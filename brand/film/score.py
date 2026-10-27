"""score.py — the launch film's score, synthesised from nothing but numpy.

Written to the same cue sheet as the picture (cues.json), so every stamp,
bloom and chime lands on its frame. In D major at 80 bpm, one bar every
three seconds:

  I    0–15    a pad and a celesta: one note for every idea that lights
  II   15–25   Bm, G, Em, A held open; the clock quickens; six stamps; silence
  III  27–50   one note; a rise; the bloom; the piano under the founder's letter
  IV   50–69   a chime as each project settles in the bowl, and each sphere named
  V    69–88   the climb, the cadence home (I–V–vi–IV–V–I), the ring-out

  python3 brand/film/score.py        # writes brand/film/score.wav
"""
import json
import os

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, "cues.json")))
SR = 48000
DUR = CUES["duration"]
N = int((DUR + 0.5) * SR)
BEAT = 60 / CUES["bpm"]
rng = np.random.default_rng(7)

dry = np.zeros((2, N))
wet = np.zeros((2, N))  # the reverb send


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pan(x, p):
    """Equal-power pan, p from -1 (left) to 1 (right), into a stereo pair."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def add(t, st, gain=1.0, send=0.3):
    i = int(round(t * SR))
    if i >= N:
        return
    st = st[:, : N - i]
    dry[:, i : i + st.shape[1]] += st * gain
    wet[:, i : i + st.shape[1]] += st * gain * send


def lowpass(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)


def highpass(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, a, r, hold=None):
    """Attack a and release r (seconds) over n samples, cosine-shaped."""
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    na = min(na, n)
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    nr = min(nr, n)
    e[n - nr :] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e


# ── Instruments ──────────────────────────────────────────────────────────────
def pad(t0, t1, notes, gain=0.05, cutoff=1800, attack=2.0, release=2.5, send=0.55, harmonics=10):
    """Detuned saws, softly filtered: the string and choir bed."""
    n = int((t1 - t0 + release) * SR)
    tt = np.arange(n) / SR
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        for k, cents in enumerate((-7, 0, 7)):
            f = hz(m) * 2 ** (cents / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            # A slow, slight drift in pitch keeps the voices alive
            drift = 1 + 0.0012 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * tt + ph)
            phase = 2 * np.pi * f * np.cumsum(drift) / SR
            v = np.zeros(n)
            for h in range(1, harmonics + 1):
                if f * h > 9000:
                    break
                v += np.sin(h * phase + ph * h) / h
            out += pan(v, (k - 1) * 0.6 + (j % 2 - 0.5) * 0.3)
    e = env(n, attack, release)
    out = np.stack([lowpass(out[0], cutoff), lowpass(out[1], cutoff)]) * e
    add(t0, out, gain / len(notes), send)


def piano(t, m, vel=0.5, length=4.5, send=0.35, p=0.0):
    """A struck string: inharmonic partials, each fading at its own rate."""
    n = int(length * SR)
    tt = np.arange(n) / SR
    f0, B = hz(m), 0.00035
    v = np.zeros(n)
    base = 1.6 * (261.6 / f0) ** 0.45 + 0.4  # lower notes ring longer
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (vel ** (0.6 + 0.12 * k)) / k ** 1.25
        dec = base / (1 + 0.45 * (k - 1))
        for det in (-0.4, 0.4):  # two strings, a little apart
            v += 0.5 * amp * np.sin(2 * np.pi * (fk + det * k * 0.25) * tt) * np.exp(-tt / dec)
    click = lowpass(rng.standard_normal(n) * np.exp(-tt / 0.004), 2500 + 3000 * vel) * 0.08 * vel
    v = (v + click) * env(n, 0.002, 0.25)
    add(t, pan(v, p), 0.22 * vel, send)


def bell(t, m, gain=0.1, length=3.5, send=0.6, p=0.0):
    """A celesta's bar: a pure fundamental and quick bright partials."""
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = hz(m)
    v = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 1.3)
    for r, a, d in ((2.0, 0.25, 0.5), (3.01, 0.12, 0.25), (4.17, 0.08, 0.12), (5.43, 0.05, 0.07)):
        if f * r < 16000:
            v += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / d)
    v *= env(n, 0.0015, 0.3)
    add(t, pan(v, p), gain, send)


def lead(t0, notes, gain=0.05, send=0.5):
    """The string line: a bowed saw with a late, growing vibrato."""
    for start_beats, m, dur_beats in notes:
        t = t0 + start_beats * BEAT
        d = dur_beats * BEAT
        n = int((d + 1.2) * SR)
        tt = np.arange(n) / SR
        vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - 0.35) / 0.8, 0, 1)
        f = hz(m)
        v = np.zeros(n)
        for c in (-5, 5):
            phase = 2 * np.pi * f * 2 ** (c / 1200) * np.cumsum(vib) / SR
            for h in range(1, 14):
                if f * h > 10000:
                    break
                v += np.sin(h * phase) / h
        v = lowpass(v, 2600) * env(n, 0.35, 1.2)
        add(t, pan(v, 0.1), gain, send)


def boom(t, gain=0.5, f1=95, f2=38, length=3.0, send=0.35):
    """A low hit: a falling sine and a dark thud of noise."""
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = f2 + (f1 - f2) * np.exp(-tt / 0.12)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9)
    v += lowpass(rng.standard_normal(n), 180) * np.exp(-tt / 0.08) * 0.9
    v *= env(n, 0.002, 0.6)
    add(t, np.stack([v, v]), gain, send)


def stamp(t, gain=0.35, p=0.0):
    """A rubber stamp on paper, heavy: the jobs between an idea and its doors."""
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    v = bandpass(rng.standard_normal(n), 700, 3200) * np.exp(-tt / 0.03)
    for r in (311, 523, 887):
        v += 0.25 * np.sin(2 * np.pi * r * tt) * np.exp(-tt / 0.07)
    add(t, pan(v * env(n, 0.001, 0.1), p), gain, 0.4)


def kick(t, gain=0.25):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 44 + 80 * np.exp(-tt / 0.035)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.22) * env(n, 0.001, 0.1)
    add(t, np.stack([v, v]), gain, 0.08)


def tom(t, gain=0.2, f0=110, p=0.0):
    n = int(0.9 * SR)
    tt = np.arange(n) / SR
    f = f0 * (1 + 0.5 * np.exp(-tt / 0.05))
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.28)
    v += lowpass(rng.standard_normal(n), 900) * np.exp(-tt / 0.02) * 0.4
    add(t, pan(v * env(n, 0.001, 0.1), p), gain, 0.3)


def tick(t, gain=0.05, p=0.0):
    n = int(0.08 * SR)
    tt = np.arange(n) / SR
    v = highpass(rng.standard_normal(n), 5000) * np.exp(-tt / 0.012)
    add(t, pan(v, p), gain, 0.15)


def cymbal(t, gain=0.12, length=4.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    v = highpass(rng.standard_normal((2, n)), 3500) * np.exp(-tt / 1.2)[None]
    add(t, v * env(n, 0.003, 0.5)[None], gain, 0.5)


def riser(t0, t1, gain=0.18):
    """Noise climbing through the bands, and a tone gliding up beneath it."""
    n = int((t1 - t0) * SR)
    x = np.linspace(0, 1, n)
    noise = rng.standard_normal((2, n))
    bands = [(200, 600), (600, 1600), (1600, 4000), (4000, 10000)]
    out = np.zeros((2, n))
    for i, (lo, hi) in enumerate(bands):
        c = i / (len(bands) - 1)
        w = np.exp(-((x - c) ** 2) / 0.06)  # each band peaks in its turn
        out += np.stack([bandpass(noise[0], lo, hi), bandpass(noise[1], lo, hi)]) * w[None]
    f = 110 * 2 ** (x * 3)  # three octaves
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    out = out * 0.45 + np.stack([tone, tone])
    out *= (x ** 2.2)[None]
    add(t0, out, gain, 0.45)


# ── The score ────────────────────────────────────────────────────────────────
# Chords, as MIDI notes
D    = [38, 50, 57, 62, 64, 66, 69]
D_hi = [26, 38, 50, 57, 62, 66, 69, 74, 78, 81]
A_C  = [37, 49, 52, 57, 64, 69, 73]
Bm   = [35, 47, 54, 57, 62, 66]
G    = [31, 43, 50, 59, 66, 69]
D_F  = [42, 54, 57, 62, 66, 69]
Em   = [40, 52, 55, 59, 62, 66]
Asus = [33, 45, 52, 57, 62, 64]
A    = [33, 45, 52, 57, 61, 64, 69]
Gmaj7 = [31, 43, 50, 55, 59, 62, 66]
C = CUES

# Act I — the night of ideas
pad(0.0, 9.0, [50, 57, 64, 66, 73], gain=0.05, cutoff=1300, attack=4.0, release=3.0)
pad(9.0, 12.0, [47, 54, 62, 66, 69], gain=0.05, cutoff=1400, attack=2.5, release=2.5)
pad(12.0, 15.0, [43, 50, 59, 66, 69], gain=0.055, cutoff=1600, attack=2.0, release=2.5)
boom(0.4, gain=0.18, f1=60, f2=34, length=5)
IDEA_NOTES = [74, 81, 78, 86, 76, 83, 81, 88, 78, 86, 83, 90, 81, 88, 86, 93, 83, 90, 88, 95, 90, 93]
for i, t in enumerate(C["ideas"]):
    bell(t, IDEA_NOTES[i % len(IDEA_NOTES)], gain=0.11 - 0.0025 * i, p=float(rng.uniform(-0.7, 0.7)))

# Act II — the organization in the way: B minor, held open over a drone,
# moving to G, E minor and an unresolved A, cut off before it can resolve
pad(15.0, 18.0, [35, 47, 54, 59, 62, 66], gain=0.06, cutoff=1100, attack=1.2, release=1.8)
pad(18.0, 21.0, [31, 43, 50, 55, 59, 62], gain=0.065, cutoff=1000, attack=1.0, release=1.5)
pad(21.0, 24.0, [28, 40, 47, 52, 55, 59, 62], gain=0.072, cutoff=950, attack=0.8, release=0.8)
pad(24.0, C["cut"], [33, 45, 52, 57, 62, 64], gain=0.078, cutoff=900, attack=0.3, release=0.06)
pad(15.0, C["cut"], [23, 35], gain=0.05, cutoff=300, attack=3.0, release=0.06)  # the drone, low B
t = 18.0
while t < C["cut"] - 0.01:  # the clock, quickening into sixteenths
    k = (t - 18.0) / (C["cut"] - 18.0)
    tick(t, gain=0.03 + 0.06 * k, p=0.4 if int(t / (BEAT / 2)) % 2 else -0.4)
    t += BEAT / 2 if t < 21.0 else BEAT / 4
for i, h in enumerate(C["hits"]):
    boom(h, gain=0.26 + 0.025 * i, f1=90, f2=36, length=2.2)
    stamp(h, gain=0.2, p=(-0.5, 0.5, 0.0, -0.4, 0.4, 0.0)[i])
boom(C["cut"], gain=0.5, f1=110, f2=30, length=4.5, send=0.6)

# Act III — one light, the rise, the bloom, the letter
piano(C["spark"], 81, vel=0.45, length=6, send=0.7)
piano(C["spark"] + 0.02, 86, vel=0.3, length=6, send=0.7)
pad(C["rise"], C["bloom"], [33, 45, 52, 57, 62, 64, 69], gain=0.06, cutoff=900, attack=3.5, release=0.3)
riser(C["rise"], C["bloom"], gain=0.09)
B = C["bloom"]
boom(B, gain=0.7, f1=80, f2=32, length=5, send=0.5)
cymbal(B, gain=0.05, length=4)
pad(B, 36.0, D_hi, gain=0.11, cutoff=3200, attack=0.05, release=3.0)
for m, p in ((86, -0.4), (90, 0.4), (93, 0.0)):
    bell(B, m, gain=0.07, length=5, p=p)
for (t0, t1, ch) in ((36, 39, A_C), (39, 42, Bm), (42, 45, G), (45, 48, D_F), (48, C["dive"][1], Em)):
    pad(t0, t1, ch, gain=0.07, cutoff=2200, attack=1.5, release=2.5)


def ostinato(t0, t1, chords, vel=0.35, sixteenths=False, send=0.3):
    """Broken chords in eighths (or sixteenths), the piano's walk."""
    step = BEAT / (4 if sixteenths else 2)
    shape = [0, 2, 1, 3, 2, 4, 3, 2]
    t, i = t0, 0
    while t < t1 - 1e-6:
        chord = chords.get(int(t // 3.0))
        if chord:
            tones = sorted(m for m in chord if 60 <= m + 12 <= 84)
            tones = [m + 12 if m < 60 else m for m in tones][:5]
            m = tones[shape[i % 8] % len(tones)]
            accent = 1.0 if i % (8 if sixteenths else 4) == 0 else 0.8
            piano(t, m, vel=vel * accent, length=2.4, send=send, p=0.35 * np.sin(i * 0.9))
        t += step
        i += 1


BARS = {
    11: D, 12: A_C, 13: Bm, 14: G, 15: D_F, 16: Em,     # the letter
    19: D, 20: A, 21: Bm, 22: G,                        # the spheres named
    23: G, 24: Em, 25: Gmaj7, 26: Asus,                 # the climb
}
ostinato(34.5, C["dive"][0], BARS, vel=0.34)
lead(C["letter"][0], [(0, 74, 3), (3, 76, 1), (4, 78, 4), (8, 79, 2), (10, 78, 1), (11, 76, 1), (12, 74, 4)], gain=0.04)
# The dive: the piano climbs into the planet
for i, m in enumerate((62, 66, 69, 74, 78, 81)):
    piano(C["dive"][0] + i * BEAT / 4 * 1.6, m, vel=0.28 + 0.04 * i, length=3, send=0.5)

# Act IV — the bowl, then who brings what
E_ = C["dive"][1]
pad(E_, C["lid"], [31, 43, 50, 55, 59, 62], gain=0.06, cutoff=1800, attack=0.6, release=2.0)
pad(C["lid"], 55.5, [42, 54, 57, 62, 66, 69], gain=0.065, cutoff=2000, attack=1.2, release=2.0)
pad(55.5, C["back"], [40, 52, 55, 59, 62, 67], gain=0.065, cutoff=2000, attack=1.2, release=1.5)
piano(C["lid"], 74, vel=0.32, length=4, send=0.6)
for d, m in zip(C["drops"], (81, 85, 88, 93)):  # a chime as each project settles
    bell(d + 0.62, m, gain=0.08, length=4)
lead(C["beneath"], [(0, 78, 2), (2, 76, 2), (4, 74, 4)], gain=0.035)
pad(C["back"], 61.5, D, gain=0.075, cutoff=2400, attack=0.6, release=2.2)
pad(61.5, 64.5, A, gain=0.075, cutoff=2400, attack=0.8, release=2.2)
pad(64.5, C["ascend"], Bm, gain=0.075, cutoff=2400, attack=0.8, release=2.2)
ostinato(C["back"] + 0.75, C["ascend"], BARS, vel=0.38)
for t, m in zip(C["tags"], (78, 81, 85, 86)):
    bell(t, m, gain=0.09, length=4)
X = C["exists"]
boom(X, gain=0.38, f1=85, f2=36, length=4)
for m in (74, 78, 81, 86):
    bell(X, m, gain=0.05, length=5)

# Act V — the expansion, the cadence home
pad(C["ascend"], 72.0, G, gain=0.08, cutoff=2400, attack=0.8, release=2.0)
pad(72.0, 75.0, Em + [71], gain=0.1, cutoff=1800, attack=1.0, release=2.0)
pad(75.0, 78.0, Gmaj7[:2] + [50, 59, 66, 69, 74], gain=0.115, cutoff=2600, attack=1.0, release=2.0)
pad(78.0, C["institutions"], Asus + [69], gain=0.13, cutoff=3000, attack=0.8, release=0.4)
ostinato(C["ascend"], 75.0, BARS, vel=0.4)
ostinato(75.0, C["institutions"], BARS, vel=0.48, sixteenths=True)
lead(72.0, [(0, 79, 4), (4, 78, 2), (6, 76, 2), (8, 74, 4)], gain=0.045)
for b in range(int(75 / BEAT), int(C["institutions"] / BEAT)):
    kick(b * BEAT, gain=0.22)
t = 77.25
while t < C["institutions"] - 1e-6:  # toms gathering into the word
    k = (t - 77.25) / (C["institutions"] - 77.25)
    tom(t, gain=0.08 + 0.18 * k, f0=150 - 60 * k, p=0.3 * np.sin(t * 9))
    t += BEAT / 4
I = C["institutions"]
boom(I, gain=0.6, f1=90, f2=30, length=5, send=0.5)
cymbal(I, gain=0.06, length=3)
pad(I, 81.0, [35, 47, 54, 59, 62, 66, 71, 74, 78], gain=0.12, cutoff=3400, attack=0.05, release=1.2)
pad(81.0, 81.75, [31, 43, 50, 59, 62, 67, 71, 74], gain=0.11, cutoff=3200, attack=0.2, release=0.5)
pad(81.75, C["flash"], [33, 45, 52, 57, 61, 64, 67, 69, 73], gain=0.11, cutoff=3600, attack=0.2, release=0.08)
for i, t in enumerate(C["constellation"]):
    bell(t, [86, 90, 93, 98, 95, 88][i % 6], gain=0.035, length=3, p=float(rng.uniform(-0.9, 0.9)))
riser(C["flash"] - 1.5, C["flash"], gain=0.07)
F = C["flash"]
boom(F, gain=0.8, f1=85, f2=30, length=6, send=0.55)
cymbal(F, gain=0.07, length=5)
pad(F, DUR - 1.5, D_hi + [86], gain=0.13, cutoff=3400, attack=0.04, release=1.5)
for m, p in ((74, -0.3), (78, 0.3), (81, -0.1), (86, 0.1)):
    bell(F, m, gain=0.07, length=6, p=p)
for i, m in enumerate((78, 76, 74, 69)):  # under the statement's words
    piano(C["statement"] + i * BEAT, m, vel=0.38, length=5, send=0.5)
piano(C["statement"] + 4 * BEAT, 62, vel=0.3, length=5, send=0.5)
piano(C["statement"] + 4 * BEAT, 74, vel=0.3, length=5, send=0.5)
bell(C["cta"], 86, gain=0.08, length=4)
bell(C["cta"] + 0.01, 93, gain=0.04, length=4)

# ── Reverb, master ───────────────────────────────────────────────────────────
ir_len = int(3.6 * SR)
tt = np.arange(ir_len) / SR
ir = rng.standard_normal((2, ir_len)) * np.exp(-tt / 0.75)[None]
ir = np.stack([lowpass(ir[0], 5200), lowpass(ir[1], 5200)])
ir[:, : int(0.018 * SR)] = 0  # pre-delay
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
verb = np.stack([fftconvolve(wet[0], ir[0])[:N], fftconvolve(wet[1], ir[1])[:N]])
mix = dry + verb * 0.9
mix = np.stack([highpass(mix[0], 28), highpass(mix[1], 28)])
mix = mix[:, : int(DUR * SR)]
fade = int(1.8 * SR)  # the last chord let go before the picture ends
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
mix /= np.abs(mix).max() / 0.89
mix = np.tanh(mix * 1.1) / np.tanh(1.1)

pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").T.copy()
out = os.path.join(HERE, "score.wav")
with open(out, "wb") as f:
    import wave
    w = wave.open(f, "wb")
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
    w.close()
print("wrote", out, f"{mix.shape[1] / SR:.2f}s")

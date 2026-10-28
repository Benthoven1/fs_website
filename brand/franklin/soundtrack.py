"""soundtrack.py — the Franklin essay's sound: its narration (narrate.py), a
score written to it, and the sounds of the picture (cues.json, from cues.js),
mixed with the music ducking under the voice.

The score is in D, at 96 bpm. Its century is in it: a harpsichord's broken
chords over soft strings while the story is Franklin's, a pulse under the fire,
pizzicato for the hospital's match, silence and a ticking clock for "here is
the thing", a piano for today, and the launch film's ending for the close.

  python3 brand/franklin/soundtrack.py     # writes soundtrack.wav
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
TIMING = json.load(open(os.path.join(HERE, "timing.json")))
CUES = json.load(open(os.path.join(HERE, "cues.json")))
E = CUES["cues"]
SR = 48000
DUR = CUES["duration"]
N = int((DUR + 0.5) * SR)
rng = np.random.default_rng(1706)
L = {l["id"]: l for l in TIMING["lines"]}


def at(id_, word=None):
    l = L[id_]
    if word is None:
        return l["t0"]
    for w, a, b in l["words"]:
        if "".join(c for c in w.lower() if c.isalnum() or c == "£").startswith(word):
            return a
    raise KeyError(word)


dry = np.zeros((2, N))
wet = np.zeros((2, N))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pan(x, p):
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def add(t, st, gain=1.0, send=0.3):
    i = int(round(t * SR))
    if i >= N or i + st.shape[1] <= 0:
        return
    if i < 0:
        st, i = st[:, -i:], 0
    st = st[:, : N - i]
    dry[:, i : i + st.shape[1]] += st * gain
    wet[:, i : i + st.shape[1]] += st * gain * send


def lowpass(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)


def highpass(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def env(n, a, r):
    e = np.ones(n)
    na, nr = min(n, max(1, int(a * SR))), min(n, max(1, int(r * SR)))
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    e[n - nr :] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e


# ── Chords ───────────────────────────────────────────────────────────────────
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
        "sus4": [0, 5, 7], "sus2": [0, 2, 7], "dim": [0, 3, 6], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "add9": [0, 4, 7, 14]}


def pc(name):
    v = NOTE[name[0]]
    for ch in name[1:]:
        v += 1 if ch == "#" else -1 if ch == "b" else 0
    return v % 12


def chord(sym):
    """'F#m7/C#' -> (bass pitch class, [pitch classes]); roots and qualities as written."""
    sym, _, bass = sym.partition("/")
    root = sym[0] + (sym[1] if len(sym) > 1 and sym[1] in "#b" else "")
    q = sym[len(root):]
    r = pc(root)
    tones = [(r + i) % 12 for i in QUAL[q]]
    return (pc(bass) if bass else r), tones


def voice(sym, lo=52, n=4):
    """The chord's tones from lo upward, n of them, its bass an octave or two below."""
    b, tones = chord(sym)
    out, m = [], lo
    while len(out) < n:
        if m % 12 in tones:
            out.append(m)
        m += 1
    bass = 36 + ((b - 36) % 12)
    return bass, out


# ── Instruments ──────────────────────────────────────────────────────────────
def pad(t0, t1, notes, gain=0.05, cutoff=1800, attack=2.0, release=2.5, send=0.55, harmonics=10):
    """Detuned saws, softly filtered: strings, held."""
    n = int((t1 - t0 + release) * SR)
    tt = np.arange(n) / SR
    out = np.zeros((2, n))
    for j, m in enumerate(notes):
        for k, cents in enumerate((-7, 0, 7)):
            f = hz(m) * 2 ** (cents / 1200)
            ph = rng.uniform(0, 2 * np.pi)
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
    add(t0, out, gain / max(1, len(notes)), send)


def piano(t, m, vel=0.5, length=4.5, send=0.35, p=0.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    f0, B = hz(m), 0.00035
    v = np.zeros(n)
    base = 1.6 * (261.6 / f0) ** 0.45 + 0.4
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (vel ** (0.6 + 0.12 * k)) / k ** 1.25
        dec = base / (1 + 0.45 * (k - 1))
        for det in (-0.4, 0.4):
            v += 0.5 * amp * np.sin(2 * np.pi * (fk + det * k * 0.25) * tt) * np.exp(-tt / dec)
    click = lowpass(rng.standard_normal(n) * np.exp(-tt / 0.004), 2500 + 3000 * vel) * 0.08 * vel
    v = (v + click) * env(n, 0.002, 0.25)
    add(t, pan(v, p), 0.22 * vel, send)


def pluck(t, m, vel=0.5, bright=0.6, decay=1.0, pos=0.18, length=None, send=0.3, p=0.0, gain=0.2):
    """A plucked string: harmonics shaped by where it was plucked, the high ones
    dying first. bright near 1 and a short decay is a harpsichord; low and long,
    a guitar; very short, pizzicato."""
    length = length or min(4.0, decay * 3.2 + 0.2)
    n = int(length * SR)
    tt = np.arange(n) / SR
    f0 = hz(m)
    v = np.zeros(n)
    for k in range(1, 40):
        fk = f0 * k * (1 + 0.00008 * k * k)
        if fk > 15000:
            break
        amp = abs(np.sin(np.pi * k * pos)) / k ** (1.8 - 0.8 * bright)
        dec = decay * (220 / f0) ** 0.25 / (1 + (k - 1) * (0.6 - 0.32 * bright))
        v += amp * np.sin(2 * np.pi * fk * tt + rng.uniform(0, 6.28)) * np.exp(-tt / dec)
    v += highpass(rng.standard_normal(n), 1800) * np.exp(-tt / 0.003) * 0.25 * bright  # the quill
    v = lowpass(v, 3500 + 3500 * bright) * env(n, 0.0008, 0.06) * vel
    add(t, pan(v, p), gain, send)


def harpsichord(t, m, vel=0.6, p=0.0, send=0.28):
    # Two choirs, an octave apart, as an 8' and 4' together
    pluck(t, m, vel, bright=0.95, decay=0.55, pos=0.11, p=p, send=send, gain=0.16)
    pluck(t + 0.004, m + 12, vel * 0.45, bright=0.95, decay=0.4, pos=0.13, p=-p, send=send, gain=0.16)


def pizz(t, m, vel=0.5, p=0.0):
    pluck(t, m, vel, bright=0.25, decay=0.22, pos=0.3, length=0.9, p=p, send=0.35, gain=0.3)


def bell(t, m, gain=0.1, length=3.5, send=0.6, p=0.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = hz(m)
    v = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 1.3)
    for r, a, d in ((2.0, 0.25, 0.5), (3.01, 0.12, 0.25), (4.17, 0.08, 0.12), (5.43, 0.05, 0.07)):
        if f * r < 16000:
            v += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / d)
    add(t, pan(v * env(n, 0.0015, 0.3), p), gain, send)


def tick(t, gain=0.05, p=0.0):
    """A clock's tick."""
    n = int(0.08 * SR)
    tt = np.arange(n) / SR
    v = highpass(rng.standard_normal(n), 5000) * np.exp(-tt / 0.012)
    add(t, pan(v, p), gain, 0.15)


def boom(t, gain=0.5, f1=95, f2=38, length=3.0, send=0.35):
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = f2 + (f1 - f2) * np.exp(-tt / 0.12)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9)
    v += lowpass(rng.standard_normal(n), 180) * np.exp(-tt / 0.08) * 0.9
    v *= env(n, 0.002, 0.6)
    add(t, np.stack([v, v]), gain, send)


def kick(t, gain=0.25):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 44 + 80 * np.exp(-tt / 0.035)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.22) * env(n, 0.001, 0.1)
    add(t, np.stack([v, v]), gain, 0.08)


def shaker(t, gain=0.03, p=0.0):
    n = int(0.12 * SR)
    tt = np.arange(n) / SR
    v = bandpass(rng.standard_normal(n), 5000, 11000) * np.exp(-tt / 0.03) * np.clip(tt / 0.01, 0, 1)
    add(t, pan(v, p), gain, 0.15)


def riser(t0, t1, gain=0.18):
    n = int((t1 - t0) * SR)
    x = np.linspace(0, 1, n)
    noise = rng.standard_normal((2, n))
    out = np.zeros((2, n))
    for i, (lo, hi) in enumerate([(200, 600), (600, 1600), (1600, 4000), (4000, 10000)]):
        w = np.exp(-((x - i / 3) ** 2) / 0.06)
        out += np.stack([bandpass(noise[0], lo, hi), bandpass(noise[1], lo, hi)]) * w[None]
    f = 110 * 2 ** (x * 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    out = (out * 0.45 + np.stack([tone, tone])) * (x ** 2.2)[None]
    add(t0, out, gain, 0.45)


# ── A bar-line clock ─────────────────────────────────────────────────────────
class Clock:
    def __init__(self, t0, bpm, per_bar):
        self.t0, self.beat, self.per = t0, 60 / bpm, per_bar

    def at(self, bar, beat=0.0):
        return self.t0 + (bar * self.per + beat) * self.beat


# ── The sounds of the picture ────────────────────────────────────────────────
def blip(t, gain=0.08, f0=880, p=0.0):
    """A pop: a soft sine that drops in pitch, and a breath of air."""
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    f = f0 * (1 + 0.6 * np.exp(-tt / 0.02))
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05)
    v += bandpass(rng.standard_normal(n), 2000, 7000) * np.exp(-tt / 0.008) * 0.15
    add(t, pan(v * env(n, 0.002, 0.05), p), gain, 0.25)


def whoosh(t, gain=0.07, length=0.9):
    n = int(length * SR)
    x = np.linspace(0, 1, n)
    noise = rng.standard_normal((2, n))
    out = np.zeros((2, n))
    for i, (lo, hi) in enumerate([(300, 900), (900, 2500), (2500, 6000)]):
        w = np.exp(-((x - (0.3 + 0.25 * i)) ** 2) / 0.04)
        out += np.stack([bandpass(noise[0], lo, hi), bandpass(noise[1], lo, hi)]) * w[None]
    out *= (np.sin(np.pi * x) ** 2)[None]
    add(t - length * 0.55, out, gain, 0.35)


def tink(t, gain=0.05, p=0.0):
    """A coin: two bright, inharmonic partials."""
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = float(rng.uniform(2400, 3200))
    v = (np.sin(2 * np.pi * f * tt) + 0.6 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.08)
    add(t, pan(v * env(n, 0.001, 0.05), p), gain, 0.3)


def thud(t, gain=0.25):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    v = bandpass(rng.standard_normal(n), 400, 2600) * np.exp(-tt / 0.03)
    v += 0.9 * np.sin(2 * np.pi * (80 + 70 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.09)
    add(t, np.stack([v, v]), gain, 0.3)


# ── The score ────────────────────────────────────────────────────────────────
c = Clock(0.0, 96, 4)
BAR = c.beat * 4


def chords_between(t0, t1, prog, bars_each=1):
    """Lay a progression from t0 to t1, a chord every bars_each bars, looping."""
    out, t, i = [], t0, 0
    while t < t1 - 0.05:
        span = min(BAR * bars_each, t1 - t)
        out.append((t, t + span, prog[i % len(prog)]))
        t += span
        i += 1
    return out


def lay(chords, keys=None, pad_gain=0.05, lo=55, cutoff=1800, arp_vel=0.4, sub=2, pattern=(0, 2, 1, 3, 2, 1, 3, 2), bass=True):
    for t0, t1, sym in chords:
        b, tones = voice(sym, lo, 4)
        pad(t0, t1, [b, b + 12] + tones, gain=pad_gain, cutoff=cutoff, attack=0.8, release=1.2)
        if bass:
            piano(t0, b, 0.3, length=3.0, send=0.35)
        if keys:
            step = c.beat / sub
            k, t = 0, t0
            while t < t1 - 1e-3:
                m = tones[pattern[k % len(pattern)] % len(tones)] + 12
                keys(t, m, arp_vel * (1.0 if k % (2 * sub) == 0 else 0.8), k)
                t += step
                k += 1


harp = lambda t, m, v, k: harpsichord(t, m, v * 0.7, p=0.25 * np.sin(k * 0.8))
pianoarp = lambda t, m, v, k: piano(t, m, v, length=2.2, send=0.4, p=0.3 * np.sin(k * 0.9))
pizzi = lambda t, m, v, k: pizz(t, m, v * 1.2, p=0.3 * np.sin(k))

# I — 1731, the night before: a pad, a bell for each empty place, then the lift
pad(0.0, at("hook3"), [38, 50, 57, 62, 64, 69], gain=0.05, cutoff=1100, attack=2.5, release=1.5)
pad(at("hook3"), at("hook3", "one"), [41, 53, 60, 65, 69, 72], gain=0.055, cutoff=1500, attack=0.6, release=1.0)
pad(at("hook3", "one"), at("who1"), [38, 50, 57, 62, 66, 69, 74], gain=0.065, cutoff=2400, attack=0.3, release=1.4)
riser(at("hook3") , at("hook3", "all"), gain=0.04)
for i, m in enumerate((74, 78, 81, 86)):
    bell(at("hook3", "all") + i * 0.22, m, gain=0.05, length=4)

# II — who he was: warm, and his century's harpsichord
lay(chords_between(at("who1"), at("lib1"), ["D", "Bm", "G", "A"]), keys=harp, pad_gain=0.045, cutoff=1600, arp_vel=0.45)
# III — the library: the same, quicker, coins in its texture
lay(chords_between(at("lib1"), at("fire1"), ["G", "D/F#", "Em", "A", "D", "A/C#", "Bm", "A"]), keys=harp, pad_gain=0.045, cutoff=1800, arp_vel=0.5, sub=4,
    pattern=(0, 1, 2, 3, 2, 1))
# IV — the fire: B minor, a low pulse
lay(chords_between(at("fire1"), at("hosp1"), ["Bm", "G", "Bm", "F#"]), keys=None, pad_gain=0.06, cutoff=1100)
t = at("fire1")
while t < at("hosp1") - 0.2:
    kick(t, 0.13)
    t += c.beat
# V — the hospital, the match: bright, plucked
lay(chords_between(at("hosp1"), at("acad1"), ["D", "A", "Bm", "G"]), keys=pizzi, pad_gain=0.045, cutoff=2000, arp_vel=0.5, pattern=(0, 2, 1, 2))
# VI — the academy: the lift
lay(chords_between(at("acad1"), at("turn1"), ["G", "A", "D"]), keys=harp, pad_gain=0.055, cutoff=2400, arp_vel=0.45)
# VII — here is the thing: silence, then a low A and a clock that quickens
pad(at("turn1") + 0.4, at("now1"), [33, 45, 52], gain=0.06, cutoff=500, attack=2.0, release=0.5)
t = at("turn1") + 0.5
while t < at("now1") - 0.05:
    k = (t - at("turn1")) / (at("now1") - at("turn1"))
    tick(t, gain=0.03 + 0.05 * k, p=0.4 if int(t / (c.beat / 2)) % 2 else -0.4)
    t += c.beat / 2 if k < 0.6 else c.beat / 4
# VIII — today: a piano, building to the close
lay(chords_between(at("now1"), E["cosmos"], ["D", "F#m", "G", "A"]), keys=pianoarp, pad_gain=0.055, cutoff=2600, arp_vel=0.34)
t = at("now2")
while t < E["cosmos"] - 0.05:
    kick(t, 0.1)
    shaker(t + c.beat / 2, 0.018, 0.4)
    t += c.beat

# The close: the launch film's ending
R = E["cosmos"]
boom(R + 0.6, gain=0.3, f1=80, f2=32, length=5, send=0.5)
D_hi = [26, 38, 50, 57, 62, 66, 69, 74, 78, 81]
pad(R, E["wordmark"], [38, 50, 57, 62, 66, 69, 74], gain=0.07, cutoff=3000, attack=0.4, release=1.5)
for m, p in ((86, -0.4), (90, 0.4), (93, 0.0)):
    bell(R + 0.6, m, gain=0.05, length=5, p=p)
M0 = E["wordmark"]
boom(M0, gain=0.28, f1=80, f2=30, length=6, send=0.55)
pad(M0, DUR - 1.0, D_hi + [86], gain=0.08, cutoff=3400, attack=0.04, release=1.5)
c0, c1 = E["cycle"]
t = c0
PENT = [86, 88, 90, 93, 95, 98, 100]
while t < c1:
    u = (t - c0) / (c1 - c0)
    bell(t, PENT[int(rng.integers(len(PENT)))], gain=0.022, length=1.6, p=float(rng.uniform(-0.8, 0.8)))
    t += 1 / (3 + 9 * np.sin(np.pi * u))
piano(E["settle"][0] + 7 * 0.14, 62, vel=0.3, length=6, send=0.6)
piano(E["settle"][0] + 7 * 0.14, 74, vel=0.32, length=6, send=0.6)
bell(E["cta"], 86, gain=0.07, length=4)

# The picture's sounds
for s in CUES["sfx"]:
    t, k, gn = s["t"], s["kind"], s.get("gain", 1)
    p = float(rng.uniform(-0.4, 0.4))
    if k == "pop":
        blip(t, 0.07 * gn, float(rng.choice([660, 740, 880, 990])), p)
    elif k == "whoosh":
        whoosh(t, 0.06 * gn)
    elif k == "chime":
        bell(t, int(rng.choice([81, 86, 88, 90])), gain=0.05 * gn, length=3, p=p)
    elif k == "coin":
        tink(t, 0.035 * gn, p)
    elif k == "stamp":
        thud(t, 0.22 * gn)
    elif k == "settle":
        bell(t, [74, 76, 78, 79, 81, 83, 86][int(round((t - E["settle"][0]) / 0.14)) % 7], gain=0.06, length=4, p=p)

# ── Reverb, the voice, the mix ───────────────────────────────────────────────
ir_len = int(3.6 * SR)
tt = np.arange(ir_len) / SR
ir = rng.standard_normal((2, ir_len)) * np.exp(-tt / 0.7)[None]
ir = np.stack([lowpass(ir[0], 5200), lowpass(ir[1], 5200)])
ir[:, : int(0.02 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
music = dry + np.stack([fftconvolve(wet[0], ir[0])[:N], fftconvolve(wet[1], ir[1])[:N]]) * 0.9
music = np.stack([highpass(music[0], 30), highpass(music[1], 30)])
music /= np.abs(music).max() + 1e-9

with wave.open(os.path.join(HERE, "narration.wav")) as w:
    vsr = w.getframerate()
    v = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2" if w.getsampwidth() == 2 else "<i4").astype(float)
    v /= 32768.0 if w.getsampwidth() == 2 else 2 ** 31
voice_ = resample_poly(v, SR, vsr)
voice_ = highpass(voice_, 80)
voice_ /= np.abs(voice_).max() + 1e-9
vv = np.zeros(N)
vv[: min(N, len(voice_))] = voice_[:N]
# The music ducks under the voice: an envelope of the voice, smoothed
envv = np.sqrt(np.convolve(vv ** 2, np.ones(int(0.25 * SR)) / int(0.25 * SR), "same"))
envv = np.clip(envv / (envv.max() + 1e-9) * 4, 0, 1)
duck = 1 - 0.55 * np.convolve(envv, np.ones(int(0.4 * SR)) / int(0.4 * SR), "same")
mix_ = music * 0.32 * duck[None] + np.stack([vv, vv]) * 0.62
mix_ = mix_[:, : int(DUR * SR)]
fade = int(1.4 * SR)
mix_[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
mix_ /= np.abs(mix_).max() / 0.9
mix_ = np.tanh(mix_ * 1.05) / np.tanh(1.05)
pcm = (np.clip(mix_, -1, 1) * 32767).astype("<i2").T.copy()
out = os.path.join(HERE, "soundtrack.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, f"{mix_.shape[1] / SR:.2f}s")

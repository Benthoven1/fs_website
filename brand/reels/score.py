"""score.py — the four polymath reels' scores, synthesised from nothing but numpy.

Each reel has its own music, written for its own century, and all four close
on the launch film's ending in D major (brand/film/score.py, Act VI):

  franklin     a harpsichord's quick broken chords in D, 1730s Philadelphia;
               then a piano and a pulse for the present
  addams       a parlour waltz in F for piano and plucked strings, Chicago 1889;
               then strings and a lift into D
  nightingale  a music box over low strings in E minor, a lamp in the wards; it
               turns to E major with the Fund, and to D at the close
  schweitzer   an organ chorale in D minor, Bach's harmony; a Picardy third,
               then the organ under strings in D major

Under the music, the collage is heard as it is made: every scrap that lands,
every stamp, strip of tape, pencil line and scissor cut, and the tear between
the past and the present, read from the story itself (dump.mjs).

  python3 brand/reels/score.py franklin     # writes brand/reels/score-franklin.wav
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ID = sys.argv[1] if len(sys.argv) > 1 else "franklin"
S = json.loads(subprocess.check_output(["node", os.path.join(HERE, "dump.mjs"), ID]))
E = S["end"]
SR = 48000
DUR = S["duration"]
N = int((DUR + 0.5) * SR)
TEAR = S["tear"]
H0 = E["hero"]
rng = np.random.default_rng(sum(map(ord, ID)))

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


def guitar(t, m, vel=0.5, p=0.0):
    pluck(t, m, vel, bright=0.35, decay=1.3, pos=0.2, p=p, send=0.32, gain=0.2)


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


def musicbox(t, m, gain=0.06, p=0.0):
    """A comb's tine: bright, inharmonic, quick to fade."""
    n = int(2.6 * SR)
    tt = np.arange(n) / SR
    f = hz(m)
    v = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.9)
    for r, a, d in ((3.9, 0.3, 0.12), (8.2, 0.14, 0.05), (2.0, 0.08, 0.4)):
        if f * r < 17000:
            v += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / d)
    add(t, pan(v * env(n, 0.001, 0.2), p), gain, 0.55)


def organ(t0, dur, notes, gain=0.05, stops=(1, 0.55, 0.3, 0.32, 0.12, 0.14), send=0.7, p=0.0, chiff=0.4):
    """Pipes: principal 8', octave 4', twelfth, fifteenth, and a little mixture,
    with the breath of each pipe as it speaks."""
    ratios = (1, 2, 3, 4, 6, 8)
    n = int((dur + 0.35) * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for m in notes:
        f = hz(m)
        for r, a in zip(ratios, stops):
            if f * r > 12000:
                continue
            out += a * np.sin(2 * np.pi * f * r * tt * (1 + 0.0004 * np.sin(2 * np.pi * 0.31 * tt)) + rng.uniform(0, 6.28))
        out += chiff * bandpass(rng.standard_normal(n), f * 2, min(f * 8, 12000)) * np.exp(-tt / 0.04) * 0.25
    e = env(n, 0.045, 0.3)
    add(t0, pan(out * e, p), gain / max(1, len(notes)), send)


def lead(t0, notes, beat, gain=0.05, send=0.5, cutoff=2600, vibrato=0.0045, octave=0):
    """A bowed line: a saw with a late, growing vibrato. notes: (beat, midi, beats)."""
    for start, m, length in notes:
        t = t0 + start * beat
        d = length * beat
        n = int((d + 1.0) * SR)
        tt = np.arange(n) / SR
        vib = 1 + vibrato * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - 0.3) / 0.7, 0, 1)
        f = hz(m + octave)
        v = np.zeros(n)
        for c in (-5, 5):
            phase = 2 * np.pi * f * 2 ** (c / 1200) * np.cumsum(vib) / SR
            for h in range(1, 14):
                if f * h > 10000:
                    break
                v += np.sin(h * phase) / h
        v = lowpass(v, cutoff) * env(n, min(0.3, d * 0.4), 0.9)
        add(t, pan(v, 0.1), gain, send)


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


def cymbal(t, gain=0.12, length=4.0):
    n = int(length * SR)
    tt = np.arange(n) / SR
    v = highpass(rng.standard_normal((2, n)), 3500) * np.exp(-tt / 1.2)[None]
    add(t, v * env(n, 0.003, 0.5)[None], gain, 0.5)


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


# ── The collage, heard ───────────────────────────────────────────────────────
def paper_slap(t, size, gain=0.07, p=0.0):
    """A scrap set down: a dry flap of paper and a soft knock on the board."""
    k = np.clip(np.sqrt(size) / 600, 0.25, 1.4)
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    v = bandpass(rng.standard_normal(n), 500, 4200) * np.exp(-tt / (0.018 + 0.012 * k))
    v += 0.6 * np.sin(2 * np.pi * (140 - 30 * k) * tt) * np.exp(-tt / 0.03) * k
    add(t, pan(v * env(n, 0.0015, 0.05), p), gain * (0.6 + 0.4 * k), 0.12)


def paper_slide(t, gain=0.05, p=0.0):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    shape = np.sin(np.pi * np.clip(tt / 0.55, 0, 1)) ** 2
    v = bandpass(rng.standard_normal(n), 1500, 7000) * shape
    add(t - 0.55, pan(v, p), gain, 0.15)
    paper_slap(t, 90000, gain * 0.8, p)


def stamp_hit(t, gain=0.22, p=0.0):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    v = bandpass(rng.standard_normal(n), 700, 3200) * np.exp(-tt / 0.03)
    for r in (311, 523, 887):
        v += 0.25 * np.sin(2 * np.pi * r * tt) * np.exp(-tt / 0.07)
    v += 0.8 * np.sin(2 * np.pi * (90 + 60 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.06)
    add(t, pan(v * env(n, 0.001, 0.1), p), gain, 0.35)


def tape_rip(t, gain=0.05, p=0.0):
    """Tape off its roll: a fast, toothed hiss."""
    n = int(0.28 * SR)
    tt = np.arange(n) / SR
    teeth = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (70 + 50 * tt / 0.28) * tt))
    v = highpass(rng.standard_normal(n), 1200) * teeth * env(n, 0.01, 0.06)
    add(t - 0.24, pan(v, p), gain, 0.1)


def pencil(t, dur, gain=0.022, p=0.0):
    n = int((dur + 0.1) * SR)
    tt = np.arange(n) / SR
    am = np.clip(0.6 + 0.4 * np.sin(2 * np.pi * 7.3 * tt) + 0.3 * rng.standard_normal(n).cumsum() / np.sqrt(n), 0, 1.5)
    v = bandpass(rng.standard_normal(n), 2500, 9000) * am * env(n, 0.03, 0.06)
    add(t, pan(v, p), gain, 0.1)


def snip(t, gain=0.06, p=0.0):
    """Scissors: two blades closing, and a ring of steel."""
    for d in (0.0, 0.07):
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        v = bandpass(rng.standard_normal(n), 3000, 9000) * np.exp(-tt / 0.006)
        v += 0.25 * np.sin(2 * np.pi * 2650 * tt) * np.exp(-tt / 0.03)
        add(t - 0.2 + d, pan(v, p), gain, 0.15)


def rip(t, gain=0.35, length=1.1):
    """The page torn in two: crackling fibres, and the halves flung away."""
    n = int(length * SR)
    tt = np.arange(n) / SR
    crack = (rng.random(n) < 0.012).astype(float)
    crack = np.convolve(crack, np.exp(-np.arange(200) / 30), "same")
    body = bandpass(rng.standard_normal(n), 400, 6000) * (0.4 + crack)
    shape = np.clip(tt / 0.05, 0, 1) * np.exp(-np.clip(tt - 0.45, 0, None) / 0.25)
    v = body * shape
    whoosh = bandpass(rng.standard_normal(n), 200, 1200) * np.sin(np.pi * np.clip((tt - 0.2) / 0.9, 0, 1)) * 0.6
    add(t, np.stack([v + whoosh * 0.7, v * 0.8 + whoosh]), gain, 0.25)


def flurry(t0, t1, gain=0.06):
    """The scraps flying off the board."""
    t = t0
    while t < t1:
        n = int(0.4 * SR)
        tt = np.arange(n) / SR
        v = bandpass(rng.standard_normal(n), 800, 6000) * np.sin(np.pi * tt / 0.4) ** 2
        add(t, pan(v, float(rng.uniform(-0.9, 0.9))), gain * float(rng.uniform(0.5, 1)), 0.3)
        t += float(rng.uniform(0.03, 0.09))


def foley():
    for e in S["events"]:
        t, k, en = e["t"], e["kind"], e["enter"]
        p = float(rng.uniform(-0.5, 0.5))
        if t >= H0 and k != "caption":
            continue
        if k == "caption":
            paper_slap(t, 40000, 0.026, p)
        elif en == "stamp":
            stamp_hit(t, 0.2, p)
        elif k == "tape":
            tape_rip(t, 0.045, p)
        elif en == "draw":
            pencil(t, e["dur"] or 0.8, 0.02 if k == "ink" else 0.016, p)
        elif en == "grow":
            snip(t, 0.05, p)
            paper_slap(t, e["size"], 0.04, p)
        elif en == "slide":
            paper_slide(t, 0.05, p)
        elif k == "ransom":
            for i in range(e["n"]):
                paper_slap(t + i * 0.06, 15000, 0.03, float(rng.uniform(-0.7, 0.7)))
        elif k == "off":
            pass
        elif en != "none":
            paper_slap(t, e["size"], 0.05, p)
    rip(TEAR, 0.15)
    flurry(H0 + 0.05, H0 + 1.0, 0.045)


# ── A bar-line clock ─────────────────────────────────────────────────────────
class Clock:
    def __init__(self, t0, bpm, per_bar):
        self.t0, self.beat, self.per = t0, 60 / bpm, per_bar

    def at(self, bar, beat=0.0):
        return self.t0 + (bar * self.per + beat) * self.beat


def arpeggio(clock, bars, play, pattern, sub, lo=55, n=4, vel=0.5, until=None, swing=0.0, skip=()):
    """Broken chords: for each (bar, chord), the pattern's chord tones in turn,
    sub notes to a beat."""
    for bar, sym, span in bars:
        if bar in skip:
            continue
        bass, tones = voice(sym, lo, n)
        steps = int(round(span * clock.per * sub))
        for i in range(steps):
            t = clock.at(bar, i / sub)
            if i % 2 and swing:
                t += swing * clock.beat / sub
            if until is not None and t >= until:
                return
            idx = pattern[i % len(pattern)]
            m = bass + 12 if idx == "b" else tones[idx % len(tones)] + 12 * (idx // len(tones))
            accent = 1.0 if i % sub == 0 else 0.8
            play(t, m, vel * accent, i)


def bars_of(progression, start=0):
    out, b = [], start
    for item in progression:
        sym, span = (item, 1) if isinstance(item, str) else item
        out.append((b, sym, span))
        b += span
    return out


def pads_for(clock, bars, gain=0.06, lo=50, n=5, cutoff=1800, until=None, attack=1.0):
    for bar, sym, span in bars:
        t0, t1 = clock.at(bar), clock.at(bar + span)
        if until is not None:
            if t0 >= until:
                break
            t1 = min(t1, until)
        bass, tones = voice(sym, lo, n)
        pad(t0, t1, [bass, bass + 12] + tones, gain=gain, cutoff=cutoff, attack=attack, release=1.4)


def melody(prog, per, rhythm, contour, lo=60, hi=90):
    """A tune that only ever sings the chord beneath it: each note the chord
    tone nearest to where the contour wants to be, and leaps discouraged."""
    bars = bars_of(prog)
    out, prev = [], None
    for b, d in rhythm:
        bar = int(b // per)
        sym = next((sy for bb, sy, sp in bars if bb <= bar < bb + sp), None)
        if sym is None:
            continue
        _, tones = chord(sym)
        cands = [m for m in range(lo, hi) if m % 12 in tones]
        target = contour(b)
        m = min(cands, key=lambda m: abs(m - target) + (0.6 * max(0, abs(m - prev) - 4) if prev is not None else 0))
        out.append((b, m, d))
        prev = m
    return out


def phrase_rhythm(first_bar, last_bar, per, shapes):
    """Each bar's rhythm, in turn from shapes: lists of (beat, beats)."""
    out = []
    for i, bar in enumerate(range(first_bar, last_bar)):
        for b, d in shapes[i % len(shapes)]:
            out.append((bar * per + b, d))
    return out


# ── The four scores ──────────────────────────────────────────────────────────
def franklin():
    """D major, 112: a harpsichord's broken chords and a bass line walking under
    them; at the tear, the present: piano, strings, a pulse."""
    c = Clock(0.35, 112, 4)
    prog = ["D", "A/C#", "Bm", "F#m/A", "G", "D/F#", "Em7", "A7",
            "D", "G/B", "A/C#", "D", "Bm", "E7/G#", "A", "A7"]
    bars = bars_of(prog)
    pattern = [0, 2, 1, 3, 2, 4, 3, 2]
    arpeggio(c, bars, lambda t, m, v, i: harpsichord(t, m, v * 0.85, p=0.25 * np.sin(i * 0.8)), pattern, 4, lo=62, n=4, vel=0.55, until=TEAR - 0.02)
    for bar, sym, span in bars:  # the bass, in quarter notes, walking
        bass, tones = voice(sym, 50, 3)
        for k, m in enumerate((bass, bass + 7, bass + 12, bass + 7)):
            t = c.at(bar, k)
            if t < TEAR - 0.02:
                pizz(t, m - 12 if k != 2 else m - 12, 0.55 if k == 0 else 0.4, p=-0.2)
    # A tune over it, from the fourth bar, rising and falling in four-bar arches
    tune = melody(prog, 4, phrase_rhythm(3, 14, 4, [[(0, 1), (1, 0.5), (1.5, 0.5), (2, 2)], [(0, 1), (1, 1), (2, 1), (3, 1)]]),
                  lambda b: 74 + 6 * np.sin(np.pi * ((b / 4 - 3) % 4) / 4) + 2 * (b > 40), lo=66, hi=86)
    for b, m, d in tune:
        t = c.at(0, b)
        if t < TEAR - 0.2:
            harpsichord(t, m, 0.6, p=0.1)
    pads_for(c, bars, gain=0.035, lo=57, n=4, cutoff=1400, until=TEAR, attack=2.0)
    # The present: the same harmony, opened up
    now(Clock(TEAR, 112, 4), ["D", "A/C#", "Bm", "G", "D/F#", "G", "Em7", "A"], keys="piano", pulse=True)


def addams():
    """A parlour waltz in F, 108: piano and a plucked guitar, a cello singing;
    then strings, and a lift into D for the close."""
    c = Clock(0.0, 108, 3)
    prog = ["F", "C/E", "Dm", "Am/C", "Bb", "F/A", "Gm7", "C7",
            "F", "Bb/D", "C/E", "F", "Dm", "Bb", "Gm7", "C",
            "F", "C7"]
    bars = bars_of(prog)
    for bar, sym, span in bars:  # oom-pah-pah: the bass, then the chord twice
        t = c.at(bar)
        if t >= TEAR - 0.02:
            break
        bass, tones = voice(sym, 57, 3)
        piano(t, bass, 0.45, length=2.5, p=-0.2)
        for k in (1, 2):
            for m in tones:
                piano(c.at(bar, k), m, 0.24, length=1.2, p=0.15)
    arpeggio(c, bars, lambda t, m, v, i: guitar(t, m, v, p=0.35), [0, 1, 2, 3, 2, 1], 2, lo=62, n=4, vel=0.4, until=TEAR - 0.02, skip=(0, 1))
    tune = melody(prog, 3, phrase_rhythm(2, 18, 3, [[(0, 2), (2, 1)], [(0, 3)], [(0, 1), (1, 1), (2, 1)], [(0, 3)]]),
                  lambda b: 70 + 5 * np.sin(np.pi * ((b / 3 - 2) % 8) / 8) + 2 * (b > 30), lo=62, hi=80)
    lead(c.t0, [(b, m - 12, d) for b, m, d in tune if c.at(0, b) < TEAR - 1.0], c.beat, gain=0.05, cutoff=1900, vibrato=0.006)
    pads_for(c, bars, gain=0.03, lo=53, n=4, cutoff=1200, until=TEAR, attack=2.5)
    now(Clock(TEAR, 108, 3), ["F", "C/E", "Dm", "Bb", "F/A", "Bb", "Gm7", "C", "F", "Bb", "Gm", "A7"], keys="guitar", pulse=False)


def nightingale():
    """E minor, 64: low strings and a music box, the wards at night; the Fund
    and the school turn it to E major; the present, warmer still."""
    c = Clock(0.0, 64, 4)
    prog = ["Em", "C", "Am", "B7", "Em", "Am", "C", "B",
            "E", "B/D#", "C#m", "A"]
    bars = bars_of(prog)
    for bar, sym, span in bars:
        t0, t1 = c.at(bar), c.at(bar + span)
        if t0 >= TEAR:
            break
        bass, tones = voice(sym, 52, 4)
        pad(t0, min(t1, TEAR), [bass - 12, bass] + tones, gain=0.07, cutoff=1100 if bar < 8 else 1600, attack=1.6, release=1.6)
    # The music box turns the chord over, a note to a beat
    arpeggio(c, bars, lambda t, m, v, i: musicbox(t, m, 0.05 + 0.015 * (i % 4 == 0), p=0.3 * np.sin(i)) if t < TEAR - 0.05 else None,
             [0, 1, 2, 1], 1, lo=71, n=3, vel=1)
    hymn = melody(prog, 4, phrase_rhythm(1, 12, 4, [[(0, 4)], [(0, 2), (2, 2)]]),
                  lambda b: 66 + 4 * np.sin(np.pi * ((b / 4 - 1) % 4) / 4) + 3 * (b >= 32), lo=59, hi=76)
    lead(c.t0, [(b, m - 12, d) for b, m, d in hymn if c.at(0, b) < TEAR - 1.0], c.beat, gain=0.055, cutoff=1700, vibrato=0.006)
    boom(c.at(8), gain=0.16, f1=70, f2=34, length=4)  # the Fund: E major
    for m in (64, 68, 71, 76):
        bell(c.at(8) + 0.02, m + 12, gain=0.035, length=4)
    now(Clock(TEAR, 72, 4), ["E", "B/D#", "C#m", "A", "E/B", "A", "F#m7", "A"], keys="piano", pulse=False)


def schweitzer():
    """D minor, a chorale on the organ in four voices; a Picardy third; then
    the organ under strings, in D major."""
    c = Clock(2.0, 60, 4)
    organ(0.2, 1.75, [38, 50, 57, 62], gain=0.06, chiff=0.8)  # the organ breathes in
    # Soprano, alto, tenor, bass, in quarter notes: a chorale of eight phrases' worth
    chorale = [
        # bar 0
        ([74, 72, 74, 76], [69, 69, 70, 69], [65, 64, 62, 61], [50, 45, 46, 45]),
        ([77, 76, 74, 73], [69, 67, 65, 64], [62, 60, 62, 61], [50, 48, 46, 45]),
        ([74, 76, 77, 79], [65, 67, 69, 70], [62, 64, 65, 62], [46, 48, 50, 46]),
        ([77, 76, 77, 77], [69, 67, 65, 65], [60, 60, 60, 57], [45, 48, 41, 41]),
        ([81, 79, 77, 76], [72, 70, 69, 67], [65, 62, 60, 61], [41, 43, 45, 45]),
        ([77, 79, 76, 74], [69, 67, 67, 65], [62, 62, 61, 62], [50, 46, 45, 50]),
        ([74, 73, 74, 74], [65, 64, 66, 66], [58, 57, 57, 57], [43, 45, 38, 38]),
    ]
    holds = {3: 3, 6: 2}  # fermatas: the last beat of these bars held long
    for b, voices in enumerate(chorale):
        for k in range(4):
            t = c.at(b, k)
            if t >= TEAR - 0.05:
                break
            notes = [v[k] for v in voices]
            last = k == 3 and b in holds
            d = c.beat * (holds.get(b, 1) if last else 1) * 0.96
            if b == 6 and k >= 2:  # the Picardy third: D major
                notes = [74, 66, 57, 38]
            if b == 6 and k == 3:
                continue
            organ(t, d if not (b == 6 and k == 2) else c.beat * 3.6, notes, gain=0.07, p=0.0)
    now(Clock(TEAR, 72, 4), ["D", "A/C#", "Bm", "G", "D/F#", "Em7", "G", "A"], keys="organ", pulse=False)


def now(c, prog, keys="piano", pulse=False):
    """The present: the reel's harmony under strings, its own keyboard broken
    in eighths, and (for some) a pulse; it comes to rest on A, the door to D,
    for the close."""
    bars = bars_of(prog)
    end = H0 - 0.05
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    if keys == "piano":
        arpeggio(c, bars, lambda t, m, v, i: piano(t, m, v, length=2.2, send=0.35, p=0.3 * np.sin(i * 0.9)), pattern, 2, lo=60, n=4, vel=0.36, until=end)
    elif keys == "guitar":
        arpeggio(c, bars, lambda t, m, v, i: (guitar(t, m, v, p=0.35), piano(t, m + 12, v * 0.35, length=1.5, p=-0.3)), [0, 1, 2, 3, 2, 1], 2, lo=60, n=4, vel=0.42, until=end)
    elif keys == "organ":
        for bar, sym, span in bars:
            t0 = c.at(bar)
            if t0 >= end:
                break
            bass, tones = voice(sym, 57, 4)
            organ(t0, min(c.at(bar + span), end) - t0, [bass] + tones, gain=0.045, stops=(1, 0.3, 0.1, 0.12, 0, 0), chiff=0.15)
        arpeggio(c, bars, lambda t, m, v, i: piano(t, m + 12, v, length=2.0, send=0.4, p=0.3 * np.sin(i)), [0, 2, 1, 3], 1, lo=60, n=4, vel=0.3, until=end)
    pads_for(c, bars, gain=0.075, lo=55, n=5, cutoff=2400, until=end, attack=1.2)
    for bar, sym, span in bars:
        t = c.at(bar)
        if t >= end:
            break
        bass, _ = voice(sym, 50, 3)
        piano(t, bass, 0.35, length=3.5, send=0.4)
        if pulse:
            for k in range(c.per):
                tk = c.at(bar, k)
                if tk < end and bar >= 2:
                    kick(tk, 0.12 if k % 2 == 0 else 0.07)
                    shaker(tk + c.beat / 2, 0.02, 0.4)
    boom(TEAR + 0.12, gain=0.2, f1=80, f2=34, length=4)
    cymbal(TEAR + 0.1, gain=0.035, length=3)
    # Held on the dominant of D into the close
    pad(end - 1.8, H0 + 1.2, [45, 57, 64, 69, 73, 76], gain=0.07, cutoff=2600, attack=1.2, release=0.8)


def close():
    """The launch film's ending: home to D as the cosmos opens, a question, an
    answer, a flurry through the wordmark's faces, a chime as each letter lands."""
    riser(H0 + 0.1, E["reveal"][0] + 0.15, gain=0.05)
    R = E["reveal"][0] + 0.15
    boom(R, gain=0.3, f1=80, f2=32, length=5, send=0.5)
    D_hi = [26, 38, 50, 57, 62, 66, 69, 74, 78, 81]
    pad(R, E["wordmark"], [38, 50, 57, 62, 66, 69, 74], gain=0.07, cutoff=3000, attack=0.08, release=1.5)
    for m, p in ((86, -0.4), (90, 0.4), (93, 0.0)):
        bell(R, m, gain=0.06, length=5, p=p)
    for i, m in enumerate((62, 66, 69, 74, 69, 66)):
        piano(E["ask"] + i * 0.42, m + 12, 0.3, length=3, send=0.5, p=0.3 * np.sin(i))
    A = E["answer"]
    boom(A, gain=0.2, f1=85, f2=36, length=4)
    pad(A, E["wordmark"], [43, 55, 62, 67, 71, 74], gain=0.055, cutoff=2600, attack=0.4, release=1.2)
    for m in (74, 78, 81, 86):
        bell(A, m, gain=0.045, length=5)
    M0 = E["wordmark"]
    boom(M0, gain=0.32, f1=80, f2=30, length=6, send=0.55)
    pad(M0, DUR - 1.2, D_hi + [86], gain=0.08, cutoff=3400, attack=0.04, release=1.5)
    for m, p in ((74, -0.3), (78, 0.3), (81, -0.1), (86, 0.1)):
        bell(M0, m, gain=0.06, length=6, p=p)
    c0, c1 = E["cycle"]
    t = c0
    PENT = [86, 88, 90, 93, 95, 98, 100]
    while t < c1:
        u = (t - c0) / (c1 - c0)
        bell(t, PENT[int(rng.integers(len(PENT)))], gain=0.022, length=1.6, p=float(rng.uniform(-0.8, 0.8)))
        if rng.random() < 0.35:  # a scrap under some of them
            paper_slap(t, 8000, 0.02, float(rng.uniform(-0.6, 0.6)))
        t += 1 / (3 + 9 * np.sin(np.pi * u))
    s0 = E["settle"][0]
    for j, m in enumerate((74, 76, 78, 79, 81, 83, 86)):
        bell(s0 + j * 0.14, m, gain=0.07, length=4, p=-0.6 + j * 0.2)
    piano(s0 + 7 * 0.14, 62, vel=0.3, length=6, send=0.6)
    piano(s0 + 7 * 0.14, 74, vel=0.32, length=6, send=0.6)
    bell(E["cta"], 86, gain=0.08, length=4)
    bell(E["cta"] + 0.01, 93, gain=0.04, length=4)


{"franklin": franklin, "addams": addams, "nightingale": nightingale, "schweitzer": schweitzer}[ID]()
foley()
close()

# ── Reverb, master ───────────────────────────────────────────────────────────
room = {"schweitzer": 1.25, "nightingale": 0.95}.get(ID, 0.75)  # a church for the organ
ir_len = int(4.5 * SR)
tt = np.arange(ir_len) / SR
ir = rng.standard_normal((2, ir_len)) * np.exp(-tt / room)[None]
ir = np.stack([lowpass(ir[0], 5200), lowpass(ir[1], 5200)])
ir[:, : int(0.02 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
verb = np.stack([fftconvolve(wet[0], ir[0])[:N], fftconvolve(wet[1], ir[1])[:N]])
mix = dry + verb * 0.9
mix = np.stack([highpass(mix[0], 28), highpass(mix[1], 28)])
mix = mix[:, : int(DUR * SR)]
fade = int(1.6 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
mix[:, : int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
mix /= np.abs(mix).max() / 0.89
mix = np.tanh(mix * 1.1) / np.tanh(1.1)

pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").T.copy()
out = os.path.join(HERE, f"score-{ID}.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, f"{mix.shape[1] / SR:.2f}s")

"""narrate.py — the essay's narration, read by a designed neural voice
(VoxCPM2 through VoiceStudio, a British documentary narrator), one line at a
time, and the timing of every word.

  python3 narrate.py speak <cache-dir>     # each line through VoiceStudio
  python3 narrate.py build <cache-dir>     # lay the lines end to end, time them

`speak` needs VoiceStudio's backend running with the VoxCPM2 engine
(OMNIVOICE_TTS_BACKEND=voxcpm2) and a clone profile named in script.json
("voice"), made from the chosen audition clip. Lines already in the cache are
skipped, so an interrupted run picks up where it stopped. The profile gives
the voice its sound; "style" in script.json directs its delivery (with a
control, VoxCPM2 clones the timbre without copying the clip's intonation). Years are read as
years: the voice gets "seventeen thirty-one" where the captions keep "1731".

`build` writes assets/narration.wav (48 kHz mono) and timing.json (each line's start
and end, in seconds, and every word's time, transcribed from the voice itself
by faster-whisper), which the picture and the score are both cut to.
"""
import difflib
import json
import os
import re
import subprocess
import sys
import urllib.request

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = json.load(open(os.path.join(HERE, "script.json")))
API = os.environ.get("VOICESTUDIO", "http://127.0.0.1:3900")
LEAD_IN = 1.2          # the picture opens before the voice
PAUSE = 0.32           # between lines in a section
SECTION_PAUSE = 0.75   # where the section changes (the id's prefix)

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen " \
       "fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def two(n):
    if n < 20:
        return ONES[n]
    return TENS[n // 10] + ("-" + ONES[n % 10] if n % 10 else "")


def year(m):
    hi, lo = int(m.group(1)), int(m.group(2))
    return two(hi) + " " + ("hundred" if lo == 0 else ("oh " + ONES[lo] if lo < 10 else two(lo)))


def spoken(text):
    """The line as the voice should read it."""
    text = re.sub(r"\b(1[0-9])(\d\d)\b", year, text)
    return re.sub(r"\bDr\b\.?", "Doctor", text)


def norm(w):
    return re.sub(r"[^\w]", "", w.lower())


def speak(cache):
    os.makedirs(cache, exist_ok=True)
    for line in SCRIPT["lines"]:
        path = os.path.join(cache, line["id"] + ".wav")
        if os.path.exists(path):
            continue
        # a line may carry its own direction (a slower, weightier beat)
        style = line.get("style", SCRIPT.get("style"))
        body = json.dumps({"model": "tts-1", "voice": SCRIPT["voice"], "input": f"({style}){spoken(line['text'])}" if style else spoken(line["text"]),
                           "seed": line.get("seed", SCRIPT.get("seed", 11)), "response_format": "wav"}).encode()
        req = urllib.request.Request(API + "/v1/audio/speech", body, {"Content-Type": "application/json"})
        audio = urllib.request.urlopen(req, timeout=3600).read()
        open(path + ".part", "wb").write(audio)
        os.replace(path + ".part", path)
        print("spoke", line["id"], flush=True)


def build(cache):
    from faster_whisper import WhisperModel
    whisper = WhisperModel("small.en", device="cpu", compute_type="int8")
    tempo = SCRIPT.get("tempo", 1.0)
    sr = 48000
    out, t, timing, prev = [np.zeros(int(LEAD_IN * sr))], LEAD_IN, [], None
    for line in SCRIPT["lines"]:
        section = re.match(r"[a-z]+", line["id"]).group(0)
        if prev is not None:
            gap = SECTION_PAUSE if section != prev else PAUSE
            out.append(np.zeros(int(gap * sr)))
            t += gap
        # Quicken without changing pitch, and level the voice
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(cache, line["id"] + ".wav"),
                              "-af", f"atempo={line.get('tempo', tempo)},highpass=f=80", "-ac", "1", "-ar", str(sr),
                              "-f", "f32le", "-"], capture_output=True, check=True).stdout
        audio = np.frombuffer(raw, np.float32)
        # Trim the silence the voice leaves at either end
        loud = np.where(np.abs(audio) > 0.012)[0]
        audio = audio[max(0, loud[0] - 480): loud[-1] + 4800]
        dur = len(audio) / sr
        # Each word's time, from the voice: whisper's words matched to the caption's
        segs, _ = whisper.transcribe(audio[::3].copy(), word_timestamps=True, language="en")
        heard = [w for s in segs for w in s.words]
        # The voice can trail off into noise after its last word: end the line there
        if heard and heard[-1].end + 0.4 < dur:
            audio = audio[: int((heard[-1].end + 0.4) * sr)]
            dur = len(audio) / sr
        words = line["text"].split()
        a = [norm(w) for w in words]
        b = [norm(spoken(w.word.strip())) for w in heard]
        times = [None] * len(words)
        for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
            for k in range(blk.size):
                h = heard[blk.b + k]
                times[blk.a + k] = (h.start, h.end)
        # Words whisper heard differently take the time between their neighbours
        for i in range(len(words)):
            if times[i] is None:
                lo = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
                hi = next((times[j][0] for j in range(i + 1, len(words)) if times[j]), dur)
                run = [j for j in range(i, len(words)) if times[j] is None]
                n = next((k for k, j in enumerate(run) if j != i + k), len(run))
                step = (hi - lo) / n
                for k in range(n):
                    times[i + k] = (lo + k * step, lo + (k + 1) * step)
        timing.append({"id": line["id"], "text": line["text"], "t0": round(t, 3), "t1": round(t + dur, 3),
                       "words": [[w, round(t + s, 3), round(t + e, 3)] for w, (s, e) in zip(words, times)]})
        out.append(audio)
        t += dur
        prev = section
        print(f'{line["id"]:6} {timing[-1]["t0"]:6.2f} – {timing[-1]["t1"]:6.2f}  {line["text"][:60]}')
    wav = np.concatenate(out)
    wav *= 0.89 / np.abs(wav).max()
    sf.write(os.path.join(HERE, "assets", "narration.wav"), wav, sr)
    json.dump({"duration": round(t, 3), "lines": timing}, open(os.path.join(HERE, "timing.json"), "w"), indent=1)
    print("narration", round(t, 2), "s")


if __name__ == "__main__":
    {"speak": speak, "build": build}[sys.argv[1]](sys.argv[2])

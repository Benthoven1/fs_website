"""narrate.py — the essay's narration, read by a neural voice (Kokoro, British
English), one line at a time, and the timing of every line.

  python3 brand/franklin/narrate.py <kokoro-v1.0.onnx> <voices-v1.0.bin>

writes narration.wav (24 kHz mono, the lines laid end to end with the pauses
below) and timing.json (each line's start and end, in seconds, and its
words' estimated times), which the picture and the score are both cut to.
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = json.load(open(os.path.join(HERE, "script.json")))
LEAD_IN = 1.2          # the picture opens before the voice
PAUSE = 0.3            # between lines in a section
SECTION_PAUSE = 0.7    # where the section changes (the id's prefix)

kokoro = Kokoro(sys.argv[1], sys.argv[2])
sr = 24000
out, t, timing, prev = [np.zeros(int(LEAD_IN * sr))], LEAD_IN, [], None
for line in SCRIPT["lines"]:
    section = re.match(r"[a-z]+", line["id"]).group(0)
    if prev is not None:
        gap = SECTION_PAUSE if section != prev else PAUSE
        out.append(np.zeros(int(gap * sr)))
        t += gap
    audio, sr = kokoro.create(line["text"], voice=SCRIPT["voice"], speed=SCRIPT["speed"], lang="en-gb")
    # Trim the silence the voice leaves at either end
    loud = np.where(np.abs(audio) > 0.01)[0]
    audio = audio[max(0, loud[0] - 240): loud[-1] + 2400]
    dur = len(audio) / sr
    # Each word's time, estimated from its share of the line's letters
    words = line["text"].split()
    weights = np.array([len(re.sub(r"[^\w£]", "", w)) + 1.6 for w in words], float)
    edges = np.concatenate([[0], np.cumsum(weights) / weights.sum()]) * dur * 0.97
    timing.append({"id": line["id"], "text": line["text"], "t0": round(t, 3), "t1": round(t + dur, 3),
                   "words": [[w, round(t + a, 3), round(t + b, 3)] for w, a, b in zip(words, edges[:-1], edges[1:])]})
    out.append(audio)
    t += dur
    prev = section
    print(f'{line["id"]:6} {timing[-1]["t0"]:6.2f} – {timing[-1]["t1"]:6.2f}  {line["text"][:60]}')
wav = np.concatenate(out)
sf.write(os.path.join(HERE, "narration.wav"), wav, sr)
json.dump({"duration": round(t, 3), "lines": timing}, open(os.path.join(HERE, "timing.json"), "w"), indent=1)
print("narration", round(t, 2), "s")

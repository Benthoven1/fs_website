# Benjamin Franklin, institution builder

A narrated video essay for phones (1080 × 1920, about two minutes): Franklin
helped start Philadelphia's lending library (1731), its first fire company
(1736), its hospital, on one of America's first matching grants (1751), and
the academy that became the University of Pennsylvania; each built from
scratch. What a fiscal sponsor would do for him today, and Mulvium's close.

In flat, colourful motion graphics, with archival plates (`CREDITS.md`); its
narration is a neural voice (Kokoro, British English, `bf_emma`).

- `script.json` — the narration, line by line.
- `narrate.py` — reads it aloud and writes `narration.wav` and
  `timing.json` (each line's and each word's time), which everything is cut to.
- `index.html`, `essay.css`, `essay.js` — the essay as a page; `essay.seek(t)`
  draws any frame, and opened over HTTP it plays itself with its soundtrack.
- `cues.js` — reads the sounds the picture makes from the page into
  `cues.json`; `soundtrack.py` writes the score to them, ducks it under the
  voice and mixes `soundtrack.wav` (`soundtrack.m4a`, its AAC encoding, is
  what the page plays).

To make it again, from the repository root:

```
pip install kokoro-onnx soundfile      # and the model: kokoro-v1.0.onnx, voices-v1.0.bin
python3 brand/franklin/narrate.py kokoro-v1.0.onnx voices-v1.0.bin
python3 -m http.server 8765 &
node brand/franklin/cues.js
python3 brand/franklin/soundtrack.py
ffmpeg -i brand/franklin/soundtrack.wav -c:a aac -b:a 192k brand/franklin/soundtrack.m4a
node brand/film/render.js brand/mulvium-franklin-essay-1080x1920.mp4 4 --page=brand/franklin/index.html --score=brand/franklin/soundtrack.wav
```

A changed line in `script.json` moves everything after it: narrate, then
cue, score and render again.

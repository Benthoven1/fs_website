# Benjamin Franklin, institution builder

A narrated video essay for phones (1080 × 1920, about two and a half
minutes). Franklin, printer, writer, scientist, inventor and Founding Father,
helped start Philadelphia's Library Company (1731, out of his Junto; still
open, America's oldest cultural institution), its first fire company (1736),
its hospital, on one of America's first matching grants (1751), and the
academy that became the University of Pennsylvania; each built from scratch.
What a fiscal sponsor would do for him today, and Mulvium's close.

It is a [HyperFrames](https://github.com/heygen-com/hyperframes) project:
HTML and GSAP, rendered frame by frame to MP4. Isometric designs drawn
with the [Anatomy](https://github.com/wheresryan22/anatomy) kit are built in 3D
(three.js, `assets/lib/world.js`) under the whole film: Franklin's four
institutions, put together part by part as the narration reaches them, then
one foundation shared. The real
paintings, engravings and documents of his city come up over it on cards
(`CREDITS.md`). `SPEC.md` is the director's brief;
`REVIEW.md` is the last review of the film against it.

- `script.json` — the narration, line by line, and the voice that reads it.
- `narrate.py` — reads each line through [VoiceStudio](https://github.com/debpalash/voicestudio)
  (VoxCPM2, Apache-2.0, a designed voice saved as a profile), years read as
  years ("seventeen thirty-one"); then lays the lines end to end in
  `assets/narration.wav` and transcribes every word's time into `timing.json`.
- `denoise.py` — clears the hiss the designed voice carries (DeepFilterNet3,
  at most 28 dB of reduction, so soft consonants survive).
- `figures/*.mjs` — the designs, drawn with the Anatomy kit: `node
  figures/fire.mjs` (and `academy`) writes `assets/fig/<name>.svg` and its
  parts list, `<name>.parts.json`, which the 3D world builds part for part.
- `assets/lib/world.js` — the designs in 3D on a plain backdrop, and a frame
  for any time t; `build.mjs` writes its schedule (builds, moves, camera,
  labels, backdrop tints).
- `prep.py` — readies the archival pictures in `assets/img/` (no grade, no
  filter) and records their sizes.
- `build.mjs` — writes the film: `index.html` (scene hosts, captions, voice,
  music, sound) and one composition per section in `compositions/`, every
  move timed to the word that names it in `timing.json`. Where a scene sets
  a line in type, that line has no subtitle (`CAPTION_FROM`), so no words
  are ever on screen twice.
- `mix.py` — the music bed: Bach's Prelude in C major (Kimiko Ishizaka, CC0),
  ducked under the voice.
- `assets/cosmos-close.mp4` — the launch film's own close (cosmos and
  wordmark), rendered clean from `brand/film` and set under the last lines.

To make it again, from this folder:

```
# the voice: VoiceStudio's backend with the VoxCPM2 engine on :3900, and a
# clone profile named in script.json ("voice")
python3 narrate.py speak <cache-dir>
python3 denoise.py <dfn3-weights> <cache-dir> <clean-dir>
python3 narrate.py build <clean-dir>          # needs faster-whisper
python3 prep.py <download-dir>                # the pictures, as named in CREDITS.md
node build.mjs
python3 mix.py <prelude.ogg>
npx hyperframes check && npx hyperframes snapshot --review
npx hyperframes render --output ../mulvium-franklin-essay-1080x1920.mp4
```

The close plate, from the repository root (`python3 -m http.server 8765` running):

```
node brand/film/render.js plate.mp4 1 64.6 86 "--page=brand/film/index.html?clean&format=reel"
```

A changed line in `script.json` moves everything after it: speak that line
again (delete its file from the cache), then build the narration, the film
and the mix again. Hand edits to `index.html` or `compositions/` are
overwritten by `build.mjs`; make them there.

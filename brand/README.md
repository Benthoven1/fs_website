# Brand images

Mulvium's launch film, and images of Mulvium's central sphere and the landing page's hero, for profile
icons, posts and banners. They are rendered from the site itself, not drawn:
the sphere with the landing page's own material, lights and camera angle
(`js/main.js`), and the hero captured from the live page after its entrance.

**The sphere**

| File | Size | Use |
|---|---|---|
| `mulvium-sphere-1024.png` | 1024 × 1024 | Profile icon: the sphere on paper, with margin for circular crops |
| `mulvium-sphere-400.png` | 400 × 400 | The same, at the size most profiles display |
| `mulvium-sphere-transparent-1024.png` | 1024 × 1024 | The sphere alone, on transparency |

**The hero, in three sets.** Every set comes at the same five sizes:

| Set | Text |
|---|---|
| `mulvium-hero-<size>.png` | The wordmark, the statement and the mission, as on the page |
| `mulvium-wordmark-<size>.png` | The MULVIUM wordmark only |
| `mulvium-cosmos-<size>.png` | No text at all |

| Size | Use |
|---|---|
| 1920x1080 | Wide posts, video thumbnails |
| 1080x1080 | Square posts; the cosmos square also works as an avatar |
| 1200x630 | Link previews |
| 1500x500 | X header |
| 1584x396 | LinkedIn banner (the profile photo covers its lower-left corner) |

Every hero image also has an `@2x` copy at twice the size. The planets sit in
slightly different places from set to set, because each is captured from the
page as it orbits.

## Making them again

- **The sphere:** serve `brand/render/` over HTTP and open `sphere.html`
  (`?bg=paper|none`, `&fill=` the share of the frame it fills, `&size=` in
  pixels); save the canvas. The files here use `bg=paper&fill=0.62` and
  `bg=none&fill=0.92`, at 1024.
- **The hero:** follow the steps at the top of `render/capture-hero.js` (a third
  argument such as `mulvium-wordmark` makes one set only), then
  scale each `@2x` capture to half size (Lanczos) for the exact sizes above.

## The launch film

Two cuts of one film, eighty-eight seconds at 30 fps, with its score:
`mulvium-launch-film-1920x1080.mp4` for wide screens and
`mulvium-launch-film-1080x1920.mp4` for phones (Instagram Reels and the like,
its words kept clear of the app's own buttons and captions), previewed from
`thumbs/`. It is the company and its vision, not any one product, told with
the site's own pieces: the landing page's cosmos and night sky (`js/main.js`),
MulviumSOS's sphere of words (`js/fsos.js`, drawn from `js/fsos-words.js` and
`js/fsos-cloud.js`), the Fiscal Sponsorship page's bowl (`js/bowl.js`), the
hero's rising words, and lines from the site and the founder's letter.

| Act | Seconds | |
|---|---|---|
| I | 0–15 | Millions of ideas, as stars met in flight and passed |
| II | 15–27 | The organization you have to build: MulviumSOS's sphere of work inks in ahead, six stamps light its jobs in gold, and it fills the night |
| III | 27–50 | One light: the rings gather, night turns to paper, and the cosmos takes its shape, with four lines of the founder's letter set around it |
| IV | 50–69 | Into the blue planet, which opens as the Fiscal Sponsorship bowl and takes in four projects; then the four spheres named: you, patrons, Mulvium, neighbors. It exists |
| V | 69–88 | The expansion: every idea lit, a road from each to the star, then the landing page |

`film/` holds its source:

- `index.html`, `film.css`, `film.js` — the film as a page. Every frame is a
  function of time alone: `film.seek(t)` draws the frame at `t` seconds.
  Opened over HTTP (`brand/film/`), it plays itself with its score; `?t=60`
  starts it a minute in, and `?format=reel` draws the phone cut.
- `cues.json` — the cue sheet the picture and the score share: when each
  idea lights, each stamp lands, the bloom, each line of the letter, each
  project settling in the bowl, each sphere named.
- `score.py` — the score, synthesised in numpy and scipy from the cue sheet
  (D major, 80 bpm): it writes `score.wav`, which is kept out of the
  repository; `score.m4a` is its AAC encoding, which the page plays.
- `render.js` — renders an MP4 frame by frame with Playwright and ffmpeg,
  in parallel parts.

To make them again, from the repository root:

```
python3 -m http.server 8765 &
python3 brand/film/score.py
ffmpeg -i brand/film/score.wav -c:a aac -b:a 192k brand/film/score.m4a
node brand/film/render.js brand/mulvium-launch-film-1920x1080.mp4 3
node brand/film/render.js brand/mulvium-launch-film-1080x1920.mp4 3 --reel
ffmpeg -ss 87.5 -i brand/mulvium-launch-film-1920x1080.mp4 -frames:v 1 -vf scale=1280:-1 brand/thumbs/mulvium-launch-film-1920x1080.jpg
ffmpeg -ss 87.5 -i brand/mulvium-launch-film-1080x1920.mp4 -frames:v 1 -vf scale=720:-1 brand/thumbs/mulvium-launch-film-1080x1920.jpg
```

Each render takes about half an hour with three parts on a machine without a
GPU. A picture replaced in the site's root (`Musical.webp` and the others), or
a word changed in MulviumSOS's vocabulary, appears in the film the next time
it is rendered.

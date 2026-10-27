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

`mulvium-launch-film-1920x1080.mp4`: ninety-two seconds at 30 fps, with its
score, previewed from `thumbs/mulvium-launch-film-1920x1080.jpg`. It is the
company and its vision, not any one product, told with the site's own pieces:
the landing page's cosmos and night sky (`js/main.js`), the loading screen's
photographs (`js/ls.js`), the hero's rising words, and lines from the site and
the founder's letter.

| Act | Seconds | |
|---|---|---|
| I | 0–15 | Millions of ideas, as stars met in flight |
| II | 15–27 | The organization in their way: six jobs land on them, and they go out |
| III | 27–42 | One light: the rings gather, night turns to paper, and the cosmos takes its shape |
| IV | 42–60 | The four photographs and their values; many roads, one meeting place |
| V | 60–73 | You, patrons and Mulvium: it exists |
| VI | 73–92 | The expansion: every idea lit, a road from each to the star, then the landing page |

`film/` holds its source:

- `index.html`, `film.css`, `film.js` — the film as a page. Every frame is a
  function of time alone: `film.seek(t)` draws the frame at `t` seconds.
  Opened over HTTP (`brand/film/`), it plays itself with its score; `?t=60`
  starts it at a minute in.
- `cues.json` — the cue sheet the picture and the score share: when each
  idea lights, each job lands, the bloom, each photograph, each tag.
- `score.py` — the score, synthesised in numpy and scipy from the cue sheet
  (D major, 80 bpm): it writes `score.wav`, which is kept out of the
  repository; `score.m4a` is its AAC encoding, which the page plays.
- `render.js` — renders the MP4 frame by frame with Playwright and ffmpeg,
  in parallel parts.

To make it again, from the repository root:

```
python3 -m http.server 8765 &
python3 brand/film/score.py
ffmpeg -i brand/film/score.wav -c:a aac -b:a 192k brand/film/score.m4a
node brand/film/render.js brand/mulvium-launch-film-1920x1080.mp4 3
ffmpeg -ss 91.5 -i brand/mulvium-launch-film-1920x1080.mp4 -frames:v 1 -vf scale=1280:-1 brand/thumbs/mulvium-launch-film-1920x1080.jpg
```

The render takes about half an hour with three parts on a machine without a
GPU. A photograph replaced in the site's root (`Musical.webp` and the others)
appears in the film the next time it is rendered.

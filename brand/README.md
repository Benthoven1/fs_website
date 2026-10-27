# Brand images

Mulvium's launch film and polymath reels, and images of Mulvium's central
sphere and the landing page's hero, for profile icons, posts and banners.
They are rendered from the site itself, not drawn: the sphere with the
landing page's own material, lights and camera angle (`js/main.js`), and the
hero captured from the live page after its entrance.

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
Contact Us page's network (`js/contact-mesh.js`), the navbar's many-faced
wordmark, the hero's rising words, and lines from the site and the founder's
letter.

| Act | Seconds | |
|---|---|---|
| I | 0–15 | Millions of ideas, as stars met in flight and passed |
| II | 15–27 | The organization you have to build: MulviumSOS's sphere of work inks in ahead, six stamps light its jobs in gold, and it fills the night |
| III | 27–52 | One light: the rings gather, night turns to paper, and the cosmos takes its shape, framed by "At Mulvium, we change the norm and we build the organization beneath you". Each sphere glides into a quadrant of its own to be named (you, patrons, Mulvium, neighbors). It exists |
| IV | 52–65 | Into the blue planet, which opens as the Fiscal Sponsorship bowl and takes in four projects, with four lines of the founder's letter set around it |
| V | 65–78 | The next great expansion: the Contact Us network spreads out, its vertices named for ideas, and a ripple crosses it on "institutions" |
| VI | 78–88 | The network gathers to a point, and the wordmark opens from it in the navbar's faces, turns through thirty more, and lands in its own, above "Join the waitlist" |

`film/` holds its source:

- `index.html`, `film.css`, `film.js` — the film as a page. Every frame is a
  function of time alone: `film.seek(t)` draws the frame at `t` seconds.
  Opened over HTTP (`brand/film/`), it plays itself with its score; `?t=60`
  starts it a minute in, and `?format=reel` draws the phone cut.
- `cues.json` — the cue sheet the picture and the score share: when each
  idea lights, each stamp lands, the bloom, each sphere named, each project
  settling in the bowl, each line of the letter, each ripple through the
  network, each letter of the wordmark landing.
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

## The Polymath Founder

Four reels for phones (1080 × 1920, a minute each at 30 fps, each with a score
of its own), on the founders Mulvium is for: polymaths who built institutions
across public life, and what fiscal sponsorship could do for each of them
today.

| No. | File | Built | Score |
|---|---|---|---|
| 1 | `mulvium-polymath-01-franklin-1080x1920.mp4` | A subscription library (1731), a fire company (1736), a hospital on a matching grant (1751), the academy that became Penn | A harpsichord in D |
| 2 | `mulvium-polymath-02-addams-1080x1920.mp4` | Hull House (1889): a kindergarten, classes, a gallery, a music school; research behind Illinois's factory laws; the Nobel Peace Prize (1931) | A parlour waltz in F |
| 3 | `mulvium-polymath-03-nightingale-1080x1920.mp4` | Scutari (1854); the rose diagram (1858); the Nightingale Fund and the Nightingale Training School (1860) | A music box and a hymn, E minor to major |
| 4 | `mulvium-polymath-04-schweitzer-1080x1920.mp4` | Medicine at thirty; Lambaréné (1913), paid for with organ recitals; the Nobel Peace Prize (1952) | An organ chorale in D minor |

Each is a collage: archival pictures (public domain or CC0, from Wikimedia
Commons; `reels/CREDITS.md`) torn and taped to a board with cut paper, stamps,
handwriting and pencil, the dates cut letter by letter from many faces. A
camera crosses the board through four dated beats; at thirty seconds the past
is torn in two to show the present beneath, where the founder's four programs,
as four circles, gather on one fiscal sponsorship agreement and its work is
stamped. Then the scraps fly: the circles become the landing page's planets
and the founder's portrait its star, the hero's words ask "Who starts a
single-person institution? A polymath.", and the wordmark turns through its
faces, each cut on its own scrap, to its own, above "Join the waitlist".

`reels/` holds their source:

- `index.html`, `reels.css`, `reel.js` — the reels as a page (`?p=franklin`,
  `addams`, `nightingale`, `schweitzer`); as with the film, `reel.seek(t)`
  draws any frame, and opened over HTTP it plays itself with its score.
- `kit.js` and `stories/` — each reel's script, every scrap and caption with
  its place and moment, as data.
- `score.py` — the four scores (`python3 brand/reels/score.py franklin`
  writes `score-franklin.wav`), with the collage's own sounds read from the
  story (`dump.mjs`): each scrap set down, each stamp, tape, pencil and the
  tear. `score-*.m4a` are the AAC encodings the page plays.
- `prep.py`, `assets.json` — fetch each picture from Commons, crop it and
  print it (sepia, halftone, duotone or aged colour) into `assets/`, and write
  `CREDITS.md`.

To make them again, from the repository root:

```
python3 -m http.server 8765 &
python3 brand/reels/prep.py      # only if assets/ is missing a picture
python3 brand/reels/score.py franklin
ffmpeg -i brand/reels/score-franklin.wav -c:a aac -b:a 192k brand/reels/score-franklin.m4a
node brand/film/render.js brand/mulvium-polymath-01-franklin-1080x1920.mp4 4 --page=brand/reels/index.html?p=franklin --score=brand/reels/score-franklin.wav
ffmpeg -ss 3.6 -i brand/mulvium-polymath-01-franklin-1080x1920.mp4 -frames:v 1 -vf scale=720:-1 brand/thumbs/mulvium-polymath-01-franklin-1080x1920.jpg
```

and likewise for the other three.

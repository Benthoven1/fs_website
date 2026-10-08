# Brand images

Images of Mulvium's central sphere and the landing page's hero, for profile
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

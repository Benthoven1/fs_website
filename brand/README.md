# Brand images

Images of Mulvium's central sphere and the landing page's hero, for profile
icons, posts and banners. They are rendered from the site itself, not drawn:
the sphere with the landing page's own material, lights and camera angle
(`js/main.js`), and the hero captured from the live page after its entrance.

| File | Size | Use |
|---|---|---|
| `mulvium-sphere-1024.png` | 1024 × 1024 | Profile icon: the sphere on paper, with margin for circular crops |
| `mulvium-sphere-400.png` | 400 × 400 | The same, at the size most profiles display |
| `mulvium-sphere-transparent-1024.png` | 1024 × 1024 | The sphere alone, on transparency |
| `mulvium-cosmos-1080x1080.png` | 1080 × 1080 | Square posts or an alternative avatar: the solar system without text |
| `mulvium-hero-1920x1080.png` | 1920 × 1080 | Wide posts, video thumbnails |
| `mulvium-hero-1200x630.png` | 1200 × 630 | Link previews |
| `mulvium-hero-1500x500.png` | 1500 × 500 | X header |
| `mulvium-hero-1584x396.png` | 1584 × 396 | LinkedIn banner (the profile photo covers its lower-left corner) |
| `mulvium-hero-1080x1080.png` | 1080 × 1080 | Square, with the wordmark and statements |

Every hero and cosmos image also has an `@2x` copy at twice the size.

## Making them again

- **The sphere:** serve `brand/render/` over HTTP and open `sphere.html`
  (`?bg=paper|none`, `&fill=` the share of the frame it fills, `&size=` in
  pixels); save the canvas. The files here use `bg=paper&fill=0.62` and
  `bg=none&fill=0.92`, at 1024.
- **The hero:** follow the steps at the top of `render/capture-hero.js`, then
  scale each `@2x` capture to half size (Lanczos) for the exact sizes above.

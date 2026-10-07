# Mulvium

Landing site for Mulvium, the parent organization of four companies: Fiscal
Sponsorship (the nonprofit arm), MulviumSOS or M.SOS (the Mulvium Sponsorship
Operating System of the for-profit arm, with two tools: Atelier, which builds an
institution, and Grove, which handles its public relations), Oak, and a fourth to
be announced.

## Structure

- `index.html` — landing page. A 3D clay-colored solar system on paper: the star is
  Mulvium and each planet is one of its companies. The statement and the mission
  sit beside the cosmos on wide screens and above and below it on narrow ones.
  Hover a planet for its name; click one to open its company's page. Click the
  star to enter the overhead orbit view and night sky, then scroll to the
  founder's letter. On the landing, scrolling brings up the footer navigation;
  pinching (or ctrl/⌘ + wheel) zooms, within limits. `index.html#orbit`, the
  nav's Dear Leader link, opens straight onto the orbit view.
- `css/style.css` — the stylesheet every page shares; `css/fiscal.css`, `css/oak.css` and
  `css/about.css` hold rules only one page needs, and only that page loads them.
- `js/main.js` — Three.js module for the landing page: the cosmos and its framing
  per layout, the hero, the 2D night transition, and interactions.
- `js/fsos.js` — the MulviumSOS page (`pages/offerings/msos.html`; MulviumSOS was called
  FSOS, and its files and CSS classes keep the `fsos` prefix): the green planet dissolves
  into a sphere made only of words (the twenty agents of Atelier and Grove and the work they
  handle) as a porcelain figure grows beneath it; the
  sphere is its head. The page's text then scrolls up over the scene, as on the Oak page.
- `js/fsos-words.js` — the MulviumSOS vocabulary: each agent, its focus and its eight words.
- `js/fsos-cloud.js` — generated: where each word sits on the sphere, packed by the shape of
  its letters so the words fit together like puzzle pieces. After changing the vocabulary,
  open `tools/pack-fsos-cloud.html` over HTTP and save its output over this file.
- `js/bowl.js` — the Fiscal Sponsorship page's opening: the blue planet's upper half
  lifts away, revealing a bowl, and four project spheres settle into it, each painted
  with one of the loading screen's four pictures.
- `js/fiscal.js` — the Fiscal Sponsorship page's text motion: rising headings, a turning
  word, reveals, the steps' timeline, and the plain-terms rows that open.
- `js/oak.js` — the Oak page: the planet becomes an acorn among leaves, and
  scrolling pulls back to the whole oak on its esplanade.
- `pages/offerings/` — Fiscal Sponsorship (what a fiscal sponsor is, how it works, and
  four hypothetical projects), MulviumSOS (Atelier, Grove, and how the two run on one
  operating system; `css/msos.css` draws its stack diagram), and Oak.
  `fsos.html` forwards old links to `msos.html`. Each of the four projects is shown with one
  of the loading screen's pictures (`Musical.webp`, `Horticulture.webp`, `image-13.webp`,
  `Pictorial.webp`), the same files the loading screen uses: replace a file and both follow.
- `pages/about/` — People, Careers, Contact Us.
- `images/` — stills of each company's animation, shown in the Offerings menu.

## Images and speed

Pictures are WebP, sized no wider than they are ever shown (1920 px for the
loading screen's). To swap one, export a WebP at that size under the same name;
pages preload the four loading pictures, lazy-load anything below the fold, load
only the font weights they draw with, and use the minified Three.js build.

## Running locally

ES modules and an import map are used, so open over HTTP rather than `file://`:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Source material

Fiscal Sponsorship and MulviumSOS content is adapted from the FiscalSponsor design
documents (`docs/` in the FiscalSponsor repository, where MulviumSOS is still called
FSOS); Oak content from the Oak repository.

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
  founder's letter. On the landing the page doesn't scroll: swiping down (or
  "Join the waitlist" beside "Click a sphere" at its foot) slides the
  waitlist drawer up over the cosmos, which lifts away with it; the drawer
  scrolls on its own, ends with the site's footer, and slides away when swiped
  up at its top (or on Escape). Pinching (or ctrl/⌘ + wheel) zooms, within
  limits. `index.html#orbit`, the nav's Dear Leader link, opens straight onto
  the orbit view; `#letter` onto the founder's letter; `#waitlist`, every
  footer's "Join the waitlist", onto the drawer. A quiet arrow under the hint
  opens the drawer; one at the drawer's top closes it.
- The waitlist drawer (`#waitlist` in `index.html`; `css/waitlist.css`,
  `css/pitch.css`, `js/waitlist.js`, `js/pitch.js`; opened and closed by
  `js/main.js`, which also moves the site's footer into it for the 3D view and
  back under the letter for the orbit view) is the pitch. Phones get one
  column; from 960px the desktop has its own wider composition. It opens on
  the offer and its form: the headline's noun turns over (idea, festival,
  research, charity, initiative, passion, as on the fiscal sponsorship page)
  in a box as wide as the widest word, so no line ever reflows. Then short
  slides, each arriving as it scrolls into view: the problem (rows of
  institutions drifting past), everything between an idea and reality (a
  slice of the M.SOS word globe, drawn from `js/fsos-cloud.js` and turning
  slowly), the answer (you, patrons and Mulvium), how it works, what a
  founder receives, $0 upfront, and the vision under a night sky; then plain
  answers, and the close with the second form. "Why build an institution?"
  and three lines from the founder's letter float beside it as thought
  bubbles, each linking to the letter in its own words.
  `?for=festival|research|community|arts|education|film` fixes the headline's
  noun; `?v=b` shows the letter's line instead. An email joins only once
  it is confirmed: the page offers a fix for a mistyped domain, the back end
  refuses domains that take no mail and throwaway inboxes, and emails a
  six-digit code that the visitor enters in the form's place. Then a card of
  five optional questions follows (what excites them, when they want to
  begin, the project's field and form, how they heard of Mulvium, their
  name), with Previous and Continue to change an answer before Submit, and
  then a thank you. Meanwhile the other signup box offers a way back to the
  code or the questions, and says "You're on the list." once they are done.
  `js/waitlist-config.js` holds every outside service (the form endpoint,
  Umami analytics); with no endpoint, a signup opens an email draft to
  hello@mulvium.org, which the visitor sends from their own address.
  `tools/waitlist-apps-script.gs` is the free endpoint: a Google Sheet that
  checks and confirms each email, records every answer, sends each new
  person one welcome email, by name if they gave it (or after twenty minutes
  if they leave the questions early), and tells hello@mulvium.org about
  them.
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
- `privacy/` — the privacy policy the waitlist links to.
- `brand/` — the press kit (`mulvium.org/brand/`): the central sphere and the
  hero as images for profile icons, posts and banners, rendered from the site
  itself, previewed from `brand/thumbs/`; `brand/README.md` lists each size
  and how to make them again.
- Every page's footer links to the waitlist (Offerings), the press kit
  (About Us) and the privacy policy (beside the copyright).
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

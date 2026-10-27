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
  noun; `?v=b` shows the letter's line instead. Each email is checked: the
  page offers a fix for a mistyped domain (`suggest` in the config), and the
  back end refuses domains that take no mail and throwaway inboxes. The back
  end can also confirm each email with a six-digit code, entered in the
  form's place (`CODE` in the Apps Script, off for now; the page follows it).
  Then a card of five questions follows (what excites them, when they want
  to begin, the project's field and form, how they heard of Mulvium, and
  their name, which is optional), with Previous and Continue to change an
  answer before Submit; Continue waits for an answer. Then a thank you.
  Meanwhile the other signup box offers a way back to the code or the
  questions, and says "You're on the list." once they are done.
  `js/waitlist-config.js` holds every outside service (the form endpoint,
  Umami analytics) and the typo check's switch; with no endpoint, a signup
  still opens the questions, but nothing is kept and no email is sent.
  `tools/waitlist-apps-script.gs` is the free endpoint: a Google Sheet that
  checks each email (and confirms it, with `CODE` on), records every answer,
  sends each new person one welcome email, by name if they gave it (or after
  twenty minutes if they leave the questions early), and tells
  hello@mulvium.org about them.
- `css/style.css` — the stylesheet every page shares; `css/fiscal.css`, `css/oak.css`,
  `css/values.css` and `css/about.css` hold rules only one page needs, and only that page
  loads them.
- Type: three faces from Google Fonts. Lora for headings and prose; IBM Plex Sans for the
  interface (navigation, footers, buttons, forms, the M.SOS demonstrations); Major
  Mono Display for small labels, always set lowercase. The one exception is the wordmark
  at the top left, whose letters keep their own faces (Cinzel, Playfair Display, Italiana,
  Inter, Cormorant SC), loaded for those letters alone. The footer's wordmark carries ™.
- The main menu: Dear Leader, Offerings, About Us, and "Join the waitlist", a clay pill
  that opens the waitlist drawer on the home page. `font-size-adjust` on `html` scales every face to one x-height,
  so sizes set in px keep the layout's measure.
- `css/editorial.css` and `js/fiscal.js` — the type and motion the Fiscal Sponsorship,
  MulviumSOS, Oak and Values pages share: headings whose words rise, reveals, definitions
  with highlighter strokes, steps as cards, numbered lists, and the closing links.
- `js/main.js` — Three.js module for the landing page: the cosmos and its framing
  per layout, the hero, the 2D night transition, and interactions.
- `js/fsos.js` — the MulviumSOS page (`pages/offerings/msos.html`; MulviumSOS was called
  FSOS, and its files and CSS classes keep the `fsos` prefix): the green planet dissolves
  into a sphere made only of words (the twenty agents of Atelier and Grove and the work they
  handle) as a porcelain figure grows beneath it; the
  sphere is its head. The page's text then scrolls up over the scene, as on the Oak page.
- `js/msos.js` — the MulviumSOS page, told as a pitch (the problem, the market with its
  sources, the solution, the two products, why it is hard to copy). Its two animations are
  M.SOS's own, brought from its web app (Benthoven1/MulviumSOS) with its colours: the
  workspace canvas, where work flows from the blueprint to the agents and on to review,
  and an agent at work, its steps and draft arriving behind a caret until a person
  approves; and Grove's client dashboard (views, share of voice, message penetration),
  with example figures. Then the market's figures count up, and the operating-system
  figure lights each layer's counterpart.
- `js/fsos-words.js` — the MulviumSOS vocabulary: each agent, its focus and its eight words,
  and the faces the word sphere draws them in.
- `js/fsos-cloud.js` — generated: where each word sits on the sphere, packed by the shape of
  its letters so the words fit together like puzzle pieces. After changing the vocabulary,
  open `tools/pack-fsos-cloud.html` over HTTP and save its output over this file.
- `js/bowl.js` — the Fiscal Sponsorship page's opening: the blue planet's upper half
  lifts away, revealing a bowl, and four project spheres settle into it, each painted
  with one of the loading screen's four pictures.
- `js/fiscal.js` — the Fiscal Sponsorship page's text motion: rising headings, a turning
  word, reveals, the steps' timeline, and the plain-terms rows that open.
- `js/oak.js` — the Oak page: the planet becomes an acorn among leaves, and
  scrolling pulls back to the whole oak on its esplanade. The tree's shaders,
  buffers and textures are readied while the acorn forms, before scrolling is
  allowed, so the pull-back never stalls. The copy is one story, from the Oak
  deck: an evening's conversation whose specifics are first plain, then all
  highlighted, then all redacted, why it should be kept, the deck's features
  with the app's own screens (the tree, an acorn, the chickadee's article, the
  forest), the market as the deck shows it (`images/oak/market.webp`), and
  privacy and consent, with a consent code that turns over.
- `js/oak-screens.js` — Oak's screens rebuilt in HTML and SVG from the app's
  stills, not pictures of them: it draws their seeded trees (trunk, forking
  limbs, leaf clumps, acorns that grow in); the phones are styled in `css/oak.css`.
- `pages/offerings/` — Fiscal Sponsorship (what a fiscal sponsor is, how it works, and
  four hypothetical projects, each set beside one of Mulvium's four beautiful things:
  the aesthetic > the grotesque, the sublime > the spectacle, role models >
  parasocial icons, myth & epic > conspiracy), MulviumSOS (Atelier and Grove, the two parts of one
  operating system, and how people approve each step; `css/msos.css`), and Oak.
  `fsos.html` forwards old links to `msos.html`. Each of the four projects is shown with one
  of the loading screen's pictures (`Musical.webp`, `Batad.webp`, `Luxor.webp`,
  `Pictorial.webp`), the same files the loading screen uses: replace a file and both follow.
- `pages/about/` — People, Careers, Contact Us, On the Name, and Values, drawn from the
  founder's vision deck: beauty (in anything, not only art) is vanishing, the four
  values as inequalities, and the patron, maker and citizen as three spheres
  (`css/values.css`, `js/values.js`, pictures in `images/values/`).
- `privacy/` — the privacy policy the waitlist links to.
- `brand/` — the press kit (`mulvium.org/brand/`): the launch film, and the
  central sphere and the hero as images for profile icons, posts and banners,
  all rendered from the site itself, previewed from `brand/thumbs/`;
  `brand/README.md` lists each size and how to make them again. The film's
  source is `brand/film/`: a page that draws any frame of it on demand (and
  plays it, with its score, in a browser), the cue sheet, the score's
  generator and the renderer.
- Every page's footer links to the waitlist (Offerings), the press kit
  (About Us) and the privacy policy (beside the copyright).
- `images/` — stills of each company's animation, shown in the Offerings menu.
  `offer-fiscal.webp` is the Fiscal Sponsorship page's bowl, rendered at 960 × 720 from
  the page itself, so it shows the four current pictures; render it again when one changes.

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

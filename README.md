# Mulvium

Landing site for Mulvium, the parent organization of four companies: Fiscal
Sponsorship (the nonprofit arm), FSOS (the institution-building operating system
of the for-profit arm), Oak, and a fourth to be announced.

## Structure

- `index.html` — landing page. A 3D clay-colored solar system on paper: the star is
  Mulvium and each planet is one of its companies. The statement and the mission
  sit beside the cosmos on wide screens and above and below it on narrow ones.
  Hover a planet for its name; click one to open its company's page. Click the
  star to enter the overhead orbit view and night sky, then scroll to the
  founder's letter. On the landing, scrolling brings up the footer navigation;
  pinching (or ctrl/⌘ + wheel) zooms, within limits. `index.html#orbit`, the
  nav's Dear Leader link, opens straight onto the orbit view.
- `css/style.css` — shared stylesheet.
- `js/main.js` — Three.js module for the landing page: the cosmos and its framing
  per layout, the hero, the 2D night transition, and interactions.
- `js/fsos.js` — the FSOS page: a nonprofit's AI workforce circling its Chief of Staff.
- `js/bowl.js` — the Fiscal Sponsorship page's opening: the blue planet's upper half
  lifts away, revealing a bowl, and four ivory projects settle into it.
- `js/fiscal.js` — the Fiscal Sponsorship page's text motion and navigation: section
  index, reading progress, comparison switch, timeline, and project tabs.
- `js/oak.js` — the Oak page: the planet becomes an acorn among leaves, and
  scrolling pulls back to the whole oak on its esplanade.
- `pages/offerings/` — Fiscal Sponsorship (what a fiscal sponsor is, how it works, and
  four hypothetical projects), FSOS, and Oak.
- `pages/about/` — People, Careers, Contact Us.
- `images/` — stills of each company's animation, shown in the Offerings menu.

## Running locally

ES modules and an import map are used, so open over HTTP rather than `file://`:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Source material

Fiscal Sponsorship and FSOS content is adapted from the FiscalSponsor design
documents (`docs/` in the FiscalSponsor repository); Oak content from the Oak
repository.

# Mulvium

Landing site for Mulvium, the parent organization of four companies: Fiscal
Sponsorship (the nonprofit arm), FSOS (the institution-building operating system
of the for-profit arm), Oak, and a fourth to be announced.

## Structure

- `index.html` — landing page. A 3D clay-colored solar system on paper: the star is
  Mulvium and each planet is one of its companies. The statement and the mission
  flank the cosmos (above and below it on phones). Hover a planet for its name;
  hover the star to enter the night sky, then scroll to the founder's letter. The
  FSOS planet opens a deep-dive (its agent workforce, with prose below); the Oak
  planet opens the Oak page.
- `css/style.css` — shared stylesheet.
- `js/main.js` — Three.js module for the landing page: the cosmos, the 2D night
  transition, the FSOS deep-dive, and interactions.
- `js/oak.js` — Three.js module for the Oak page: the planet becomes an acorn among
  leaves, and scrolling pulls back to the whole oak on its esplanade.
- `pages/offerings/` — Fiscal Sponsorship and Oak.
- `pages/about/` — People, Careers, Contact Us.

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

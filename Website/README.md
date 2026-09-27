# Mulvium

Landing site for Mulvium, the parent organization of four companies: Fiscal
Sponsorship (the nonprofit arm), FSOS (the institution-building operating system
of the for-profit arm), Oak, and a fourth to be announced.

## Structure

- `index.html` — landing page. A 3D clay-colored solar system on paper: the star is
  Mulvium and each planet is one of its companies. Hover a planet for its name; hover
  the star to enter a 2D night view with the mission frames ("From Idea to
  Institution") and the product deck. The FSOS planet opens a deep-dive: the agent
  workforce circling its Chief of Staff, with prose below.
- `css/style.css` — shared stylesheet.
- `js/main.js` — Three.js module. Handles the 3D cosmos, 2D transition, mission
  frames, FSOS deep-dive, and interactions.
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

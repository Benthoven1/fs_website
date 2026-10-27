// No. 3 — Florence Nightingale: nurse, statistician, reformer.
// Scutari, 1854: thirty-eight nurses, the wards by lamplight; most deaths
// from preventable disease, not wounds; the polar-area "rose" of 1858 and the
// sanitary reform it argued for; the first woman elected to the Royal
// Statistical Society; the Nightingale Fund (£44,000 by public subscription,
// held by a council) and the Nightingale Training School at St Thomas' (1860).
import { img, paper, disc, label, ransom, hand, stamp, tape, shape, ink, ring, glow, say, ending, programs } from "../kit.js";

const INK = "#1b1613", CREAM = "#efe3c8", NAVY = "#2f3d55", ROSE = "#b8645a", OLIVE = "#8a8452", PLUM = "#6c4a5a", GOLD = "#e3b04b";
const TYPE = { font: "Special Elite", size: 34, bg: "#f4ecdb", padX: 18 };

export default {
  id: "nightingale",
  no: 3,
  name: "Florence Nightingale",
  images: {
    portrait: "nightingale-portrait.jpg",
    star: "nightingale-star.jpg",
    scutari: "nightingale-scutari.jpg",
    litho: "nightingale-litho.jpg",
    rose: "nightingale-rose.jpg",
    coxcomb: "nightingale-coxcomb.jpg",
  },
  tear: 30.0,
  end: ending(46.5),

  past: {
    board: "#e2d9c8",
    camera: [
      [0, 0, -40, 1.08, -1], [4.6, 0, 20, 1, 0],
      [5.6, 30, 1770, 1.144, 1], [10.6, 50, 1820, 1.21, 0],
      [11.6, -80, 3690, 1.122, -1], [17, -90, 3740, 1.188, 0],
      [17.8, 0, 5590, 1.056, 0], [23.4, 0, 5630, 1.144, 0],
      [24.2, 60, 7490, 1.1, 1], [30, 60, 7550, 1.177, 0],
    ],
    pieces: [
      // ── The founder ──
      paper(NAVY, 220, -200, 620, 920, { rot: 4, enter: "none" }),
      paper(ROSE, -320, 360, 380, 300, { rot: -6, enter: "none", dots: "rgba(255,255,255,0.12)" }),
      img("portrait", 20, -260, 540, { rot: -2, at: 0.7, fy: 0.2 }),
      tape(-190, -610, 170, { rot: -36, at: 1.0 }),
      tape(250, -620, 170, { rot: 30, at: 1.1 }),
      ransom("FLORENCE", 0, 250, 100, { at: 1.6 }),
      ransom("NIGHTINGALE", 10, 380, 92, { at: 2.0, stagger: 0.05 }),
      label("NURSE", -320, -470, { ...TYPE, rot: -6, at: 2.8 }),
      label("STATISTICIAN", 320, -300, { ...TYPE, rot: 5, at: 3.1 }),
      label("REFORMER", -320, -40, { ...TYPE, rot: 4, at: 3.4 }),

      // ── 1854: Scutari, by lamplight ──
      paper(INK, 0, 1800, 940, 1000, { rot: -2, at: 5.2, edges: "tttt" }),
      img("scutari", 40, 1560, 760, { rot: 2, at: 5.6, h: 500 }),
      ransom("1854", -120, 1260, 140, { at: 6.1 }),
      label("SCUTARI · THE CRIMEAN WAR", 90, 1840, { ...TYPE, rot: -2, at: 6.8 }),
      hand("38 nurses", -250, 1950, { at: 7.6, size: 64, rot: -4, color: "#f3e3c0" }),
      img("litho", 170, 2060, 360, { rot: 5, at: 8.6, h: 460, fy: 0.3, d: 1.06 }),
      glow(110, 2050, 340, { at: 9.4 }),
      tape(60, 1840, 140, { rot: -20, at: 8.9 }),

      // ── She counts ──
      paper(ROSE, -230, 3420, 420, 560, { rot: -5, at: 11.5, dots: "rgba(255,255,255,0.12)" }),
      paper("#f3ecdb", 40, 3560, 720, 700, { rot: 2, at: 11.7, lines: "rgba(47,61,85,0.3)" }),
      label("BARRACK HOSPITAL · WINTER 1854–55", 40, 3270, { ...TYPE, size: 28, rot: 2, at: 12.0 }),
      hand("wounds", -170, 3400, { at: 12.3, size: 78, rot: 2, color: NAVY }),
      tally(80, 3410, 1, 12.9, 0.5, NAVY),
      hand("disease", -170, 3560, { at: 13.5, size: 78, rot: 2, color: ROSE }),
      tally(80, 3570, 3, 14.0, 1.5, ROSE),
      ring(0, 3570, 330, 85, { at: 15.7, dur: 0.6, rot: 2, color: ROSE, width: 7 }),
      label("PREVENTABLE", 180, 3740, { ...TYPE, rot: -4, at: 16.2, bg: ROSE, color: "#fff6ea" }),
      tape(-310, 3230, 150, { rot: -30, at: 11.9 }),
      // ── 1858: the rose ──
      img("rose", 0, 5600, 960, { rot: -1, at: 18.0, enter: "unfold", edges: "cccc" }),
      img("coxcomb", -270, 5160, 330, { rot: -7, at: 18.4, d: 1.05 }),
      ransom("1858", 150, 5270, 150, { at: 18.7 }),
      tape(-380, 5370, 160, { rot: -25, at: 18.3 }),
      tape(380, 5830, 160, { rot: -25, at: 18.4 }),
      label("Diagram of the Causes of Mortality in the Army in the East", 0, 5895, { font: "IM Fell English", size: 28, italic: true, bg: CREAM, rot: 1, at: 19.6 }),
      stamp("SANITARY\nREFORM", -250, 5440, { rot: -9, at: 21.0, color: NAVY }),
      label("ROYAL STATISTICAL SOCIETY", 190, 5800, { ...TYPE, size: 28, rot: 3, at: 22.0 }),

      // ── The Fund, and the school ──
      paper(PLUM, -150, 7380, 560, 640, { rot: -3, at: 24.3 }),
      paper("#f3ecdb", 40, 7330, 560, 420, { rot: 3, at: 24.7, lines: "rgba(47,61,85,0.3)", edges: "tctt" }),
      hand("£44,000", 40, 7250, { at: 25.2, size: 84, rot: 3 }),
      hand("by public subscription", 60, 7350, { at: 25.8, size: 46, rot: 3, color: NAVY }),
      stamp("THE\nNIGHTINGALE\nFUND", 200, 7480, { rot: -7, at: 26.3, size: 30, color: PLUM }),
      ransom("1860", -140, 7690, 140, { at: 27.1 }),
      shape("house", 200, 7760, 360, CREAM, { aspect: 0.72, rot: 2, at: 27.6 }),
      shape("cross", 200, 7760, 66, ROSE, { rot: 2, at: 27.9 }),
      label("ST THOMAS’ HOSPITAL, LONDON", 60, 7875, { ...TYPE, size: 28, rot: -2, at: 28.4 }),
    ],
    captions: [
      say(0.4, 4.7, 248, [{ text: "the polymath founder · no. 3", font: "Major Mono Display", size: 30, bg: INK, color: "#f3ede2" }]),
      say(5.8, 8.3, 1390, ["1854. The Crimean War.", "She leads thirty-eight nurses"]),
      say(8.4, 11.0, 1390, ["to the army hospital at Scutari,", { text: "and walks its wards by lamplight.", it: true }]),
      say(11.9, 14.4, 1390, ["She keeps count, and finds", "most soldiers are dying"]),
      say(14.5, 17.1, 1390, [{ text: "not of their wounds,", it: true }, { text: "but of preventable disease.", it: true }]),
      say(18.2, 20.7, 1390, ["1858. She draws the numbers", "as a rose, for all to see."]),
      say(20.8, 23.4, 1390, ["The case for sanitary reform, made;", { text: "the first woman elected to", it: true }, { text: "the Royal Statistical Society.", it: true }]),
      say(24.5, 27.0, 1390, ["A grateful public gives £44,000", "to a fund held by a council,"]),
      say(27.1, 29.8, 1390, ["and in 1860, it opens", { text: "the Nightingale Training School.", it: true }]),
    ],
  },

  now: {
    board: "#eceae5",
    camera: [[30.0, 0, 40, 1.06, 0], [34.2, 0, 10, 1.0, 0], [38.2, 0, -10, 0.98, 0], [42.2, 0, -30, 1.0, 0], [46.5, 0, -40, 1.02, 0]],
    pieces: [
      paper("#E0B8C8", -250, -380, 540, 700, { rot: -4, at: 30.25, edges: "cttc" }),
      paper("#B8CAE0", 280, 280, 540, 620, { rot: 3, at: 30.4, edges: "tcct" }),
      ransom("TODAY", 0, -560, 170, { at: 30.7, out: 34.3, papers: [["#f8f4ec", INK], ["#b87758", "#fffaf2"], ["#E0B8C8", INK], ["#1b1613", "#f8f4ec"], ["#B8DDD8", INK]] }),
      ...programs("Florence Nightingale", ["the school", "book"], ["the data", "chart"], ["the hospital", "cross"], ["the nurses", "lamp"]),
      stamp("GIFTS\nRECEIPTED", -110, -195, { size: 34, rot: -8, at: 38.7 }),
      stamp("FUND\nHELD", 120, -95, { size: 34, rot: 6, at: 39.3, color: "#3f5f8a" }),
      stamp("GRANTS\nRECEIVED", -100, 5, { size: 34, rot: 4, at: 39.9 }),
      stamp("BOOKS\nKEPT", 130, 100, { size: 34, rot: -5, at: 40.5, color: "#3f5f8a" }),
      disc(0, -640, 150, { key: "star", orbit: "star", at: 42.6, fy: 0.3 }),
      hand("back to the wards", 150, -470, { at: 43.4, size: 50, rot: -5 }),
    ],
    captions: [
      say(31.0, 34.2, 1390, ["The Nightingale Fund worked", { text: "much like fiscal sponsorship.", it: true }]),
      say(34.8, 38.2, 1390, ["Today, a fiscal sponsor could hold", { text: "that fund for any nurse with a plan.", it: true }]),
      say(38.8, 42.2, 1390, ["Gifts held for the project alone.", "Receipts issued. Books kept."]),
      say(42.8, 46.3, 1390, ["Mulvium is building that home", { text: "for the next Nightingale.", it: true, bg: "#b87758", color: "#fffaf2" }]),
    ],
  },
};

// Tally marks in groups of five, struck through, n groups
function tally(x, y, groups, at, dur, color) {
  const pts = [];
  for (let g = 0; g < groups; g++) {
    const x0 = g * 150;
    for (let k = 0; k < 4; k++) pts.push([x0 + k * 26, -36], [x0 + k * 24 + 2, 36], null);
    pts.push([x0 - 14, 22], [x0 + 104, -18], null);
  }
  return ink(pts, x, y, { at, dur, width: 6, color, rot: 2 });
}

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
      [0, 0, -40, 1.08, -1], [4.6, 0, 20, 1.0, 0],
      [5.6, 30, 1880, 1.04, 1], [10.6, 50, 1930, 1.1, 0],
      [11.6, -80, 3800, 1.02, -1], [17.0, -90, 3850, 1.08, 0],
      [17.8, 0, 5700, 0.96, 0], [23.4, 0, 5740, 1.04, 0],
      [24.2, 60, 7600, 1.0, 1], [30.0, 60, 7660, 1.07, 0],
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
      paper(INK, 0, 1820, 900, 900, { rot: -2, at: 5.2, edges: "tttt" }),
      img("scutari", 0, 1700, 720, { rot: 2, at: 5.6, h: 480 }),
      ransom("1854", -220, 1380, 150, { at: 6.1 }),
      label("SCUTARI · THE CRIMEAN WAR", 60, 1990, { ...TYPE, rot: -2, at: 6.8 }),
      hand("38 nurses", -230, 2080, { at: 7.6, size: 60, rot: -4, color: "#f3e3c0" }),
      glow(260, 2150, 300, { at: 9.0 }),
      shape("lamp", 260, 2150, 170, GOLD, { aspect: 1.35, rot: 4, at: 8.8 }),

      // ── She counts ──
      paper("#f3ecdb", 0, 3640, 720, 800, { rot: 2, at: 11.7, lines: "rgba(47,61,85,0.3)" }),
      hand("wounds", -200, 3420, { at: 12.2, size: 60, rot: 2, color: NAVY }),
      ink([[0, 0], [0, 50], null, [26, 0], [26, 50], null, [-10, 34], [38, 18]], 50, 3400, { at: 12.8, dur: 0.4, width: 4, color: NAVY, rot: 2 }),
      hand("disease", -200, 3560, { at: 13.3, size: 60, rot: 2, color: ROSE }),
      ink([[0, 0], [0, 50], null, [24, 0], [24, 50], null, [48, 0], [48, 50], null, [72, 0], [72, 50], null, [-10, 34], [86, 14],
        null, [110, 0], [110, 50], null, [134, 0], [134, 50], null, [158, 0], [158, 50], null, [182, 0], [182, 50], null, [100, 34], [196, 14],
        null, [220, 0], [220, 50], null, [244, 0], [244, 50], null, [268, 0], [268, 50], null, [292, 0], [292, 50], null, [210, 34], [306, 14]],
        30, 3540, { at: 13.9, dur: 1.4, width: 4, color: ROSE, rot: 2 }),
      ring(-60, 3590, 300, 70, { at: 15.6, dur: 0.6, rot: 2, color: ROSE }),
      label("PREVENTABLE", 160, 3760, { ...TYPE, rot: -4, at: 16.1, bg: ROSE, color: "#fff6ea" }),
      tape(-300, 3270, 150, { rot: -30, at: 12.0 }),

      // ── 1858: the rose ──
      img("rose", 0, 5600, 940, { rot: -1, at: 18.0, enter: "unfold", h: 520 }),
      ransom("1858", 220, 5250, 150, { at: 18.7 }),
      tape(-380, 5370, 160, { rot: -25, at: 18.3 }),
      tape(380, 5830, 160, { rot: -25, at: 18.4 }),
      label("Diagram of the Causes of Mortality in the Army in the East", 0, 5930, { font: "IM Fell English", size: 28, italic: true, bg: CREAM, rot: 1, at: 19.6 }),
      stamp("SANITARY\nREFORM", -250, 6010, { rot: -9, at: 21.0, color: NAVY }),
      label("ROYAL STATISTICAL SOCIETY", 200, 6080, { ...TYPE, size: 28, rot: 3, at: 22.0 }),

      // ── The Fund, and the school ──
      img("litho", -210, 7400, 420, { rot: -4, at: 24.4 }),
      paper("#f3ecdb", 200, 7470, 460, 380, { rot: 3, at: 24.9, lines: "rgba(47,61,85,0.3)", edges: "tctt" }),
      hand("£44,000", 210, 7400, { at: 25.4, size: 74, rot: 3 }),
      stamp("THE\nNIGHTINGALE\nFUND", 220, 7560, { rot: -7, at: 26.1, size: 30, color: PLUM }),
      ransom("1860", -170, 7790, 140, { at: 27.1 }),
      shape("house", 200, 7840, 340, CREAM, { aspect: 0.72, rot: 2, at: 27.6 }),
      shape("cross", 200, 7840, 64, ROSE, { rot: 2, at: 27.9 }),
      label("ST THOMAS’ HOSPITAL, LONDON", 120, 8020, { ...TYPE, size: 28, rot: -2, at: 28.4 }),
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
      ...programs(["the school", "book"], ["the data", "chart"], ["the hospital", "cross"], ["the nurses", "lamp"]),
      stamp("GIFTS\nRECEIPTED", -110, -170, { size: 34, rot: -8, at: 38.7 }),
      stamp("FUND\nHELD", 120, -50, { size: 34, rot: 6, at: 39.3, color: "#3f5f8a" }),
      stamp("GRANTS\nRECEIVED", -100, 70, { size: 34, rot: 4, at: 39.9 }),
      stamp("BOOKS\nKEPT", 130, 160, { size: 34, rot: -5, at: 40.5, color: "#3f5f8a" }),
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

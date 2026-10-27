// No. 1 — Benjamin Franklin: printer, scientist, writer, diplomat.
// Philadelphia: a subscription library (1731); a volunteer fire company
// (1736, two leather buckets a member); a hospital on a matching grant
// (1751); the academy that became the University of Pennsylvania (opened
// 1751). Each organized from scratch.
import { img, paper, disc, label, ransom, hand, stamp, tape, shape, ink, ring, say, ending, programs } from "../kit.js";

const INK = "#1b1613", CREAM = "#efe3c8", KRAFT = "#c9a77a", INDIGO = "#4f607c", OXBLOOD = "#7d3b2c", OCHRE = "#c79a4a";
const TYPE = { font: "Special Elite", size: 34, bg: "#f4ecdb", padX: 18 };
const END = ending(46.5);

export default {
  id: "franklin",
  no: 1,
  name: "Benjamin Franklin",
  images: {
    portrait: "franklin-portrait.jpg",
    star: "franklin-star.jpg",
    kite: "franklin-kite.jpg",
    almanac: "franklin-almanac.jpg",
    march: "franklin-march.jpg",
    printer: "franklin-printer.jpg",
    press: "franklin-press.jpg",
  },
  tear: 30.0,
  end: END,

  past: {
    board: "#e7dcc6",
    // [t, x, y, zoom, roll]
    camera: [
      [0, 0, -40, 1.08, -1], [4.6, 0, 20, 1.0, 0],
      [5.6, 40, 1880, 1.04, 1], [10.6, 60, 1930, 1.1, 0],
      [11.6, -100, 3800, 1.02, -1], [15.2, -90, 3840, 1.08, 0],
      [16.2, 120, 5700, 1.0, 1], [21.0, 140, 5760, 1.07, 0],
      [22.0, -60, 7600, 1.0, -1], [25.0, -40, 7640, 1.04, 0],
      [26.0, 0, 9450, 0.98, 1], [30.0, 0, 9500, 1.06, 0],
    ],
    pieces: [
      // ── The founder ──
      img("march", -300, -470, 470, { rot: -9, enter: "none" }),
      paper(KRAFT, 210, -170, 640, 980, { rot: 4, enter: "none" }),
      paper(INDIGO, -330, 380, 380, 260, { rot: -6, enter: "none" }),
      img("portrait", 30, -260, 560, { rot: -3, at: 0.7, fy: 0.3 }),
      tape(-190, -600, 170, { rot: -38, at: 1.0 }),
      tape(270, -610, 170, { rot: 34, at: 1.1 }),
      ransom("BENJAMIN", -10, 250, 96, { at: 1.6 }),
      ransom("FRANKLIN", 20, 380, 112, { at: 2.1 }),
      label("PRINTER", -330, -520, { ...TYPE, rot: -7, at: 2.8 }),
      label("SCIENTIST", 340, -330, { ...TYPE, rot: 6, at: 3.1 }),
      label("WRITER", -340, -110, { ...TYPE, rot: 4, at: 3.4 }),
      label("DIPLOMAT", 330, 40, { ...TYPE, rot: -5, at: 3.7 }),

      // ── 1731: a subscription library ──
      img("almanac", 300, 1560, 330, { rot: 7, at: 5.3, enter: "slide", from: 0 }),
      paper(OXBLOOD, -210, 1830, 520, 330, { rot: -3, at: 5.5 }),
      ransom("1731", -220, 1500, 150, { at: 5.9 }),
      label("PHILADELPHIA", -160, 1640, { ...TYPE, rot: -2, at: 6.4 }),
      shape("book", -250, 1840, 260, OCHRE, { aspect: 0.62, rot: -8, at: 6.9 }),
      shape("book", -170, 1930, 280, CREAM, { aspect: 0.62, rot: 5, at: 7.1 }),
      shape("book", -300, 2010, 250, INDIGO, { aspect: 0.62, rot: -3, at: 7.3 }),
      label("Articles of Agreement · 1 July 1731", 170, 1930, { font: "IM Fell English", size: 34, italic: true, bg: CREAM, rot: 3, at: 8.0 }),
      hand("50 × 40s.", 250, 2040, { at: 8.7, rot: -4 }),
      ring(250, 2040, 160, 52, { at: 9.4, dur: 0.6, rot: -4 }),

      // ── 1736: a fire company ──
      paper(KRAFT, 110, 3700, 620, 760, { rot: 3, at: 11.3 }),
      ransom("1736", -230, 3360, 150, { at: 11.8 }),
      shape("flame", 140, 3560, 300, "#d9652b", { aspect: 1.25, rot: 3, at: 12.2 }),
      shape("flame", 200, 3600, 170, "#efb03c", { aspect: 1.25, rot: 8, at: 12.35 }),
      shape("bucket", -220, 3780, 170, OXBLOOD, { rot: -6, at: 12.7 }),
      shape("bucket", -40, 3800, 170, OXBLOOD, { rot: 4, at: 12.85 }),
      shape("bucket", 140, 3790, 170, OXBLOOD, { rot: -2, at: 13.0 }),
      label("An ounce of prevention is worth a pound of cure.", 0, 3990, { font: "IM Fell English", size: 34, italic: true, bg: "#f2ead8", rot: -2, at: 13.6 }),
      label("— Pennsylvania Gazette, 1735", 170, 4060, { font: "IM Fell English", size: 26, bg: "none", rot: -2, at: 14.0, enter: "none" }),
      label("UNION FIRE COMPANY", -150, 3500, { ...TYPE, rot: -3, at: 14.4 }),

      // ── 1751: a hospital, on a match ──
      img("press", 300, 5380, 300, { rot: 6, at: 16.0, enter: "slide", from: 0, d: 1.05 }),
      ransom("1751", -230, 5280, 150, { at: 16.3 }),
      shape("house", -10, 5560, 460, CREAM, { aspect: 0.72, rot: -2, at: 16.8 }),
      shape("cross", -10, 5560, 92, OXBLOOD, { rot: -2, at: 17.2 }),
      paper("#f3ecdb", 120, 5900, 560, 300, { rot: 3, at: 17.9, lines: "rgba(79,96,124,0.35)", edges: "tctt" }),
      hand("£2,000 raised", 140, 5850, { at: 18.5, size: 58, rot: 3 }),
      hand("+ £2,000 granted", 160, 5935, { at: 19.3, size: 58, rot: 3 }),
      ink([[-170, 0], [190, 12]], 150, 5985, { at: 20.0, dur: 0.35, width: 5 }),
      stamp("MATCHED", 280, 6010, { rot: -12, at: 20.4 }),

      // ── An academy ──
      paper(INDIGO, 40, 7450, 700, 520, { rot: -2, at: 21.7 }),
      shape("columns", 40, 7430, 500, CREAM, { aspect: 0.7, rot: -2, at: 22.1 }),
      label("THE ACADEMY OF PHILADELPHIA", 40, 7760, { ...TYPE, rot: 2, at: 22.7 }),
      label("now the University of Pennsylvania", 70, 7830, { font: "IM Fell English", size: 32, italic: true, bg: CREAM, rot: 2, at: 23.4 }),
      tape(-280, 7240, 150, { rot: -30, at: 22.3 }),

      // ── And between experiments ──
      img("kite", 30, 9200, 600, { rot: 3, at: 26.0, fy: 0.25, h: 720 }),
      shape("kite", -320, 8980, 170, "#e9dcc0", { aspect: 1.3, rot: -18, at: 26.6, d: 1.12 }),
      shape("bolt", 330, 9000, 130, "#efb03c", { aspect: 1.6, rot: 10, at: 26.9, d: 1.12 }),
      shape("key", 320, 9480, 80, OCHRE, { aspect: 2.2, rot: 20, at: 27.2, d: 1.08 }),
      img("printer", -280, 9580, 360, { rot: -6, at: 27.6, d: 1.04 }),
      tape(-140, 8850, 160, { rot: -20, at: 26.3 }),
    ],
    captions: [
      say(0.4, 4.7, 248, [{ text: "the polymath founder · no. 1", font: "Major Mono Display", size: 30, bg: INK, color: "#f3ede2" }]),
      say(5.7, 8.2, 1390, ["1731. Books are scarce and dear.", "So Franklin gathers fifty subscribers"]),
      say(8.3, 10.9, 1390, ["at forty shillings each,", { text: "and founds a library they share.", it: true }]),
      say(11.9, 15.2, 1390, ["1736. Neighbors pledge two leather", "buckets apiece, and become", { text: "the Union Fire Company.", it: true }]),
      say(16.5, 18.6, 1390, ["1751. A hospital for the sick poor,", "on Franklin’s terms:"]),
      say(18.7, 21.1, 1390, ["citizens raise £2,000,", { text: "and the Assembly matches it.", it: true }]),
      say(22.3, 25.1, 1390, ["Then an academy,", { text: "today the University of Pennsylvania.", it: true }]),
      say(26.4, 29.7, 1390, ["Between experiments and the press,", "he organized every one", { text: "from scratch.", it: true }]),
    ],
  },

  now: {
    board: "#eceae5",
    camera: [[30.0, 0, 40, 1.06, 0], [34.2, 0, 10, 1.0, 0], [38.2, 0, -10, 0.98, 0], [42.2, 0, -30, 1.0, 0], [46.5, 0, -40, 1.02, 0]],
    pieces: [
      paper("#B8CAE0", -260, -380, 520, 700, { rot: -4, at: 30.25, edges: "cttc" }),
      paper("#E0B8C8", 280, 300, 560, 640, { rot: 3, at: 30.4, edges: "tcct" }),
      ransom("TODAY", 0, -560, 170, { at: 30.7, out: 34.3, papers: [["#f8f4ec", INK], ["#b87758", "#fffaf2"], ["#B8CAE0", INK], ["#1b1613", "#f8f4ec"], ["#C4DDB8", INK]] }),
      ...programs(["the library", "book"], ["the fire company", "bucket"], ["the hospital", "cross"], ["the academy", "columns"]),
      // Its work, stamped
      stamp("GIFTS\nRECEIPTED", -110, -170, { size: 34, rot: -8, at: 38.7 }),
      stamp("GRANTS\nRECEIVED", 120, -50, { size: 34, rot: 6, at: 39.3, color: "#3f5f8a" }),
      stamp("CONTRACTS\nSIGNED", -100, 70, { size: 34, rot: 4, at: 39.9 }),
      stamp("BOOKS\nKEPT", 130, 160, { size: 34, rot: -5, at: 40.5, color: "#3f5f8a" }),
      // And the founder, free for the work
      disc(0, -640, 150, { key: "star", orbit: "star", at: 42.6, fy: 0.35 }),
      hand("back to the experiments", 150, -470, { at: 43.4, size: 50, rot: -5, color: "#8f4e33" }),
    ],
    captions: [
      say(31.0, 34.2, 1390, ["Today, Franklin wouldn’t need", "to found four organizations."]),
      say(34.8, 38.2, 1390, ["One fiscal sponsor could hold", { text: "all four, each with its own fund.", it: true }]),
      say(38.8, 42.2, 1390, ["Gifts receipted. Grants received.", "Contracts signed. Books kept."]),
      say(42.8, 46.3, 1390, ["Mulvium is building that home", { text: "for the next Franklin.", it: true, bg: "#b87758", color: "#fffaf2" }]),
    ],
  },
};

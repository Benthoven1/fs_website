// No. 2 — Jane Addams: reformer, writer, organizer.
// Hull House, Chicago (1889, with Ellen Gates Starr): a kindergarten, classes,
// a gallery, a music school, a coffee house; residents' research on the
// neighborhood (Hull-House Maps and Papers, 1895) behind Illinois factory and
// child-labor reform; a campus of buildings kept by patrons such as Mary Rozet
// Smith; the Nobel Peace Prize in 1931, the first American woman to win it.
import { img, paper, disc, label, ransom, hand, stamp, tape, shape, ink, ring, say, ending, programs } from "../kit.js";

const INK = "#1b1613", CREAM = "#efe3c8", BRICK = "#9a4b36", SAGE = "#7f8f6a", MUSTARD = "#d0a441", SLATE = "#56606b", LAMP = "#f2c14e";
const TYPE = { font: "Special Elite", size: 34, bg: "#f4ecdb", padX: 18 };

export default {
  id: "addams",
  no: 2,
  name: "Jane Addams",
  images: {
    portrait: "addams-portrait.jpg",
    star: "addams-star.jpg",
    house: "addams-house.jpg",
    kinder: "addams-kinder.jpg",
    coffee: "addams-coffee.jpg",
    quad: "addams-quad.jpg",
    children: "addams-children.jpg",
    band: "addams-band.jpg",
    club: "addams-club.jpg",
    sig: "addams-sig.jpg",
  },
  tear: 30.0,
  end: ending(46.5),

  past: {
    board: "#e4dccb",
    camera: [
      [0, 0, -40, 1.08, 1], [4.6, 0, 20, 1.0, 0],
      [5.6, -40, 1880, 1.04, -1], [10.6, -60, 1930, 1.1, 0],
      [11.6, 100, 3800, 1.0, 1], [16.6, 90, 3850, 1.06, 0],
      [17.6, -120, 5700, 1.0, -1], [22.8, -140, 5760, 1.07, 0],
      [23.8, 60, 7600, 1.0, 1], [26.4, 40, 7640, 1.03, 0],
      [27.2, 0, 9450, 1.0, -1], [30.0, 0, 9490, 1.06, 0],
    ],
    pieces: [
      // ── The founder ──
      paper(SAGE, -220, -200, 620, 900, { rot: -4, enter: "none" }),
      paper(MUSTARD, 300, 330, 420, 300, { rot: 5, enter: "none", dots: "rgba(27,22,19,0.12)" }),
      img("portrait", 20, -260, 540, { rot: 2, at: 0.7, fy: 0.25 }),
      tape(-200, -610, 170, { rot: -32, at: 1.0 }),
      tape(250, -620, 170, { rot: 36, at: 1.1 }),
      ransom("JANE", -40, 250, 120, { at: 1.6 }),
      ransom("ADDAMS", 30, 390, 120, { at: 2.0 }),
      label("REFORMER", -320, -470, { ...TYPE, rot: -6, at: 2.8 }),
      label("WRITER", 330, -260, { ...TYPE, rot: 5, at: 3.1 }),
      label("ORGANIZER", -310, 40, { ...TYPE, rot: 4, at: 3.4 }),
      img("sig", 250, 90, 380, { rot: -4, at: 3.9, edges: "cccc" }),

      // ── 1889: a house on Halsted Street ──
      paper(BRICK, 160, 1830, 560, 620, { rot: 3, at: 5.2 }),
      ransom("1889", -230, 1430, 150, { at: 5.8 }),
      img("house", 30, 1720, 680, { rot: -2, at: 6.3, h: 460 }),
      label("HALSTED STREET · CHICAGO", -60, 2000, { ...TYPE, rot: -2, at: 7.0 }),
      label("with Ellen Gates Starr", 190, 2075, { font: "IM Fell English", size: 32, italic: true, bg: CREAM, rot: 3, at: 7.6 }),
      tape(-300, 1500, 150, { rot: -25, at: 6.6 }),
      ink([[-20, 0], [250, -6]], -40, 2035, { at: 9.0, dur: 0.4, width: 4 }),

      // ── Its doors open ──
      shape("house", 0, 3560, 560, CREAM, { aspect: 0.72, rot: -1, at: 11.8 }),
      paper(LAMP, -168, 3567, 108, 76, { edges: "cccc", rot: -1, at: 12.3, enter: "grow" }),
      paper(LAMP, 56, 3567, 108, 76, { edges: "cccc", rot: -1, at: 12.6, enter: "grow" }),
      paper(LAMP, -168, 3701, 108, 76, { edges: "cccc", rot: -1, at: 12.9, enter: "grow" }),
      paper(LAMP, 56, 3701, 108, 76, { edges: "cccc", rot: -1, at: 13.2, enter: "grow" }),
      paper(LAMP, -1, 3442, 60, 72, { edges: "cccc", rot: -1, at: 13.5, enter: "grow" }),
      img("kinder", -300, 3920, 340, { rot: -6, at: 13.9, d: 1.04 }),
      img("coffee", 290, 3940, 340, { rot: 5, at: 14.4, d: 1.04 }),
      img("band", 0, 3230, 520, { rot: 2, at: 15.0, d: 1.06 }),
      label("KINDERGARTEN", -300, 4080, { ...TYPE, size: 28, rot: -5, at: 14.1 }),
      label("COFFEE HOUSE", 290, 4100, { ...TYPE, size: 28, rot: 4, at: 14.6 }),
      label("MUSIC SCHOOL", 160, 3120, { ...TYPE, size: 28, rot: 3, at: 15.3 }),

      // ── 1895: the neighborhood, mapped ──
      paper("#f3ecdb", 0, 5560, 700, 760, { rot: -2, at: 17.7, lines: "rgba(86,96,107,0.3)" }),
      ransom("1895", 170, 5160, 150, { at: 18.2 }),
      paper(MUSTARD, -200, 5440, 170, 130, { edges: "cccc", rot: -2, at: 18.6, enter: "grow" }),
      paper(BRICK, -30, 5430, 150, 150, { edges: "cccc", rot: -2, at: 18.75, enter: "grow" }),
      paper(SAGE, 130, 5450, 150, 120, { edges: "cccc", rot: -2, at: 18.9, enter: "grow" }),
      paper(SLATE, -190, 5580, 160, 120, { edges: "cccc", rot: -2, at: 19.05, enter: "grow" }),
      paper("#c98c6b", -20, 5585, 160, 130, { edges: "cccc", rot: -2, at: 19.2, enter: "grow" }),
      paper(MUSTARD, 140, 5590, 140, 120, { edges: "cccc", rot: -2, at: 19.35, enter: "grow" }),
      label("WAGES · TRADES · NATIONALITIES", 0, 5320, { font: "Special Elite", size: 26, bg: "none", rot: -2, at: 18.4, enter: "none" }),
      hand("block by block", 120, 5760, { at: 19.8, size: 56, rot: -3 }),
      ring(-20, 5520, 260, 170, { at: 20.6, dur: 0.6, rot: -2 }),
      stamp("FACTORY\nACT", 230, 5880, { rot: -10, at: 21.4 }),
      img("children", -250, 5960, 330, { rot: 5, at: 21.9, d: 1.05 }),

      // ── A campus, kept by patrons ──
      img("quad", -170, 7400, 460, { rot: -3, at: 24.0 }),
      img("club", 220, 7560, 440, { rot: 4, at: 24.4 }),
      label("thirteen buildings by 1907", 30, 7820, { font: "IM Fell English", size: 32, italic: true, bg: CREAM, rot: -2, at: 25.0 }),
      hand("Mary Rozet Smith", -60, 7900, { at: 25.6, size: 56, rot: -2 }),

      // ── 1931 ──
      paper(SLATE, 0, 9420, 680, 560, { rot: 2, at: 27.3 }),
      ransom("1931", -10, 9220, 160, { at: 27.6 }),
      disc(0, 9520, 120, { color: "#d8b45a", at: 28.2, rim: "#f3e2b0" }),
      shape("star", 0, 9520, 120, "#fff3d0", { at: 28.4 }),
      label("THE NOBEL PEACE PRIZE", 0, 9690, { ...TYPE, rot: -2, at: 28.7 }),
    ],
    captions: [
      say(0.4, 4.7, 248, [{ text: "the polymath founder · no. 2", font: "Major Mono Display", size: 30, bg: INK, color: "#f3ede2" }]),
      say(5.7, 8.2, 1390, ["Chicago, 1889. Jane Addams", "and Ellen Gates Starr move into"]),
      say(8.3, 10.9, 1390, ["an old mansion on Halsted Street,", { text: "among immigrant neighbors.", it: true }]),
      say(11.9, 16.6, 1390, ["Hull House opens its doors:", "a kindergarten, classes, a gallery,", { text: "a music school, a coffee house.", it: true }]),
      say(17.9, 20.3, 1390, ["Residents map the neighborhood:", "wages, trades, nationalities."]),
      say(20.4, 22.9, 1390, ["Their research helps win Illinois’", { text: "factory and child-labor laws.", it: true }]),
      say(24.1, 26.9, 1390, ["It grows into a campus,", { text: "kept by patrons like Mary Rozet Smith.", it: true }]),
      say(27.6, 29.8, 1390, ["1931. The Nobel Peace Prize,", { text: "the first American woman to win it.", it: true }]),
    ],
  },

  now: {
    board: "#eceae5",
    camera: [[30.0, 0, 40, 1.06, 0], [34.2, 0, 10, 1.0, 0], [38.2, 0, -10, 0.98, 0], [42.2, 0, -30, 1.0, 0], [46.5, 0, -40, 1.02, 0]],
    pieces: [
      paper("#C4DDB8", 250, -380, 560, 700, { rot: 4, at: 30.25, edges: "tcct" }),
      paper("#B8DDD8", -280, 280, 540, 620, { rot: -3, at: 30.4, edges: "cttc" }),
      ransom("TODAY", 0, -560, 170, { at: 30.7, out: 34.3, papers: [["#f8f4ec", INK], ["#b87758", "#fffaf2"], ["#C4DDB8", INK], ["#1b1613", "#f8f4ec"], ["#E0B8C8", INK]] }),
      ...programs(["the kindergarten", "book"], ["the arts", "note"], ["the research", "chart"], ["the neighbors", "house"]),
      stamp("GIFTS\nRECEIPTED", -110, -170, { size: 34, rot: -8, at: 38.7 }),
      stamp("GRANTS\nRECEIVED", 120, -50, { size: 34, rot: 6, at: 39.3, color: "#3f5f8a" }),
      stamp("STAFF\nHIRED", -100, 70, { size: 34, rot: 4, at: 39.9 }),
      stamp("BOOKS\nKEPT", 130, 160, { size: 34, rot: -5, at: 40.5, color: "#3f5f8a" }),
      disc(0, -640, 150, { key: "star", orbit: "star", at: 42.6, fy: 0.3 }),
      hand("back to the neighbors", 150, -470, { at: 43.4, size: 50, rot: -5 }),
    ],
    captions: [
      say(31.0, 34.2, 1390, ["Today, Addams could begin the day", "a sponsorship agreement is signed."]),
      say(34.8, 38.2, 1390, ["Every program with its own fund,", { text: "under one charitable home.", it: true }]),
      say(38.8, 42.2, 1390, ["Patrons give. Foundations fund.", "Staff are hired. Books are kept."]),
      say(42.8, 46.3, 1390, ["Mulvium is building that home", { text: "for the next Addams.", it: true, bg: "#b87758", color: "#fffaf2" }]),
    ],
  },
};

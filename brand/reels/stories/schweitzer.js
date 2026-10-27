// No. 4 — Albert Schweitzer: organist, Bach scholar, theologian, physician.
// Strasbourg; medical school at thirty (1905) to serve as a doctor in Africa;
// Lambaréné, 1913, with Hélène Schweitzer, a nurse: the first consulting room
// a former chicken coop; the hospital paid for by his organ recitals,
// lectures and books; a pedal piano for the tropics from the Paris Bach
// Society; the Nobel Peace Prize for 1952, its money spent on a leprosarium.
import { img, paper, disc, label, ransom, hand, stamp, tape, shape, ink, ring, say, ending, programs } from "../kit.js";

const INK = "#1b1613", CREAM = "#efe3c8", WALNUT = "#6b4a32", OCHRE = "#c4903f", TEAL = "#4f7a74", RUST = "#a65a3a", BONE = "#e8dcc0";
const TYPE = { font: "Special Elite", size: 34, bg: "#f4ecdb", padX: 18 };

export default {
  id: "schweitzer",
  no: 4,
  name: "Albert Schweitzer",
  images: {
    portrait: "schweitzer-portrait.jpg",
    star: "schweitzer-star.jpg",
    organ: "schweitzer-organ.jpg",
    concert: "schweitzer-concert.jpg",
    bach: "schweitzer-bach.jpg",
    wtc: "schweitzer-wtc.jpg",
    lambarene: "schweitzer-lambarene.jpg",
  },
  tear: 30.0,
  end: ending(46.5),

  past: {
    board: "#e3dac6",
    camera: [
      [0, 0, -40, 1.08, 1], [4.6, 0, 20, 1, 0],
      [5.6, -30, 1770, 1.144, -1], [10.6, -50, 1820, 1.21, 0],
      [11.6, 90, 3690, 1.122, 1], [17, 80, 3740, 1.188, 0],
      [17.8, -60, 5590, 1.1, -1], [23.4, -60, 5640, 1.166, 0],
      [24.2, 40, 7490, 1.1, 1], [30, 40, 7550, 1.177, 0],
    ],
    pieces: [
      // ── The founder ──
      img("wtc", -290, -430, 460, { rot: -8, enter: "none", fy: 0.15, h: 560 }),
      paper(WALNUT, 220, -170, 620, 940, { rot: 3, enter: "none" }),
      paper(TEAL, -320, 380, 380, 280, { rot: -5, enter: "none" }),
      img("portrait", 30, -260, 540, { rot: -2, at: 0.7, fy: 0.25 }),
      tape(-190, -610, 170, { rot: -36, at: 1.0 }),
      tape(260, -620, 170, { rot: 32, at: 1.1 }),
      ransom("ALBERT", -20, 250, 112, { at: 1.6 }),
      ransom("SCHWEITZER", 10, 385, 98, { at: 2.0, stagger: 0.05 }),
      label("ORGANIST", -330, -480, { ...TYPE, rot: -6, at: 2.8 }),
      label("BACH SCHOLAR", 320, -340, { ...TYPE, rot: 5, at: 3.1 }),
      label("THEOLOGIAN", -320, -130, { ...TYPE, rot: 4, at: 3.4 }),
      label("PHYSICIAN", 330, 30, { ...TYPE, rot: -5, at: 3.7 }),

      // ── Strasbourg: the organ, and a turn to medicine ──
      img("bach", 0, 1720, 760, { rot: -2, at: 5.4, h: 600, fy: 0.2 }),
      shape("pipes", -250, 1950, 330, OCHRE, { aspect: 1.1, rot: -3, at: 6.2, d: 1.06 }),
      label("J. S. BACH · BWV 614 · in Bach’s own hand", 70, 2050, { font: "IM Fell English", size: 26, italic: true, bg: CREAM, rot: 2, at: 6.9 }),
      ransom("1905", 140, 1400, 150, { at: 8.4 }),
      shape("cross", 300, 1580, 110, RUST, { rot: 6, at: 9.0 }),
      label("FACULTY OF MEDICINE", 160, 1680, { ...TYPE, size: 28, rot: 4, at: 9.4 }),

      // ── 1913: Lambaréné ──
      paper(TEAL, 0, 3660, 760, 820, { rot: 2, at: 11.7 }),
      ransom("1913", -105, 3310, 150, { at: 12.1 }),
      img("lambarene", 40, 3600, 520, { rot: -3, at: 12.6, h: 560, fy: 0.4 }),
      label("LAMBARÉNÉ · OGOOUÉ RIVER", 10, 3880, { ...TYPE, rot: 2, at: 13.4 }),
      hand("with Hélène, a nurse", -120, 3950, { at: 14.0, size: 54, rot: -2 }),
      label("first consulting room: a chicken coop", 110, 4015, { font: "IM Fell English", size: 30, italic: true, bg: CREAM, rot: -1, at: 15.4 }),

      // ── Paid for in Bach ──
      img("concert", 30, 5520, 760, { rot: 2, at: 17.9, h: 520 }),
      shape("note", -330, 5240, 120, INK, { aspect: 1.3, rot: -12, at: 18.6, d: 1.1 }),
      shape("note", 330, 5180, 100, RUST, { aspect: 1.3, rot: 14, at: 18.9, d: 1.1 }),
      label("ORGAN RECITAL", -150, 5820, { font: "Rye", size: 44, bg: "#f2e3c2", color: RUST, rot: -3, at: 19.5 }),
      label("in aid of the hospital at Lambaréné", 90, 5880, { font: "IM Fell English", size: 30, italic: true, bg: "#f2e3c2", rot: -3, at: 20.0 }),
      paper(BONE, 160, 5200, 400, 160, { rot: 4, at: 21.4, edges: "cccc" }),
      label("A PEDAL PIANO FOR THE TROPICS", 160, 5180, { font: "Special Elite", size: 22, bg: "none", rot: 4, at: 21.6, enter: "none" }),
      label("gift of the Paris Bach Society", 160, 5225, { font: "IM Fell English", size: 24, italic: true, bg: "none", rot: 4, at: 21.6, enter: "none" }),
      tape(-10, 5140, 120, { rot: -40, at: 21.5 }),

      // ── It grows; the prize ──
      img("organ", -200, 7420, 440, { rot: -4, at: 24.4 }),
      shape("house", 210, 7300, 220, BONE, { aspect: 0.72, rot: 3, at: 24.9 }),
      shape("house", 300, 7470, 180, CREAM, { aspect: 0.72, rot: -2, at: 25.1 }),
      shape("house", 130, 7490, 200, "#d9c9a4", { aspect: 0.72, rot: 4, at: 25.3 }),
      ransom("1952", 40, 7720, 150, { at: 27.2 }),
      disc(-260, 7860, 90, { color: "#d8b45a", at: 27.8, rim: "#f3e2b0" }),
      label("THE NOBEL PEACE PRIZE", 0, 7845, { ...TYPE, rot: -2, at: 28.2 }),
    ],
    captions: [
      say(0.4, 4.7, 248, [{ text: "the polymath founder · no. 4", font: "Major Mono Display", size: 30, bg: INK, color: "#f3ede2" }]),
      say(5.8, 8.3, 1390, ["Strasbourg. An organist,", "a Bach scholar, a theologian."]),
      say(8.4, 11.0, 1390, ["At thirty, he starts medical school,", { text: "to serve as a doctor in Africa.", it: true }]),
      say(12.0, 14.6, 1390, ["1913. Lambaréné, in today’s Gabon,", "with his wife Hélène, a nurse."]),
      say(14.7, 17.1, 1390, ["His first consulting room:", { text: "a former chicken coop.", it: true }]),
      say(18.0, 20.6, 1390, ["To pay for it, he plays Bach:", "organ recitals across Europe,"]),
      say(20.7, 23.4, 1390, ["lectures, and books.", { text: "Art, sustaining medicine.", it: true }]),
      say(24.5, 27.0, 1390, ["The hospital grows", { text: "to dozens of buildings.", it: true }]),
      say(27.3, 29.8, 1390, ["The Nobel Peace Prize, for 1952:", { text: "its money goes to a leprosarium.", it: true }]),
    ],
  },

  now: {
    board: "#eceae5",
    camera: [[30.0, 0, 40, 1.06, 0], [34.2, 0, 10, 1.0, 0], [38.2, 0, -10, 0.98, 0], [42.2, 0, -30, 1.0, 0], [46.5, 0, -40, 1.02, 0]],
    pieces: [
      paper("#B8DDD8", 250, -380, 540, 700, { rot: 4, at: 30.25, edges: "tcct" }),
      paper("#C4DDB8", -280, 280, 540, 620, { rot: -3, at: 30.4, edges: "cttc" }),
      ransom("TODAY", 0, -560, 170, { at: 30.7, out: 34.3, papers: [["#f8f4ec", INK], ["#b87758", "#fffaf2"], ["#B8DDD8", INK], ["#1b1613", "#f8f4ec"], ["#B8CAE0", INK]] }),
      ...programs("Albert Schweitzer", ["the clinic", "cross"], ["the concerts", "note"], ["the books", "book"], ["the patrons", "heart"]),
      stamp("GIFTS\nRECEIPTED", -110, -195, { size: 34, rot: -8, at: 38.7 }),
      stamp("CONTRACTS\nSIGNED", 120, -95, { size: 34, rot: 6, at: 39.3, color: "#3f5f8a" }),
      stamp("INSURED", -100, 5, { size: 34, rot: 4, at: 39.9 }),
      stamp("BOOKS\nKEPT", 130, 100, { size: 34, rot: -5, at: 40.5, color: "#3f5f8a" }),
      disc(0, -640, 150, { key: "star", orbit: "star", at: 42.6, fy: 0.3 }),
      hand("back to the patients", 150, -470, { at: 43.4, size: 50, rot: -5 }),
    ],
    captions: [
      say(31.0, 34.2, 1390, ["Today, a musician-doctor", "could build the same way."]),
      say(34.8, 38.2, 1390, ["Audiences become patrons, giving", { text: "through a fiscal sponsor.", it: true }]),
      say(38.8, 42.2, 1390, ["The sponsor signs, insures,", "and keeps the books."]),
      say(42.8, 46.3, 1390, ["Mulvium is building that home", { text: "for the next Schweitzer.", it: true, bg: "#b87758", color: "#fffaf2" }]),
    ],
  },
};

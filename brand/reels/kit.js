// kit.js — the vocabulary the four polymath reels are written in. Each story
// (stories/*.js) is plain data built with these helpers, so the page can draw
// it and the score (score.py, through dump.mjs) can hear it: every scrap that
// lands, every stamp and every tear is a sound at the same moment.
//
// A piece sits on the collage board at (x, y), in board pixels (the frame is
// 1080 × 1920 board pixels at zoom 1), turned rot degrees, and lands at `at`
// seconds. `enter` is how it arrives:
//   slap    dropped onto the board from just above it (the default)
//   slide   pushed in from off the frame, along `from` degrees
//   unfold  opened out from a fold
//   stamp   pressed down, hard
//   draw    drawn on, over `dur` seconds (ink and handwriting)
//   grow    scaled up from its centre (cut circles)
//   none    already there
// d is depth: above 1 nearer the lens (it moves more as the camera moves).

let seq = 0;
const piece = (kind, x, y, o) => ({ kind, x, y, rot: 0, at: 0, enter: "slap", d: 1, seed: ++seq, ...o });

// An archival scrap: a public-domain picture (assets/, from prep.py), torn
export const img = (key, x, y, w, o = {}) => piece("img", x, y, { key, w, edges: "tttt", ...o });
// Coloured paper, torn or cut
export const paper = (color, x, y, w, h, o = {}) => piece("paper", x, y, { color, w, h, edges: "tttt", ...o });
// A circle cut with scissors, of paper or from a picture
export const disc = (x, y, r, o = {}) => piece("disc", x, y, { r, enter: "grow", ...o });
// Words on a strip of paper
export const label = (text, x, y, o = {}) => piece("label", x, y, { text, size: 40, font: "Lora", ...o });
// Words cut letter by letter from many faces (a date, a name)
export const ransom = (text, x, y, size, o = {}) => piece("ransom", x, y, { text, size, ...o });
// Handwriting, written on
export const hand = (text, x, y, o = {}) => piece("hand", x, y, { text, size: 64, enter: "draw", dur: 0.9, color: "#8f4e33", ...o });
// A rubber stamp
export const stamp = (text, x, y, o = {}) => piece("stamp", x, y, { text, size: 44, color: "#a8432e", enter: "stamp", ...o });
// Masking tape
export const tape = (x, y, w, o = {}) => piece("tape", x, y, { w, h: 46, enter: "slap", ...o });
// A cut-paper silhouette (the shapes in reel.js's SHAPES)
export const shape = (name, x, y, w, color, o = {}) => piece("shape", x, y, { name, w, color, ...o });
// A pencil or ink line, drawn on: points relative to (x, y)
// Lamplight on the paper
export const glow = (x, y, r, o = {}) => piece("glow", x, y, { r, enter: "fade", ...o });
export const ink = (pts, x, y, o = {}) => piece("ink", x, y, { pts, enter: "draw", dur: 0.7, color: "#8f4e33", width: 6, ...o });
export const ring = (x, y, rx, ry, o = {}) => ink(ellipsePts(rx, ry, o.turns || 1.08), x, y, o);
export const arrow = (x0, y0, x1, y1, o = {}) => ink(arrowPts(x0, y0, x1, y1, o.bend || 0.18), 0, 0, o);

function ellipsePts(rx, ry, turns) {
  const out = [];
  for (let i = 0; i <= 48; i++) {
    const a = -2.2 + (turns * 2 * Math.PI * i) / 48;
    const w = 1 + 0.04 * Math.sin(i * 0.7);
    out.push([Math.cos(a) * rx * w, Math.sin(a) * ry * w]);
  }
  return out;
}
function arrowPts(x0, y0, x1, y1, bend) {
  const out = [], mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    out.push([(1 - s) ** 2 * x0 + 2 * s * (1 - s) * mx + s * s * x1, (1 - s) ** 2 * y0 + 2 * s * (1 - s) * my + s * s * y1]);
  }
  // the head, as a pen would add it: back up one side, then down the other
  const a = Math.atan2(y1 - my, x1 - mx), L = 34;
  out.push(null, [x1 + Math.cos(a + 2.6) * L, y1 + Math.sin(a + 2.6) * L], [x1, y1], [x1 + Math.cos(a - 2.6) * L, y1 + Math.sin(a - 2.6) * L]);
  return out;
}

// Captions: lines on paper strips, set in the frame (not on the board), each
// line landing in turn. y is the top of the first line, in frame pixels.
export const say = (t0, t1, y, lines, o = {}) => ({ t: [t0, t1], y, lines: lines.map((l) => (typeof l === "string" ? { text: l } : l)), ...o });

// The agreement, and the four programs it holds: each a circle that will
// become one of the cosmos's spheres
export function programs(...four) {
  const at = [35.0, 35.5, 36.0, 36.5];
  const spots = [[-330, -430, -4], [340, -370, 3], [-340, 165, 3], [350, 190, -3]];
  const colors = ["#C4DDB8", "#B8CAE0", "#E0B8C8", "#B8DDD8"];
  return [
    paper("#fbf8f1", 0, -40, 540, 560, { rot: -1.5, at: 34.4, edges: "cccc", enter: "slide", from: 90 }),
    label("FISCAL SPONSORSHIP AGREEMENT", 0, -270, { font: "Special Elite", size: 28, bg: "none", rot: -1.5, at: 34.6, enter: "none" }),
    ink([[-200, 0], [200, -4]], 0, -232, { at: 34.7, dur: 0.3, width: 3, color: "#1b1613", alpha: 0.6 }),
    ...four.flatMap(([name, icon], i) => {
      const [x, y, r] = spots[i];
      return [
        disc(x, y, 118, { color: colors[i], icon, orbit: i, at: at[i] }),
        label(name, x, y + 150, { font: "Special Elite", size: 28, bg: "#fbf8f1", rot: r, at: at[i] + 0.2 }),
      ];
    }),
  ];
}

// The close every reel shares: the collage gathers into the landing page's
// cosmos, a question rises over it, and the wordmark turns through its faces
// to its own. h is the moment the collage begins to gather.
export function ending(h) {
  return {
    hero: h,                       // scraps fly, circles find their orbits
    reveal: [h + 1.0, h + 2.2],    // the board lifts away from the cosmos
    ask: h + 1.6,                  // "Who starts a single-person institution?"
    answer: h + 3.3,               // "A polymath."
    wordmark: h + 5.3,
    cycle: [h + 5.9, h + 9.3],
    settle: [h + 9.3, h + 10.3],
    cta: h + 10.8,
    duration: h + 14.0,
  };
}

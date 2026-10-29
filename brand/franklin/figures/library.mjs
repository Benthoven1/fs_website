// library.mjs — Fig. 2, the subscription library as a machine. Fifty coin
// stacks on a tray (the subscribers, 40 shillings each) run down one rail
// into a hopper on a strongbox (the pooled fund, £100), and the fund fills a
// bookcase (the collection). One tray, one box, one case: many small
// payments, one shared library.
import { k, writeFigure, screen, build, LIFT } from "./common.mjs";

const W = 1000, H = 760;
const PLATE = { x: -92, y: -204, w: 184, d: 408, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const TRAY = { x: -72, y: 58, w: 144, d: 132, r: 4 };
const TRAY_H = 5;
const COLS = 5, ROWS = 10, GAP_X = 26, GAP_Y = 12.4, COIN_R = 4.2, COIN_H = 1.4, PER_STACK = 4;
const BOX = { x: -36, y: -44, w: 72, d: 70, r: 3 };
const BOX_H = 48;
const HOPPER = [0, -9];
const CASE = { x: -40, y: -190, w: 44, d: 124, r: 2 };
const CASE_H = 112;
const SHELVES = [0, 36, 72];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [CASE.x, CASE.y, CASE_H + 4], [CASE.x + CASE.w, CASE.y + CASE.d, CASE_H + 4], [HOPPER[0], HOPPER[1], BOX_H + 30]],
  W, H, { pad: 40, azimuth: 52 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a ruled strip along the front (+x) edge, and a label plate
  const strip = { x: PLATE.x + PLATE.w - 14, y: -146, w: 7, d: 330, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.y + 4, strip.y + strip.d - 4, 5, 5, strip.x + 0.8, 0.6, [2, 3.6], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const label = { x: PLATE.x + PLATE.w - 18, y: -196, w: 11, d: 40, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2 + 1.1, label.y + label.d / 2], 0.8, P, "y"), "LIBRARY CO. 1731", { size: 3.1, tone: "mid", anchor: "middle" }));
  return out.join("");
}

// The tray of subscriptions: fifty stacks of four coins
const stacks = [];
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++)
  stacks.push([TRAY.x + 20 + c * GAP_X, TRAY.y + 10 + r * GAP_Y]);
function tray() {
  const out = [S(k.slabOf(TRAY, 0, TRAY_H, P, 6, 0.8), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3), TRAY_H, P), { tone: "faint" }));
  // the rail the coins leave by, from the tray's front edge to the hopper
  return out.join("");
}
function stackSvg([x, y], i) {
  const parts = [];
  for (let n = 0; n < PER_STACK; n++)
    parts.push(S(k.cylinder(x, y, COIN_R, TRAY_H + n * COIN_H, COIN_H - 0.15, P, 24), { tone: "mid", crease: "none" }));
  parts.push(L(k.ring(x, y, COIN_R - 1.4, TRAY_H + PER_STACK * COIN_H - 0.15, P, 20), { tone: "faint" }));
  return build(3 + i * 0.03, `<g data-part="coin${i}">${parts.join("")}</g>`);
}

function rail() {
  const out = [];
  const r = { x: -5, y: BOX.y + BOX.d, w: 10, d: TRAY.y - BOX.y - BOX.d + 2, r: 1 };
  out.push(S(k.slabOf(r, 0, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([0, r.y + 3], [0, r.y + r.d - 3], 3, P), { tone: "faint" }));
  out.push(D([at([0, r.y + 4, 3]), at([0, r.y + r.d - 4, 3])], { size: 0.45 }));
  return out.join("");
}

function strongbox() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BOX, 0, 1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(BOX, 0, BOX_H - 8, P, 5, 0.8), { tone: "hi" }));
  out.push(L(k.sideSeam(BOX, 12, P), { tone: "faint" }));
  // the lid, a little proud of the body
  const lid = { x: BOX.x - 2, y: BOX.y - 2, w: BOX.w + 4, d: BOX.d + 4, r: 4 };
  out.push(S(k.slabOf(lid, BOX_H - 8, 8, P, 5, 1), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(lid, 4), BOX_H, P), { tone: "faint" }));
  // hasp and keyhole on the front (+x) face
  const fx = BOX.x + BOX.w;
  out.push(S(k.slabOf({ x: fx, y: -5, w: 1.6, d: 10, r: 0.6 }, BOX_H - 18, 14, P, 2), { tone: "hi" }));
  out.push(D([at([fx + 1.6, 0, BOX_H - 12])], { size: 0.9, tone: "hi" }));
  // corner straps
  for (const y of [BOX.y + 6, BOX.y + BOX.d - 6])
    out.push(L(k.segment([fx, y, 2], [fx, y, BOX_H - 9], P), { tone: "lo" }));
  // the hopper on the lid: a wide collar over a neck
  const body = out.splice(0).join("");
  const [hx, hy] = HOPPER;
  out.push(S(k.cylinder(hx, hy, 9, BOX_H, 6, P, 36, 0.6), { tone: "hi" }));
  out.push(S(k.cylinder(hx, hy, 22, BOX_H + 6, 10, P, 48, 0.8), { tone: "hi" }));
  out.push(L(k.ring(hx, hy, 18.5, BOX_H + 16, P, 48), { tone: "lo" }));
  out.push(L(k.ring(hx, hy, 9, BOX_H + 16, P, 32), { tone: "mid" }));
  out.push(D(byDepth(Array.from({ length: 8 }, (_, i) => [hx + Math.cos(i * Math.PI / 4) * 20.2, hy + Math.sin(i * Math.PI / 4) * 20.2])).map(([x, y]) => at([x, y, BOX_H + 16])), { size: 0.45 }));
  return build(1.6, body) + build(2.1, out.join(""));
}

// The bookcase: two sides, a back, three shelves and a cornice
const books = [];
SHELVES.forEach((z, s) => {
  let y = CASE.y + 6;
  let n = 0;
  while (y < CASE.y + CASE.d - 10) {
    const d = 4 + ((s * 7 + n * 3) % 4) * 1.2, h = 22 + ((s * 5 + n * 7) % 5) * 2.2;
    books.push({ plan: { x: CASE.x + 6, y, w: CASE.w - 12, d, r: 0.6 }, z: z + 6, h, shelf: s });
    y += d + 0.6;
    n++;
  }
});
function bookcase() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(CASE, 0, 1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: 5, d: CASE.d, r: 1 }, 0, CASE_H, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: 5, r: 1 }, 0, CASE_H, P, 3, 0.5), { tone: "mid" }));
  SHELVES.forEach((z, s) => {
    out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d, r: 1 }, z, 6, P, 3, 0.5), { tone: "mid" }));
    out.push(L(k.lineOnTop([CASE.x + 2, CASE.y + 3], [CASE.x + 2, CASE.y + CASE.d - 3], z + 6, P), { tone: "faint" }));
    const row = books.filter((b) => b.shelf === s).map((b, i) => `<g data-part="book${s}-${i}">${S(k.slabOf(b.plan, b.z, b.h, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" })}</g>`);
    out.push(`<g data-part="shelf${s}">${row.join("")}</g>`);
  });
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: CASE.d, r: 1 }, CASE_H - 6, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x - 2, y: CASE.y - 2, w: CASE.w + 4, d: CASE.d + 4, r: 1.6 }, CASE_H, 4, P, 3, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y + CASE.d - 5, w: CASE.w, d: 5, r: 1 }, 0, CASE_H - 6, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([CASE.x + CASE.w, CASE.y + CASE.d - 2.5, 20]), at([CASE.x + CASE.w, CASE.y + CASE.d - 2.5, 90])], { size: 0.45 }));
  return out.join("");
}

// Painter's order, back (-y) to front (+y): the case, the box and its
// hopper, the rail, then the tray and its stacks, each back to front
const order = stacks.map((p, i) => ({ p, i })).sort((a, b) => k.depthOf([...a.p, 0], P) - k.depthOf([...b.p, 0], P));
const body = [build(0, plate()), build(1, bookcase()), strongbox(), build(2.4, rail()), build(2.7, tray()), ...order.map(({ p, i }) => stackSvg(p, i))];

// Moves: each stack rides to the hopper's mouth and drops in; each shelf of
// books slides in from behind the case
const moves = {
  coins: stacks.map(([x, y]) => screen(P, [HOPPER[0] - x, HOPPER[1] - y, BOX_H + 18 - TRAY_H])),
  coinsDrop: screen(P, [0, 0, -14]),
  shelfIn: screen(P, [-34, 0, 0]),
  lift: screen(P, [0, 0, LIFT]),
};

writeFigure("library", {
  width: W, height: H, accent: "library",
  label: "Fifty stacks of coins on a tray run down a rail into the hopper of a strongbox, and the box fills a bookcase: fifty subscriptions pooled into one library.",
  body, moves,
});

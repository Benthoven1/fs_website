// grant.mjs — Fig. 4, the matching grant as a machine. Two coin columns on
// one plinth. The donors' column builds coin by coin up a measured post; at
// the £2,000 mark the top coin lifts a paddle, the paddle's rod pulls the
// latch on the other column, and the Assembly's £2,000, held there all
// along, drops onto its platform. Twenty coins of £100 a side.
import { k, writeFigure, screen, build, LIFT } from "./common.mjs";

const W = 1000, H = 760;
const PLATE = { x: -70, y: -120, w: 140, d: 240, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const COIN_R = 17, COIN_H = 4, COINS = 20, PLAT_Z = 16;
const COLS = { donors: [6, 56], assembly: [6, -56] };
const TOP = PLAT_Z + COINS * COIN_H;          // the £2,000 mark
const BAR_Z = TOP + 34;                         // the crossbar over each column
const HELD = 22;                                // how high the Assembly's stack hangs

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -56, BAR_Z + 10], [0, 56, BAR_Z + 10]], W, H, { pad: 70, azimuth: 50 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a centre groove between the two columns, as if the plinth were two halves joined
  out.push(L(k.lineOnTop([PLATE.x + 8, 0], [PLATE.x + PLATE.w - 8, 0], 0, P), { tone: "faint" }));
  // engraved plates in front of each column
  for (const [name, [, y]] of Object.entries(COLS)) {
    const label = { x: PLATE.x + PLATE.w - 18, y: y - 20, w: 10, d: 40, r: 1.2 };
    out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
    out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2 + 1.1, label.y + label.d / 2], 0.8, P, "y"), name === "donors" ? "PRIVATE DONORS" : "THE ASSEMBLY", { size: 3, tone: "mid", anchor: "middle" }));
  }
  return out.join("");
}

// One column: a pedestal, a platform, two posts behind the coins, a crossbar
function column([cx, cy], side) {
  const out = [];
  out.push(S(k.cylinder(cx, cy, 24, 0, 6, P, 48, 0.8), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 10, 6, PLAT_Z - 9, P, 32), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, COIN_R + 3, PLAT_Z - 3, 3, P, 48, 0.6), { tone: "mid" }));
  out.push(L(k.ring(cx, cy, COIN_R + 1, PLAT_Z, P, 48), { tone: "faint" }));
  // two posts at the back of the column
  for (const dy of [-COIN_R - 3, COIN_R + 3]) {
    out.push(S(k.cylinder(cx - COIN_R - 4, cy + dy, 2.6, 6, BAR_Z - 6, P, 20), { tone: "mid", crease: "none" }));
  }
  // the measuring strip on the donors' column: one tick a coin, a long one each £500
  if (side === "donors") {
    const strip = { x: cx - COIN_R - 9, y: cy + COIN_R + 6, w: 6, d: 2, r: 0.4 };
    out.push(S(k.slabOf(strip, PLAT_Z, TOP - PLAT_Z + 2, P, 2), { tone: "mid", crease: "none" }));
    const ticks = [];
    for (let n = 0; n <= COINS; n++) {
      const z = PLAT_Z + n * COIN_H, len = n % 5 === 0 ? 4 : 2;
      ticks.push(k.segment([strip.x + strip.w, strip.y + 2, z], [strip.x + strip.w, strip.y + 2 + len, z], P));
    }
    out.push(L(ticks.join(""), { tone: "lo" }));
  }
  return out.join("");
}
function crossbar([cx, cy]) {
  const out = [];
  const bar = { x: cx - COIN_R - 8, y: cy - COIN_R - 7, w: 8, d: 2 * COIN_R + 14, r: 1.2 };
  out.push(S(k.slabOf(bar, BAR_Z, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([bar.x + 4, bar.y + 3, BAR_Z + 6]), at([bar.x + 4, bar.y + bar.d - 3, BAR_Z + 6])], { size: 0.45 }));
  return out.join("");
}

// The coins
const coin = (cx, cy, z, lit) => S(k.cylinder(cx, cy, COIN_R, z, COIN_H - 0.3, P, 48, 0.4), { tone: "hi", lit, crease: "lo" });
function donorCoins() {
  const [cx, cy] = COLS.donors;
  return Array.from({ length: COINS }, (_, n) => `<g data-part="d${n}">${coin(cx, cy, PLAT_Z + n * COIN_H, true)}</g>`).join("");
}
function assemblyStack() {
  const [cx, cy] = COLS.assembly;
  const coins = Array.from({ length: COINS }, (_, n) => coin(cx, cy, PLAT_Z + n * COIN_H, true)).join("");
  // the hanger: a rod from the top coin up through the latch
  const hanger = S(k.cylinder(cx, cy, 2.2, TOP, BAR_Z - TOP - 2, P, 16), { tone: "mid", crease: "none" });
  const cap = S(k.cylinder(cx, cy, 5, BAR_Z - 2, 3, P, 24), { tone: "mid" });
  return `<g data-part="held">${coins}${hanger}${cap}</g>`;
}

// The trip: a paddle over the donors' column at the mark, a rod along the
// back of the plinth's posts to the latch over the Assembly's column
function trip() {
  const [dx, dy] = COLS.donors, [ax, ay] = COLS.assembly;
  const out = [];
  const z = BAR_Z - 10;
  const rod = { x: dx - COIN_R - 11, y: ay, w: 3, d: dy - ay, r: 1.2 };
  out.push(S(k.slabOf(rod, z, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(D([at([rod.x + 1.5, ay, z + 3]), at([rod.x + 1.5, dy, z + 3])], { size: 0.5, tone: "hi" }));
  return out.join("");
}
function paddle() {
  const [dx, dy] = COLS.donors;
  const out = [];
  // a hinged arm from the rod's end, resting just above the mark
  out.push(S(k.slabOf({ x: dx - COIN_R - 9, y: dy - 3, w: COIN_R + 10, d: 6, r: 1.2 }, TOP + 1, 2.4, P, 3), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(dx - COIN_R - 9, dy, 3.2, TOP, 4.4, P, 20), { tone: "mid" }));
  return `<g data-part="paddle">${out.join("")}</g>`;
}
function latch() {
  const [ax, ay] = COLS.assembly;
  const out = [];
  out.push(S(k.slabOf({ x: ax - 6, y: ay - 8, w: 12, d: 16, r: 1.6 }, BAR_Z - 4, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([ax, ay, BAR_Z + 4])], { size: 0.9, tone: "hi" }));
  return `<g data-part="latch">${out.join("")}</g>`;
}

// Painter's order: back column (assembly, -y) before front (donors, +y)
const body = [
  build(0, plate()),
  build(1, column(COLS.assembly, "assembly")),
  build(3, `<g data-part="heldAt" transform="${k.translateAlong(P, [0, 0, HELD])}">${assemblyStack()}</g>`),
  build(2, crossbar(COLS.assembly)), build(2.4, latch()),
  build(2.8, trip()),
  build(1.3, column(COLS.donors, "donors")),
  donorCoins(),
  build(2.2, crossbar(COLS.donors)), build(2.6, paddle()),
];

writeFigure("grant", {
  width: W, height: H, accent: "hospital",
  label: "Two coin columns on one plinth. Coins build up the donors' column; at the £2,000 mark the top coin lifts a paddle whose rod releases a latch, and the Assembly's £2,000, held above its own column, drops onto its platform.",
  body,
  moves: { lift: screen(P, [0, 0, LIFT]), held: screen(P, [0, 0, HELD]), drop: screen(P, [0, 0, -HELD]), paddleUp: screen(P, [0, 0, 3]) },
});

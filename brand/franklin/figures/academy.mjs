// academy.mjs — the Academy's plot. Its foundation, and the hall: stepped
// stone, a brick body with quoins, a base course and a string course, sash
// windows (each a glass recess, a frame, glazing bars, a sill and a keyed
// lintel), a panelled door, a portico of six columns with bases and capitals,
// an entablature with the Academy's green frieze and a row of dentils, a
// pediment with an oculus, a slate roof and a cupola.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, foundation } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -115, y: -110, w: 230, d: 220 }, -19, 130), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const body = [plinth(R), foundation(R, { doc: "charter" })];

const CY = 34, BW = 120, BD = 52, Z0 = 9, BH = 48;
const FY = CY + BD / 2 - 14, SX = BW / 2; // the hall's front face (behind the portico) and its right side
const BY0 = FY - BD;

body.push(R.part("steps", { build: 4, from: "down" }, () => {
  let o = "";
  [[0, 156, 96, "stoneDark"], [3, 150, 90, "stone"], [6, 144, 84, "stoneDark"]].forEach(([z, w, d, m]) => (o += R.box({ x: -w / 2, y: CY - d / 2 + 4, w, d, r: 0.8 }, z, 3, m, { bevel: 0.5 })));
  return o;
}));
body.push(R.part("hall", { build: 4.4, from: "down" }, () => {
  let o = "";
  o += R.box({ x: -SX - 1, y: BY0 - 1, w: BW + 2, d: BD + 2, r: 0.5 }, Z0, 3, "stone", { bevel: 0.4 });
  o += R.box({ x: -SX, y: BY0, w: BW, d: BD, r: 0.4 }, Z0 + 3, BH - 3, "brick", { bevel: 0.3 });
  o += R.box({ x: -SX - 0.8, y: BY0 - 0.8, w: BW + 1.6, d: BD + 1.6, r: 0.4 }, Z0 + 25, 1.8, "trim", { bevel: 0.3 });
  // quoins up the three visible corners, long and short in turn
  for (const [qx, qy] of [[-SX, FY], [SX, FY], [SX, BY0]]) for (let i = 0; i < 7; i++) {
    const z = Z0 + 3 + i * 6.3, L = i % 2 ? 4 : 7;
    o += R.box({ x: qx - (qx > 0 ? (qy === FY ? 3.4 : 3.4) : 0) - (qx < 0 ? 0.4 : 0), y: qy - (qy === FY ? 3.4 : 0), w: qx > 0 ? 3.8 : 3.8, d: 3.8, r: 0.2 }, z, 5.6, "trim", { bevel: 0.2 });
    if (qy === FY) o += R.box({ x: qx - (qx > 0 ? L : 0), y: qy, w: L, d: 0.5, r: 0.1 }, z, 5.6, "trim", { bevel: 0.1 });
  }
  return o;
}));
// sash windows: front face (y = FY) and right side (x = SX)
function windowFront(x, z) {
  let o = "";
  o += R.box({ x: x - 5, y: FY - 0.3, w: 10, d: 0.5, r: 0.1 }, z, 14, "glass", { bevel: 0.05 });
  for (const [a, b, w, h] of [[-5.8, 0, 11.6, 1], [-5.8, 13.4, 11.6, 1], [-5.8, 0, 1, 14.4], [4.8, 0, 1, 14.4]]) o += R.box({ x: x + a, y: FY, w, d: 0.9, r: 0.1 }, z + b, h, "trim", { bevel: 0.1 });
  o += R.box({ x: x - 0.3, y: FY, w: 0.6, d: 0.5, r: 0.05 }, z + 1, 12.4, "trim", { bevel: 0.05 });
  o += R.box({ x: x - 4.8, y: FY, w: 9.6, d: 0.5, r: 0.05 }, z + 6.9, 0.6, "trim", { bevel: 0.05 });
  o += R.box({ x: x - 6.6, y: FY, w: 13.2, d: 2.2, r: 0.2 }, z - 1.4, 1.4, "stone", { bevel: 0.2 });
  o += R.box({ x: x - 6.4, y: FY, w: 12.8, d: 0.8, r: 0.1 }, z + 14.4, 1.8, "brickDark", { bevel: 0.1 });
  o += R.box({ x: x - 1.2, y: FY, w: 2.4, d: 1.1, r: 0.1 }, z + 14.2, 2.6, "trim", { bevel: 0.1 });
  return o;
}
function windowSide(y, z) {
  let o = "";
  o += R.box({ x: SX - 0.2, y: y - 5, w: 0.5, d: 10, r: 0.1 }, z, 14, "glass", { bevel: 0.05 });
  for (const [a, b, d, h] of [[-5.8, 0, 11.6, 1], [-5.8, 13.4, 11.6, 1], [-5.8, 0, 1, 14.4], [4.8, 0, 1, 14.4]]) o += R.box({ x: SX, y: y + a, w: 0.9, d, r: 0.1 }, z + b, h, "trim", { bevel: 0.1 });
  o += R.box({ x: SX, y: y - 0.3, w: 0.5, d: 0.6, r: 0.05 }, z + 1, 12.4, "trim", { bevel: 0.05 });
  o += R.box({ x: SX, y: y - 4.8, w: 0.5, d: 9.6, r: 0.05 }, z + 6.9, 0.6, "trim", { bevel: 0.05 });
  o += R.box({ x: SX, y: y - 6.6, w: 2.2, d: 13.2, r: 0.2 }, z - 1.4, 1.4, "stone", { bevel: 0.2 });
  o += R.box({ x: SX, y: y - 6.4, w: 0.8, d: 12.8, r: 0.1 }, z + 14.4, 1.8, "brickDark", { bevel: 0.1 });
  o += R.box({ x: SX, y: y - 1.2, w: 1.1, d: 2.4, r: 0.1 }, z + 14.2, 2.6, "trim", { bevel: 0.1 });
  return o;
}
body.push(R.part("windows", { build: 4.8, from: "front", dist: 120 }, () => {
  let o = "";
  for (const z of [Z0 + 7, Z0 + 30]) {
    for (const x of [-44, -22, 22, 44]) o += windowFront(x, z);
    for (const y of [BY0 + 12, BY0 + 26, BY0 + 40]) o += windowSide(y, z);
  }
  o += windowFront(0, Z0 + 30);
  return o;
}));
body.push(R.part("door", { build: 4.9, from: "front", dist: 120 }, () => {
  let o = "";
  o += R.box({ x: -8, y: FY, w: 16, d: 1, r: 0.2 }, Z0 + 3, 21, "trim", { bevel: 0.2 });
  for (const sx of [-1, 1]) {
    o += R.box({ x: sx < 0 ? -6.4 : 0.2, y: FY + 0.4, w: 6.2, d: 0.8, r: 0.2 }, Z0 + 3, 16, "walnut", { bevel: 0.2 });
    for (const z of [Z0 + 5, Z0 + 11]) o += R.box({ x: (sx < 0 ? -6.4 : 0.2) + 1, y: FY + 1.2, w: 4.2, d: 0.3, r: 0.1 }, z, 4.4, "walnutLight", { bevel: 0.1 });
  }
  o += R.box({ x: -6.4, y: FY + 0.4, w: 12.8, d: 0.5, r: 0.1 }, Z0 + 19.4, 3.6, "glass", { bevel: 0.05 });
  o += R.dots([[-1.2, FY + 1.3, Z0 + 11], [1.2, FY + 1.3, Z0 + 11]], "brass", { size: 0.5, normal: "y" });
  return o;
}));
// the portico: six columns on the top step
const CX = [-50, -30, -10, 10, 30, 50], COLY = CY + 38, CT = Z0 + BH;
CX.forEach((x, i) => body.push(R.part(`col${i}`, { build: 5 + i * 0.08, from: "up", dist: 220 }, () => {
  let o = "";
  o += R.box({ x: x - 4.8, y: COLY - 4.8, w: 9.6, d: 9.6, r: 0.4 }, Z0, 1.6, "stone", { bevel: 0.3 });
  o += R.cyl(x, COLY, 4.6, Z0 + 1.6, 1.6, "trim", { seg: 28 });
  o += R.cyl(x, COLY, 3.9, Z0 + 3.2, CT - Z0 - 7.4, "trim", { r2: 3.4, seg: 28 });
  o += R.cyl(x, COLY, 4.4, CT - 4.2, 1.6, "trim", { seg: 28 });
  o += R.box({ x: x - 4.9, y: COLY - 4.9, w: 9.8, d: 9.8, r: 0.3 }, CT - 2.6, 2.6, "trim", { bevel: 0.3 });
  return o;
})));
body.push(R.part("entablature", { build: 5.6, from: "up", dist: 240 }, () => {
  let o = "";
  const y0 = BY0 - 1.5, d = COLY + 5.5 - y0;
  o += R.box({ x: -SX - 1.5, y: y0, w: BW + 3, d, r: 0.4 }, CT, 3, "trim", { bevel: 0.3 });
  o += R.box({ x: -SX - 1, y: y0 + 0.5, w: BW + 2, d: d - 1, r: 0.3 }, CT + 3, 4, "acc", { bevel: 0.3 });
  for (let i = 0; i < 26; i++) o += R.box({ x: -SX + 1 + i * 4.6, y: y0 + d - 0.2, w: 2.2, d: 1.4, r: 0.1 }, CT + 7, 1.6, "trim", { bevel: 0.1 });
  o += R.box({ x: -SX - 3.5, y: y0 - 2, w: BW + 7, d: d + 4, r: 0.6 }, CT + 8.6, 2.8, "trim", { bevel: 0.6 });
  return o;
}));
// the pediment over the portico, an oculus in it; the slate roof behind
const RZ = CT + 11.4;
body.push(R.part("pediment", { build: 5.9, from: "up", dist: 240 }, () =>
  R.prism([[-SX - 2, RZ], [SX + 2, RZ], [0, RZ + 20]], COLY - 12, COLY + 5, "trim") +
  R.rod([0, COLY + 5, RZ + 7.5], "y", 0.6, 3.2, "glass", { seg: 24 }) +
  R.torus(0, COLY + 5.6, RZ + 7.5, 3.4, 0.5, "trim", { axis: "y" })));
body.push(R.part("roof", { build: 6.1, from: "up", dist: 260 }, () =>
  R.prism([[-SX - 1, RZ], [SX + 1, RZ], [0, RZ + 19]], BY0 - 2, COLY - 12, "slate") +
  R.line([[0, BY0 - 2, RZ + 19], [0, COLY - 12, RZ + 19]], "lo")));
body.push(R.part("cupola", { build: 6.4, from: "up", dist: 300 }, () => {
  const cy = (BY0 + COLY) / 2 - 8, z = RZ + 14;
  let o = R.box({ x: -10, y: cy - 10, w: 20, d: 20, r: 0.6 }, z, 8, "trim", { bevel: 0.4 });
  for (const [x, y] of k.corners({ x: -9, y: cy - 9, w: 18, d: 18 }, 1.2)) o += R.box({ x: x - 1.2, y: y - 1.2, w: 2.4, d: 2.4, r: 0.2 }, z + 8, 9, "trim", { bevel: 0.2 });
  o += R.box({ x: -6, y: cy - 6, w: 12, d: 12, r: 0.3 }, z + 8, 9, "glass", { bevel: 0.1 });
  o += R.box({ x: -11, y: cy - 11, w: 22, d: 22, r: 0.6 }, z + 17, 2, "trim", { bevel: 0.4 });
  o += R.cyl(0, cy, 9, z + 19, 8, "acc", { r2: 2.5, seg: 36 });
  o += R.cyl(0, cy, 0.7, z + 27, 6, "brass", { seg: 10 });
  o += R.cyl(0, cy, 1.6, z + 30, 1.6, "brass", { seg: 14 });
  return o;
}));

writeFigure("academy", { width: W, height: H, accent: "academy", label: "The Academy's plot: its foundation and a brick hall with a portico, pediment, roof and cupola.", body });
writeParts("academy", R.parts);

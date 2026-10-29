// project.mjs — the new project: a plot in front of the hub, wired to it
// before anything stands on it, so its foundation is already there. A
// scaffold goes up, and inside it the project's own building rises storey by
// storey (placed by the film: "while the founder does the work").
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -80, y: -80, w: 160, d: 160 }, -19, 110), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const PW = 150;
const body = [plinth(R, { w: PW, d: PW })];
// the socket at the back, where the hub's conduit arrives
body.push(R.part("socket", { build: 1, from: "down" }, () =>
  R.box({ x: -12, y: -PW / 2 + 4, w: 24, d: 14, r: 1 }, 0, 1.6, "acc", { bevel: 0.4 }) +
  R.dots(k.corners({ x: -12, y: -PW / 2 + 4, w: 24, d: 14 }, 2.4).map(([x, y]) => [x, y, 1.6]), "brass", { size: 0.8 })));
// the scaffold: four standards on base plates, two lifts of ledgers, a brace, boards
const SX = 40, SY = 34, SH = 96;
body.push(R.part("scaffold", { build: 2, from: "up", dist: 200 }, () => {
  let o = "";
  for (const [x, y] of k.corners({ x: -SX, y: -SY, w: 2 * SX, d: 2 * SY }, 0)) {
    o += R.box({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0.4 }, 0, 1, "iron", { bevel: 0.2 });
    o += R.cyl(x, y, 1.2, 1, SH, "iron", { seg: 10 });
  }
  for (const z of [36, 72]) {
    for (const y of [-SY, SY]) o += R.rod([-SX, y, z], "x", 2 * SX, 1, "iron", { seg: 10 });
    for (const x of [-SX, SX]) o += R.rod([x, -SY, z], "y", 2 * SY, 1, "iron", { seg: 10 });
    o += R.box({ x: -SX, y: SY - 9, w: 2 * SX, d: 9, r: 0.3 }, z + 1, 1.2, "oakLight", { bevel: 0.2 });
    for (let i = 1; i < 6; i++) o += R.line([[-SX + i * (2 * SX / 6), SY - 9, z + 2.22], [-SX + i * (2 * SX / 6), SY, z + 2.22]], "lo");
  }
  o += R.box({ x: SX - 0.6, y: -SY, w: 1.2, d: 2 * SY * 1.25, r: 0.4 }, 4, 1.2, "iron", { rot: { axis: "x", deg: 46, at: [SX, -SY, 4] } });
  // a ladder up the front right
  for (const x of [SX + 3, SX + 11]) o += R.box({ x: x - 0.8, y: SY + 2, w: 1.6, d: 1.6, r: 0.3 }, 0, 80, "oak", { bevel: 0.2 });
  for (let z = 8; z < 80; z += 9) o += R.rod([SX + 3, SY + 2.8, z], "x", 8, 0.5, "oak", { seg: 8 });
  return o;
}));
// the building, storey by storey, in Mulvium's colour, with its windows
const BX = 30, BY = 24;
for (let n = 0; n < 3; n++) body.push(R.part(`storey${n}`, { build: 0, event: "grow" }, () => {
  const z = n * 28;
  let o = R.box({ x: -BX, y: -BY, w: 2 * BX, d: 2 * BY, r: 0.6 }, z, 26, "acc", { bevel: 0.4 });
  o += R.box({ x: -BX - 1, y: -BY - 1, w: 2 * BX + 2, d: 2 * BY + 2, r: 0.6 }, z + 26, 2, "trim", { bevel: 0.3 });
  for (const x of [-18, -6, 6, 18]) {
    o += R.box({ x: x - 3.4, y: BY, w: 6.8, d: 0.5, r: 0.1 }, z + 7, 12, "glass", { bevel: 0.05 });
    o += R.box({ x: x - 4.2, y: BY, w: 8.4, d: 1.4, r: 0.2 }, z + 5.8, 1.2, "trim", { bevel: 0.15 });
  }
  for (const y of [-12, 0, 12]) {
    o += R.box({ x: BX, y: y - 3.4, w: 0.5, d: 6.8, r: 0.1 }, z + 7, 12, "glass", { bevel: 0.05 });
    o += R.box({ x: BX, y: y - 4.2, w: 1.4, d: 8.4, r: 0.2 }, z + 5.8, 1.2, "trim", { bevel: 0.15 });
  }
  if (n === 2) o += R.box({ x: -BX - 2.5, y: -BY - 2.5, w: 2 * BX + 5, d: 2 * BY + 5, r: 0.8 }, z + 28, 3, "trim", { bevel: 0.6 });
  return o;
}));

writeFigure("project", { width: W, height: H, accent: "mulvium", label: "A new project's plot, wired to the shared foundation, its building rising inside a scaffold.", body });
writeParts("project", R.parts);

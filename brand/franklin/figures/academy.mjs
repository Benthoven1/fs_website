// academy.mjs — Fig. 5, the Academy's hall. On the plot's slab, in front of
// its foundation: a stone step, a brick hall, a portico of six columns under
// an entablature, a stepped roof and a cupola. Drawn with the Anatomy kit;
// the same design, part for part, is written to academy.parts.json for the
// film's 3D world.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";

const W = 1000, H = 760;
const SLAB = { x: -115, y: -110, w: 230, d: 220 };
const Z0 = 30, BW = 150;
const P = k.fitProjection([...k.boxCorners(SLAB, -14, 0), [0, Z0, 110]], W, H, { pad: 50, azimuth: 45 });
const R = recorder(P);

const body = [];
body.push(k.solidSvg(k.slabOf({ ...SLAB, r: 4 }, -14, 14, P, 8, 1.2), { tone: "mid" }));
body.push(R.part("step", { build: 4, from: "down" }, () => R.box({ x: -BW / 2, y: Z0 - 40, w: BW, d: 80 }, 0, 8, "stoneDark")));
body.push(R.part("hall", { build: 4.4, from: "down" }, () => R.box({ x: -BW / 2 + 10, y: Z0 - 38, w: BW - 20, d: 56 }, 8, 50, "brick")));
for (let i = 0; i < 6; i++)
  body.push(R.part(`col${i}`, { build: 4.8 + i * 0.08, from: "up" }, () => R.cyl(-50 + i * 20, Z0 + 26, 3.8, 8, 46, "trim")));
body.push(R.part("entablature", { build: 5.5, from: "up" }, () => R.box({ x: -BW / 2 + 2, y: Z0 - 38, w: BW - 4, d: 72 }, 54, 7, "trim")));
body.push(R.part("roof", { build: 5.8, from: "up" }, () =>
  [0, 1, 2].map((n) => R.box({ x: -BW / 2 + 8 + n * 14, y: Z0 - 34 + n * 9, w: BW - 16 - n * 28, d: 64 - n * 18 }, 61 + n * 7, 7, "lit")).join("")));
body.push(R.part("cupola", { build: 6.1, from: "up" }, () =>
  R.box({ x: -8, y: Z0 - 10, w: 16, d: 16 }, 82, 14, "trim") + R.cyl(0, Z0 - 2, 6, 96, 8, "lit")));

writeFigure("academy", {
  width: W, height: H, accent: "academy",
  label: "A stone step, a brick hall with a portico of six columns, an entablature, a stepped roof in the Academy's green and a cupola.",
  body,
});
writeParts("academy", R.parts);

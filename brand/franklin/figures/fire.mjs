// fire.mjs — Fig. 3, the Union Fire Company's rack. On the plot's slab, in
// front of its foundation: an oak rack of three iron bars with ten leather
// buckets on each (thirty volunteers, thirty buckets), and the alarm bell on
// its own post. Drawn with the Anatomy kit; the same design, part for part,
// is written to fire.parts.json for the film's 3D world.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";

const W = 1000, H = 760;
const SLAB = { x: -115, y: -110, w: 230, d: 220 };
const RACK_Y = 40, RW = 168, BARS = [36, 66, 96];
const P = k.fitProjection([...k.boxCorners(SLAB, -14, 0), [0, RACK_Y, 140], [-100, 82, 140]], W, H, { pad: 50, azimuth: 45 });
const R = recorder(P);

const body = [];
// the slab, for context only (the world builds each plot's own foundation)
body.push(k.solidSvg(k.slabOf({ ...SLAB, r: 4 }, -14, 14, P, 8, 1.2), { tone: "mid" }));
body.push(R.part("rackBase", { build: 4, from: "down" }, () => R.box({ x: -RW / 2 - 8, y: RACK_Y - 6, w: RW + 16, d: 12 }, 0, 6, "oak")));
body.push(R.part("posts", { build: 4.2, from: "up" }, () =>
  R.box({ x: -RW / 2 - 3.5, y: RACK_Y - 3.5, w: 7, d: 7 }, 6, 102, "oak") + R.box({ x: RW / 2 - 3.5, y: RACK_Y - 3.5, w: 7, d: 7 }, 6, 102, "oak")));
body.push(R.part("bars", { build: 4.5, from: "left" }, () =>
  BARS.map((z) => R.box({ x: -RW / 2, y: RACK_Y - 1.6, w: RW, d: 3.2 }, z - 1.6, 3.2, "iron")).join("")));
body.push(R.part("bell", { build: 4.6, from: "up" }, () =>
  R.box({ x: -103, y: 79, w: 6, d: 6 }, 0, 130, "oak") + R.box({ x: -103, y: 79, w: 26, d: 6 }, 124, 5, "oak") + R.cyl(-88, 82, 7, 104, 13, "brass")));
// the buckets, front row last so the painter's order holds in the drawing
for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
  const x = -RW / 2 + 12 + i * 16, z = BARS[row] - 17.5;
  body.push(R.part(`bucket${row * 10 + i}`, { build: 5 + (row * 10 + i) * 0.04, from: "up" }, () =>
    R.cyl(x, RACK_Y, 5, z, 13, (row * 10 + i) % 3 ? "lit:leather" : "lit:leatherRed") + R.cyl(x, RACK_Y, 5.3, z + 6.5, 1.4, "band")));
}

writeFigure("fire", {
  width: W, height: H, accent: "fire",
  label: "An oak rack of three iron bars with ten leather buckets on each, and an alarm bell on its own post: thirty volunteers, thirty buckets.",
  body,
});
writeParts("fire", R.parts);

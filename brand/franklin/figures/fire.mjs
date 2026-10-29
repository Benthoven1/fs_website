// fire.mjs — the Union Fire Company's plot. Its foundation, and the company's
// rack: two collared oak posts on outrigger feet with knee braces, three iron
// bars in bolted brackets, and thirty leather buckets on their hooks (thirty
// volunteers, thirty buckets), each with its rolled rim, two bands, a painted
// crest and an iron bail; beside it the alarm bell on its own post and yoke.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, foundation } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -115, y: -110, w: 230, d: 220 }, -19, 140), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const body = [plinth(R), foundation(R, { doc: "stove" })];

const RY = 40, PX = 86, BARS = [38, 68, 98], TOP = 108;
body.push(R.part("rack", { build: 4, from: "down" }, () => {
  let o = "";
  o += R.box({ x: -PX - 6, y: RY - 5, w: 2 * PX + 12, d: 10, r: 0.8 }, 0, 6, "oak", { bevel: 0.6 });
  for (const px of [-PX, PX]) {
    o += R.box({ x: px - 3.5, y: RY - 22, w: 7, d: 44, r: 0.8 }, 0, 5, "oak", { bevel: 0.5 });
    for (const dy of [-19, 19]) o += R.dots([[px, RY + dy, 5]], "iron", { size: 0.8 });
    o += R.box({ x: px - 6, y: RY - 6, w: 12, d: 12, r: 0.6 }, 5, 1.6, "iron", { bevel: 0.3 });
    o += R.box({ x: px - 3.5, y: RY - 3.5, w: 7, d: 7, r: 0.6 }, 6.6, TOP - 6.6, "oak", { bevel: 0.4 });
    // knee braces, rising from the outriggers to the post
    o += R.box({ x: px - 1.5, y: RY + 3.5, w: 3, d: 21, r: 0.4 }, 5, 3, "oakLight", { rot: { axis: "x", deg: -38, at: [px, RY + 24.5, 5] } });
    o += R.box({ x: px - 1.5, y: RY - 24.5, w: 3, d: 21, r: 0.4 }, 5, 3, "oakLight", { rot: { axis: "x", deg: 38, at: [px, RY - 24.5, 5] } });
    for (const z of [22, 52, 82]) o += R.box({ x: px - 4.4, y: RY - 4.4, w: 8.8, d: 8.8, r: 0.6 }, z, 2, "iron", { bevel: 0.3 });
    o += R.box({ x: px - 5, y: RY - 5, w: 10, d: 10, r: 0.8 }, TOP, 2.4, "walnut", { bevel: 0.5 });
    o += R.cyl(px, RY, 2.6, TOP + 2.4, 2, "brass", { seg: 20 });
    o += R.cyl(px, RY, 1.4, TOP + 4.4, 2.6, "brass", { r2: 0.2, seg: 16 });
  }
  return o;
}));
body.push(R.part("bars", { build: 4.4, from: "left" }, () => {
  let o = "";
  for (const z of BARS) {
    o += R.rod([-PX, RY, z], "x", 2 * PX, 1.8, "iron", { seg: 16 });
    for (const px of [-PX, PX]) {
      o += R.box({ x: px - 5, y: RY - 2.6, w: 10, d: 5.2, r: 0.6 }, z - 3, 6, "iron", { bevel: 0.4 });
      o += R.dots([[px - 2.6, RY + 2.6, z + 1.6], [px + 2.6, RY + 2.6, z + 1.6]], "brass", { size: 0.5, normal: "y" });
    }
  }
  return o;
}));
// the bell, on its own post and yoke
body.push(R.part("bell", { build: 4.7, from: "up", dist: 260 }, () => {
  const bx = -104, by = 84, top = 128;
  let o = "";
  o += R.box({ x: bx - 6, y: by - 6, w: 12, d: 12, r: 0.6 }, 0, 2, "iron", { bevel: 0.3 });
  o += R.box({ x: bx - 3, y: by - 3, w: 6, d: 6, r: 0.5 }, 2, top - 2, "oak", { bevel: 0.4 });
  o += R.box({ x: bx - 4, y: by - 4, w: 8, d: 8, r: 0.5 }, 30, 2, "iron", { bevel: 0.3 });
  o += R.box({ x: bx - 3, y: by - 3, w: 30, d: 6, r: 0.5 }, top, 4.4, "oak", { bevel: 0.4 });
  o += R.box({ x: bx + 2, y: by - 1.2, w: 14, d: 2.4, r: 0.3 }, top - 9, 2.4, "oakLight", { rot: { axis: "y", deg: 40, at: [bx + 3, by, top - 9] } });
  const hx = bx + 22;
  o += R.box({ x: hx - 2.4, y: by - 2.4, w: 4.8, d: 4.8, r: 0.4 }, top - 3, 3, "iron", { bevel: 0.2 });
  o += R.cyl(hx, by, 2.6, top - 6.2, 3.2, "brass", { seg: 20 });
  o += R.cyl(hx, by, 9, top - 19, 13, "acc", { r2: 4.4, seg: 40 });
  o += R.cyl(hx, by, 9.6, top - 20.6, 1.6, "acc", { seg: 40 });
  o += R.line([[hx - 9.3, by, top - 13], [hx + 9.3, by, top - 13]], "faint");
  o += R.cyl(hx, by, 0.5, top - 52, 31.4, "rope", { seg: 8 });
  o += R.cyl(hx, by, 1.4, top - 56, 4, "walnut", { seg: 12 });
  return o;
}));
// thirty buckets, front row last
for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
  const n = row * 10 + i, x = -PX + 13 + i * 16, zt = BARS[row] - 3.6, z0 = zt - 14;
  body.push(R.part(`bucket${n}`, { build: 5 + n * 0.04, from: "up", dist: 150 }, () => {
    let o = "";
    o += R.box({ x: x - 0.7, y: RY - 0.7, w: 1.4, d: 1.4, r: 0.3 }, zt, 3.6, "iron", { bevel: 0.1 });
    o += R.cyl(x, RY, 4.3, z0, 14, n % 4 === 3 ? "leatherRed" : "acc", { r2: 5.5, seg: 28 });
    o += R.cyl(x, RY, 4.6, z0 + 2, 1.2, "leather", { r2: 4.75, seg: 28 });
    o += R.cyl(x, RY, 5.3, z0 + 9.6, 1.2, "leather", { r2: 5.45, seg: 28 });
    o += R.cyl(x, RY, 5.8, z0 + 13, 1.2, "leather", { seg: 28 });
    o += R.box({ x: x - 1.6, y: RY + 4.6, w: 3.2, d: 0.4, r: 0.2 }, z0 + 4.4, 4, "crest", { bevel: 0.05, rot: { axis: "x", deg: 4.5, at: [x, RY + 4.6, z0 + 4.4] } });
    o += R.torus(x, RY, z0 + 14.2, 5.4, 0.42, "iron", { arc: Math.PI, axis: "y" });
    return o;
  }));
}

writeFigure("fire", { width: W, height: H, accent: "fire", label: "The Union Fire Company's plot: its foundation, a rack of thirty leather buckets, and the alarm bell.", body });
writeParts("fire", R.parts);

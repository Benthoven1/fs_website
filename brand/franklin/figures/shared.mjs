// shared.mjs — a fiscal sponsor's plot: one foundation, shared. A wider
// plinth carries the foundation once (rules, members, money, larger), a
// brass bus bar in bolted clamps along its middle, and four socketed bays,
// each a stone frame with a recessed floor, four contact pins and a strap to
// the bus. Three institutions stand in their bays: flanged, ribbed modules
// with handles and plates, in their colours. The fourth bay waits for the
// new project, which the film sets in.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, foundation } from "./parts.mjs";

const W = 1000, H = 760;
const PW = 330, PD = 230, S = 1.35;
const P = k.fitProjection(k.boxCorners({ x: -PW / 2, y: -PD / 2, w: PW, d: PD }, -19, 100), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const body = [plinth(R, { w: PW, d: PD }), foundation(R, { w: PW, d: PD, s: S, doc: "constitution4" })];

const XS = [-117, -39, 39, 117], SY = 52, BUSY = -6;
body.push(R.part("bus", { build: 4, from: "left" }, () => {
  let o = R.box({ x: -150, y: BUSY - 3, w: 300, d: 6, r: 0.6 }, 0, 2.6, "brass", { bevel: 0.3 });
  for (let x = -140; x <= 140; x += 40) {
    o += R.box({ x: x - 4, y: BUSY - 5, w: 8, d: 10, r: 0.6 }, 0, 4.2, "iron", { bevel: 0.3 });
    o += R.dots([[x - 2, BUSY, 4.2], [x + 2, BUSY, 4.2]], "brass", { size: 0.6 });
  }
  return o;
}));
XS.forEach((x, i) => body.push(R.part(`bay${i}`, { build: 4.4 + i * 0.1, from: "down" }, () => {
  let o = "";
  const B = 56;
  for (const [a, b, w, d] of [[-B / 2, -B / 2, B, 4], [-B / 2, B / 2 - 4, B, 4], [-B / 2, -B / 2 + 4, 4, B - 8], [B / 2 - 4, -B / 2 + 4, 4, B - 8]])
    o += R.box({ x: x + a, y: SY + b, w, d, r: 0.5 }, 0, 2.6, "stoneDark", { bevel: 0.3 });
  o += R.box({ x: x - B / 2 + 4, y: SY - B / 2 + 4, w: B - 8, d: B - 8, r: 0.4 }, 0, 0.8, "iron", { bevel: 0.1 });
  o += R.dots(k.corners({ x: x - 16, y: SY - 16, w: 32, d: 32 }, 0).map(([a, b]) => [a, b, 0.8]), "brass", { size: 1.4 });
  o += R.box({ x: x - 2.5, y: BUSY + 3, w: 5, d: SY - 28 - BUSY - 3, r: 0.4 }, 0, 1.6, "brass", { bevel: 0.2 });
  o += R.dots([[x, BUSY + 7, 1.6], [x, SY - 30, 1.6]], "iron", { size: 0.6 });
  return o;
})));
// a module: an institution's own work, set in a bay
function module(name, x, mat, opts) {
  return R.part(name, opts, () => {
    const M = 40, H = 46;
    let o = R.box({ x: x - M / 2 - 2, y: SY - M / 2 - 2, w: M + 4, d: M + 4, r: 0.8 }, 0.8, 3, "iron", { bevel: 0.4 });
    o += R.dots(k.corners({ x: x - M / 2 - 2, y: SY - M / 2 - 2, w: M + 4, d: M + 4 }, 2).map(([a, b]) => [a, b, 3.8]), "brass", { size: 0.7 });
    o += R.box({ x: x - M / 2, y: SY - M / 2, w: M, d: M, r: 1.2 }, 3.8, H, mat, { bevel: 0.8 });
    for (let z = 10; z < H; z += 8) {
      o += R.box({ x: x - M / 2 + 4, y: SY + M / 2, w: M - 8, d: 0.6, r: 0.2 }, 3.8 + z, 1.2, "porcelain", { bevel: 0.1 });
      o += R.box({ x: x + M / 2, y: SY - M / 2 + 4, w: 0.6, d: M - 8, r: 0.2 }, 3.8 + z, 1.2, "porcelain", { bevel: 0.1 });
    }
    o += R.box({ x: x - M / 2 - 1, y: SY - M / 2 - 1, w: M + 2, d: M + 2, r: 1 }, 3.8 + H, 2.6, "porcelain", { bevel: 0.6 });
    for (const sx of [-1, 1]) o += R.box({ x: x + sx * 9 - 1, y: SY - 1, w: 2, d: 2, r: 0.4 }, 6.4 + H, 3, "brass", { bevel: 0.2 });
    o += R.rod([x - 10, SY, 6.4 + H + 3], "x", 20, 0.9, "brass", { seg: 12 });
    o += R.box({ x: x - 8, y: SY + M / 2 + 0.6, w: 16, d: 0.5, r: 0.2 }, 3.8 + 4, 3.6, "brass", { bevel: 0.1 });
    return o;
  });
}
body.push(module("mod0", XS[0], "acc:library", { build: 5, from: "up", dist: 260 }));
body.push(module("mod1", XS[1], "acc:fire", { build: 5.2, from: "up", dist: 260 }));
body.push(module("mod2", XS[2], "acc:hospital", { build: 5.4, from: "up", dist: 260 }));
body.push(module("new", XS[3], "acc:mulvium", { build: 0, event: "new", dist: 340 }));

writeFigure("shared", { width: W, height: H, accent: "mulvium", label: "A shared foundation: rules, members and money once, a bus bar, and four bays for projects.", body });
writeParts("shared", R.parts);

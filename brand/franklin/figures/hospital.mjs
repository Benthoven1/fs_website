// hospital.mjs — the Pennsylvania Hospital's plot: the matching grant as a
// machine. Its foundation, and two coin columns on stone platforms with
// collared posts and braced crossbars. The donors' post carries a measured
// strip to the £2,000 mark, where a hinged paddle waits; a trip rod in guide
// eyes runs across to the latch on the Assembly's crossbar, which holds the
// Assembly's £2,000 up on a hanger. Coins of £100, milled on the edge, twenty
// a side. The donors' coins, the paddle and the held stack move in the film.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, foundation } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -115, y: -110, w: 230, d: 220 }, -19, 140), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const body = [plinth(R), foundation(R, { doc: "declaration" })];

const COIN = 3.8, N = 20, CR = 15, PT = 4.6, MARK = PT + N * COIN, BAR = MARK + 46, HELD = 34;
const AX = -50, DX = 50, Y = 36, PY = Y - CR - 9;
const coin = (x, y, z, mat) => R.cyl(x, y, CR, z, COIN - 0.3, mat, { seg: 40 }) + R.knurl(x, y, CR, z, z + COIN - 0.3, 56, "faint");

function column(name, x, build, from) {
  return R.part(name, { build, from }, () => {
    let o = "";
    o += R.cyl(x, Y, 21, 0, 2.4, "stoneDark", { seg: 48 });
    o += R.cyl(x, Y, 18, 2.4, 2.2, "brass", { seg: 48 });
    o += R.ring(x, Y, PT + 0.01, 15.6, "lo");
    o += R.box({ x: x - 7, y: PY - 7, w: 14, d: 14, r: 0.8 }, 0, 2, "iron", { bevel: 0.3 });
    o += R.dots(k.corners({ x: x - 7, y: PY - 7, w: 14, d: 14 }, 2).map(([a, b]) => [a, b, 2]), "brass", { size: 0.6 });
    o += R.box({ x: x - 3.2, y: PY - 3.2, w: 6.4, d: 6.4, r: 0.6 }, 2, BAR + 4, "oak", { bevel: 0.4 });
    for (const z of [30, 70]) o += R.box({ x: x - 4.2, y: PY - 4.2, w: 8.4, d: 8.4, r: 0.6 }, z, 2, "iron", { bevel: 0.3 });
    o += R.box({ x: x - 4.6, y: PY - 4.6, w: 9.2, d: 9.2, r: 0.8 }, BAR + 6, 2.4, "walnut", { bevel: 0.5 });
    // the crossbar out over the column, and its brace
    o += R.box({ x: x - 3.2, y: PY - 3.2, w: 6.4, d: Y - PY + 6, r: 0.6 }, BAR, 6, "oak", { bevel: 0.4 });
    o += R.box({ x: x - 1.4, y: PY + 3.2, w: 2.8, d: 18, r: 0.3 }, BAR - 1, 2.8, "oakLight", { rot: { axis: "x", deg: -40, at: [x, PY + 3.2, BAR - 1] } });
    o += R.dots([[x, Y + 2.8, BAR + 3], [x, PY + 3.2, BAR - 6]], "iron", { size: 0.6, normal: "y" });
    return o;
  });
}
body.push(column("assemblyCol", AX, 4, "left"), column("donorCol", DX, 4.4, "right"));
// the measured strip on the donors' post: a tick per coin, a long one every five
body.push(R.part("strip", { build: 4.8, from: "front" }, () => {
  const fy = PY + 3.2;
  let o = R.box({ x: DX - 2.6, y: fy, w: 5.2, d: 0.6, r: 0.3 }, PT - 1, MARK - PT + 4, "brass", { bevel: 0.15 });
  const segs = [];
  for (let n = 0; n <= N; n++) o += R.line([[DX - 2.6, fy + 0.62, PT + n * COIN], [DX - 2.6 + (n % 5 ? 2 : 3.8), fy + 0.62, PT + n * COIN]], n % 5 ? "lo" : "mid");
  o += R.box({ x: DX - 4.2, y: fy, w: 1.6, d: 1.6, r: 0.3 }, MARK - 0.8, 1.6, "acc", { bevel: 0.2 });
  return o;
}));
// the trip rod, in guide eyes on both crossbars, with knobs at its ends
body.push(R.part("trip", { build: 5, from: "back" }, () => {
  const z = BAR + 9;
  let o = R.rod([AX - 2, PY, z], "x", DX - AX + 4, 1.1, "iron", { seg: 12 });
  for (const x of [AX, DX]) {
    o += R.box({ x: x - 1, y: PY - 1, w: 2, d: 2, r: 0.3 }, BAR + 6, 1.8, "iron", { bevel: 0.1 });
    o += R.torus(x, PY, z, 2.2, 0.55, "brass", { axis: "x" });
  }
  o += R.cyl(AX - 2.6, PY, 1.8, z - 1.8, 3.6, "brass", { seg: 16 });
  return o;
}));
// the paddle, hinged at the donors' post, resting just over the mark
body.push(R.part("paddle", { build: 5.2, from: "right" }, () => {
  let o = R.rod([DX - 3.4, PY + 4.4, MARK + 1.6], "x", 6.8, 1.6, "iron", { seg: 14 });
  o += R.box({ x: DX - 3, y: PY + 4.4, w: 6, d: Y - PY - 4, r: 0.5 }, MARK + 0.9, 1.4, "iron", { bevel: 0.3 });
  o += R.box({ x: DX - 7, y: Y - 7, w: 14, d: 14, r: 1 }, MARK + 0.4, 1.4, "acc", { bevel: 0.3 });
  return o;
}));
// the latch on the Assembly's crossbar, and the hanger it holds
body.push(R.part("latch", { build: 5.4, from: "left" }, () =>
  R.box({ x: AX - 5, y: Y - 5, w: 10, d: 10, r: 0.8 }, BAR - 7, 7, "iron", { bevel: 0.4 }) +
  R.rod([AX - 6.5, Y, BAR - 3.5], "x", 13, 0.8, "brass", { seg: 12 }) +
  R.dots([[AX - 3, Y + 5, BAR - 3.5], [AX + 3, Y + 5, BAR - 3.5]], "brass", { size: 0.5, normal: "y" })));
const topHeld = PT + HELD + N * COIN;
body.push(R.part("hanger", { build: 5.6, from: "up", dist: 200 }, () =>
  R.cyl(AX, Y, 0.9, topHeld + 2.4, BAR - 7 - topHeld - 2.4, "iron", { seg: 10 }) +
  R.torus(AX, Y, BAR - 9, 2.2, 0.5, "iron", { axis: "y" }) +
  R.cyl(AX, Y, 5, topHeld, 2.4, "iron", { seg: 24 })));
// the Assembly's £2,000 in pewter, held up until the donors match it
body.push(R.part("held", { build: 5.8, from: "up", dist: 260 }, () => {
  let o = "";
  for (let n = 0; n < N; n++) o += coin(AX, Y, PT + HELD + n * COIN, "pewter");
  return o;
}));
// the donors' coins, placed one by one by the film
for (let n = 0; n < N; n++) body.push(R.part(`donor${n}`, { build: 0, event: "donors" }, () => coin(DX, Y, PT + n * COIN, "brass")));

writeFigure("hospital", { width: W, height: H, accent: "hospital", label: "The Pennsylvania Hospital's plot: its foundation and the matching grant as a machine.", body });
writeParts("hospital", R.parts);

// library.mjs — the Library Company's plot. Its foundation (with a hopper on
// the strongbox: the common fund's mouth), a walnut bookcase with panelled
// sides, lipped shelves and a dentilled cornice, the collection in its
// bindings, and a felt-lined tray of fifty subscriptions, four milled coins to
// a stack. The coins and the books are placed by the film (events): the coins
// ride into the hopper, the books arrive shelf by shelf once the fund exists.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, foundation } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -115, y: -110, w: 230, d: 220 }, -19, 110), W, H, { pad: 40, azimuth: 45 });
const R = recorder(P);
const body = [plinth(R), foundation(R, { doc: "almanac", hopper: true })];

// the bookcase, open to the front (+y)
const BX = -60, BY = 40, CW = 74, CH = 92, CD = 26, Z = 5;
body.push(R.part("case", { build: 4, from: "back" }, () => {
  let o = "";
  o += R.box({ x: BX - CW / 2 - 1.5, y: BY - CD / 2 - 1.5, w: CW + 3, d: CD + 3, r: 0.8 }, 0, Z, "walnut", { bevel: 0.6 });
  o += R.line([[BX - CW / 2, BY + CD / 2 + 1.5, Z * 0.5], [BX + CW / 2, BY + CD / 2 + 1.5, Z * 0.5]], "faint");
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? BX - CW / 2 : BX + CW / 2 - 4;
    o += R.box({ x: x0, y: BY - CD / 2, w: 4, d: CD, r: 0.5 }, Z, CH, "walnut", { bevel: 0.4 });
  }
  // a raised panel on the visible end
  o += R.box({ x: BX + CW / 2, y: BY - CD / 2 + 3.5, w: 0.9, d: CD - 7, r: 0.3 }, Z + 7, CH - 14, "walnutLight", { bevel: 0.3 });
  o += R.box({ x: BX - CW / 2 + 4, y: BY - CD / 2, w: CW - 8, d: 2.5, r: 0.3 }, Z, CH, "walnutLight", { bevel: 0.2 });
  for (const z of [0, 30, 60]) {
    o += R.box({ x: BX - CW / 2 + 4, y: BY - CD / 2 + 2.5, w: CW - 8, d: CD - 2.5, r: 0.3 }, Z + z, 3, "walnut", { bevel: 0.3 });
    o += R.box({ x: BX - CW / 2 + 4, y: BY + CD / 2 - 1.4, w: CW - 8, d: 1.6, r: 0.3 }, Z + z - 1, 4.2, "walnutLight", { bevel: 0.3 });
    for (const sx of [-1, 1]) o += R.dots([[BX + sx * (CW / 2 - 4), BY + CD / 2 - 4, Z + z + 3.1]], "brass", { size: 0.45 });
  }
  // the cornice: a two-tier moulding over a row of dentils
  for (let i = 0; i < 12; i++) o += R.box({ x: BX - CW / 2 + 2 + i * 6.1, y: BY + CD / 2, w: 3, d: 1.4, r: 0.2 }, Z + CH - 3.2, 2.6, "walnutLight", { bevel: 0.2 });
  o += R.box({ x: BX - CW / 2 - 2, y: BY - CD / 2 - 2, w: CW + 4, d: CD + 4, r: 0.6 }, Z + CH, 3, "walnut", { bevel: 0.6 });
  o += R.box({ x: BX - CW / 2 - 3.6, y: BY - CD / 2 - 3.6, w: CW + 7.2, d: CD + 7.2, r: 0.8 }, Z + CH + 3, 2.6, "walnutLight", { bevel: 0.8 });
  o += R.box({ x: BX - 8, y: BY + CD / 2 + 1.6, w: 16, d: 0.6, r: 0.3 }, Z + CH - 9, 4.4, "brass", { bevel: 0.2 });
  o += R.dots([[BX - 6.6, BY + CD / 2 + 2.2, Z + CH - 6.8], [BX + 6.6, BY + CD / 2 + 2.2, Z + CH - 6.8]], "iron", { size: 0.4, normal: "y" });
  return o;
}));

// the collection: blue for the Library Company, with calf, morocco and cloth among it
const BIND = ["acc", "acc", "bindBlue2", "bindNavy", "bindCalf", "bindOx", "bindGreen"];
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
let nb = 0;
[0, 30, 60].forEach((z, s) => {
  let x = BX - CW / 2 + 5.5;
  for (let n = 0; x < BX + CW / 2 - 9; n++) {
    const bw = 3.8 + hash(s * 17 + n) * 2.4, bh = 18 + hash(s * 31 + n * 3) * 7, bd = 17 + hash(n * 5 + s) * 3;
    const mat = BIND[Math.floor(hash(s * 7 + n * 5) * BIND.length)];
    const fy = BY + CD / 2 - 2.4;
    body.push(R.part(`book${nb++}`, { build: 0, event: "books" }, () =>
      R.box({ x, y: fy - bd, w: bw, d: bd, r: 0.4 }, Z + z + 3, bh, mat, { bevel: 0.3 }) +
      R.box({ x: x - 0.05, y: fy - 0.05, w: bw + 0.1, d: 0.3, r: 0.1 }, Z + z + 3 + bh * 0.16, 0.9, "gilt", { bevel: 0.05 }) +
      R.box({ x: x - 0.05, y: fy - 0.05, w: bw + 0.1, d: 0.3, r: 0.1 }, Z + z + 3 + bh * 0.8, 0.9, "gilt", { bevel: 0.05 }) +
      R.box({ x: x + bw * 0.18, y: fy, w: bw * 0.64, d: 0.2, r: 0.1 }, Z + z + 3 + bh * 0.56, bh * 0.14, "bindLabel", { bevel: 0.05 })));
    x += bw + 0.5;
  }
});

// the tray of subscriptions
const TX = 48, TY = 44, TW = 116, TD = 78;
body.push(R.part("tray", { build: 5, from: "front" }, () => {
  let o = "";
  o += R.box({ x: TX - TW / 2, y: TY - TD / 2, w: TW, d: TD, r: 2 }, 0, 3, "walnut", { bevel: 0.8 });
  o += R.box({ x: TX - TW / 2 + 3, y: TY - TD / 2 + 3, w: TW - 6, d: TD - 6, r: 1 }, 3, 0.6, "felt", { bevel: 0.1 });
  for (const [x, y, w, d] of [[TX - TW / 2, TY - TD / 2, TW, 3], [TX - TW / 2, TY + TD / 2 - 3, TW, 3], [TX - TW / 2, TY - TD / 2 + 3, 3, TD - 6], [TX + TW / 2 - 3, TY - TD / 2 + 3, 3, TD - 6]])
    o += R.box({ x, y, w, d, r: 0.5 }, 3, 4, "oak", { bevel: 0.4 });
  for (let c = 1; c < 10; c++) o += R.line([[TX - 50 + c * 10, TY - TD / 2 + 3, 3.62], [TX - 50 + c * 10, TY + TD / 2 - 3, 3.62]], "faint");
  for (let r = 1; r < 5; r++) o += R.line([[TX - TW / 2 + 3, TY - 32.5 + r * 13, 3.62], [TX + TW / 2 - 3, TY - 32.5 + r * 13, 3.62]], "faint");
  // handles at both ends, and a plate on the front rim
  for (const sx of [-1, 1]) {
    const xe = TX + sx * (TW / 2);
    for (const dy of [-10, 10]) o += R.box({ x: xe + (sx > 0 ? 0 : -2.2), y: TY + dy - 1, w: 2.2, d: 2, r: 0.4 }, 3, 2.4, "brass", { bevel: 0.2 });
    o += R.rod([xe + sx * 2.2 - (sx > 0 ? 0 : 0), TY - 11, 4.2], "y", 22, 0.7, "brass", { seg: 12 });
  }
  o += R.box({ x: TX - 14, y: TY + TD / 2, w: 28, d: 0.6, r: 0.3 }, 3.6, 3, "brass", { bevel: 0.15 });
  o += R.line([[TX - 10, TY + TD / 2 + 0.62, 5.1], [TX + 10, TY + TD / 2 + 0.62, 5.1]], "mid");
  return o;
}));
// fifty stacks of four coins, each coin milled on its edge
for (let c = 0; c < 10; c++) for (let r = 0; r < 5; r++) {
  const x = TX - 45 + c * 10, y = TY - 26 + r * 13, i = c * 5 + r;
  body.push(R.part(`stack${i}`, { build: 6 + i * 0.02, event: "coins", dist: 220 }, () => {
    let o = "";
    for (let n = 0; n < 4; n++) {
      o += R.cyl(x, y, 4.3, 3.6 + n * 1.5, 1.35, "brass", { seg: 24 });
      o += R.knurl(x, y, 4.3, 3.6 + n * 1.5, 3.6 + n * 1.5 + 1.35, 28, "faint");
    }
    return o + R.ring(x, y, 3.6 + 6 - 0.13, 3, "lo");
  }));
}

writeFigure("library", { width: W, height: H, accent: "library", label: "The Library Company's plot: its foundation, a bookcase, and a tray of fifty subscriptions.", body });
writeParts("library", R.parts);

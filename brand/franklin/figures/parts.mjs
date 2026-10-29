// parts.mjs — the pieces every plot shares, drawn with the Anatomy kit to its
// craft rules (references/craft.md): many small parts, each resting on another
// and doing a job. A plinth on flanged feet with a groove, screws, a ruler and
// a label plate; and the foundation every institution stands on: rules (a
// lectern with the founding document on its desk), members (a card cabinet of
// drawers, each with its front, label holder, card, pull and rivets) and money
// (a strapped, riveted strongbox with corner irons, hinges, hasp and lock).
// Each function draws inside R.part(...) and returns the SVG; the recorder
// writes the same solids for the 3D world.
import { k } from "./common.mjs";

export const SLAB_H = 14, FOOT = 5;

// The plot's plinth: slab top at z = 0, feet down to -(SLAB_H + FOOT)
export function plinth(R, { w = 230, d = 220, name = "plinth", build = 0 } = {}) {
  return R.part(name, { build, from: "down" }, () => {
    const PL = { x: -w / 2, y: -d / 2, w, d, r: 6 };
    let o = "";
    for (const [x, y] of k.corners(PL, 22)) {
      o += R.cyl(x, y, 8.5, -SLAB_H - FOOT, 1.6, "iron", { seg: 28 });
      o += R.cyl(x, y, 6.4, -SLAB_H - FOOT + 1.6, FOOT - 1.6, "stoneDark", { seg: 28 });
    }
    o += R.box(PL, -SLAB_H, SLAB_H, "stone", { bevel: 1.6, r: 6 });
    // a seam band round the visible faces, and a groove inset on the top
    o += R.line([[-w / 2 + 6, d / 2, -5], [w / 2 - 6, d / 2, -5]], "faint");
    o += R.line([[w / 2, -d / 2 + 6, -5], [w / 2, d / 2 - 6, -5]], "faint");
    o += R.groove({ x: PL.x + 6, y: PL.y + 6, w: w - 12, d: d - 12 }, 0.05);
    const sc = k.corners(PL, 11);
    sc.forEach(([x, y]) => (o += R.ring(x, y, 0.06, 2.6, "lo")));
    o += R.dots(sc.map(([x, y]) => [x, y, 0.06]), "iron", { size: 1.1 });
    // a brass ruler along the front, ticks hung from its back edge
    const strip = { x: -w / 2 + 18, y: d / 2 - 15, w: w - 96, d: 7, r: 1 };
    o += R.box(strip, 0, 0.6, "brass", { bevel: 0.2 });
    o += R.ticks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.8, 0.62, [2.2, 4.2]);
    o += R.dots([[strip.x + 1.8, strip.y + 3.5, 0.62], [strip.x + strip.w - 1.8, strip.y + 3.5, 0.62]], "iron", { size: 0.6 });
    // the label plate: three engraved rules and two screws
    const lp = { x: w / 2 - 66, y: d / 2 - 24, w: 50, d: 15, r: 1.4 };
    o += R.box(lp, 0, 0.9, "brass", { bevel: 0.3 });
    o += R.groove({ x: lp.x + 1.6, y: lp.y + 1.6, w: lp.w - 3.2, d: lp.d - 3.2 }, 0.92, "lo");
    [[6, 34], [6, 26], [6, 18]].forEach(([a, b], i) => (o += R.line([[lp.x + a, lp.y + 4.2 + i * 3.2, 0.93], [lp.x + a + b, lp.y + 4.2 + i * 3.2, 0.93]], "mid")));
    o += R.dots([[lp.x + 3.2, lp.y + lp.d / 2, 0.92], [lp.x + lp.w - 3.2, lp.y + lp.d / 2, 0.92]], "iron", { size: 0.7 });
    return o;
  });
}

// Rules: a walnut lectern, the founding document open on its desk
export function lectern(R, cx, cy, { s = 1, doc, build = 1, name = "rules" } = {}) {
  return R.part(name, { build, from: "left" }, () => {
    let o = "";
    o += R.box({ x: cx - 17 * s, y: cy - 14 * s, w: 34 * s, d: 28 * s, r: 2 }, 0, 3 * s, "walnut", { bevel: 0.8 });
    o += R.box({ x: cx - 14 * s, y: cy - 11 * s, w: 28 * s, d: 22 * s, r: 1.5 }, 3 * s, 1.2 * s, "walnutLight", { bevel: 0.4 });
    for (const [x, y] of k.corners({ x: cx - 17 * s, y: cy - 14 * s, w: 34 * s, d: 28 * s }, 3 * s)) o += R.dots([[x, y, 3 * s]], "brass", { size: 0.8 });
    o += R.box({ x: cx - 6.5 * s, y: cy - 6.5 * s, w: 13 * s, d: 13 * s, r: 1 }, 4.2 * s, 2.4 * s, "walnut");
    o += R.box({ x: cx - 4.5 * s, y: cy - 4.5 * s, w: 9 * s, d: 9 * s, r: 0.8 }, 6.6 * s, 15 * s, "walnutLight");
    o += R.line([[cx - 4.5 * s, cy + 4.5 * s, 10 * s], [cx + 4.5 * s, cy + 4.5 * s, 10 * s]], "faint");
    o += R.line([[cx - 4.5 * s, cy + 4.5 * s, 17 * s], [cx + 4.5 * s, cy + 4.5 * s, 17 * s]], "faint");
    o += R.box({ x: cx - 6.5 * s, y: cy - 6.5 * s, w: 13 * s, d: 13 * s, r: 1 }, 21.6 * s, 2.4 * s, "walnut");
    o += R.box({ x: cx - 14 * s, y: cy - 5 * s, w: 28 * s, d: 10 * s, r: 1 }, 24 * s, 2 * s, "walnut");
    for (const sx of [-1, 1]) o += R.box({ x: cx + sx * 11 * s - 1.2 * s, y: cy - 5 * s, w: 2.4 * s, d: 10 * s, r: 0.4 }, 26 * s, 1.6 * s, "brass");
    const dz = 27.6 * s, tilt = { axis: "x", deg: -22, at: [cx, cy, dz] };
    o += R.box({ x: cx - 19 * s, y: cy - 15 * s, w: 38 * s, d: 30 * s, r: 1.2 }, dz, 2.6 * s, "walnut", { rot: tilt, bevel: 0.7 });
    o += R.box({ x: cx - 19 * s, y: cy + 12.4 * s, w: 38 * s, d: 2.6 * s, r: 0.5 }, dz + 2.6 * s, 2.4 * s, "walnutLight", { rot: tilt });
    o += R.dots([[cx - 16 * s, cy + 13.7 * s, dz + 5 * s], [cx + 16 * s, cy + 13.7 * s, dz + 5 * s]], "brass", { size: 0.7 });
    o += R.doc(doc, { x: cx, y: cy - 1.2 * s, z: dz + 2.66 * s, w: 30 * s, d: 25 * s, rot: tilt });
    return o;
  });
}

// Members: a card cabinet of six drawers
export function cabinet(R, cx, cy, { s = 1, build = 2, name = "members" } = {}) {
  return R.part(name, { build, from: "back" }, () => {
    const W = 40 * s, D = 30 * s, H = 44 * s, B = 4 * s, gap = 1.6 * s;
    const fy = cy + D / 2;
    let o = "";
    o += R.box({ x: cx - W / 2 - 1.2, y: cy - D / 2 - 1.2, w: W + 2.4, d: D + 2.4, r: 1 }, 0, B, "walnut", { bevel: 0.6 });
    o += R.box({ x: cx - W / 2, y: cy - D / 2, w: W, d: D, r: 0.8 }, B, H, "oak", { bevel: 0.6 });
    o += R.box({ x: cx - W / 2 - 1.6, y: cy - D / 2 - 1.6, w: W + 3.2, d: D + 3.2, r: 1.2 }, B + H, 3 * s, "walnut", { bevel: 0.8 });
    o += R.line([[cx + W / 2, cy - D / 2 + 2, B + H * 0.5], [cx + W / 2, cy + D / 2 - 2, B + H * 0.5]], "faint");
    const dw = (W - 3 * gap) / 2, dh = (H - 4 * gap) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const x0 = cx - W / 2 + gap + c * (dw + gap), z0 = B + gap + r * (dh + gap), mx = x0 + dw / 2;
      o += R.box({ x: x0, y: fy, w: dw, d: 1.3 * s, r: 0.4 }, z0, dh, "oakLight", { bevel: 0.35 });
      // label holder: a brass frame, its card, a rivet each side
      const hz = z0 + dh * 0.56;
      o += R.box({ x: mx - 4.2 * s, y: fy + 1.3 * s, w: 8.4 * s, d: 0.5 * s, r: 0.2 }, hz, 3.8 * s, "brass", { bevel: 0.15 });
      o += R.box({ x: mx - 3.2 * s, y: fy + 1.8 * s, w: 6.4 * s, d: 0.25 * s, r: 0.1 }, hz + 0.7 * s, 2.4 * s, "paper", { bevel: 0.05 });
      o += R.dots([[mx - 3.7 * s, fy + 1.8 * s, hz + 1.9 * s], [mx + 3.7 * s, fy + 1.8 * s, hz + 1.9 * s]], "brass", { size: 0.35 * s, normal: "y" });
      // the pull: two posts and a bar
      const pz = z0 + dh * 0.24;
      for (const sx of [-1, 1]) o += R.box({ x: mx + sx * 3.6 * s - 0.6 * s, y: fy + 1.3 * s, w: 1.2 * s, d: 1.8 * s, r: 0.3 }, pz, 1.2 * s, "brass", { bevel: 0.2 });
      o += R.rod([mx - 4.6 * s, fy + 2.7 * s, pz + 0.6 * s], "x", 9.2 * s, 0.55 * s, "brass", { seg: 12 });
    }
    return o;
  });
}

// Money: a strapped strongbox; with a hopper, the fund's mouth
export function strongbox(R, cx, cy, { s = 1, build = 3, name = "money", hopper = false } = {}) {
  return R.part(name, { build, from: "right" }, () => {
    const W = 44 * s, D = 34 * s, Hb = 24 * s, Hl = 9 * s, F = 2.2 * s, fy = cy + D / 2;
    let o = "";
    for (const [x, y] of k.corners({ x: cx - W / 2, y: cy - D / 2, w: W, d: D }, 3 * s))
      o += R.box({ x: x - 2.5 * s, y: y - 2.5 * s, w: 5 * s, d: 5 * s, r: 0.6 }, 0, F, "iron", { bevel: 0.3 });
    o += R.box({ x: cx - W / 2, y: cy - D / 2, w: W, d: D, r: 1 }, F, Hb, "oak", { bevel: 0.6 });
    o += R.line([[cx - W / 2 + 1, fy, F + Hb * 0.5], [cx + W / 2 - 1, fy, F + Hb * 0.5]], "faint");
    o += R.box({ x: cx - W / 2 - 1.2, y: cy - D / 2 - 1.2, w: W + 2.4, d: D + 2.4, r: 2 }, F + Hb, Hl, "oak", { bevel: 1 });
    o += R.groove({ x: cx - W / 2 + 3, y: cy - D / 2 + 3, w: W - 6, d: D - 6 }, F + Hb + Hl + 0.05, "lo");
    // two iron straps over body and lid, riveted on the front
    for (const sx of [-0.3, 0.3]) {
      const xs = cx + sx * W;
      o += R.box({ x: xs - 1.8 * s, y: cy - D / 2 - 0.5, w: 3.6 * s, d: D + 1, r: 0.3 }, F - 0.2, Hb + 0.4, "iron", { bevel: 0.2 });
      o += R.box({ x: xs - 1.8 * s, y: cy - D / 2 - 1.7, w: 3.6 * s, d: D + 3.4, r: 0.3 }, F + Hb, Hl + 0.5, "iron", { bevel: 0.2 });
      o += R.dots([3, 9, 15, 21].map((z) => [xs, fy + 0.5, F + z * s]), "iron", { size: 0.55 * s, normal: "y" });
      o += R.dots([[xs, fy + 1.7, F + Hb + 4.5 * s]], "iron", { size: 0.55 * s, normal: "y" });
    }
    // corner irons on the four upright edges
    for (const [x, y] of k.corners({ x: cx - W / 2, y: cy - D / 2, w: W, d: D }, 0))
      o += R.box({ x: x - 1.6 * s, y: y - 1.6 * s, w: 3.2 * s, d: 3.2 * s, r: 0.4 }, F, Hb, "iron", { bevel: 0.2 });
    // hinges at the back, hasp and lock plate at the front
    for (const sx of [-0.25, 0.25]) o += R.rod([cx + sx * W - 4 * s, cy - D / 2 - 1.6, F + Hb], "x", 8 * s, 1.3 * s, "iron", { seg: 12 });
    o += R.box({ x: cx - 6 * s, y: fy, w: 12 * s, d: 0.8 * s, r: 0.5 }, F + Hb * 0.3, 10 * s, "brass", { bevel: 0.3 });
    o += R.box({ x: cx - 0.6 * s, y: fy + 0.8 * s, w: 1.2 * s, d: 0.2 * s, r: 0.2 }, F + Hb * 0.3 + 3 * s, 3.6 * s, "ink", { bevel: 0.05 });
    o += R.dots([[cx - 4.6 * s, fy + 0.8 * s, F + Hb * 0.3 + 1.6 * s], [cx + 4.6 * s, fy + 0.8 * s, F + Hb * 0.3 + 1.6 * s], [cx - 4.6 * s, fy + 0.8 * s, F + Hb * 0.3 + 8.4 * s], [cx + 4.6 * s, fy + 0.8 * s, F + Hb * 0.3 + 8.4 * s]], "iron", { size: 0.45 * s, normal: "y" });
    o += R.box({ x: cx - 2.6 * s, y: fy + 1.2, w: 5.2 * s, d: 1.2 * s, r: 0.4 }, F + Hb - 5 * s, 10 * s, "iron", { bevel: 0.3 });
    // a handle on each end: two brackets and a bar
    for (const sx of [-1, 1]) {
      const xe = cx + sx * (W / 2 + 0.4);
      for (const dy of [-6, 6]) o += R.box({ x: xe + (sx > 0 ? 0 : -2 * s), y: cy + dy * s - 1 * s, w: 2 * s, d: 2 * s, r: 0.4 }, F + Hb * 0.62, 2.4 * s, "iron", { bevel: 0.2 });
      o += R.rod([xe + sx * 2 * s - (sx > 0 ? 0 : 0), cy - 7 * s, F + Hb * 0.62 + 1.2 * s], "y", 14 * s, 0.8 * s, "iron", { seg: 12 });
    }
    if (hopper) {
      const z0 = F + Hb + Hl;
      o += R.cyl(cx, cy, 11 * s, z0, 2.4 * s, "brass", { seg: 40 });
      o += R.dots(Array.from({ length: 8 }, (_, i) => [cx + Math.cos(i * Math.PI / 4) * 9.4 * s, cy + Math.sin(i * Math.PI / 4) * 9.4 * s, z0 + 2.4 * s]), "iron", { size: 0.6 * s });
      o += R.cyl(cx, cy, 6.5 * s, z0 + 2.4 * s, 3 * s, "brass", { seg: 32 });
      o += R.cyl(cx, cy, 6.5 * s, z0 + 5.4 * s, 9 * s, "brass", { r2: 15 * s, seg: 48 });
      o += R.cyl(cx, cy, 15.6 * s, z0 + 14.4 * s, 1.6 * s, "brass", { seg: 48 });
      o += R.ring(cx, cy, z0 + 16, 13 * s, "lo");
      o += R.knurl(cx, cy, 15.6 * s, z0 + 14.4 * s, z0 + 16 * s, 64, "faint");
    }
    return o;
  });
}

// The foundation along a plot's back: rules, members, money
export function foundation(R, { w = 230, d = 220, s = 1, doc, hopper = false } = {}) {
  const by = -d / 2 + 38 * s;
  return [
    lectern(R, -w / 2 + 40 * s, by, { s, doc }),
    cabinet(R, 0, by, { s }),
    strongbox(R, w / 2 - 40 * s, by, { s, hopper }),
  ].join("");
}
// where the hopper's mouth is (the library's coins drop in here)
export const hopperMouth = ({ w = 230, d = 220, s = 1 } = {}) => [w / 2 - 40 * s, -d / 2 + 38 * s, 2.2 * s + 24 * s + 9 * s + 16 * s];

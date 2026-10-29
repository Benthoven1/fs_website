// hub.mjs — the shared foundation, at the centre of the four plots. When the
// film reaches "a founder today does not have to start from nothing", the
// rules, members and money each institution built for itself lift off and
// fuse here: one lectern, one card cabinet, one strongbox, on a plinth inlaid
// in Mulvium's colour. Then the links: a rose strip where each plot's own
// foundation stood, and a brass conduit from each to the hub. Coordinates are
// the world's (the hub sits at the origin), so the links reach the plots.
import { k, writeFigure, writeParts, recorder } from "./common.mjs";
import { plinth, lectern, cabinet, strongbox } from "./parts.mjs";

const W = 1000, H = 760;
const P = k.fitProjection(k.boxCorners({ x: -320, y: -320, w: 640, d: 640 }, -19, 80), W, H, { pad: 30, azimuth: 45 });
const R = recorder(P);
const HW = 150, HD = 140, S = 0.8;
const body = [plinth(R, { w: HW, d: HD, inlay: "acc" })];
body.push(lectern(R, -46, -22, { s: S, doc: "constitution4", build: 1 }));
body.push(cabinet(R, 0, -22, { s: S, build: 1 }));
body.push(strongbox(R, 46, -22, { s: S, build: 1 }));

// where each plot's own foundation stood, in world coordinates, and the
// conduit's way from there to the hub's edge
const PLOTS = { library: [-200, -190], fire: [200, -190], hospital: [-200, 190], academy: [200, 190] };
body.push(R.part("links", { build: 2, from: "down" }, () => {
  let o = "";
  for (const [x0, y0] of Object.values(PLOTS)) {
    const fy = y0 - 110 + 38, sx = Math.sign(x0), sy = Math.sign(y0);
    // the rose strip along the plot's foundation row, brass at its ends
    o += R.box({ x: x0 - 100, y: fy - 9, w: 200, d: 18, r: 2 }, 0, 0.9, "acc", { bevel: 0.3 });
    o += R.dots([[x0 - 96, fy, 0.9], [x0 + 96, fy, 0.9]], "brass", { size: 1.4 });
    // the conduit: along the plot's inner edge, then into the hub
    const xe = sx * 90, ye = sy * 40;
    o += R.box({ x: xe - 2, y: Math.min(fy, ye), w: 4, d: Math.abs(fy - ye), r: 0.8 }, 0, 2.6, "brass", { bevel: 0.4 });
    o += R.box({ x: Math.min(xe, sx * HW / 2), y: ye - 2, w: Math.abs(xe - sx * HW / 2) + 2, d: 4, r: 0.8 }, 0, 2.6, "brass", { bevel: 0.4 });
    for (const t of [0.25, 0.5, 0.75]) o += R.box({ x: xe - 3.4, y: fy + (ye - fy) * t - 2, w: 6.8, d: 4, r: 0.5 }, 0, 3.6, "iron", { bevel: 0.3 });
  }
  // and one toward the front, for whatever is founded next
  o += R.box({ x: -2, y: HD / 2, w: 4, d: 320, r: 0.8 }, 0, 2.6, "brass", { bevel: 0.4 });
  for (const y of [120, 200, 280, 360]) o += R.box({ x: -3.4, y: y - 2, w: 6.8, d: 4, r: 0.5 }, 0, 3.6, "iron", { bevel: 0.3 });
  return o;
}));

writeFigure("hub", { width: W, height: H, accent: "mulvium", label: "One foundation at the centre of the four plots, linked to each.", body });
writeParts("hub", R.parts);

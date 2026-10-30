// common.mjs — what every figure in the essay shares: the Anatomy kit, the
// porcelain light theme of the Mulvium site, one accent per institution (the
// lit part of each machine; a part carrying its own colour inside a figure
// says so with data-own) and a writer that emits the SVG with its moves.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

export { k };
export const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fig");

// The site's porcelain: paper #eceae5, surface #f9f8f5, ink #1b1613, rule #d9d4ca
export const ACCENTS = {
  library: { line: "#4d6d96", top: "#c8d6ea", shade: "#a8bcd8" },
  fire: { line: "#a8603f", top: "#f0d5bb", shade: "#dcb393" },
  hospital: { line: "#357f77", top: "#b8ddd8", shade: "#93c3bc" },
  academy: { line: "#55804a", top: "#c4ddb8", shade: "#a3c694" },
  mulvium: { line: "#9a5571", top: "#e0b8c8", shade: "#cc9db1" },
};

export function themeCss(scope) {
  return `
${scope}{--anatomy-paper:#f9f8f5;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#d8d3ca;--anatomy-shade-1:#e2ded6;--anatomy-shade-2:#ebe8e2;--anatomy-shade-3:#f3f1ec;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#efece6;
  --anatomy-hi:#1b1613;--anatomy-mid:#857b72;--anatomy-lo:#b3aaa1;--anatomy-faint:#d6d0c7;--anatomy-lit:#1b1613;
  --anatomy-halo:#7d7264;--anatomy-halo-opacity:.30;--anatomy-dot:#3b332f;--anatomy-weight:.6px;
  --anatomy-mono:"IBM Plex Mono",ui-monospace,monospace}
${Object.entries(ACCENTS).map(([name, a]) => `
${scope} [data-accent="${name}"] .iso-solid[data-lit]>.iso-fill,${scope} [data-accent="${name}"] .iso-solid[data-lit]>.iso-top{fill:${a.top}}
${scope} [data-accent="${name}"] .iso-solid[data-lit]>.iso-shade{fill:${a.shade}}
${scope} [data-accent="${name}"] .iso-solid[data-lit]>.iso-edge,${scope} [data-accent="${name}"] .iso-line[data-tone="lit"]{stroke:${a.line}}
${scope} [data-accent="${name}"] .iso-face-text[data-tone="lit"]{fill:${a.line}}`).join("")}
${Object.entries(ACCENTS).map(([name, a]) => `
${scope} [data-own="${name}"] .iso-solid[data-lit]>.iso-fill,${scope} [data-own="${name}"] .iso-solid[data-lit]>.iso-top{fill:${a.top}}
${scope} [data-own="${name}"] .iso-solid[data-lit]>.iso-shade{fill:${a.shade}}
${scope} [data-own="${name}"] .iso-solid[data-lit]>.iso-edge,${scope} [data-own="${name}"] .iso-line[data-tone="lit"]{stroke:${a.line}}`).join("")}`;
}

// The kit's styles, scoped so a figure can sit inside a HyperFrames scene
export function scopedKitCss(scope) {
  return k.ISO_CSS.replace(/\.iso\[data-theme="light"\]\{[^}]*\}/, "")
    .replace(/(^|\})\s*\.iso(?=[{\s\[.])/g, `$1${scope}`)
    .replace(/(^|\}|,)\s*(\.iso-|\.tb-)/g, `$1${scope} $2`);
}

// Write the figure: an <svg> (no styles: the scene brings them) and its
// moves, every one a screen-space translate computed from world units
export function writeFigure(name, { width, height, accent, label, body, moves = {} }) {
  mkdirSync(OUT, { recursive: true });
  const svg = k.figureSvg({ width, height, label, body }).replace("<svg", `<svg data-accent="${accent}"`);
  writeFileSync(join(OUT, `${name}.svg`), svg);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ width, height, accent, moves }, null, 1));
  // a standalone page to look at the figure on its own
  const page = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><style>${scopedKitCss(".fig")}${themeCss(".fig")}
body{margin:0;background:#eceae5}.fig{width:${width}px;margin:0 auto;background:#f9f8f5}</style><div class="fig">${svg}</div>`;
  writeFileSync(join(OUT, `${name}.html`), page);
  console.log(name, (svg.length / 1024).toFixed(0) + " KB");
}

// A part of the machine as it is put together: the film lowers each [data-build]
// group into place in the order of its number (the plinth first, the lit
// subject last), along the figure's own vertical axis
export const build = (n, svg) => `<g data-build="${Math.round(n * 1000) / 1000}">${svg}</g>`;
export const LIFT = 70;

// A design recorder. Each solid drawn with the kit is also written down, with
// its material, so the film's 3D world builds the same design part for part
// (assets/fig/<name>.parts.json). Coordinates are the kit's world: x along,
// y toward the viewer, z up. A part is one group that arrives in build order;
// a part with an `event` is placed by the film instead (coins that flow,
// books that arrive with the fund, the new project that is set in).
//
// Kinds: box (a rounded slab, optionally rotated about one axis), cyl (an
// upright cylinder or frustum), rod (a cylinder along x or y), torus, prism
// (a convex polygon in x-z extruded along y), dots (screw and rivet heads),
// line (a polyline: seams, grooves, rules), ring, ticks, knurl, doc (an
// archive document laid on a face).
const DARK = new Set(["iron", "walnut", "leather", "slate", "ink"]);
export function recorder(P) {
  const parts = [];
  let cur = null;
  const tone = (mat) => (mat.startsWith("acc") ? "hi" : DARK.has(mat) ? "lo" : mat.startsWith("stone") ? "mid" : "hi");
  const lit = (mat) => mat.startsWith("acc");
  const push = (s) => { cur.solids.push(Object.fromEntries(Object.entries(s).map(([a, v]) => [a, typeof v === "number" ? Math.round(v * 1000) / 1000 : v]))); };
  const pts = (a) => k.pointsAt(a, P);
  const R = {
    parts,
    part(name, { build: n = 0, from = "up", event, dist } = {}, draw) {
      cur = { name, build: n, from, event, dist, solids: [] };
      const svg = draw();
      parts.push(cur); cur = null;
      return build(n, `<g data-part="${name}">${svg}</g>`, from);
    },
    box(plan, z, h, mat, { bevel = 0.5, rot, r } = {}) {
      push({ kind: "box", x: plan.x, y: plan.y, w: plan.w, d: plan.d, z, h, r: r ?? plan.r ?? 0.8, bevel, mat, ...(rot ? { rot } : {}) });
      return k.solidSvg(k.slabOf({ r: 0.8, ...plan }, z, h, P, 3, Math.min(bevel, h / 3)), { tone: tone(mat), lit: lit(mat) });
    },
    cyl(x, y, r, z, h, mat, { r2, seg = 32 } = {}) {
      push({ kind: "cyl", x, y, r, r2: r2 ?? r, z, h, seg, mat });
      return k.solidSvg(k.cylinder(x, y, Math.max(r, r2 ?? r), z, h, P, seg), { tone: tone(mat), lit: lit(mat) });
    },
    rod([x, y, z], axis, len, r, mat, { seg = 16 } = {}) {
      push({ kind: "rod", x, y, z, axis, len, r, seg, mat });
      const plan = axis === "x" ? { x, y: y - r, w: len, d: 2 * r, r: r * 0.9 } : { x: x - r, y, w: 2 * r, d: len, r: r * 0.9 };
      return k.solidSvg(k.slabOf(plan, z - r, 2 * r, P, 3), { tone: tone(mat), lit: lit(mat) });
    },
    torus(x, y, z, radius, tube, mat, { arc = Math.PI * 2, axis = "y" } = {}) {
      push({ kind: "torus", x, y, z, R: radius, t: tube, arc, axis, mat });
      return "";
    },
    prism(polygon, y0, y1, mat) {
      push({ kind: "prism", polygon, y0, y1, mat });
      const xs = polygon.map((p) => p[0]), zs = polygon.map((p) => p[1]);
      return k.solidSvg(k.slabOf({ x: Math.min(...xs), y: y0, w: Math.max(...xs) - Math.min(...xs), d: y1 - y0, r: 0.5 }, Math.min(...zs), Math.max(...zs) - Math.min(...zs), P, 3), { tone: tone(mat), lit: lit(mat) });
    },
    dots(points, mat = "iron", { size = 0.7, normal = "z" } = {}) {
      push({ kind: "dots", pts: points, size, normal, mat });
      return k.dotsSvg(pts(points), { size: 0.45 });
    },
    line(points, tone = "lo", { closed = false } = {}) {
      push({ kind: "line", pts: points, tone, closed });
      return k.lineSvg(k.pathOf(pts(points), closed), { tone, free: true });
    },
    ring(x, y, z, r, tone = "lo") {
      push({ kind: "ring", x, y, z, r, tone });
      return k.lineSvg(k.ring(x, y, r, z, P, 32), { tone });
    },
    // a rounded-rectangle groove on a top face
    groove(plan, z, tone = "faint") {
      const { x, y, w, d } = plan;
      return R.line([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], tone, { closed: true });
    },
    // ruler ticks along x, hanging from a strip's edge (edge = the strip's y)
    ticks(x0, x1, step, every, edge, z, [short, long], { axis = "x" } = {}) {
      const segs = [];
      for (let i = Math.ceil(x0 / step), at = i * step; at <= x1 + 1e-9; i++, at = i * step) {
        const L = i % every === 0 ? long : short;
        segs.push(axis === "x" ? [[at, edge, z], [at, edge + L, z]] : [[edge, at, z], [edge + L, at, z]]);
      }
      push({ kind: "ticks", segs, tone: "lo" });
      return segs.map(([a, b]) => k.lineSvg(k.segment(a, b, P), { tone: "lo" })).join("");
    },
    knurl(x, y, r, z0, z1, count, tone = "lo") {
      push({ kind: "knurl", x, y, r, z0, z1, count, tone });
      return k.lineSvg(k.knurl(x, y, r, z0, z1, count, P), { tone });
    },
    // a document laid flat at (x, y, z), turned with its desk (rot, as for a box)
    doc(name, { x, y, z, w, d, rot }) {
      push({ kind: "doc", name, x, y, z, w, d, ...(rot ? { rot } : {}) });
      return "";
    },
  };
  return R;
}
export function writeParts(name, parts) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.parts.json`), JSON.stringify(parts));
  const n = parts.reduce((a, p) => a + p.solids.filter((s) => !["line", "ring", "ticks", "knurl"].includes(s.kind)).length, 0);
  console.log(`${name}: ${parts.length} parts, ${n} solids`);
}

export const screen = (P, by) => {
  const [x, y] = k.axisVector(P, by);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
};

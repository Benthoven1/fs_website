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
  const page = `<!doctype html><meta charset="utf-8"><style>${scopedKitCss(".fig")}${themeCss(".fig")}
body{margin:0;background:#eceae5}.fig{width:${width}px;margin:0 auto;background:#f9f8f5}</style><div class="fig">${svg}</div>`;
  writeFileSync(join(OUT, `${name}.html`), page);
  console.log(name, (svg.length / 1024).toFixed(0) + " KB");
}

// A part of the machine as it is put together: the film lowers each [data-build]
// group into place in the order of its number (the plinth first, the lit
// subject last), along the figure's own vertical axis
export const build = (n, svg) => `<g data-build="${Math.round(n * 1000) / 1000}">${svg}</g>`;
export const LIFT = 70;

export const screen = (P, by) => {
  const [x, y] = k.axisVector(P, by);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
};

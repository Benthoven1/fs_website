// name.js — On the Name (pages/about/name.html): the roads.
// The hero: many roads draw in from every side and meet at the name as the
// loading screen opens, and travellers in the planets' colours walk them in.
// Fig. 1: three roads, four roads, many roads. Fig. 2: Philosophy and the
// seven liberal arts, after the rose of the Hortus Deliciarum (fol. 32r).
// The plates draw themselves in as they come into view (css/name.css).
import { scrollCue } from "./scroll-cue.js";

const NS = "http://www.w3.org/2000/svg";
const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEG = Math.PI / 180;

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
// Deterministic randomness, so the roads fall the same way on every visit
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (x) => Math.round(x * 10) / 10;

// ── The hero: roads meeting at the name ──────────────────────────────────────
const hero = document.getElementById("nm-hero");
const roadsSvg = document.getElementById("nm-roads");
// The star (Mulvium) and its four planets
const TRAVELLER_TONES = ["#f0d5bb", "#c4ddb8", "#b8cae0", "#e0b8c8", "#b8ddd8"];
let roads = [], travellers = [];

function buildHero() {
  const W = hero.clientWidth, H = hero.clientHeight;
  roadsSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  roadsSvg.replaceChildren();
  const cx = W / 2, cy = H * 0.47, R = Math.hypot(W, H) * 0.6;
  const rnd = mulberry32(20261007);
  const N = W < 640 ? 11 : 15;
  const beds = svgEl("g", {}, roadsSvg), lines = svgEl("g", {}, roadsSvg), walkers = svgEl("g", {}, roadsSvg);
  roads = [];
  for (let i = 0; i < N; i++) {
    // Evenly round the compass, each a little off true, each with a gentle bend
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.24;
    const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R * 0.82;
    const nx = -Math.sin(a), ny = Math.cos(a), bend = (rnd() - 0.5) * 0.3 * R;
    const d = `M${f(sx)} ${f(sy)} C${f(sx + (cx - sx) * 0.35 + nx * bend)} ${f(sy + (cy - sy) * 0.35 + ny * bend)} ` +
      `${f(sx + (cx - sx) * 0.72 + nx * bend * 0.35)} ${f(sy + (cy - sy) * 0.72 + ny * bend * 0.35)} ${f(cx)} ${f(cy)}`;
    const delay = `--d:${(0.08 * i).toFixed(2)}s;--dur:2.6s`;
    svgEl("path", { d, class: "nm-plate-bed nm-draw", pathLength: 1, style: delay }, beds);
    const line = svgEl("path", { d, class: "nm-plate-road nm-draw", pathLength: 1, style: delay }, lines);
    roads.push({ line, len: 0 });
  }
  roads.forEach((r) => { r.len = r.line.getTotalLength(); });
  // Travellers: a few on every road, walking in toward the name
  travellers = [];
  const M = N + 6;
  for (let k = 0; k < M; k++) {
    const road = roads[k % N];
    const dot = svgEl("circle", { r: 3.4, fill: TRAVELLER_TONES[k % TRAVELLER_TONES.length], stroke: "rgba(27,22,19,0.28)", "stroke-width": 0.8, opacity: 0 }, walkers);
    travellers.push({ road, dot, phase: rnd(), period: 13 + rnd() * 9 });
  }
  placeTravellers(motionOK ? 0 : 1);
}

let walkT0 = null;
function placeTravellers(now) {
  for (const tr of travellers) {
    // Reduced motion: each stands still somewhere along its road
    const t = motionOK ? ((now / 1000 / tr.period + tr.phase) % 1) : 0.2 + tr.phase * 0.45;
    const p = tr.road.line.getPointAtLength(t * tr.road.len);
    // In from the edge; gone before the paper gathering round the name
    const o = Math.min(1, t / 0.08) * (1 - Math.min(1, Math.max(0, (t - 0.68) / 0.14)));
    tr.dot.setAttribute("cx", f(p.x));
    tr.dot.setAttribute("cy", f(p.y));
    tr.dot.setAttribute("opacity", (o * walkIn).toFixed(3));
  }
}

let heroOn = true, walking = false, walkIn = 0;
function walk(ts) {
  if (!walking) return;
  if (walkT0 === null) walkT0 = ts;
  walkIn = Math.min(1, (ts - walkT0) / 2600); // they arrive with the roads
  if (heroOn) placeTravellers(ts);
  requestAnimationFrame(walk);
}

const cue = scrollCue(document.getElementById("nm-cue"));
function onHole() {
  if (roadsSvg.classList.contains("is-in")) return;
  roadsSvg.classList.add("is-in");
  if (motionOK) { walking = true; requestAnimationFrame(walk); }
  else { walkIn = 1; placeTravellers(0); }
}
function onDone() { onHole(); setTimeout(() => cue.ready(true), motionOK ? 1200 : 0); }

buildHero();
let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { buildHero(); if (!walking) placeTravellers(0); }, 150);
});
new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(hero);

// ls.js flags each event on window for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

// ── Fig. 1: three roads, four roads, many roads ──────────────────────────────
// Roads leave a centre at the given angles (degrees, 0 = east, clockwise).
// A label is written along its road, or at the end of an upright one.
function crossroads(parent, { name, gloss, roads: spec, mulvium }) {
  const svg = svgEl("svg", { viewBox: "0 0 300 290", role: "img" }, parent);
  const C = [150, 128], L = 96;
  const beds = svgEl("g", {}, svg), lines = svgEl("g", {}, svg), labels = svgEl("g", {}, svg);
  spec.forEach((r, i) => {
    const a = r.angle * DEG, ex = C[0] + Math.cos(a) * L, ey = C[1] + Math.sin(a) * L;
    const d = `M${f(ex)} ${f(ey)} L${C[0]} ${C[1]}`;
    const style = `--d:${(0.12 * i).toFixed(2)}s;--dur:1.1s`;
    svgEl("path", { d, class: "nm-plate-bed nm-draw", pathLength: 1, style }, beds);
    svgEl("path", { d, class: "nm-plate-road nm-draw", pathLength: 1, style }, lines);
    if (!r.label) return;
    const t = svgEl("text", { class: "nm-label nm-label--road nm-fade", style: `--d:${(0.5 + 0.12 * i).toFixed(2)}s`, "text-anchor": "middle" }, labels);
    t.textContent = r.label;
    if (Math.abs(Math.sin(a)) > 0.9) {
      // Up or down the page: set at the road's end, level
      t.setAttribute("x", f(ex));
      t.setAttribute("y", f(Math.sin(a) < 0 ? ey - 10 : ey + 19));
    } else {
      // Along the road, above it, turned to read upright
      const mx = C[0] + Math.cos(a) * L * 0.58, my = C[1] + Math.sin(a) * L * 0.58;
      let rot = r.angle;
      if (Math.cos(a) < 0) rot += 180;
      t.setAttribute("transform", `translate(${f(mx)} ${f(my)}) rotate(${f(rot)}) translate(0 -8)`);
    }
  });
  svgEl("circle", { cx: C[0], cy: C[1], r: mulvium ? 7 : 3.6, class: `nm-fade ${mulvium ? "nm-node nm-node--mulvium" : "nm-node"}`, style: "--d:0.9s" }, svg);
  const n = svgEl("text", { x: 150, y: 262, "text-anchor": "middle", class: "nm-plate-name" }, svg);
  n.textContent = name;
  const g = svgEl("text", { x: 150, y: 282, "text-anchor": "middle", class: "nm-plate-gloss" }, svg);
  g.textContent = gloss;
}

const trio = document.getElementById("nm-trio");
if (trio) {
  crossroads(trio, { name: "Trivium", gloss: "three roads", roads: [
    { angle: -90, label: "GRAMMATICA" }, { angle: 30, label: "DIALECTICA" }, { angle: 150, label: "RHETORICA" },
  ] });
  crossroads(trio, { name: "Quadrivium", gloss: "four roads", roads: [
    { angle: -90, label: "ARITHMETICA" }, { angle: 0, label: "GEOMETRIA" }, { angle: 90, label: "MVSICA" }, { angle: 180, label: "ASTRONOMIA" },
  ] });
  // Twelve roads; the four kinds of endeavor in the mission are named
  const named = { 225: "ARS", 315: "SCIENTIA", 45: "DOCTRINA", 135: "CARITAS" };
  crossroads(trio, { name: "Mulvium", gloss: "many roads", mulvium: true,
    roads: Array.from({ length: 12 }, (_, i) => { const angle = -75 + i * 30, k = ((angle % 360) + 360) % 360; return { angle, label: named[k] }; }) });
}

// ── Fig. 2: the rose of the seven arts ───────────────────────────────────────
// Icons are drawn about (0, 0), some 40 units across, in the arts' attributes
function star(x, y, r) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    d += `${i ? "L" : "M"}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  }
  return d + "Z";
}
const ARTS = [
  { name: "GRAMMATICA", trivium: true, icon: [
    "M-17 0 C-11 -4 -5 -4 0 0 C5 -4 11 -4 17 0 L17 16 C11 12 5 12 0 16 C-5 12 -11 12 -17 16 Z M0 0 L0 16", // book
    "M-17 -12 L17 -20 M-6 -14.6 L-3.5 -21 M5 -17.2 L8.5 -23.5", // rod
  ] },
  { name: "RHETORICA", trivium: true, icon: [
    "M-16 -17 H6 A3 3 0 0 1 9 -14 V14 A3 3 0 0 1 6 17 H-16 A3 3 0 0 1 -19 14 V-14 A3 3 0 0 1 -16 -17 Z", // tablet
    "M-14 -9 H4 M-14 -3 H4 M-14 3 H0 M-14 9 H3",
    "M14 -19 L19 14 L18.6 18.5", // stylus
  ] },
  { name: "DIALECTICA", trivium: true, icon: [
    "M-12 17 C-13 6 -11 -4 -4 -8 C2 -11 8 -10 12 -7 L20 -3.5 C22 -2.5 22 1 20 2 L9 3 C7 6 5 11 3 17", // a hound's head
    "M-3 -8 C-9 -6 -11 2 -8 8 C-6 4 -4 -1 -1 -5", // its ear, hanging
  ], dots: [[9, -4.5, 1.4], [21.2, -1.4, 1.3]] },
  { name: "MVSICA", icon: [
    "M-12 -17 C-17 -2 -10 15 0 15 C10 15 17 -2 12 -17", // lyre
    "M-13.5 -12 H13.5 M-5 -12 V13.5 M0 -12 V15 M5 -12 V13.5",
  ], dots: [[-12, -18.5, 1.8], [12, -18.5, 1.8]] },
  { name: "ARITHMETICA", icon: [
    "M-19 -12 C-11 16 11 16 19 -12", // a cord of beads
  ], beads: true },
  { name: "GEOMETRIA", icon: [
    "M-1.2 -15 L-11 14 M1.2 -15 L11 14 M-8 5 Q0 9 8 5", // compass
    "M-19 19 H19 M-13 19 V16 M-6.5 19 V16 M0 19 V16 M6.5 19 V16 M13 19 V16", // measure
  ], dots: [[0, -17, 2.4]] },
  { name: "ASTRONOMIA", icon: [
    "M-13 5 A11 11 0 1 0 9 5 A11 11 0 1 0 -13 5 Z M-9 5 A7 7 0 1 0 5 5 A7 7 0 1 0 -9 5 Z M-10 -2 L6 12 M-2 -6 V-10", // astrolabe
    star(13, -15, 4.2), star(19, -4, 3), star(-15, -14, 3.2),
  ] },
];

function rose(parent) {
  const S = 600, cx = 300, cy = 300, r1 = 170, r2 = 282, rT = 258;
  const svg = svgEl("svg", { viewBox: `0 0 ${S} ${S}`, role: "img" }, parent);
  const defs = svgEl("defs", {}, svg);
  const n = ARTS.length, span = 360 / n, gap = 2.4;
  const P = (r, deg) => [cx + Math.cos(deg * DEG) * r, cy + Math.sin(deg * DEG) * r];
  // The rim and the inner circle
  svgEl("circle", { cx, cy, r: r2 + 8, class: "nm-arch-edge nm-draw", pathLength: 1, style: "--d:0s;--dur:2s" }, svg);
  ARTS.forEach((art, i) => {
    const mid = -90 + i * span, a0 = mid - span / 2 + gap / 2, a1 = mid + span / 2 - gap / 2;
    const [ax, ay] = P(r2, a0), [bx, by] = P(r2, a1), [cx1, cy1] = P(r1, a1), [dx, dy] = P(r1, a0);
    const d = `M${f(ax)} ${f(ay)} A${r2} ${r2} 0 0 1 ${f(bx)} ${f(by)} L${f(cx1)} ${f(cy1)} A${r1} ${r1} 0 0 0 ${f(dx)} ${f(dy)} Z`;
    const delay = 0.55 + i * 0.1;
    svgEl("path", { d, class: `nm-fade ${art.trivium ? "nm-arch--trivium" : "nm-arch--quadrivium"}`, style: `--d:${delay.toFixed(2)}s` }, svg);
    svgEl("path", { d, class: "nm-arch-edge nm-draw", pathLength: 1, style: `--d:${delay.toFixed(2)}s;--dur:1.6s` }, svg);
    // A stream from Philosophy to the art
    let s = "";
    for (let k = 0; k <= 24; k++) {
      const r = 116 + ((r1 - 4 - 116) * k) / 24, w = Math.sin((k / 24) * Math.PI * 3) * 3.2;
      const [x, y] = P(r, mid + (w / r) / DEG);
      s += `${k ? "L" : "M"}${f(x)} ${f(y)}`;
    }
    svgEl("path", { d: s, class: "nm-stream nm-draw", pathLength: 1, style: `--d:${(0.3 + i * 0.08).toFixed(2)}s;--dur:1.2s` }, svg);
    // The art's attribute, standing upright in its arch
    const [ix, iy] = P(218, mid);
    const g = svgEl("g", { transform: `translate(${f(ix)} ${f(iy)}) scale(1.12)` }, svg);
    art.icon.forEach((d2) => svgEl("path", { d: d2, class: "nm-icon nm-draw", pathLength: 1, style: `--d:${(1 + i * 0.1).toFixed(2)}s;--dur:1.5s` }, g));
    (art.dots || []).forEach(([x, y, r]) => svgEl("circle", { cx: x, cy: y, r, class: "nm-icon-fill nm-fade", style: `--d:${(1.6 + i * 0.1).toFixed(2)}s` }, g));
    if (art.beads) {
      for (let k = 1; k <= 7; k++) {
        // Points on the cord's curve (a cubic), evenly in t
        const t = k / 8, u = 1 - t;
        const x = u * u * u * -19 + 3 * u * u * t * -11 + 3 * u * t * t * 11 + t * t * t * 19;
        const y = u * u * u * -12 + 3 * u * u * t * 16 + 3 * u * t * t * 16 + t * t * t * -12;
        svgEl("circle", { cx: f(x), cy: f(y), r: 2.7, class: "nm-icon-fill nm-fade", style: `--d:${(1.4 + i * 0.1 + k * 0.05).toFixed(2)}s` }, g);
      }
    }
    // Its name along the rim, reading upright above and below
    const lower = Math.sin(mid * DEG) > 0.2;
    const w = span / 2 - 3, rr = lower ? rT + 11 : rT;
    const [p0x, p0y] = P(rr, lower ? mid + w : mid - w), [p1x, p1y] = P(rr, lower ? mid - w : mid + w);
    const id = `nm-arc-${i}`;
    svgEl("path", { id, d: `M${f(p0x)} ${f(p0y)} A${rr} ${rr} 0 0 ${lower ? 0 : 1} ${f(p1x)} ${f(p1y)}` }, defs);
    const text = svgEl("text", { class: "nm-label nm-fade", style: `--d:${(1.2 + i * 0.1).toFixed(2)}s;font-size:13px` }, svg);
    const tp = svgEl("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, text);
    tp.textContent = art.name;
  });
  svgEl("circle", { cx, cy, r: r1 - 2, class: "nm-arch-edge nm-draw", pathLength: 1, style: "--d:0.2s;--dur:1.8s" }, svg);
  // Philosophy at the centre, crowned with Ethics, Logic, and Physics
  svgEl("circle", { cx, cy, r: 112, class: "nm-medallion nm-fade", style: "--d:0s" }, svg);
  svgEl("circle", { cx, cy, r: 104, class: "nm-medallion-inner nm-draw", pathLength: 1, style: "--d:0.1s;--dur:1.6s" }, svg);
  const [q0x, q0y] = P(84, 200), [q1x, q1y] = P(84, 340);
  svgEl("path", { id: "nm-arc-philosophia", d: `M${f(q0x)} ${f(q0y)} A84 84 0 0 1 ${f(q1x)} ${f(q1y)}` }, defs);
  const ph = svgEl("text", { class: "nm-label nm-fade", style: "--d:0.5s;font-size:15px;letter-spacing:0.2em" }, svg);
  const php = svgEl("textPath", { href: "#nm-arc-philosophia", startOffset: "50%", "text-anchor": "middle" }, ph);
  php.textContent = "PHILOSOPHIA";
  const crown = svgEl("g", { transform: `translate(${cx} ${cy + 6}) scale(1.5)` }, svg);
  svgEl("path", { d: "M-16 6 L-16 -8 L-8 0 L0 -12 L8 0 L16 -8 L16 6 Z M-16 6 H16", class: "nm-icon nm-draw", pathLength: 1, style: "--d:0.4s;--dur:1.4s" }, crown);
  [[-16, -10.5], [0, -14.5], [16, -10.5]].forEach(([x, y]) => svgEl("circle", { cx: x, cy: y, r: 2.4, class: "nm-icon-fill nm-fade", style: "--d:1s" }, crown));
  const heads = svgEl("text", { x: cx, y: cy + 44, "text-anchor": "middle", class: "nm-label nm-fade", style: "--d:1.1s;font-size:9px" }, svg);
  heads.textContent = "ETHICA · LOGICA · PHYSICA";
}

const roseHost = document.getElementById("nm-rose");
if (roseHost) rose(roseHost);

// Each plate draws in as it comes into view
const plates = document.querySelectorAll(".nm-fig");
if (!motionOK || !("IntersectionObserver" in window)) plates.forEach((p) => p.classList.add("is-in"));
else {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.25 });
  plates.forEach((p) => io.observe(p));
}

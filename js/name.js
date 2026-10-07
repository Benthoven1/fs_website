// name.js — On the Name (pages/about/name.html).
// The "Scroll" cue on the title page, Fig. 1 (three roads, four roads, many
// roads), and the figures drawing or fading in as they come into view
// (css/name.css).
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
const f = (x) => Math.round(x * 10) / 10;

// ── The title page's cue ─────────────────────────────────────────────────────
const cue = scrollCue(document.getElementById("nm-cue"));
function onDone() { setTimeout(() => cue.ready(true), motionOK ? 1200 : 0); }
// ls.js flags each event on window for late listeners
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

// Each figure draws or fades in as it comes into view
const plates = document.querySelectorAll(".nm-fig");
if (!motionOK || !("IntersectionObserver" in window)) plates.forEach((p) => p.classList.add("is-in"));
else {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.25 });
  plates.forEach((p) => io.observe(p));
}

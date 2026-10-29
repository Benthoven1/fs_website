// build.mjs — writes the Franklin essay as a HyperFrames project: index.html
// (the root: scene hosts, captions, voice, music and sound) and one file per
// section in compositions/. Every time in them is a literal number, taken
// from timing.json, where the narration's words were measured; so a re-voiced
// line, or a re-timed one, means running this again, not editing by hand.
//
//   node build.mjs            # then: npx hyperframes check / snapshot / render
//
// The film is one story in one place: a 3D model of an eighteenth-century
// commons (assets/lib/world.js, three.js) runs under every scene, and on it
// Franklin's four institutions are built part by part, then a fifth plot with
// one foundation shared. The archive's pictures and documents (assets/img/,
// prep.py) float over it on cards. Type is the Mulvium site's: Lora, Major
// Mono Display and IBM Plex Sans.
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const W = 1080, H = 1920;
const C = { paper: "#ECEAE5", surface: "#F9F8F5", ink: "#1B1613", soft: "#3B332F", muted: "#5C544E", rule: "#D9D4CA", clay: "#B87758" };
const A = { library: "#4D6D96", fire: "#A8603F", hospital: "#357F77", academy: "#55804A", mulvium: "#9A5571" };
const SIZES = JSON.parse(fs.readFileSync(path.join(HERE, "assets/img/sizes.json"), "utf8"));
const SCRIPT = JSON.parse(fs.readFileSync(path.join(HERE, "script.json"), "utf8"));

// ── The clock: every word of the narration ─────────────────────────────────
let T = JSON.parse(fs.readFileSync(path.join(HERE, "timing.json"), "utf8"));
if (SCRIPT.lines.some((l, i) => !T.lines[i] || T.lines[i].text !== l.text)) {
  // The narration is behind the script: lay the words out at a reading pace
  // so the scenes can be worked on, and say so
  console.warn("timing.json does not match script.json: using estimated times");
  let t = 1.2, prev = null;
  T = { lines: SCRIPT.lines.map((l) => {
    const sec = l.id.replace(/\d+$/, "");
    if (prev) t += (sec === prev ? 0.32 : 0.75) + (l.pause_before || 0);
    prev = sec;
    const t0 = t, words = l.text.split(" ").map((w) => {
      const d = 0.16 + 0.055 * w.replace(/\W/g, "").length + (/[,.:]$/.test(w) ? 0.18 : 0);
      const r = [w, +t.toFixed(3), +(t + d).toFixed(3)]; t += d; return r;
    });
    return { id: l.id, text: l.text, t0, t1: +t.toFixed(3), words };
  }) };
  T.duration = t;
}
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9£]/g, "");
const L = (id) => T.lines.find((l) => l.id === id) || (() => { throw new Error("no line " + id); })();
// The time a word starts (or ends): at("hook1", "library"), at("who2", "and", 2)
function word(id, w, nth = 1) {
  const l = L(id);
  if (typeof w === "number") return l.words[w];
  let n = 0;
  for (const x of l.words) if (norm(x[0]) === norm(w) && ++n === nth) return x;
  throw new Error(`no word "${w}" in ${id}`);
}
const at = (id, w, nth) => (w === undefined ? L(id).t0 : word(id, w, nth)[1]);
const after = (id, w, nth) => (w === undefined ? L(id).t1 : word(id, w, nth)[2]);
const VOICE_END = T.lines[T.lines.length - 1].t1;

// ── Scenes ──────────────────────────────────────────────────────────────────
const r3 = (x) => Math.round(x * 1000) / 1000;
const js = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" ? r3(v) : v));
const isHex = (s) => /^[0-9a-f]{3,8}$/i.test(s);
class Scene {
  constructor(id, t0, t1, z) { Object.assign(this, { id, t0, t1, z, html: [], css: [], raw: [], tl: [], sfx: [], scripts: [] }); }
  local(t) { return r3(Math.max(0, t - this.t0)); }
  $(sel) { return sel.replace(/#([a-z][\w-]*)/g, (m, s) => (isHex(s) ? m : `#${this.id}-${s}`)); }
  fromTo(sel, a, b, t) { this.tl.push(`tl.fromTo(${js(this.$(sel))}, ${js(a)}, ${js(b)}, ${this.local(t)});`); return this; }
  to(sel, b, t) { this.tl.push(`tl.to(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  set(sel, b, t) { this.tl.push(`tl.set(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  add(html) { this.html.push(html.replace(/id="([a-z])/g, `id="${this.id}-$1`)); return this; }
  style(css) { this.css.push(css.replace(/#([a-z][\w-]*)/g, (m, s) => (s === "root" || isHex(s) ? m : `#${this.id}-${s}`))); return this; }
  sound(name, t, vol = 0.5) { this.sfx.push({ name, t: r3(t), vol }); return this; }
  // A card arrives: up from below, from a side, or out of a slight zoom
  enter(sel, t, { from = "up", dur = 0.6, stagger = 0 } = {}) {
    const a = { opacity: 0, filter: "blur(6px)", ...(from === "up" ? { y: 70 } : from === "right" ? { x: 120 } : from === "left" ? { x: -120 } : { scale: 0.94 }) };
    const b = { opacity: 1, filter: "blur(0px)", x: 0, y: 0, scale: 1, duration: dur, ease: "expo.out", stagger };
    return this.fromTo(sel, a, b, t);
  }
  leave(sel, t, dur = 0.25) {
    return this.to(sel, { opacity: 0, filter: "blur(8px)", duration: dur, ease: "power2.in" }, t);
  }
  // Words blur in one by one (motion.md's per-word entrance)
  words(sel, t, { stagger = 0.067, dur = 0.16 } = {}) {
    const parent = sel.replace(/ \.w$/, "");
    if (parent !== sel) this.set(parent, { opacity: 1 }, t);
    return this.fromTo(sel, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: dur, ease: "power2.out", stagger }, t);
  }
  // A number counting to its value; fmt is a JS expression of v
  count(sel, t, dur, from, to, fmt = "Math.round(v)") {
    this.tl.push(`{ const o = { v: ${from} }, el = document.querySelector(${js(this.$(sel))}); tl.fromTo(o, { v: ${from} }, { v: ${to}, duration: ${r3(dur)}, ease: "power2.out", onUpdate: () => { const v = o.v; el.textContent = ${fmt}; } }, ${this.local(t)}); }`);
    return this;
  }
  // Move a picture's camera over [t, t + dur]
  cam(sel, from, to, t, dur, ease = "power2.inOut") {
    return this.fromTo(sel, from, { ...to, duration: dur, ease }, t);
  }
  file() {
    return `<template>
  <style>
${FONTS}
    #root { position: absolute; inset: 0; overflow: hidden; }
${BASE}
${this.css.join("\n")}
${this.raw.join("\n")}
  </style>
  <div id="root" data-composition-id="${this.id}" data-width="${W}" data-height="${H}" data-duration="${r3(this.t1 - this.t0)}">
${this.html.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${this.tl.join("\n    ")}
    window.__timelines["${this.id}"] = tl;
  </script>
${this.scripts.join("\n")}
</template>
`;
  }
}

// The site's type: Lora for titles and figures, Major Mono Display (lower
// case) for kickers and labels, IBM Plex Sans for small text and subtitles
const FONTS = [
  ["IBM Plex Sans", "IBMPlexSans-400", 400, "normal"], ["IBM Plex Sans", "IBMPlexSans-500", 500, "normal"], ["IBM Plex Sans", "IBMPlexSans-600", 600, "normal"],
  ["Lora", "Lora-500", 500, "normal"], ["Lora", "Lora-600", 600, "normal"], ["Lora", "Lora-400i", 400, "italic"], ["Lora", "Lora-500i", 500, "italic"],
  ["Major Mono Display", "MajorMonoDisplay-400", 400, "normal"],
].map(([f, file, w, s]) => `    @font-face { font-family: "${f}"; src: url(assets/fonts/${file}.woff2) format("woff2"); font-weight: ${w}; font-style: ${s}; font-display: block; }`).join("\n");

const BASE = `
    .abs { position: absolute; }
    .full { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    .disp { font-family: "Lora", serif; font-weight: 600; color: ${C.ink}; }
    .small { font-family: "IBM Plex Sans", sans-serif; color: ${C.muted}; }
    .serif { font-family: "Lora", serif; color: ${C.ink}; }
    .kicker { font-family: "Major Mono Display", monospace; font-size: 30px; letter-spacing: 0.06em; text-transform: lowercase; color: ${C.muted}; }
    .w { display: inline-block; white-space: pre; }
    .card { position: absolute; background: ${C.surface}; border: 1px solid ${C.rule}; border-radius: 28px; overflow: hidden;
      box-shadow: inset 0 1px 0 #FFFFFF, 0 2px 4px rgba(27,22,19,0.04), 0 18px 48px rgba(27,22,19,0.10); }
    .card .cap { position: absolute; left: 0; bottom: 0; width: 100%; height: 64px; overflow: hidden; padding: 0 28px; display: flex; align-items: center; gap: 18px;
      background: ${C.surface}; border-top: 1px solid ${C.rule}; font-family: "IBM Plex Sans", sans-serif; font-size: 28px; color: ${C.muted}; white-space: nowrap; }
    .card .cap b { font-weight: 500; color: ${C.ink}; }
    .pic { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    .pic img { display: block; width: 100%; height: 100%; }
    .tag { position: absolute; padding: 10px 18px 11px; border-radius: 10px; background: ${C.surface}; border: 1px solid ${C.rule};
      font-family: "Major Mono Display", monospace; font-size: 30px; letter-spacing: 0.04em; text-transform: lowercase; color: ${C.ink}; white-space: nowrap; }
    .bar { position: absolute; border-radius: 4px; }
`;
const words = (text, cls = "w") => text.split(" ").map((w) => `<span class="${cls}">${w} </span>`).join("");
const picEl = (id, name) => `<div id="${id}" class="pic" style="width:${SIZES[name].w}px;height:${SIZES[name].h}px"><img src="assets/img/${name}.jpg" alt=""></div>`;
// An archival picture in a card, framed by a camera, with its source
function exhibit(id, name, { x, y, w, h, fig, caption, extra = "" }) {
  return `<div id="${id}" class="card" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">
    <div class="abs" style="left:0;top:0;width:${w}px;height:${h - 64}px;overflow:hidden">${picEl(`${id}-pic`, name)}</div>
    <div class="cap"><span>${caption}</span></div></div>`;
}
// A camera framing in a w x h window: point (fx, fy) of the picture at the
// window's centre, at k times the scale that covers the window
function frame(name, w, h, fx, fy, k = 1) {
  const { w: iw, h: ih } = SIZES[name];
  const s = Math.max(w / iw, h / ih) * k;
  const x = Math.min(0, Math.max(w - s * iw, w / 2 - fx * iw * s)), y = Math.min(0, Math.max(h - s * ih, h / 2 - fy * ih * s));
  return { x: r3(x), y: r3(y), scale: r3(s) };
}
const scenes = [];
const SECTION = (id) => T.lines.filter((l) => l.id.startsWith(id));
const start = (id) => SECTION(id)[0].t0;
const TOPY = 380; // where a card's content starts, under the timeline
const LOW = 1420; // readouts over the world: on the open ground under the model

// ── THE WORLD: one 3D commons under the whole film ─────────────────────────
// The schedule it runs on: when each plot is built, what moves when, where the
// camera goes, which names stand on the model, and when a veil lifts the
// cards off it. Every number comes from the narration's word times.
const WORLD = (() => {
  const plotBuild = {
    library: [after("lib1") + 0.15, at("lib2", "fifty") - 0.25],
    fire: [after("fire1") + 0.7, after("fire2", "buckets") + 0.2],
    hospital: [after("hosp1") + 0.15, at("hosp2", "only") + 0.2],
    academy: [at("acad1") - 0.85, at("acad1", "opened") + 0.6],
    shared: [at("now1") - 1.2, after("now1") + 0.2],
  };
  // the same order arithmetic as world.js: a part arrives at t0 + (t1 - t0) * order / max
  const MAXORD = { library: 6 + 49 * 0.02, fire: 5 + 29 * 0.04, hospital: 5.6, academy: 6.1, shared: 5.4 };
  const arrive = (plot, order) => { const [a, b] = plotBuild[plot]; return a + (b - a) * order / MAXORD[plot]; };
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target"));
  const events = {
    libCoins: [at("lib2", "fifty"), after("lib2", "each")],
    libBooks: [after("lib2", "each") + 0.4, Math.min(after("lib2") + 0.8, start("lib3") + 0.2)],
    hospDonors: [d0, d1], hospTrip: d1 + 0.12,
    turn: { rules: at("turn1", "rules") - 0.05, members: at("turn1", "members") - 0.05, money: at("turn1", "money") - 0.05 },
    turnEnd: start("now") - 0.3,
    nowNew: at("now2", "structure") - 0.6,
  };
  const cam = [
    { t: 0, dur: 0, shot: "wide" },
    { t: start("who") - 0.6, dur: 3, shot: "all4" },
    { t: after("lib1") - 0.4, dur: 1.7, shot: "plot:library" },
    { t: at("lib2", "fifty") - 0.4, dur: 1.1, shot: "mid:library" },
    { t: after("lib2", "each") + 0.1, dur: 1.0, shot: "close:library:case" },
    { t: start("lib3") - 0.1, dur: 1.6, shot: "plot:library" },
    { t: after("fire1") - 0.4, dur: 1.8, shot: "plot:fire" },
    { t: at("fire2", "thirty") - 0.2, dur: 1.4, shot: "mid:fire" },
    { t: start("hosp") - 0.2, dur: 2.0, shot: "all4" },
    { t: after("hosp1") - 0.4, dur: 1.8, shot: "plot:hospital" },
    { t: d0 - 0.2, dur: 1.2, shot: "mid:hospital" },
    { t: d1 + 0.9, dur: 4.5, shot: "plot:hospital" },
    { t: at("acad1") - 1.2, dur: 1.6, shot: "plot:academy" },
    { t: at("turn1") - 0.9, dur: 1.9, shot: "all4" },
    { t: at("now1") - 1.4, dur: 2.2, shot: "plot:shared" },
    { t: at("now2", "new") - 0.5, dur: 1.0, shot: "mid:shared" },
  ];
  const NAMES = [["library", "lending library", "hook1", "library", "1731"], ["fire", "fire company", "hook1", "fire", "1736"], ["hospital", "hospital", "hook1", "hospital", "1751"], ["academy", "college", "hook1", "college", "1751"]];
  const tAll = at("hook2", "all");
  const labels = [
    ...NAMES.flatMap(([plot, name, id, w, year]) => [
      { text: name, anchor: `${plot}.slab`, t0: at(id, w) - 0.1, t1: tAll },
      { text: `${name} · ${year}`, anchor: `${plot}.slab`, t0: tAll, t1: start("who") - 0.4 },
    ]),
    { text: "rules", anchor: "library.rules", t0: arrive("library", 1) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    { text: "members", anchor: "library.members", t0: arrive("library", 2) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    { text: "money", anchor: "library.money", t0: arrive("library", 3) + 0.3, t1: at("lib2", "fifty") - 0.2 },
    { text: "the collection", anchor: "library.case", t0: after("lib2", "each") + 0.6, t1: start("lib3") - 0.2 },
    { text: "the academy", anchor: "academy.cupola", t0: at("acad1", "opened") + 0.7, t1: start("turn") - 0.3 },
    { text: "shared services", anchor: "shared.members", t0: at("now2", "existing") - 0.1, t1: start("end") - 0.5 },
    { text: "new project", anchor: "shared.new", t0: at("now2", "new") + 0.2, t1: start("end") - 0.5 },
  ];
  // when the archive's cards are up, a veil lifts them off the model
  const veils = [
    [start("who") - 0.45, after("lib1") + 0.05], [start("lib3") - 0.25, after("fire1") + 0.9],
    [start("hosp") - 0.15, after("hosp1") + 0.05],
  ];
  // the backdrop's tint: porcelain, leaning to each institution's colour in its part of the story
  const tints = [
    ["library", "#D3DEEC", after("lib1") - 0.4], ["fire", "#F0DAC8", after("fire1") - 0.4], ["hospital", "#CFE4E0", after("hosp1") - 0.4],
    ["academy", "#D9E7CF", at("acad1") - 1.2], ["neutral", "#E6E1D8", at("turn1") - 0.9], ["mulvium", "#ECD6E0", at("now1") - 1.4],
  ];
  return { ghosts: tAll, build: plotBuild, events, cam, labels, veils, tints };
})();
{
  const s = new Scene("world", 0, start("end") + 0.6, 0);
  // the backdrop: porcelain, each tint a layer that fades in over the last
  s.add(`<div id="bg" class="full" style="background:linear-gradient(180deg, #F3F1EC 0%, ${C.paper} 100%)"></div>
    ${WORLD.tints.map(([n, c]) => `<div id="tint-${n}" class="full" style="opacity:0;background:linear-gradient(180deg, ${c} 0%, #F1EEE8 62%, ${C.paper} 100%)"></div>`).join("")}`);
  WORLD.tints.forEach(([n, , t], i) => {
    s.set(`#tint-${n}`, { opacity: 0 }, 0).to(`#tint-${n}`, { opacity: 1, duration: 1.4, ease: "power1.inOut" }, t);
    const next = WORLD.tints[i + 1];
    if (next) s.to(`#tint-${n}`, { opacity: 0, duration: 1.4, ease: "power1.inOut" }, next[2] + 1.4);
  });
  s.add(`<canvas id="cv" class="full" width="${W}" height="${H}" data-layout-ignore></canvas>
    <div id="lab" class="full" data-layout-ignore></div>
    <div id="veil" class="full" style="background:${C.paper};opacity:0"></div>`);
  s.style(`
    .wl { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0; }
    .wl-d { position: absolute; left: -6px; top: -6px; width: 12px; height: 12px; border-radius: 6px; background: ${C.ink}; border: 2px solid ${C.surface}; }
    .wl-l { position: absolute; left: -1px; top: -64px; width: 2px; height: 58px; background: ${C.ink}; }
    .wl-t { position: absolute; bottom: 66px; left: -300px; width: 600px; text-align: center; font-family: "Major Mono Display", monospace; font-size: 32px;
      letter-spacing: 0.04em; color: ${C.ink}; white-space: nowrap; text-shadow: 0 0 10px ${C.surface}, 0 0 4px ${C.surface}; }`);
  s.set("#veil", { opacity: 0 }, 0);
  WORLD.veils.forEach(([a, b]) => s.to("#veil", { opacity: 0.86, duration: 0.45, ease: "power2.out" }, a).to("#veil", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, b));
  s.tl.push(`tl.to({}, { duration: ${r3(s.t1 - s.t0)} }, 0);`);
  s.scripts.push(`  <script>
    window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
    window.__hf.buildReady["world"] = new Promise((r) => (window.__worldReady = r));
  </script>
  <script type="module">
    import { createWorld } from "../assets/lib/world.js";
    let world = null, last = 0;
    window.addEventListener("hf-seek", (e) => { last = e.detail.time; if (world) world.renderAt(last); });
    createWorld(document.getElementById("world-cv"), document.getElementById("world-lab"), ${JSON.stringify(WORLD, (k, v) => (typeof v === "number" ? r3(v) : v))})
      .then((w) => { world = w; w.renderAt(last); window.__worldReady(); });
  </script>`);
  scenes.push(s);
}

// ── CHROME: the running timeline, 1725 to 1755 ─────────────────────────────
{
  const s = new Scene("chrome", 0, start("end") - 0.35, 40);
  const X0 = 84, X1 = 996, Y = 250, yr = (y) => X0 + (y - 1725) / 30 * (X1 - X0);
  let tl = `<div id="line" class="abs" style="left:0;top:0;width:${W}px;height:340px;opacity:0">
    <div class="bar" style="left:${X0}px;top:${Y}px;width:${X1 - X0}px;height:3px;background:${C.ink};opacity:0.35"></div>`;
  for (let y = 1725; y <= 1755; y += 5) {
    tl += `<div class="bar" style="left:${r3(yr(y) - 1)}px;top:${Y - 10}px;width:2px;height:${y % 10 === 0 ? 22 : 14}px;background:${C.ink};opacity:0.35"></div>`;
    if (y % 10 === 0) tl += `<div class="kicker abs" style="left:${r3(yr(y) - 60)}px;top:${Y + 20}px;width:120px;text-align:center;color:${C.ink}">${y}</div>`;
  }
  const MARKS = [["junto", 1727, "#8A8178"], ["library", 1731, A.library], ["fire", 1736, A.fire], ["hospital", 1751, A.hospital], ["academy", 1751, A.academy]];
  MARKS.forEach(([name, year, col]) => {
    const dy = name === "academy" ? -30 : 0;
    tl += `<div id="m-${name}" class="abs" style="left:${r3(yr(year) - 11)}px;top:${Y - 10 + dy}px;width:22px;height:22px;border-radius:11px;background:${col};border:3px solid ${C.surface};box-shadow:0 2px 6px rgba(27,22,19,.18);opacity:0"></div>`;
  });
  tl += `<div id="needle" class="abs" style="left:${r3(yr(1731) - 1.5)}px;top:${Y - 34}px;width:3px;height:44px;background:${C.ink};border-radius:2px"></div></div>`;
  s.add(tl);
  s.fromTo("#line", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.15);
  const visit = [[at("hook2", "1751"), 1751], [at("lib1", "1727"), 1727], [at("lib2", "1731"), 1731], [at("fire1", "1735"), 1735], [at("fire2", "next"), 1736], [at("hosp1", "1751"), 1751]];
  visit.forEach(([t, y]) => s.to("#needle", { x: yr(y) - yr(1731), duration: 0.6, ease: "power3.inOut" }, t - 0.1));
  const pop = (id, t) => s.fromTo(id, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
  pop("#m-junto", at("lib1", "1727") + 0.4);
  pop("#m-library", at("lib2", "1731") + 0.4);
  pop("#m-fire", at("fire2", "union"));
  pop("#m-hospital", at("hosp1", "hospital"));
  pop("#m-academy", at("acad1", "academy"));
  s.leave("#line", start("turn") - 0.45, 0.3);
  scenes.push(s);
}

// ── HOOK: the city, and four empty plots ───────────────────────────────────
{
  const s = new Scene("hook", 0, start("who") - 0.25, 1);
  const pw = 960, ph = 420;
  s.add(exhibit("pros", "prospect", { x: 60, y: TOPY, w: pw, h: ph, caption: "East Prospect of Philadelphia, Scull &amp; Heap, 1754" }));
  s.cam("#pros-pic", frame("prospect", pw, ph - 64, 0.12, 0.5), frame("prospect", pw, ph - 64, 0.6, 0.5), 0, L("hook2").t1 + 0.6, "power1.inOut");
  ["library", "fire", "hospital", "college"].forEach((w) => s.sound("click-soft", at("hook1", w) - 0.05, 0.22));
  s.sound("whoosh-short", at("hook2", "all") - 0.05, 0.18);
  s.leave("#pros", start("who") - 0.5, 0.25);
  scenes.push(s);
}
// ── WHO: a profile, two signatures, one method ──────────────────────────
{
  const s = new Scene("who", start("who") - 0.45, start("lib") - 0.2, 2);
  // the profile: a portrait, a name, four roles with a picture each
  s.add(exhibit("por", "portrait", { x: 60, y: TOPY, w: 520, h: 700, fig: "1.1", caption: "Duplessis, c. 1785" }));
  s.add(`<div id="name" class="abs" style="left:612px;top:${TOPY + 8}px;width:420px;opacity:0">
    <div class="disp" style="font-size:44px;font-weight:600;line-height:1.08"><span class="w">Benjamin</span><br><span class="w">Franklin</span></div>
    <div class="small" style="font-size:28px;margin-top:10px">1706 – 1790</div></div>`);
  const ROLES = [["printer", "Printer", "almanac", 0.5, 0.3], ["writer", "Writer", "martin", 0.45, 0.32], ["scientist", "Scientist", "kite", 0.55, 0.3], ["inventor", "Inventor", "stove", 0.24, 0.6]];
  ROLES.forEach(([w, label, img, fx, fy], i) => {
    const y = TOPY + 180 + i * 130;
    s.add(`<div id="r${i}" class="abs" style="left:612px;top:${y}px;width:408px;height:112px;opacity:0">
      <div class="card" style="left:0;top:0;width:150px;height:112px;border-radius:16px"><div class="abs" style="left:0;top:0;width:150px;height:112px;overflow:hidden">${picEl(`r${i}-pic`, img)}</div></div>
      <div class="disp abs" style="left:176px;top:34px;font-size:36px;font-weight:500">${label}</div></div>`);
    s.set(`#r${i}-pic`, frame(img, 150, 112, fx, fy, 1.1), 0);
    s.enter(`#r${i}`, at("who1", w) - 0.08, { from: "right", dur: 0.45 });
  });
  const t0 = start("who") - 0.4;
  s.enter("#por", t0, { from: "left" }).cam("#por-pic", frame("portrait", 520, 636, 0.53, 0.36, 1.15), frame("portrait", 520, 636, 0.53, 0.33, 1.28), t0, L("who1").t1 - t0 + 0.6, "power1.inOut");
  s.words("#name .w", at("who1", "franklin") - 0.2, { stagger: 0.12 });
  s.fromTo("#name .small", { opacity: 0 }, { opacity: 1, duration: 0.3 }, at("who1", "franklin"));
  s.sound("whoosh-short", t0, 0.2);
  // two signatures: Trumbull's Declaration, then Franklin's name on the Constitution
  const tD = at("who2") - 0.2;
  s.leave("#por, #name, #r0, #r1, #r2, #r3", tD - 0.25, 0.22);
  s.add(exhibit("trum", "trumbull", { x: 60, y: TOPY, w: 960, h: 620, fig: "1.2", caption: "Trumbull, Declaration of Independence, 1818", extra: "opacity:0" }));
  s.enter("#trum", tD, { from: "zoom" }).cam("#trum-pic", frame("trumbull", 960, 556, 0.4, 0.5, 1.0), frame("trumbull", 960, 556, 0.62, 0.48, 1.35), tD, at("who2", "constitution") - tD);
  const tC = at("who2", "and") - 0.15, cz = SIZES.constitution4;
  s.add(exhibit("con", "constitution4", { x: 60, y: TOPY + 20, w: 960, h: 660, fig: "1.3", caption: "Constitution, p. 4, 1787 · National Archives", extra: "opacity:0" }));
  // the camera finds "B Franklin" on the page; the ring is drawn where the framing puts it
  const cw = 960, chh = 596, cf = frame("constitution4", cw, chh, 0.88, 0.853, 2.6);
  const sx = 60 + cf.x + 0.88 * cz.w * cf.scale, sy = TOPY + 20 + cf.y + 0.853 * cz.h * cf.scale;
  s.enter("#con", tC, { from: "right", dur: 0.5 });
  s.cam("#con-pic", frame("constitution4", cw, chh, 0.88, 0.853, 1.0), cf, tC + 0.2, 0.9);
  s.add(`<svg id="ring" class="abs" style="left:${r3(sx - 230)}px;top:${r3(sy - 95)}px;width:460px;height:190px;overflow:visible" viewBox="0 0 460 190"><ellipse cx="230" cy="95" rx="214" ry="78" fill="none" stroke="${C.clay}" stroke-width="7" pathLength="100" stroke-dasharray="100 120" stroke-dashoffset="110" stroke-linecap="round"/></svg>`);
  s.fromTo("#ring ellipse", { strokeDashoffset: 110 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, tC + 1.05);
  s.add(`<div id="six" class="card" style="left:60px;top:${TOPY + 700}px;width:960px;height:150px;border-radius:22px;opacity:0">
    <div class="disp abs" style="left:34px;top:14px;font-size:96px;font-weight:700;color:${C.clay}">6</div>
    <div class="disp abs" style="left:120px;top:26px;width:820px;font-size:32px;line-height:1.3;color:${C.soft}">signers of both founding documents<br><span class="small" style="font-size:28px">Clymer, Franklin, Morris, Read, Sherman, Wilson</span></div></div>`);
  s.enter("#six", at("who2", "both") - 0.1, { from: "up", dur: 0.5 });
  // the method, as a four-step process
  const tM = at("who3") - 0.2;
  s.leave("#trum, #con, #ring, #six", tM - 0.25, 0.22);
  const STEPS = [["need", "Identify a public need"], ["pooling", "Pool contributions"], ["many", "From many members"], ["members", "Found the institution"]];
  s.add(`<div id="mh" class="kicker abs" style="left:84px;top:${TOPY + 10}px;opacity:0">The method</div>`);
  s.fromTo("#mh", { opacity: 0 }, { opacity: 1, duration: 0.3 }, tM);
  STEPS.forEach(([w, label], i) => {
    const y = TOPY + 80 + i * 176;
    s.add(`<div id="st${i}" class="card" style="left:84px;top:${y}px;width:912px;height:136px;border-radius:22px;opacity:0">
      <div class="small abs" style="left:34px;top:44px;font-size:36px;font-weight:500;color:${C.clay}">0${i + 1}</div>
      <div class="disp abs" style="left:128px;top:40px;font-size:44px;font-weight:600">${label}</div></div>`);
    if (i) s.add(`<div id="ln${i}" class="bar" style="left:136px;top:${y - 40}px;width:4px;height:40px;background:${C.rule};transform-origin:50% 0;opacity:0"></div>`);
    // the first step comes up as the method is named; the last as the members are
    const t = i === 0 ? at("who3", "method") : i === 3 ? at("who3", "many") + 0.55 : at("who3", w) - 0.1;
    if (i) s.fromTo(`#ln${i}`, { opacity: 1, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.2, ease: "power2.out" }, t - 0.15);
    s.enter(`#st${i}`, t, { from: "left", dur: 0.45 });
  });
  scenes.push(s);
}

// ── LIB: the Junto; then the library is built and paid for on the model ────
{
  const s = new Scene("lib", start("lib") - 0.2, start("fire") - 0.15, 3);
  // the Junto's members, from Franklin's own list
  const ROSTER = [["Joseph Breintnal", "scrivener"], ["Thomas Godfrey", "glazier"], ["Nicholas Scull", "surveyor"], ["William Parsons", "shoemaker"], ["William Maugridge", "joiner"], ["Hugh Meredith", "printer"]];
  s.add(`<div id="jun" class="card" style="left:84px;top:${TOPY}px;width:912px;height:700px;opacity:0">
    <div class="kicker abs" style="left:40px;top:36px">founded 1727</div>
    <div class="disp abs" style="left:40px;top:80px;font-size:80px">The Junto</div>
    ${ROSTER.map(([n, t], i) => `<div id="ro${i}" class="abs" style="left:40px;top:${222 + i * 66}px;width:832px;height:66px;border-top:1px solid ${C.rule};opacity:0">
      <span class="serif abs" style="left:0;top:12px;font-size:34px;font-weight:500">${n}</span><span class="small abs" style="right:0;top:16px;font-size:28px">${t}</span></div>`).join("")}
    <div class="small abs" style="left:40px;top:630px;font-size:28px">Source: Franklin, Autobiography</div></div>`);
  s.enter("#jun", at("lib1") - 0.15, { from: "zoom" });
  ROSTER.forEach((_, i) => s.enter(`#ro${i}`, at("lib1", "tradesmen") - 0.3 + i * 0.12, { from: "up", dur: 0.4 }));
  s.leave("#jun", after("lib1") - 0.1, 0.25);
  // the arithmetic, on the ground under the model, as the subscriptions run in
  const c0 = at("lib2", "fifty"), c1 = after("lib2", "each");
  s.add(`<div id="sum" class="abs" style="left:84px;top:${LOW}px;width:912px;opacity:0">
    <div class="kicker">subscriptions</div>
    <span id="n50" class="disp" style="font-size:96px;color:${A.library}">0</span><span class="disp" style="font-size:44px;color:${C.muted};font-weight:500"> × 40s =&nbsp;</span><span id="fund" class="disp" style="font-size:96px">£0</span>
    <div class="small" style="font-size:30px;margin-top:2px">then 10s per member per year</div></div>`);
  s.enter("#sum", c0 - 0.3, { from: "up", dur: 0.5 }).count("#n50", c0, c1 - c0 + 0.45, 0, 50).count("#fund", c0, c1 - c0 + 0.45, 0, 100, "'£' + Math.round(v)");
  s.leave("#sum", start("lib3") - 0.4, 0.25);
  s.sound("whoosh", after("lib1") + 0.1, 0.16);
  s.sound("typing", c0, 0.14);
  // the Library Company, from Birch's view of its hall
  const tL = at("lib3") - 0.25;
  s.add(exhibit("hall", "library-hall", { x: 60, y: TOPY, w: 960, h: 700, caption: "Library and Surgeons Hall, Birch, 1799 · LOC", extra: "opacity:0" }));
  s.enter("#hall", tL, { from: "right" }).cam("#hall-pic", frame("library-hall", 960, 636, 0.45, 0.45, 1.05), frame("library-hall", 960, 636, 0.34, 0.42, 1.6), tL, start("fire") - tL);
  s.add(`<div id="since" class="tag" style="left:88px;top:${TOPY + 28}px;opacity:0;color:${A.library}">1731 → today</div>`);
  s.enter("#since", at("lib3", "still") - 0.1, { from: "left", dur: 0.4 });
  s.sound("whoosh-short", tL, 0.18);
  scenes.push(s);
}

// ── FIRE: the proverb; then the company's rack and its thirty buckets ──────
{
  const s = new Scene("fire", start("fire") - 0.15, start("hosp") - 0.15, 4);
  s.add(`<div id="q" class="card" style="left:60px;top:${TOPY}px;width:960px;height:560px;opacity:0">
    <div id="qbar" class="bar" style="left:44px;top:56px;width:8px;height:300px;background:${A.fire};transform-origin:50% 0"></div>
    <div id="qt" class="serif abs" style="left:84px;top:44px;width:820px;font-size:68px;line-height:1.18;font-style:italic">${words("An ounce of prevention is worth a pound of cure.")}</div>
    <div class="kicker abs" style="left:84px;top:430px">pennsylvania gazette · 4 feb 1735</div></div>`);
  s.enter("#q", at("fire1") - 0.1, { from: "zoom" });
  // the rule draws down while the letter is introduced, then the proverb sets
  s.fromTo("#qbar", { scaleY: 0 }, { scaleY: 1, duration: at("fire1", "ounce") - at("fire1", "newspaper"), ease: "power1.inOut" }, at("fire1", "newspaper"));
  s.words("#qt .w", at("fire1", "ounce") - 0.1, { stagger: (at("fire1", "cure") - at("fire1", "ounce")) / 10 });
  s.leave("#q", after("fire1") + 0.85, 0.25);
  s.sound("whoosh", after("fire1") + 0.1, 0.16);
  // under the model: the company, and one of its buckets as it survives
  s.add(`<div id="uf" class="abs" style="left:84px;top:${LOW}px;width:560px;opacity:0">
    <div class="kicker">est. 1736</div>
    <div class="disp" style="font-size:56px;line-height:1.1;margin-top:8px">Union Fire Company</div>
    <div class="small" style="font-size:30px;margin-top:14px;line-height:1.45"><b id="n30" style="font-weight:600;color:${A.fire}">0</b> volunteers, each with<br>their own leather bucket</div></div>`);
  s.enter("#uf", at("fire2", "union") - 0.2, { from: "left", dur: 0.5 }).count("#n30", at("fire2", "thirty") - 0.1, 0.9, 0, 30);
  s.add(exhibit("buck", "bucket", { x: 700, y: LOW - 40, w: 296, h: 360, caption: "A fire bucket", extra: "opacity:0;border-radius:20px" }));
  s.set("#buck-pic", frame("bucket", 296, 296, 0.5, 0.46, 1.15), 0);
  s.enter("#buck", at("fire2", "leather") - 0.2, { from: "right", dur: 0.5 });
  scenes.push(s);
}

// ── HOSP: Dr Bond's proposal; then the matching grant, built and run ───────
{
  const s = new Scene("hosp", start("hosp") - 0.15, start("acad") - 0.15, 5);
  s.add(exhibit("bond", "bond", { x: 60, y: TOPY, w: 430, h: 580, caption: "Thomas Bond", extra: "opacity:0" }));
  s.add(exhibit("hos", "hospital", { x: 520, y: TOPY + 80, w: 500, h: 620, caption: "Pennsylvania Hospital", extra: "opacity:0" }));
  s.set("#bond-pic", frame("bond", 430, 516, 0.5, 0.35, 1.05), 0);
  s.enter("#bond", at("hosp1") - 0.1, { from: "left" }).enter("#hos", at("hosp1", "hospital") - 0.15, { from: "right" });
  s.cam("#hos-pic", frame("hospital", 500, 556, 0.5, 0.45, 1.0), frame("hospital", 500, 556, 0.55, 0.5, 1.15), at("hosp1") - 0.1, L("hosp1").t1 - at("hosp1") + 0.8);
  s.leave("#bond, #hos", after("hosp1") - 0.1, 0.25);
  s.sound("whoosh", after("hosp1") + 0.1, 0.16);
  const d0 = at("hosp2", "private"), d1 = Math.max(after("hosp2"), at("hosp3", "target")), tT = d1 + 0.12;
  s.add(`<div id="cnt" class="abs" style="left:84px;top:${LOW}px;width:440px;opacity:0">
    <div class="kicker">private donors</div><div id="dn" class="disp" style="font-size:88px;color:${C.clay}">£0</div></div>
    <div id="cnt2" class="abs" style="left:556px;top:${LOW}px;width:440px;text-align:right;opacity:0">
    <div class="kicker">the assembly</div><div id="an" class="disp" style="font-size:88px;color:${C.muted}">£2,000</div></div>`);
  s.enter("#cnt", d0 - 0.3, { from: "left", dur: 0.45 }).enter("#cnt2", d0 - 0.15, { from: "right", dur: 0.45 });
  s.count("#dn", d0, d1 - d0 + 0.1, 0, 2000, "'£' + (Math.round(v / 100) * 100).toLocaleString('en-GB')");
  s.fromTo("#an", { color: C.muted }, { color: A.hospital, duration: 0.3 }, tT + 0.45);
  s.sound("impact-bass-1", tT + 0.47, 0.22);
  s.add(`<div id="mg" class="tag" style="left:84px;top:${LOW + 190}px;opacity:0;color:${A.hospital}">£2,000 + £2,000 = £4,000</div>`);
  s.enter("#mg", at("hosp3", "pennsylvania") - 0.1, { from: "up", dur: 0.4 });
  scenes.push(s);
}

// ── ACAD: the hall rises; the university it became ─────────────────────────
{
  const s = new Scene("acad", start("acad") - 0.15, start("turn") - 0.2, 6);
  const tU = at("acad1", "university") - 0.15;
  s.add(`<div id="yrs" class="abs" style="left:84px;top:${LOW}px;width:440px;opacity:0">
    <div class="kicker">academy</div><div class="disp" style="font-size:72px;color:${A.academy}">1751</div>
    <div class="kicker" style="margin-top:10px">university</div><div class="disp" style="font-size:72px">1791</div></div>`);
  s.enter("#yrs", at("acad1", "opened") - 0.1, { from: "left", dur: 0.5 });
  s.add(exhibit("pen", "penn", { x: 556, y: LOW - 20, w: 440, h: 330, caption: "College Hall, Penn", extra: "opacity:0;border-radius:20px" }));
  s.enter("#pen", tU, { from: "right", dur: 0.5 }).cam("#pen-pic", frame("penn", 440, 266, 0.5, 0.5, 1.12), frame("penn", 440, 266, 0.5, 0.45, 1.0), tU, 2.4);
  scenes.push(s);
}

// ── TURN: four foundations, built four times ───────────────────────────────
{
  const s = new Scene("turn", start("turn") - 0.2, start("now") - 0.15, 7);
  const KEYS = [["rules", "rules"], ["members", "members"], ["money", "money"]];
  KEYS.forEach(([w, label], i) => {
    s.add(`<div id="k${i}" class="tag" style="left:${84 + i * 250}px;top:${LOW + 60}px;opacity:0">${label}</div>`);
    s.enter(`#k${i}`, at("turn1", w) - 0.1, { from: "up", dur: 0.35 });
    s.sound("click-soft", at("turn1", w) - 0.05, 0.2);
  });
  s.add(`<div id="x4" class="disp abs" style="left:84px;top:${LOW - 40}px;font-size:132px;color:${C.clay};opacity:0">×4</div>`);
  s.leave("#k0, #k1, #k2", at("turn2", "four") - 0.35, 0.2);
  s.enter("#x4", at("turn2", "four") - 0.1, { from: "zoom", dur: 0.4 });
  // four times over, beside a printing business, an almanac and electricity
  const SIDE = [["printing", "press", "Printing"], ["almanac", "almanac", "Almanac"], ["electricity", "kite", "Electricity"]];
  SIDE.forEach(([w, img, label], i) => {
    s.add(`<div id="sd${i}" class="card" style="left:${300 + i * 236}px;top:${LOW - 20}px;width:216px;height:220px;border-radius:16px;opacity:0">
      <div class="abs" style="left:0;top:0;width:216px;height:156px;overflow:hidden">${picEl(`sd${i}-pic`, img)}</div>
      <div class="cap" style="padding:0 16px"><span>${label}</span></div></div>`);
    s.set(`#sd${i}-pic`, frame(img, 216, 156, 0.5, 0.35, 1.05), 0);
    s.enter(`#sd${i}`, at("turn2", w) - 0.15, { from: "up", dur: 0.45 });
  });
  scenes.push(s);
}

// ── NOW: one shared foundation, and a new project set into it ──────────────
{
  const s = new Scene("now", start("now") - 0.15, start("end") - 0.35, 8);
  s.sound("whoosh", at("now1") - 1.3, 0.16);
  s.sound("click-soft", at("now2", "structure") + 0.15, 0.4);
  s.add(`<div id="fs" class="abs" style="left:84px;top:${LOW - 10}px;width:912px;opacity:0">
    <div class="kicker">fiscal sponsorship</div><div class="disp" style="font-size:60px;margin-top:6px">From day one:</div></div>`);
  s.enter("#fs", at("now2", "sponsor") - 0.1, { from: "left", dur: 0.45 });
  const CAN = [["tax-deductible", "gifts"], ["grants", "grants"], ["contracts", "contracts"]];
  CAN.forEach(([w, label], i) => {
    s.add(`<div id="cv${i}" class="tag" style="left:${84 + i * 280}px;top:${LOW + 120}px;opacity:0;color:${A.mulvium}">✓ ${label}</div>`);
    s.enter(`#cv${i}`, at("now2", w) - 0.1, { from: "up", dur: 0.35 });
  });
  scenes.push(s);
}

// ── END: the cosmos and the wordmark (the launch film's own close) ──────
const PLATE = { file: "cosmos-close.mp4", from: 64.6, gather: 77.0, settle: 84.4 };
{
  const t0 = start("end") - 0.35;
  const offset = PLATE.gather - (after("end2") + 0.7);
  const mediaStart = Math.max(0, t0 + offset - PLATE.from);
  const t1 = t0 + (PLATE.settle + 1.6 - PLATE.from - mediaStart);
  const s = new Scene("end", t0, t1, 9);
  s.add(`<video id="plate" class="full" src="assets/${PLATE.file}" muted playsinline style="object-fit:cover"></video>`);
  s.mediaStart = r3(mediaStart);
  s.add(`<div id="build" class="serif abs" style="left:90px;top:840px;width:900px;text-align:center;font-size:56px;line-height:1.25">${words("Mulvium is building that structure for the next Franklin.")}</div>`);
  s.words("#build .w", at("end1") - 0.05, { stagger: (after("end1") - at("end1") - 0.3) / 9 });
  s.leave("#build", at("end2") - 0.15, 0.25);
  s.add(`<div id="close" class="serif abs" style="left:90px;top:760px;width:900px;text-align:center;font-size:46px;line-height:1.3">${words("The next great expansion of human creativity will come from making it easier to create")}<br><span style="font-size:108px;color:${C.clay};font-style:italic">${words("institutions.")}</span></div>`);
  s.words("#close .w", at("end2", "the") - 0.05, { stagger: (at("end2", "institutions") - at("end2", "the")) / 15 });
  s.leave("#close", after("end2") + 0.6, 0.3);
  s.sound("riser", at("end2", "institutions") - 1.6, 0.2);
  scenes.push(s);
}

// ── Captions: only where the screen does not already say it ────────────────
// A subtitle never repeats words the page is setting: lines whose words are
// on screen in type get none. Each entry is the first word index from which
// the line is subtitled (Infinity: never).
const NO = Infinity;
const CAPTION_FROM = {
  hook1: NO, hook2: 0, who1: NO, who2: NO, who3: NO, lib1: NO, lib2: NO, lib3: 0,
  fire1: NO, fire2: NO, hosp1: 0, hosp2: NO, hosp3: NO, acad1: NO, turn1: NO, turn2: NO,
  now1: NO, now2: NO, end1: NO, end2: NO,
};
const groups = [];
for (const l of T.lines) {
  const from = CAPTION_FROM[l.id] ?? 0;
  let g = [];
  l.words.forEach((w, i) => {
    if (i < from) return;
    g.push(w);
    const next = l.words[i + 1], len = g.map((x) => x[0]).join(" ").length;
    if (!next || /[.:;]$/.test(w[0]) || (/,$/.test(w[0]) && g.length >= 3) || g.length >= 6 || len > 34 || next[1] - w[2] > 0.15) { groups.push(g); g = []; }
  });
}
const caps = new Scene("captions", 0, T.duration || VOICE_END + 8, 50);
groups.forEach((g, i) => {
  const t0 = g[0][1] - 0.05, t1 = Math.min(g[g.length - 1][2] + 0.25, groups[i + 1] ? groups[i + 1][0][1] - 0.06 : 1e9);
  caps.add(`<div id="g${i}" class="cap"><span>${g.map((w) => w[0]).join(" ")}</span></div>`);
  caps.set(`#g${i}`, { opacity: 1, visibility: "visible" }, t0).set(`#g${i}`, { opacity: 0, visibility: "hidden" }, t1);
});
caps.style(`
    #root { background: none; }
    .cap { position: absolute; left: 0; top: 1440px; width: ${W}px; height: 130px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; }
    .cap span { max-width: 900px; text-align: center; font-family: "IBM Plex Sans", sans-serif; font-weight: 500; font-size: 44px; line-height: 1.25; color: ${C.surface};
      background: rgba(27, 22, 19, 0.86); border-radius: 14px; padding: 10px 24px 12px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`);
const content = scenes.filter((s) => s.id !== "chrome" && s.id !== "world");
caps.t1 = content[content.length - 1].t0;

// ── The root: scenes, captions, voice, music, sound ────────────────────────
const DUR = r3(content[content.length - 1].t1);
fs.mkdirSync(path.join(HERE, "compositions"), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, "compositions"))) fs.unlinkSync(path.join(HERE, "compositions", f));
for (const s of [...scenes, caps]) fs.writeFileSync(path.join(HERE, "compositions", `${s.id}.html`), s.file());
// Each scene runs until the next one is on top of it; the chrome over all of them
const hosts = scenes.map((s, i) => {
  const next = content[content.indexOf(s) + 1];
  const end = s.id === "chrome" || s.id === "world" ? s.t1 : next ? Math.max(s.t1, next.t0 + 0.05) : s.t1;
  return `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${r3(s.t0)}" data-duration="${r3(end - s.t0)}" data-track-index="${i % 2 + 1}" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:${s.z}"></div>`;
});
const end = scenes[scenes.length - 1];
// Each effect on the first lane that is free when it starts
const SFX_LEN = { "click-soft": 0.37, "impact-bass-1": 2.12, "impact-bass-2": 2.59, "key-press": 0.43, riser: 10.03, typing: 1.54, "whoosh-short": 0.57, whoosh: 0.57 };
const lanes = [];
const sfx = scenes.flatMap((s) => s.sfx).sort((a, b) => a.t - b.t).map((x, i) => {
  const len = SFX_LEN[x.name];
  let k = lanes.findIndex((free) => free <= x.t);
  if (k < 0) k = lanes.push(0) - 1;
  lanes[k] = x.t + len + 0.05;
  return `      <audio id="sfx${i}" class="clip" src="assets/sfx/${x.name}.mp3" data-start="${x.t}" data-duration="${len}" data-track-index="${12 + k}" data-volume="${x.vol}"></audio>`;
});
const index = `<!doctype html>
<html lang="en" data-resolution="portrait" data-composition-variables='[
  {"id":"color-paper","type":"color","label":"Ground","default":"${C.paper}"},
  {"id":"color-ink","type":"color","label":"Ink","default":"${C.ink}"},
  {"id":"color-clay","type":"color","label":"Accent","default":"${C.clay}"}
]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Franklin, institution builder</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}" data-motion-blur="off">
${hosts.join("\n")}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${r3(caps.t1)}" data-track-index="3" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:50"></div>
      <audio id="voice" class="clip" src="assets/narration.wav" data-start="0" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music-bed.m4a" data-start="0" data-duration="${DUR}" data-track-index="11" data-volume="1"></audio>
${sfx.join("\n")}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(HERE, "index.html"), index);
// the plate's in-point is a property of its <video>
const endFile = path.join(HERE, "compositions", "end.html");
fs.writeFileSync(endFile, fs.readFileSync(endFile, "utf8").replace('<video id="end-plate"', `<video id="end-plate" data-start="0" data-media-start="${end.mediaStart}" data-duration="${r3(end.t1 - end.t0)}"`).replace('class="full" src', 'class="full clip" src'));
// what the sound mix and the README need to know
fs.writeFileSync(path.join(HERE, "cues.json"), JSON.stringify({ duration: DUR, voiceEnd: VOICE_END, sections: Object.fromEntries(scenes.map((s) => [s.id, r3(s.t0)])), sfx: scenes.flatMap((s) => s.sfx) }, null, 1));
console.log(`${scenes.length} scenes, ${groups.length} caption groups, ${DUR}s`);

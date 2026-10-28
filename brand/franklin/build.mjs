// build.mjs — writes the Franklin essay as a HyperFrames project: index.html
// (the root: scene hosts, captions, voice, music and sound) and one file per
// section in compositions/. Every time in them is a literal number, taken
// from timing.json, where the narration's words were measured; so a re-voiced
// line, or a re-timed one, means running this again, not editing by hand.
//
//   node build.mjs            # then: npx hyperframes check / snapshot / render
//
// Pictures are read from assets/img/ with their sizes in assets/img/sizes.json
// (prep.py writes both). The look and the shots are SPEC.md's.
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const W = 1080, H = 1920, FPS = 30;
const C = { paper: "#EDE3CB", ink: "#1B1915", red: "#A8261B", clay: "#B5694A", iron: "#2E2C29", wood: "#C7A06B" };
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
    if (prev) t += sec === prev ? 0.32 : 0.75;
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
// The time a word starts (or ends): at("hook1", "library"), at("hosp2", "thousand", 2)
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
class Scene {
  constructor(id, t0, t1, z) { Object.assign(this, { id, t0, t1, z, html: [], css: [], tl: [], sfx: [] }); }
  local(t) { return r3(Math.max(0, t - this.t0)); }
  $(sel) { return sel.replace(/#([a-z])/g, `#${this.id}-$1`); }
  fromTo(sel, a, b, t) { this.tl.push(`tl.fromTo(${js(this.$(sel))}, ${js(a)}, ${js(b)}, ${this.local(t)});`); return this; }
  to(sel, b, t) { this.tl.push(`tl.to(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  set(sel, b, t) { this.tl.push(`tl.set(${js(this.$(sel))}, ${js(b)}, ${this.local(t)});`); return this; }
  add(html) { this.html.push(html.replace(/id="([a-z])/g, `id="${this.id}-$1`)); return this; }
  style(css) { this.css.push(css.replace(/#([a-z][\w-]*)/g, (m, s) => (s === "root" ? m : `#${this.id}-${s}`))); return this; }
  sound(name, t, vol = 0.5) { this.sfx.push({ name, t: r3(t), vol }); return this; }
  // A type "kiss": the words are pressed onto the paper, not faded
  press(sel, t, { stagger = 0.1, dur = 0.14 } = {}) {
    return this.fromTo(sel, { opacity: 0, scale: 1.035, filter: "blur(3px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: dur, ease: "power4.out", stagger }, t);
  }
  // A pen stroke drawn along its path (pathLength 100)
  pen(sel, t, dur = 0.35) {
    return this.fromTo(sel, { strokeDashoffset: 110 }, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" }, t);
  }
  // A loose sheet laid onto the table
  lay(sel, t, { x = 0, y = 1500, rot = 4, end = 0, dur = 0.85 } = {}) {
    return this.fromTo(sel, { x, y, rotation: rot }, { x: 0, y: 0, rotation: end, duration: dur, ease: "expo.out" }, t);
  }
  out(sel, t, dur = 0.2) {
    return this.to(sel, { opacity: 0, filter: "blur(8px)", duration: dur, ease: "power2.in" }, t);
  }
  // Move a picture's camera to a framing (see frame()) over [t, t + dur]
  cam(sel, from, to, t, dur, ease = "power2.inOut") {
    return this.fromTo(sel, from, { ...to, duration: dur, ease }, t);
  }
  file() {
    return `<template>
  <style>
${FONTS}
    #root { position: absolute; inset: 0; overflow: hidden; background: ${C.paper} url(assets/paper.jpg) center / cover; }
${BASE}
${this.css.join("\n")}
  </style>
  <div id="root" data-composition-id="${this.id}" data-width="${W}" data-height="${H}">
${this.html.join("\n")}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    ${this.tl.join("\n    ")}
    window.__timelines["${this.id}"] = tl;
  </script>
</template>
`;
  }
}

const FONTS = [
  ["IM Fell English", "IMFellEnglish-400", 400, "normal"], ["IM Fell English", "IMFellEnglish-400i", 400, "italic"],
  ["IM Fell English SC", "IMFellEnglishSC-400", 400, "normal"], ["Libre Caslon Text", "LibreCaslonText-400", 400, "normal"],
  ["Libre Caslon Text", "LibreCaslonText-700", 700, "normal"], ["Libre Caslon Text", "LibreCaslonText-400i", 400, "italic"],
].map(([f, file, w, s]) => `    @font-face { font-family: "${f}"; src: url(assets/fonts/${file}.woff2) format("woff2"); font-weight: ${w}; font-style: ${s}; font-display: block; }`).join("\n");

const BASE = `
    .abs { position: absolute; }
    .full { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    .fell { font-family: "IM Fell English", serif; font-weight: 400; color: ${C.ink}; line-height: 1.02; }
    .sc { font-family: "IM Fell English SC", serif; font-weight: 400; color: ${C.ink}; letter-spacing: 0.04em; line-height: 1.1; }
    .caslon { font-family: "Libre Caslon Text", serif; color: ${C.ink}; }
    .red { color: ${C.red}; }
    .on-dark { color: ${C.paper}; }
    .ink { text-shadow: 0 0 0.6px rgba(27, 25, 21, 0.85); }
    .w { display: inline-block; white-space: pre; }
    .pic { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    .pic img { display: block; width: 100%; height: 100%; }
    .sheet { position: absolute; background: ${C.paper} url(assets/paper.jpg) center / cover; box-shadow: 0 18px 44px rgba(40, 24, 8, 0.30), 0 2px 6px rgba(40, 24, 8, 0.18); }
    .slip { position: absolute; left: 0; width: ${W}px; background: rgba(237, 227, 203, 0.94); }
    .rule { position: absolute; height: 3px; background: ${C.ink}; }
    svg.ink-line { position: absolute; overflow: visible; }
    svg.ink-line path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 100 120; stroke-dashoffset: 110; }
`;

// A picture sized to its pixels, placed by its camera: framing (fx, fy) of
// the picture at screen point (sx, sy), at s screen pixels per picture pixel
function pic(id, name, extra = "") {
  const s = SIZES[name];
  if (!s) throw new Error("no picture " + name);
  return `<div id="${id}" class="pic" style="width:${s.w}px;height:${s.h}px;${extra}"><img src="assets/img/${name}.jpg" alt=""></div>`;
}
function frame(name, fx, fy, s, sx = W / 2, sy = H / 2, cover = true) {
  const { w, h } = SIZES[name];
  let x = sx - s * fx * w, y = sy - s * fy * h;
  if (cover) { // never show the edge of a full-bleed picture
    s = Math.max(s, W / w, H / h);
    x = Math.min(0, Math.max(W - s * w, sx - s * fx * w));
    y = Math.min(0, Math.max(H - s * h, sy - s * fy * h));
  }
  return { x: r3(x), y: r3(y), scale: r3(s) };
}
const fill = (name) => Math.max(W / SIZES[name].w, H / SIZES[name].h);
const words = (text, cls = "w") => text.split(" ").map((w) => `<span class="${cls}">${w} </span>`).join("");
// A hand-drawn line: a rule with a little life in it, pathLength 100
function stroke(id, x, y, w, h, d, color = C.red, width = 7, extra = "") {
  return `<svg id="${id}" class="ink-line" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}" viewBox="0 0 ${w} ${h}"><path d="${d}" pathLength="100" stroke="${color}" stroke-width="${width}"/></svg>`;
}
// A loose ring round a signature, drawn as a pen would: a little over one turn
function ring(id, cx, cy, rx, ry) {
  const pts = [];
  for (let i = 0; i <= 56; i++) {
    const a = -2.2 + (i / 56) * Math.PI * 2.18, k = 1 + 0.05 * Math.sin(i * 0.9);
    pts.push(`${(rx + 12 + Math.cos(a) * rx * k).toFixed(1)},${(ry + 12 + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return stroke(id, cx - rx - 12, cy - ry - 12, 2 * rx + 24, 2 * ry + 24, "M" + pts.join(" L"), C.red, 7);
}
// Seeded randomness, so every build is the same
let seed = 1731;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// A deckled edge for a loose sheet
function deckle(w, h, n = 60, amp = 5) {
  const p = [];
  for (let i = 0; i <= n; i++) p.push(`${((i / n) * 100).toFixed(2)}% ${(rnd() * amp).toFixed(1)}px`);
  for (let i = 0; i <= n * 1.6; i++) p.push(`calc(100% - ${(rnd() * amp).toFixed(1)}px) ${((i / (n * 1.6)) * 100).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) p.push(`${((i / n) * 100).toFixed(2)}% calc(100% - ${(rnd() * amp).toFixed(1)}px)`);
  for (let i = Math.round(n * 1.6); i >= 0; i--) p.push(`${(rnd() * amp).toFixed(1)}px ${((i / (n * 1.6)) * 100).toFixed(2)}%`);
  return `clip-path: polygon(${p.join(",")});`;
}
// A quill's scrawl of a name on a subscription list
function scrawl(w) {
  let d = `M2,${10 + rnd() * 6}`, x = 2;
  while (x < w - 10) {
    const step = 8 + rnd() * 14, up = 2 + rnd() * 14;
    d += ` q${(step / 2).toFixed(1)},${(-up).toFixed(1)} ${step.toFixed(1)},${(rnd() * 6 - 3).toFixed(1)}`;
    x += step;
    if (rnd() < 0.14) { d += ` m${(6 + rnd() * 8).toFixed(1)},0`; x += 10; }
  }
  return d;
}

const scenes = [];
const SECTION = (id) => T.lines.filter((l) => l.id.startsWith(id));
const start = (id) => SECTION(id)[0].t0;

// ── 1. HOOK: Philadelphia, 1731, and what it lacked ─────────────────────────
{
  const s = new Scene("hook", 0, start("who") - 0.25, 1);
  const P = "prospect", ps = fill(P);
  // The engraving as printed: a band across the paper, travelling east to west
  const PH = 1240, pk = PH / SIZES[P].h, PW = SIZES[P].w * pk;
  s.add(`<div id="world" class="abs" style="left:0;top:400px;width:${W}px;height:${PH}px;overflow:hidden">${pic("pan", P)}</div>`)
    .add(`<div id="name" class="sc ink abs" style="left:0;top:178px;width:${W}px;text-align:center;font-size:110px;letter-spacing:0.07em">Philadelphia</div>`)
    .add(`<div id="year" class="fell red abs" style="left:0;top:296px;width:${W}px;text-align:center;font-size:72px;letter-spacing:0.3em;opacity:0">1731</div>`);
  s.cam("#pan", { x: 0, y: 0, scale: pk }, { x: -(PW - W) * 0.55, y: 0, scale: pk }, 0, at("hook3") + 1.2, "power1.inOut");
  s.press("#year", at("hook1", "1731"), { dur: 0.12 });
  s.sound("impact-bass-1", at("hook1", "1731") + 0.03, 0.22);
  // The broadside: what the city wanted
  const items = ["A Lending Library", "A Fire Company", "A Hospital", "A College"];
  const years = ["1731", "1736", "1751", "1751"];
  let sheet = `<div id="sheet" class="sheet" style="left:70px;top:440px;width:940px;height:720px;${deckle(940, 720)}">
    <div class="sc ink abs" style="left:0;top:44px;width:940px;text-align:center;font-size:44px;letter-spacing:0.16em">Wanted in this City</div>
    <div class="rule" style="left:110px;top:118px;width:720px;height:2px"></div>`;
  items.forEach((it, i) => {
    sheet += `<div id="it${i}" class="fell ink abs" style="left:84px;top:${168 + i * 128}px;font-size:76px"><span style="position:relative;display:inline-block">${it}
      ${stroke(`strike${i}`, -14, 34, 0, 0, "", C.red, 7, "width:calc(100% + 28px);height:30px").replace(/viewBox="[^"]*"/, 'viewBox="0 0 100 30" preserveAspectRatio="none"').replace(/d=""/, `d="M0,${18 + i % 2 * 4} C30,${10 + i * 2} 70,${24 - i * 2} 100,${12 + i}" vector-effect="non-scaling-stroke"`)}</span></div>
      <div id="yr${i}" class="fell ink abs" style="left:740px;top:${178 + i * 128}px;width:150px;text-align:right;font-size:58px;opacity:0">${years[i]}</div>`;
  });
  sheet += `</div>`;
  s.add(sheet).add(`<div id="sig" class="abs" style="left:300px;top:1000px;width:620px;height:250px;clip-path:inset(0 100% 0 0)"><img src="assets/img/signature.png" alt="" style="width:100%;height:100%;object-fit:contain"></div>`);
  s.style(`#sheet { transform-origin: 50% 0; }`);
  s.lay("#sheet", at("hook1", "had") - 0.3, { y: 1500, rot: -5, end: -0.8 });
  s.sound("whoosh-short", at("hook1", "had") - 0.28, 0.25);
  s.press("#it0, #it1, #it2, #it3", at("hook1", "had") - 0.1, { stagger: 0.07 });
  [["hook1", "library"], ["hook2", "company"], ["hook2", "hospital"], ["hook2", "college"]].forEach(([id, w], i) =>
    s.pen(`#strike${i} path`, at(id, w) + 0.08, 0.3));
  // Twenty years later: the strikes lift, each line gets its year
  const later = at("hook3", "twenty");
  s.to("#strike0, #strike1, #strike2, #strike3", { opacity: 0, y: -14, duration: 0.3, ease: "power2.in", stagger: 0.05 }, later);
  s.press("#yr0, #yr1, #yr2, #yr3", at("hook3", "four") - 0.35, { stagger: 0.09 });
  // One man: his own hand, written left to right
  s.fromTo("#sig", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power1.inOut" }, at("hook3", "one") - 0.1);
  // Into his signature, and out into his face
  const zt = L("hook3").t1 + 0.05;
  s.to("#sheet, #sig", { scale: 5, x: -1200, y: -2300, opacity: 0, duration: 0.45, ease: "power3.in" }, zt);
  s.sound("whoosh", zt, 0.3);
  s.t1 = Math.max(s.t1, zt + 0.45);
  scenes.push(s);
}

// ── 2. WHO: printer, writer, scientist, inventor, Founding Father ──────────
{
  const s = new Scene("who", start("who") - 0.25, start("lib") - 0.2, 2);
  s.add(`<div id="face" class="full">${pic("p0", "portrait")}</div>`)
    .add(`<div id="nslip" class="slip" style="top:196px;height:132px;opacity:0"></div>`)
    .add(`<div id="name" class="sc ink abs" style="left:0;top:218px;width:${W}px;text-align:center;font-size:84px;letter-spacing:0.08em">${words("Benjamin Franklin")}</div>`);
  const pf = fill("portrait");
  s.cam("#p0", frame("portrait", 0.53, 0.30, pf * 1.22), frame("portrait", 0.53, 0.30, pf * 1.06), 0, 0.9, "expo.out");
  s.to("#p0", { ...frame("portrait", 0.53, 0.29, pf * 1.12), duration: at("who1", "printer") - s.t0 - 0.9, ease: "power1.inOut" }, s.t0 + 0.9);
  s.set("#nslip", { opacity: 1 }, at("who1", "benjamin") - 0.05).press("#name .w", at("who1", "benjamin"), { stagger: 0.16 });
  // Four quick plates, one a word, cut on the word
  const four = [["printer", "almanac", 0.5, 0.32], ["writer", "martin", 0.45, 0.32], ["scientist", "kite", 0.55, 0.3], ["inventor", "stove", 0.24, 0.62]];
  four.forEach(([w, img, fx, fy], i) => {
    const t = at("who1", w) - 0.07, f = fill(img);
    s.add(`<div id="m${i}" class="full" style="opacity:0">${pic(`mp${i}`, img)}</div>`)
      .add(`<div id="lab${i}" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:62px;letter-spacing:0.1em;opacity:0">${w}</div>`);
    s.set(`#m${i}`, { opacity: 1 }, t).set(`#lab${i}`, { opacity: 1 }, t);
    s.cam(`#mp${i}`, frame(img, fx, fy, f * 1.16), frame(img, fx, fy, f * 1.04), t, 0.75, "expo.out");
    if (i > 0) s.set(`#m${i - 1}, #lab${i - 1}`, { opacity: 0 }, t + 0.02);
    if (i === 0) s.set("#nslip, #name", { opacity: 0 }, t + 0.02);
  });
  // A Founding Father: Trumbull's Declaration, along the table to him
  const tA = at("who2", "and") - 0.1, tr = fill("trumbull");
  s.add(`<div id="tw" class="full" style="opacity:0">${pic("tp", "trumbull")}</div>`)
    .add(`<div id="ff" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:62px;letter-spacing:0.1em;opacity:0">${words("A Founding Father")}</div>`);
  s.set("#tw", { opacity: 1 }, tA).set("#m3, #lab3", { opacity: 0 }, tA + 0.02);
  s.cam("#tp", frame("trumbull", 0.30, 0.5, tr), frame("trumbull", 0.585, 0.55, tr * 1.08), tA, at("who2", "who") - tA + 0.1);
  s.set("#ff", { opacity: 1 }, at("who2", "founding") - 0.05).press("#ff .w", at("who2", "founding") - 0.05, { stagger: 0.12 });
  s.sound("whoosh-short", tA - 0.02, 0.2);
  // His own signature on both: the Declaration, then the Constitution
  // (the engrossed Declaration is too faded to point at one name: the camera
  // reads its heading; on the Constitution it finds "B Franklin")
  const docs = [["declaration", "signed", 0.5, 0.052, 2.2, null], ["constitution4", "constitution", 0.88, 0.853, 3.2, [250, 92]]];
  docs.forEach(([img, w, fx, fy, z, rr], i) => {
    const t = at("who2", w) - 0.25, sz = SIZES[img], sw = 980 / sz.w;
    s.add(`<div id="d${i}" class="full" style="opacity:0;background:${C.paper} url(assets/paper.jpg) center/cover"><div id="dc${i}" class="abs" style="left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0">
      <div class="sheet" style="left:0;top:0;width:${r3(sz.w * sw)}px;height:${r3(sz.h * sw)}px;background:none"><img src="assets/img/${img}.jpg" alt="" style="width:100%;height:100%;display:block"></div></div>
      ${rr ? ring(`ring${i}`, 540, 700, rr[0], rr[1]) : ""}</div>`);
    // the sheet lands, then the camera finds what it is looking for
    const land = { x: 50, y: 300, scale: 1 }, near = { x: 540 - fx * sz.w * sw * z, y: 700 - fy * sz.h * sw * z, scale: z };
    s.set(`#d${i}`, { opacity: 1 }, t);
    s.fromTo(`#dc${i}`, { x: 50 + (i ? 1200 : 0), y: i ? 300 : 1900, scale: 1, rotation: i ? 6 : -4 }, { ...land, rotation: 0, duration: 0.6, ease: "expo.out" }, t);
    s.to(`#dc${i}`, { ...near, duration: 0.95, ease: "power2.inOut" }, t + 0.6);
    if (rr) s.pen(`#ring${i} path`, t + 1.5, 0.45);
    s.sound("whoosh-short", t, 0.18);
  });
  // A polymath, pointed at the public good
  const tP = at("who3") - 0.15;
  s.add(`<div id="poly" class="full" style="opacity:0;background:${C.paper} url(assets/paper.jpg) center/cover">
      <div id="pm" class="fell ink abs" style="left:84px;top:330px;font-size:150px">${words("A polymath,")}</div>
      ${stroke("arrow", 150, 520, 520, 330, "M20,10 C40,170 180,280 470,300 M440,270 L475,300 L436,322", C.red, 8)}
      <div id="pg" class="sc ink abs" style="left:84px;top:860px;width:920px;font-size:104px;letter-spacing:0.05em;text-align:right">${words("the public good.")}</div></div>`);
  s.set("#poly", { opacity: 1 }, tP).press("#pm .w", at("who3", "a"), { stagger: 0.14 });
  s.pen("#arrow path", at("who3", "pointed"), 0.55).press("#pg .w", at("who3", "public") - 0.05, { stagger: 0.1 });
  scenes.push(s);
}

// ── 3. LIB: the Junto, the subscribers, the Library Company ────────────────
{
  const s = new Scene("lib", start("lib") - 0.2, start("fire") - 0.1, 3);
  s.add(`<div id="junto" class="fell ink abs" style="left:84px;top:270px;font-size:176px">${"The Junto".split("").map((c) => `<span class="w">${c}</span>`).join("")}</div>`)
    .add(`<div id="yr" class="sc red abs" style="left:90px;top:470px;font-size:56px;letter-spacing:0.12em;opacity:0">Philadelphia, 1727</div>`);
  const tJ = at("lib1", "junto") - 0.35;
  s.press("#junto .w", tJ, { stagger: 0.055, dur: 0.1 });
  for (let k = 0; k < 3; k++) s.sound("key-press", tJ + k * 0.17, 0.3);
  s.press("#yr", at("lib1", "1727"));
  const trades = ["a scrivener,", "a glazier,", "a surveyor,", "a shoemaker,", "a joiner,", "a printer"];
  s.add(`<div id="trades" class="fell ink abs" style="left:90px;top:600px;width:900px;font-size:66px;line-height:1.18">${trades.map((t) => `<span class="w">${t} </span>`).join("")}</div>`);
  s.press("#trades .w", at("lib1", "club") - 0.05, { stagger: (at("lib1", "he") - at("lib1", "club")) / 6 });
  const verbs = [["read", "Read,"], ["debate", "debate,"], ["improve", "and improve."]];
  s.add(`<div id="verbs" class="sc ink abs" style="left:90px;top:900px;font-size:86px;letter-spacing:0.05em">${verbs.map(([, v]) => `<span class="w">${v} </span>`).join("")}</div>`);
  verbs.forEach(([w], i) => s.press(`#verbs .w:nth-child(${i + 1})`, at("lib1", w) - 0.04));
  // They pooled their own books; then fifty subscribers, forty shillings each
  const tB = at("lib2") - 0.2;
  s.out("#junto, #yr, #trades, #verbs", tB, 0.22);
  s.add(`<div id="books" class="fell ink abs" style="left:84px;top:300px;font-size:120px;opacity:0">${words("Their own books…")}</div>`);
  s.press("#books .w", at("lib2", "pooled"), { stagger: 0.12 }).set("#books", { opacity: 1 }, at("lib2", "pooled"));
  // The subscription list: fifty names, written in as the voice counts them
  const tS = at("lib2", "then") - 0.15;
  s.out("#books", tS - 0.05, 0.15);
  let list = `<div id="list" class="sheet" style="left:60px;top:210px;width:960px;height:960px;${deckle(960, 960)}">
    <div class="sc ink abs" style="left:0;top:34px;width:960px;text-align:center;font-size:40px;letter-spacing:0.14em">The Subscribers</div>
    <div id="l1731" class="fell red abs" style="left:0;top:80px;width:960px;text-align:center;font-size:64px">1731</div>`;
  for (let i = 0; i < 50; i++) {
    const col = i % 2, row = Math.floor(i / 2), w = 250 + rnd() * 130;
    list += `<div class="abs caslon" style="left:${70 + col * 450}px;top:${178 + row * 29.5}px;font-size:22px;width:36px;text-align:right;color:#5a5048">${i + 1}.</div>`;
    list += stroke(`n${i}`, 116 + col * 450, 168 + row * 29.5, w, 26, scrawl(w), "#2a241f", 2.2);
  }
  list += `</div>`;
  s.add(list).add(`<div id="count" class="fell ink abs" style="left:640px;top:1000px;width:360px;text-align:right;font-size:120px;opacity:0">50</div>`)
    .add(`<div id="fee" class="sc ink abs" style="left:84px;top:1030px;font-size:72px;opacity:0">40s. each</div>`);
  s.lay("#list", tS, { y: 1500, rot: 3, end: 0.6 }).sound("whoosh-short", tS, 0.2);
  s.press("#l1731", at("lib2", "1731"));
  const n0 = at("lib2", "fifty") - 0.1, n1 = at("lib2", "pay");
  s.pen("#list svg[id] path", n0, 0.16).tl.pop();
  s.tl.push(`tl.fromTo(${js(`#lib-list svg.ink-line:not(#lib-l1731) path`)}, {strokeDashoffset:110}, {strokeDashoffset:0, duration:0.18, ease:"power1.out", stagger:${r3((n1 - n0) / 50)}}, ${s.local(n0)});`);
  s.press("#count", at("lib2", "subscribers") + 0.1).press("#fee", at("lib2", "forty"));
  s.sound("typing", n0, 0.18);
  // The Library Company, still open today
  const tL = at("lib3") - 0.25, lh = "library-hall", lz = SIZES[lh], lw = 1000 / lz.w;
  s.add(`<div id="hall" class="full" style="opacity:0;background:${C.paper} url(assets/paper.jpg) center/cover"><div id="hc" class="abs" style="left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0">
      <div class="sheet" style="left:40px;top:330px;width:1000px;height:${r3(lz.h * lw)}px;background:none"><img src="assets/img/${lh}.jpg" alt="" style="width:100%;height:100%;display:block"></div></div></div>`)
    .add(`<div id="lc" class="sc ink abs" style="left:0;top:180px;width:${W}px;text-align:center;font-size:54px;letter-spacing:0.08em;line-height:1.2;opacity:0">The Library Company<br>of Philadelphia</div>`);
  s.set("#hall", { opacity: 1 }, tL).set("#list, #count, #fee", { opacity: 0 }, tL + 0.02);
  // the camera walks up Fifth Street to the statue in its niche
  const lk = 1.55, lfx = 0.345, lfy = 0.40;
  s.fromTo("#hc", { x: 0, y: 0, scale: 1 }, { x: 540 - (40 + lfx * 1000) * lk, y: 760 - (330 + lfy * lz.h * lw) * lk, scale: lk, duration: at("lib3", "still") - tL + 0.1, ease: "power2.inOut" }, tL + 0.3);
  s.set("#lc", { opacity: 1 }, tL + 0.25).press("#lc", tL + 0.25);
  s.sound("whoosh-short", tL - 0.02, 0.2);
  const tT = at("lib3", "still") - 0.1, lt = "lib-statue", ltf = fill(lt);
  s.add(`<div id="today" class="full" style="opacity:0">${pic("tp", lt)}</div>`)
    .add(`<div id="since" class="slip" style="top:860px;height:300px;opacity:0"><div class="sc red abs" style="left:84px;top:34px;font-size:52px;letter-spacing:0.12em">${words("Open since 1731")}</div>
      <div class="fell ink abs" style="left:84px;top:110px;width:920px;font-size:74px;line-height:1.08">${words("America’s oldest cultural institution.")}</div></div>`);
  s.set("#today", { opacity: 1 }, tT).set("#hall, #lc", { opacity: 0 }, tT + 0.02);
  s.cam("#tp", frame(lt, 0.5, 0.42, ltf * 1.12), frame(lt, 0.5, 0.36, ltf * 1.02), tT, 2.6, "expo.out");
  s.set("#since", { opacity: 1 }, tT + 0.3).press("#since .sc .w", tT + 0.3, { stagger: 0.08 });
  s.press("#since .fell .w", at("lib3", "america’s") - 0.05, { stagger: 0.09 });
  scenes.push(s);
}

// ── 4. FIRE: the page burns; an ounce of prevention; leather buckets ───────
{
  const s = new Scene("fire", start("fire") - 0.1, start("hosp") - 0.15, 4);
  const lt = "lib-statue", ltf = fill(lt), last = frame(lt, 0.5, 0.36, ltf * 1.02);
  // The last picture of the library, burning from its lower edge
  s.add(`<svg class="full" style="position:absolute" width="${W}" height="${H}">
      <defs><filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="17"/><feDisplacementMap in="SourceGraphic" scale="150"/></filter>
      <mask id="hole" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle id="burn" cx="610" cy="1560" r="0" fill="#000" filter="url(#fire-rough)"/></mask>
      <mask id="char" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle id="burn2" cx="610" cy="1560" r="0" fill="#000" filter="url(#fire-rough)"/></mask></defs>
      <g mask="url(#fire-char)"><rect width="${W}" height="${H}" fill="#2a170b"/></g>
      <g mask="url(#fire-hole)"><image href="assets/img/${lt}.jpg" x="${last.x}" y="${last.y}" width="${SIZES[lt].w * last.scale}" height="${SIZES[lt].h * last.scale}" preserveAspectRatio="none"/>
      <rect width="${W}" height="${H}" fill="rgba(237,227,203,0.94)" y="860" height="300"/></g></svg>`);
  // the slip of words over the picture, as the library scene left it
  s.add(`<div id="slipcopy" class="slip" style="top:860px;height:300px"><div class="sc red abs" style="left:84px;top:34px;font-size:52px;letter-spacing:0.12em">Open since 1731</div>
      <div class="fell ink abs" style="left:84px;top:110px;width:920px;font-size:74px;line-height:1.08">America’s oldest cultural institution.</div></div>`);
  const tF = at("fire1") - 0.05;
  s.fromTo("#burn", { attr: { r: 0 } }, { attr: { r: 2300 }, duration: 2.4, ease: "power2.in" }, tF);
  s.fromTo("#burn2", { attr: { r: 0 } }, { attr: { r: 2280 }, duration: 2.4, ease: "power2.in" }, tF + 0.12);
  s.to("#slipcopy", { opacity: 0, duration: 0.3 }, tF + 1.2);
  s.add(`<div id="fire" class="fell red abs" style="left:84px;top:330px;font-size:230px;opacity:0">Fire.</div>`);
  s.press("#fire", at("fire1", "fire") + 0.05, { dur: 0.16 });
  // the proverb, as a broadside: the pound outweighs the ounce
  const tO = at("fire2") - 0.2;
  s.out("#fire", tO - 0.1, 0.18);
  s.add(`<div id="prov" class="abs" style="left:84px;top:250px;width:912px">
      <div id="pv0" class="sc ink" style="font-size:64px;letter-spacing:0.1em">An ounce</div>
      <div id="pv1" class="fell ink" style="font-size:96px;margin-top:6px">of prevention</div>
      <div id="pv2" class="fell ink" style="font-size:60px;margin-top:20px">is worth</div>
      <div id="pv3" class="sc ink" style="font-size:230px;line-height:0.95;letter-spacing:0.01em">a Pound</div>
      <div id="pv4" class="fell ink" style="font-size:96px">of cure.</div>
      <div id="pv5" class="sc ink" style="font-size:40px;margin-top:34px;letter-spacing:0.14em;color:#5a5048">Pennsylvania Gazette, 1735</div></div>`);
  [["ounce", 0], ["prevention", 1], ["worth", 2], ["pound", 3], ["cure", 4]].forEach(([w, i]) => s.press(`#pv${i}`, at("fire2", w) - 0.08, { dur: i === 3 ? 0.16 : 0.13 }));
  s.sound("impact-bass-2", at("fire2", "pound") - 0.05, 0.2);
  s.press("#pv5", at("fire2", "cure") + 0.3);
  // the Union Fire Company, and its buckets
  const tU = at("fire2", "he") - 0.15;
  s.to("#prov", { y: -1400, duration: 0.5, ease: "power3.in" }, tU);
  s.add(`<div id="union" class="abs" style="left:84px;top:300px;width:920px"><div class="sc ink" style="font-size:96px;line-height:1.06">${words("The Union Fire Company")}</div>
      <div class="sc red" style="font-size:52px;letter-spacing:0.14em;margin-top:22px">1736</div>
      <div class="fell ink" style="font-size:66px;margin-top:40px;line-height:1.15">${words("Thirty volunteers, pledged to come to any fire with their own leather buckets.")}</div></div>`);
  s.press("#union .sc:first-child .w", at("fire2", "union") - 0.05, { stagger: 0.12 }).press("#union .red", at("fire2", "company") + 0.2);
  s.press("#union .fell .w", at("fire2", "volunteers") - 0.05, { stagger: (at("fire2", "leather") - at("fire2", "volunteers")) / 12 });
  const tK = at("fire2", "leather") - 0.1, bk = "bucket", bf = fill(bk);
  s.add(`<div id="bucket" class="full" style="opacity:0">${pic("bp", bk)}</div>`);
  s.set("#bucket", { opacity: 1 }, tK).cam("#bp", frame(bk, 0.5, 0.45, bf * 1.18), frame(bk, 0.5, 0.42, bf * 1.04), tK, 1.4, "expo.out");
  s.sound("whoosh-short", tK - 0.02, 0.2);
  scenes.push(s);
}

// ── 5. HOSP: Dr Bond's hospital and the first matching grant ───────────────
{
  const s = new Scene("hosp", start("hosp") - 0.15, start("acad") - 0.15, 5);
  const bz = SIZES.bond, bw = 640 / bz.w;
  s.add(`<div id="bond" class="sheet" style="left:220px;top:250px;width:640px;height:${r3(bz.h * bw)}px;background:none"><img src="assets/img/bond.jpg" alt="" style="width:100%;height:100%;display:block"></div>`)
    .add(`<div id="bn" class="sc ink abs" style="left:0;top:${290 + bz.h * bw}px;width:${W}px;text-align:center;font-size:56px;letter-spacing:0.1em;opacity:0">Dr Thomas Bond</div>`);
  s.lay("#bond", at("hosp1") - 0.1, { y: 1600, rot: -6, end: -1.2 }).press("#bn", at("hosp1", "thomas"));
  s.sound("whoosh-short", at("hosp1") - 0.1, 0.2);
  const hz = SIZES.hospital, hw = 700 / hz.w, tH = at("hosp1", "hospital") - 0.15;
  s.add(`<div id="hosp" class="sheet" style="left:190px;top:230px;width:700px;height:${r3(hz.h * hw)}px;background:none"><img src="assets/img/hospital.jpg" alt="" style="width:100%;height:100%;display:block"></div>`)
    .add(`<div id="hn" class="sc ink abs" style="left:190px;top:${262 + hz.h * hw}px;width:760px;font-size:50px;letter-spacing:0.1em;opacity:0">${words("A hospital for the sick poor")}</div>`);
  s.lay("#hosp", tH, { x: 1300, y: 80, rot: 5, end: 0.8 }).out("#bn", tH, 0.15);
  s.press("#hn .w", at("hosp1", "sick") - 0.1, { stagger: 0.08 }).sound("whoosh-short", tH, 0.2);
  // The ledger: the Assembly's £2,000 waits on the donors' £2,000
  const tG = at("hosp2") - 0.25;
  s.to("#bond, #hosp, #hn", { x: -1300, rotation: -4, duration: 0.45, ease: "power3.in" }, tG - 0.15);
  s.add(`<div id="ledger" class="abs" style="left:0;top:220px;width:${W}px;height:900px;opacity:0">
      <div class="rule" style="left:540px;top:0;width:3px;height:860px"></div>
      <div class="rule" style="left:60px;top:150px;width:960px;height:3px"></div>
      <div class="sc ink abs" style="left:60px;top:40px;width:460px;text-align:center;font-size:50px;letter-spacing:0.08em;line-height:1.1">The<br>Assembly</div>
      <div class="sc ink abs" style="left:560px;top:40px;width:460px;text-align:center;font-size:50px;letter-spacing:0.08em;line-height:1.1">Private<br>donors</div>
      <div id="ghost" class="fell abs" style="left:60px;top:250px;width:460px;text-align:center;font-size:136px;color:transparent;-webkit-text-stroke:2px rgba(27,25,21,0.55);opacity:0">£2,000</div>
      <div id="paid" class="fell ink abs" style="left:60px;top:250px;width:460px;text-align:center;font-size:136px;opacity:0">£2,000</div>
      <div id="tally" class="fell ink abs" style="left:560px;top:250px;width:460px;text-align:center;font-size:136px;opacity:0">£0</div>
      <div id="only" class="fell ink abs" style="left:60px;top:440px;width:460px;text-align:center;font-size:52px;opacity:0">only if …</div>
      <div id="bar" class="abs" style="left:740px;top:440px;width:60px;height:380px;border:3px solid ${C.ink};opacity:0"><div id="fillbar" class="abs" style="left:0;bottom:0;width:100%;height:100%;background:${C.ink};transform-origin:50% 100%"></div></div>
      ${stroke("brace", 120, 590, 840, 120, "M10,10 C10,70 400,40 420,110 C440,40 830,70 830,10", C.red, 7)}
      <div id="match" class="sc ink abs" style="left:0;top:740px;width:${W}px;text-align:center;font-size:72px;letter-spacing:0.08em;opacity:0">${words("A matching grant")}</div></div>`);
  s.set("#ledger", { opacity: 1 }, tG).press("#ledger > .sc", tG, { stagger: 0.12 });
  s.press("#ghost", at("hosp2", "two") - 0.05).press("#only", at("hosp2", "only") - 0.05);
  const d0 = at("hosp2", "private") - 0.05, d1 = after("hosp2", "first");
  s.set("#tally", { opacity: 1 }, d0).set("#bar", { opacity: 1 }, d0);
  s.fromTo("#fillbar", { scaleY: 0 }, { scaleY: 1, duration: d1 - d0 - 0.1, ease: "power1.inOut" }, d0);
  s.tl.push(`{ const o = { v: 0 }; tl.fromTo(o, { v: 0 }, { v: 2000, duration: ${r3(d1 - d0 - 0.1)}, ease: "power1.inOut", onUpdate: () => { document.getElementById("hosp-tally").textContent = "£" + (Math.round(o.v / 50) * 50).toLocaleString("en-GB"); } }, ${s.local(d0)}); }`);
  s.set("#paid", { opacity: 1 }, d1 + 0.05).set("#ghost, #only", { opacity: 0 }, d1 + 0.05).fromTo("#paid", { scale: 1.12 }, { scale: 1, duration: 0.25, ease: "expo.out" }, d1 + 0.05);
  s.sound("impact-bass-1", d1 + 0.07, 0.24);
  s.out("#bar", at("hosp3") - 0.2, 0.2);
  s.pen("#brace path", at("hosp3", "matching") - 0.35, 0.45).press("#match .w", at("hosp3", "matching") - 0.05, { stagger: 0.1 });
  scenes.push(s);
}

// ── 6. ACAD: the academy that became a university ───────────────────────────
{
  const s = new Scene("acad", start("acad") - 0.15, start("turn") - 0.2, 6);
  const ch = "charter", cf = fill(ch), pn = "penn", pf = fill(pn);
  s.add(`<div id="ch" class="full">${pic("cp", ch)}</div>`)
    .add(`<div id="lab" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:62px;letter-spacing:0.1em">${words("An academy, 1751")}</div>`)
    .add(`<div id="pn" class="full" style="opacity:0">${pic("pp", pn)}</div>`)
    .add(`<div id="lab2" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:62px;letter-spacing:0.1em;opacity:0">${words("University of Pennsylvania")}</div>`);
  const tU = at("acad1", "university") - 0.1;
  s.cam("#cp", frame(ch, 0.3, 0.2, cf * 1.5), frame(ch, 0.62, 0.55, cf * 1.25), 0, tU - s.t0);
  s.press("#lab .w", at("acad1", "academy") - 0.05, { stagger: 0.1 });
  s.set("#pn, #lab2", { opacity: 1 }, tU).set("#ch, #lab", { opacity: 0 }, tU + 0.02);
  s.cam("#pp", frame(pn, 0.5, 0.5, pf * 1.15), frame(pn, 0.5, 0.45, pf * 1.03), tU, 1.6, "expo.out");
  s.press("#lab2 .w", tU, { stagger: 0.08 }).sound("whoosh-short", tU - 0.02, 0.2);
  scenes.push(s);
}

// ── 7. TURN: four times, from scratch ───────────────────────────────────────
{
  const s = new Scene("turn", start("turn") - 0.2, start("now") - 0.15, 7);
  s.add(`<div id="thing" class="fell ink abs" style="left:84px;top:520px;font-size:120px;width:920px">${words("But here is the thing.")}</div>`);
  s.press("#thing .w", at("turn1", "but"), { stagger: (after("turn1") - at("turn1")) / 5 });
  // the paperwork of each, laid on a pile as it is named
  const tS = at("turn2") - 0.1;
  s.out("#thing", tS, 0.18);
  s.add(`<div id="scratch" class="fell ink abs" style="left:84px;top:250px;font-size:100px">${words("From scratch:")}</div>`);
  s.press("#scratch .w", at("turn2", "scratch") - 0.4, { stagger: 0.14 });
  const pile = [["agreements", "charter", -5], ["subscriptions", null, 4], ["fundraising", null, -2], ["books", "almanac", 6]];
  pile.forEach(([w, img, rot], i) => {
    const t = at("turn2", w) - 0.12, left = 150 + i * 22, top = 470 + i * 26;
    let inner;
    if (img) inner = `<img src="assets/img/${img}.jpg" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
    else if (w === "subscriptions") inner = Array.from({ length: 14 }, (_, k) => stroke(`ps${k}`, 60, 70 + k * 40, 300 + rnd() * 160, 26, scrawl(300 + rnd() * 160), "#2a241f", 2.2).replace('stroke-dasharray: 100 120', '')).join("");
    else inner = `<div class="fell ink abs" style="left:0;top:90px;width:100%;text-align:center;font-size:96px">£2,000</div><div class="fell ink abs" style="left:0;top:220px;width:100%;text-align:center;font-size:96px">£2,000</div>`;
    s.add(`<div id="pl${i}" class="sheet" style="left:${left}px;top:${top}px;width:700px;height:580px;overflow:hidden;${img ? "background:none;" : ""}">${inner}</div>`)
      .add(`<div id="pt${i}" class="slip sc ink" style="top:1080px;height:84px;padding:10px 0 0 84px;font-size:56px;letter-spacing:0.12em;opacity:0">${w}</div>`);
    s.lay(`#pl${i}`, t, { y: 1700, x: (i % 2 ? 1 : -1) * 300, rot: rot * 3, end: rot, dur: 0.55 });
    s.set(`#pt${i}`, { opacity: 1 }, t + 0.1);
    if (i) s.set(`#pt${i - 1}`, { opacity: 0 }, t + 0.1);
    s.sound(i % 2 ? "impact-bass-2" : "impact-bass-1", t + 0.32, 0.13);
  });
  s.style(`svg.ink-line path { stroke-dashoffset: 0; } #pl1 svg.ink-line path, #pl2 svg.ink-line path { stroke-dasharray: none; }`);
  // four times over, and everything else besides
  const tF = at("turn3") - 0.1;
  s.out("#pt3, #scratch", tF, 0.15);
  s.add(`<div id="four" class="fell red abs" style="left:84px;top:250px;font-size:150px">${words("Four times,")}</div>`);
  s.press("#four .w", at("turn3", "four") - 0.05, { stagger: 0.14 });
  const side = [["printing", "press", 0.5, 0.45, "a printing business"], ["almanac", "almanac", 0.5, 0.3, "an almanac"], ["lightning", "kite", 0.62, 0.22, "experiments with lightning"]];
  side.forEach(([w, img, fx, fy, label], i) => {
    const t = at("turn3", w) - 0.08, f = fill(img);
    s.add(`<div id="sd${i}" class="full" style="opacity:0">${pic(`sp${i}`, img)}</div>`)
      .add(`<div id="sl${i}" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:56px;letter-spacing:0.1em;opacity:0">${label}</div>`);
    s.set(`#sd${i}, #sl${i}`, { opacity: 1 }, t).cam(`#sp${i}`, frame(img, fx, fy, f * 1.2), frame(img, fx, fy, f * 1.05), t, 0.9, "expo.out");
    if (i) s.set(`#sd${i - 1}, #sl${i - 1}`, { opacity: 0 }, t + 0.02);
  });
  // the lightning: two white frames on the word
  s.add(`<div id="flash" class="full" style="background:#fffaf0;opacity:0"></div>`);
  const tl = at("turn3", "lightning") + 0.25;
  s.set("#flash", { opacity: 0.85 }, tl).set("#flash", { opacity: 0 }, tl + 2 / FPS).set("#flash", { opacity: 0.6 }, tl + 4 / FPS).set("#flash", { opacity: 0 }, tl + 5 / FPS);
  s.sound("impact-bass-2", tl, 0.18);
  scenes.push(s);
}

// ── 8. NOW: no longer from zero; the chase that holds the type ─────────────
{
  const s = new Scene("now", start("now") - 0.15, start("end") - 0.35, 8);
  s.add(`<div id="today" class="sc red abs" style="left:84px;top:250px;font-size:72px;letter-spacing:0.16em">Today</div>`)
    .add(`<div id="zero" class="fell ink abs" style="left:84px;top:380px;width:920px;font-size:104px;line-height:1.05">${words("A founder would not start from zero.")}</div>`);
  s.press("#today", at("now1", "today") - 0.05).press("#zero .w", at("now1", "founder") - 0.2, { stagger: (at("now1", "zero") - at("now1", "founder") + 0.2) / 7 });
  // The chase: an iron frame that locks a forme of type in place
  const tC = at("now2") - 0.15;
  s.out("#today, #zero", tC, 0.2);
  s.add(`<div id="fs" class="sc ink abs" style="left:84px;top:230px;font-size:64px;letter-spacing:0.12em;opacity:0">${words("A fiscal sponsor")}</div>`)
    .add(`<div id="forme" class="abs" style="left:140px;top:430px;width:800px;height:600px">
      <div id="chase" class="abs" style="left:0;top:0;width:800px;height:600px;border:30px solid ${C.iron};border-radius:6px;box-shadow:inset 0 0 0 3px #4a4743, 0 14px 30px rgba(40,24,8,0.35)"></div>
      <div id="q0" class="abs" style="left:560px;top:30px;width:110px;height:34px;background:${C.wood};border:2px solid #8a6a3e"></div>
      <div id="q1" class="abs" style="left:736px;top:250px;width:34px;height:110px;background:${C.wood};border:2px solid #8a6a3e"></div>
      <div id="proj" class="fell ink abs" style="left:30px;top:90px;width:740px;text-align:center;font-size:96px">${"A New Project".split("").map((c) => `<span class="w">${c}</span>`).join("")}</div>
      <div id="can" class="caslon abs" style="left:30px;top:250px;width:740px;text-align:center;font-size:56px;line-height:1.6">
        <div id="c0" style="opacity:0">accepts gifts</div><div id="c1" style="opacity:0">wins grants</div><div id="c2" style="opacity:0">signs contracts</div></div></div>
      <div id="home" class="sc red abs" style="left:0;top:1060px;width:${W}px;text-align:center;font-size:58px;letter-spacing:0.12em;opacity:0">${words("a home from day one")}</div>`);
  s.press("#fs .w", at("now2", "fiscal") - 0.25, { stagger: 0.12 });
  s.press("#proj .w", at("now2", "new") - 0.1, { stagger: 0.045, dur: 0.1 });
  s.fromTo("#chase", { y: -900, opacity: 1 }, { y: 0, duration: 0.6, ease: "expo.out" }, at("now2", "home") - 0.45);
  s.set("#chase", { opacity: 0 }, 0).set("#chase", { opacity: 1 }, at("now2", "home") - 0.45);
  s.sound("impact-bass-1", at("now2", "home") - 0.1, 0.24);
  s.fromTo("#q0", { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, ease: "power3.out" }, at("now2", "day") - 0.1)
    .fromTo("#q1", { y: 140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power3.out" }, at("now2", "one") - 0.1);
  s.sound("click-soft", at("now2", "day") + 0.05, 0.4).sound("click-soft", at("now2", "one") + 0.05, 0.4);
  s.press("#home .w", at("now2", "day") - 0.05, { stagger: 0.07 });
  [["accept", 0], ["win", 1], ["sign", 2]].forEach(([w, i]) => s.press(`#c${i}`, at("now2", w) - 0.05));
  // …while the founder does the work
  const tW = at("now2", "while") - 0.1, mt = "martin", mf = fill(mt);
  s.add(`<div id="work" class="full" style="opacity:0">${pic("wp", mt)}</div>`)
    .add(`<div id="wl" class="slip sc ink" style="top:1010px;height:96px;padding:12px 0 0 84px;font-size:56px;letter-spacing:0.1em;opacity:0">${words("The founder does the work")}</div>`);
  s.set("#work", { opacity: 1 }, tW).cam("#wp", frame(mt, 0.45, 0.4, mf * 1.15), frame(mt, 0.5, 0.36, mf * 1.04), tW, after("now2") - tW + 0.4, "power2.out");
  s.set("#wl", { opacity: 1 }, at("now2", "founder") - 0.1).press("#wl .w", at("now2", "founder") - 0.1, { stagger: 0.09 });
  s.sound("whoosh-short", tW - 0.02, 0.2);
  scenes.push(s);
}

// ── 9. END: the cosmos and the wordmark (the launch film's own close) ──────
const PLATE = { file: "cosmos-close.mp4", from: 64.6, gather: 77.0, settle: 84.4 };
{
  const t0 = start("end") - 0.35;
  // the plate's network grows under the words; it gathers into the wordmark
  // as the last word lands
  const offset = PLATE.gather - (after("end2") + 0.7);
  const mediaStart = Math.max(0, t0 + offset - PLATE.from);
  const t1 = t0 + (PLATE.settle + 1.6 - PLATE.from - mediaStart);
  const s = new Scene("end", t0, t1, 9);
  s.add(`<video id="plate" class="full" src="assets/${PLATE.file}" muted playsinline style="object-fit:cover"></video>`);
  s.mediaStart = r3(mediaStart);
  s.add(`<div id="build" class="caslon abs" style="left:0;top:800px;width:${W}px;text-align:center;font-size:58px;line-height:1.3">${words("That is what Mulvium is building:")}<br><span style="font-size:78px">${words("a home for the next Franklin.")}</span></div>`);
  s.press("#build .w", at("end1", "that") - 0.05, { stagger: (after("end1") - at("end1") - 0.3) / 11 });
  s.out("#build", at("end2") - 0.15, 0.25);
  s.add(`<div id="close" class="caslon abs" style="left:90px;top:760px;width:900px;text-align:center;font-size:46px;line-height:1.3">${words("The next great expansion of human creativity will come from making it easier to create")}<br><span class="red" style="font-size:108px;color:${C.clay};font-style:italic">${words("institutions.")}</span></div>`);
  s.press("#close .w", at("end2", "the") - 0.05, { stagger: (at("end2", "institutions") - at("end2", "the")) / 15 });
  s.out("#close", after("end2") + 0.6, 0.3);
  s.sound("riser", at("end2", "institutions") - 1.6, 0.2);
  scenes.push(s);
}

// ── Captions: the voice, four to six words at a time ───────────────────────
const groups = [];
for (const l of T.lines) {
  if (l.id.startsWith("end")) continue; // over the close the words are set large
  let g = [];
  l.words.forEach((w, i) => {
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
    .cap { position: absolute; left: 0; top: 1186px; width: ${W}px; height: 140px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; }
    .cap span { max-width: 900px; text-align: center; font-family: "Libre Caslon Text", serif; font-size: 48px; line-height: 1.22; color: ${C.ink};
      background: rgba(237, 227, 203, 0.94); padding: 8px 22px 12px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`);
caps.t1 = scenes[scenes.length - 1].t0;

// ── The root: scenes, captions, voice, music, sound ────────────────────────
const DUR = r3(scenes[scenes.length - 1].t1);
fs.mkdirSync(path.join(HERE, "compositions"), { recursive: true });
for (const s of [...scenes, caps]) fs.writeFileSync(path.join(HERE, "compositions", `${s.id}.html`), s.file());
// Each scene runs until the next one is on top of it
const hosts = scenes.map((s, i) => {
  const end = i < scenes.length - 1 ? Math.max(s.t1, scenes[i + 1].t0 + 0.05) : s.t1;
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
  {"id":"color-paper","type":"color","label":"Paper","default":"${C.paper}"},
  {"id":"color-ink","type":"color","label":"Ink","default":"${C.ink}"},
  {"id":"color-red","type":"color","label":"Red plate","default":"${C.red}"}
]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Franklin, institution builder</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
      #vignette { position: absolute; inset: 0; pointer-events: none; z-index: 60;
        background: radial-gradient(ellipse 85% 70% at 50% 46%, rgba(60, 36, 12, 0) 62%, rgba(60, 36, 12, 0.16) 100%); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="${W}" data-height="${H}" data-motion-blur="on">
${hosts.join("\n")}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${r3(caps.t1)}" data-track-index="3" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:50"></div>
      <div id="vignette" class="clip" data-start="0" data-duration="${DUR}" data-track-index="4" data-layout-ignore></div>
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

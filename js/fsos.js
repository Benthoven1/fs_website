// fsos.js — the FSOS page scene: a mind made of the work.
// FSOS's green planet arrives as the loading screen opens. Then it dissolves
// into words: the solid planet falls away and leaves a sphere made only of
// words, huddled together like a word cloud, the vocabulary of running a
// nonprofit: the twelve agents, what each looks after, and the everyday work
// between them. The camera draws back as a porcelain figure grows beneath
// it, and the word sphere turns out to be the figure's head, turning slowly
// as words light up across it. Clicking the head returns home.
import * as THREE from "three";

const canvas = document.getElementById("fsos-canvas");
if (!canvas) throw new Error("fsos: #fsos-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — the planet and porcelain tones mirror js/main.js
const PAPER       = 0xeceae5;
const PASTEL_FSOS = 0xc4ddb8;
const PORCELAIN   = 0xf3eee6;
const GLINT       = new THREE.Color(0xc19a5b);   // a word lit up, in gold
// The words take the planet's green, deepened so they read on paper
const TONES = {
  agent: [0x3f5a38],
  focus: [0x58764c, 0x5f7d52],
  work:  [0x6f8a62, 0x7e9c6e, 0x86a376, 0x8fae7f, 0x7a9469, 0x9ab58a],
};

// ── Renderer, scene, lights (same sculptural lighting as the home cosmos) ────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const FOV = 36;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 16, 10);
keyLight.castShadow = true;
const SHADOW_MAP = window.innerWidth < 720 ? 1024 : 2048;
keyLight.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
keyLight.shadow.radius = 6;
keyLight.shadow.bias = -0.0004;
Object.assign(keyLight.shadow.camera, { left: -7, right: 7, top: 12, bottom: -3, near: 1, far: 50 });
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

// Paper floor that only receives the figure's soft shadow
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── The vocabulary ───────────────────────────────────────────────────────────
const AGENTS = ["Research", "Grants", "Communications", "Governance", "Development", "Finance",
  "Compliance", "Programs", "Volunteers", "Marketing", "Operations", "Evaluation"];
const FOCUS = ["Evidence", "Funders", "Press", "Board", "Donors", "Budgets",
  "Filings", "Services", "Recruiting", "Outreach", "Logistics", "Impact"];
const WORK = ["grant report", "form 990", "gift receipt", "board minutes", "bylaws", "budget variance",
  "cash flow", "audit trail", "donor letter", "press release", "newsletter", "annual report",
  "logic model", "theory of change", "survey", "outcomes", "volunteer roster", "onboarding",
  "schedule", "venues", "contracts", "insurance", "payroll", "invoices", "reconciliation", "policies",
  "conflict of interest", "approvals", "timeline", "milestones", "partners", "sponsors", "campaign",
  "appeal", "pledges", "stewardship", "thank-you notes", "case for support", "letter of inquiry",
  "proposal", "deadlines", "renewals", "metrics", "dashboard", "interviews", "literature review",
  "citations", "permits", "risk register", "memo", "agenda", "resolution", "fiscal year",
  "restricted funds", "gift agreement", "grant agreement", "blueprint", "mission", "audiences",
  "decisions", "sources", "memory", "drafts", "review", "site visits", "vendor quotes",
  "state filings", "annual meeting", "committees", "job descriptions", "hiring", "training",
  "data privacy", "accessibility", "translations", "social posts", "media list", "op-ed", "website",
  "event plan", "run of show", "tickets", "budget to actuals", "forecast", "grant calendar",
  "prospects", "major gifts", "in-kind gifts", "acknowledgments", "impact report",
  "evaluation plan", "baseline", "indicators", "feedback", "lessons learned", "handoffs",
  "requests", "sign-off"];

// Each style: atlas font, and the word's height on a head of radius 1
const STYLES = {
  agent: { font: '500 72px "Cormorant SC"', px: 72, h: 0.24 },
  focus: { font: '500 64px "Cormorant Garamond"', px: 64, h: 0.17 },
  work:  { font: '400 48px "DM Mono"', px: 48, h: 0.115 },
};

// ── Figure geometry ──────────────────────────────────────────────────────────
// A stock figure about five heads tall, standing on a round porcelain base.
const HEAD_R = 1.15;
const HEAD_C = new THREE.Vector3(0, 9.15, 0);
const FIG_TOP = HEAD_C.y + HEAD_R, FIG_C = new THREE.Vector3(0, 5.6, 0);

// Deterministic randomness, so the cloud packs the same way every visit
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── The atlas: every word drawn once, in white, tinted per word ──────────────
const ATLAS_W = 2048, PAD = 6;
const atlasCanvas = document.createElement("canvas");
const entries = [
  ...AGENTS.map((text) => ({ text, kind: "agent" })),
  ...FOCUS.map((text) => ({ text, kind: "focus" })),
  ...WORK.map((text) => ({ text, kind: "work" })),
];
function layoutAtlas() {
  const ctx = atlasCanvas.getContext("2d");
  let x = 0, y = 0, rowH = 0;
  entries.forEach((en) => {
    const st = STYLES[en.kind];
    ctx.font = st.font;
    const w = Math.ceil(ctx.measureText(en.text).width + st.px * 0.2) + PAD * 2;
    const h = Math.ceil(st.px * 1.25) + PAD * 2;
    if (x + w > ATLAS_W) { x = 0; y += rowH; rowH = 0; }
    Object.assign(en, { x, y, w, h, aspect: (w - PAD * 2) / (h - PAD * 2) });
    x += w; rowH = Math.max(rowH, h);
  });
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = THREE.MathUtils.ceilPowerOfTwo(y + rowH);
}
function paintAtlas() {
  const ctx = atlasCanvas.getContext("2d");
  ctx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  entries.forEach((en) => {
    // Squeeze to fit the slot, in case the fonts changed since it was measured
    const st = STYLES[en.kind];
    ctx.font = st.font;
    const fit = Math.min(1, (en.w - PAD * 2) / (ctx.measureText(en.text).width + st.px * 0.2));
    ctx.save();
    ctx.translate(en.x + en.w / 2, en.y + en.h / 2 + st.px * 0.04);
    ctx.scale(fit, 1);
    ctx.fillText(en.text, 0, 0);
    ctx.restore();
  });
}
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

// ── Packing the words onto the sphere ────────────────────────────────────────
// Each word runs along a great circle, curved onto the surface. A chain of
// circles stands in for its footprint; a word fits where its chain meets no
// other. Largest first, then the vocabulary again at smaller sizes until the
// surface is full.
const UP = new THREE.Vector3(0, 1, 0);
function frameAt(n, vertical) {
  const e = new THREE.Vector3().crossVectors(UP, n);
  if (e.lengthSq() < 1e-6) e.set(1, 0, 0);
  e.normalize();
  const u = new THREE.Vector3().crossVectors(n, e);
  return vertical ? { e: u, u: e.clone().negate() } : { e, u };
}
function chain(n, e, w, h) {
  const r = h / 2, out = [];
  const span = Math.max(0, w - h), count = Math.max(1, Math.ceil(span / (h * 0.85)) + 1);
  for (let k = 0; k < count; k++) {
    const s = count === 1 ? 0 : -span / 2 + (span * k) / (count - 1);
    out.push({ c: n.clone().multiplyScalar(Math.cos(s)).addScaledVector(e, Math.sin(s)), r });
  }
  return out;
}
// Spatial hash over latitude/longitude cells
const CELL = 0.1, NLAT = Math.ceil(Math.PI / CELL), NLON = Math.ceil((2 * Math.PI) / CELL);
const cellOf = (c) => {
  const lat = Math.acos(THREE.MathUtils.clamp(c.y, -1, 1)), lon = Math.atan2(c.z, c.x) + Math.PI;
  return [Math.min(NLAT - 1, Math.floor(lat / CELL)), Math.min(NLON - 1, Math.floor(lon / CELL))];
};
function makeHash() {
  const cells = new Map();
  return {
    add(circle) { const [a, b] = cellOf(circle.c); const k = a * NLON + b; (cells.get(k) || cells.set(k, []).get(k)).push(circle); },
    hits(circle, gap, rMax) {
      const [a, b] = cellOf(circle.c);
      const reach = circle.r + rMax + gap, dl = Math.ceil(reach / CELL);
      const sinLat = Math.sqrt(Math.max(0, 1 - circle.c.y * circle.c.y));
      const dn = sinLat < 0.2 ? NLON : Math.ceil(reach / CELL / sinLat) + 1;
      const lonCells = new Set();
      for (let j = -Math.min(dn, NLON); j <= Math.min(dn, NLON); j++) lonCells.add((b + j + NLON * 2) % NLON);
      for (let i = Math.max(0, a - dl); i <= Math.min(NLAT - 1, a + dl); i++) {
        for (const j of lonCells) {
          const list = cells.get(i * NLON + j);
          if (!list) continue;
          for (const o of list) if (circle.c.dot(o.c) > Math.cos(circle.r + o.r + gap)) return true;
        }
      }
      return false;
    },
  };
}
function packCloud() {
  const rnd = mulberry32(20261002);
  const hash = makeHash();
  const GAP = 0.008;
  let rMax = 0;
  const placed = [];
  const M = 6000, golden = Math.PI * (3 - Math.sqrt(5));
  const cand = Array.from({ length: M }, (_, i) => {
    const y = 1 - ((i + 0.5) / M) * 2, r = Math.sqrt(1 - y * y), th = i * golden;
    return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
  });
  function tryPlace(en, h, n, vertical) {
    const { e, u } = frameAt(n, vertical);
    const w = h * en.aspect;
    if (w > 2.2) return false;
    const circles = chain(n, e, w, h);
    if (circles.some((c) => hash.hits(c, GAP, rMax))) return false;
    circles.forEach((c) => hash.add(c));
    rMax = Math.max(rMax, h / 2);
    placed.push({ en, n, e, u, w, h });
    return true;
  }
  function place(en, h, tries, verticalChance) {
    const start = Math.floor(rnd() * M), step = 2311;
    for (let j = 0; j < tries; j++) {
      const n = cand[(start + j * step) % M];
      const vertical = rnd() < verticalChance;
      if (tryPlace(en, h, n, vertical) || tryPlace(en, h, n, !vertical)) return true;
    }
    return false;
  }
  // The twelve agents sit at the twelve corners of an icosahedron, so they
  // spread evenly round the head; one faces front
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute("position");
  const corners = [];
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    if (!corners.some((c) => c.distanceTo(v) < 1e-3)) corners.push(v);
  }
  const tilt = new THREE.Quaternion().setFromUnitVectors(corners[0], new THREE.Vector3(0.18, 0.12, 1).normalize());
  entries.filter((en) => en.kind === "agent").forEach((en, i) => {
    const n = corners[i].clone().applyQuaternion(tilt);
    if (!tryPlace(en, STYLES.agent.h, n, false)) place(en, STYLES.agent.h, M, 0);
  });
  entries.filter((en) => en.kind === "focus").forEach((en) => place(en, STYLES.focus.h, M, 0.15));
  entries.filter((en) => en.kind === "work").forEach((en) => place(en, STYLES.work.h, M, 0.3));
  // Fill: wherever a small word still fits, put one, smaller each pass, so
  // the words huddle together
  const pool = entries.filter((en) => en.kind !== "agent");
  for (const scale of [0.8, 0.62, 0.48]) {
    const h = STYLES.work.h * scale, start = Math.floor(rnd() * M);
    for (let j = 0; j < M; j++) {
      const n = cand[(start + j * 2311) % M];
      if (hash.hits({ c: n, r: h / 2 }, GAP, rMax)) continue;
      for (let k = 0; k < 4; k++) {
        const en = pool[Math.floor(rnd() * pool.length)];
        const hh = h * (en.kind === "focus" ? 1.3 : 1), vertical = rnd() < 0.3;
        if (tryPlace(en, hh, n, vertical) || tryPlace(en, hh, n, !vertical)) break;
      }
    }
  }
  return { placed, rnd };
}

// ── Building the word surface: one mesh, every word curved onto the sphere ───
const WORD_R = HEAD_R * 1.004;
const headGroup = new THREE.Group();
headGroup.position.copy(HEAD_C);
scene.add(headGroup);

const planetMat = new THREE.MeshStandardMaterial({ color: PASTEL_FSOS, roughness: 0.34, metalness: 0, transparent: true });
const planet = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 96, 64), planetMat);
planet.castShadow = true;
headGroup.add(planet);

let wordMesh = null, wordColors = null;
const wordSpans = [];
function buildCloud() {
  layoutAtlas();
  paintAtlas();
  atlas.needsUpdate = true;
  const { placed, rnd } = packCloud();
  let verts = 0;
  const segs = placed.map((p) => Math.max(2, Math.ceil(p.w / 0.06)));
  segs.forEach((s) => { verts += (s + 1) * 2; });
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const col = new Float32Array(verts * 3), index = [];
  const W = atlasCanvas.width, H = atlasCanvas.height;
  let v = 0;
  const d1 = new THREE.Vector3(), d = new THREE.Vector3();
  placed.forEach((p, wi) => {
    const S = segs[wi], first = v;
    const tones = TONES[p.en.kind], tone = new THREE.Color(tones[Math.floor(rnd() * tones.length)]);
    // A little depth, like a cloud: words sit at slightly different heights
    const rad = WORD_R * (p.en.kind === "agent" ? 1.04 : 1 + rnd() * 0.035);
    const u0 = (p.en.x + PAD) / W, u1 = (p.en.x + p.en.w - PAD) / W;
    const vTop = 1 - (p.en.y + PAD) / H, vBot = 1 - (p.en.y + p.en.h - PAD) / H;
    for (let i = 0; i <= S; i++) {
      const s = -p.w / 2 + (p.w * i) / S;
      d1.copy(p.n).multiplyScalar(Math.cos(s)).addScaledVector(p.e, Math.sin(s));
      for (let j = 0; j < 2; j++) {
        const t = j === 0 ? -p.h / 2 : p.h / 2;
        d.copy(d1).multiplyScalar(Math.cos(t)).addScaledVector(p.u, Math.sin(t));
        pos.set([d.x * rad, d.y * rad, d.z * rad], v * 3);
        nor.set([d.x, d.y, d.z], v * 3);
        uv.set([u0 + ((u1 - u0) * i) / S, j === 0 ? vBot : vTop], v * 2);
        col.set([planetColor.r, planetColor.g, planetColor.b], v * 3);
        v++;
      }
      if (i < S) { const a = first + i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    wordSpans.push({ first, count: v - first, tone, kind: p.en.kind, n: p.n, lit: 0, delay: 0 });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(index);
  wordColors = geo.getAttribute("color");
  // Flat type, seen from both sides; words round the back fade toward the
  // paper, which is what gives the hollow sphere its depth
  const mat = new THREE.MeshBasicMaterial({
    map: atlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.35,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPaper = { value: new THREE.Color(PAPER) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec3 wN = normalize(mat3(modelMatrix) * normal);
        vec3 wP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFacing = dot(wN, normalize(cameraPosition - wP));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;\nuniform vec3 uPaper;")
      .replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        diffuseColor.rgb = mix(uPaper, diffuseColor.rgb, mix(0.2, 1.0, smoothstep(-0.35, 0.55, vFacing)));`);
  };
  wordMesh = new THREE.Mesh(geo, mat);
  wordMesh.castShadow = true;
  wordMesh.visible = false;
  headGroup.add(wordMesh);
}
function setWordColor(span, color) {
  for (let k = 0; k < span.count; k++) wordColors.setXYZ(span.first + k, color.r, color.g, color.b);
}

// Words are measured and drawn with their web fonts, so wait for the font
// stylesheet and the fonts (but not forever); if they arrive later, repaint.
const FONTS = [STYLES.agent.font, STYLES.focus.font, STYLES.work.font];
function fontsReady() {
  const link = document.querySelector('link[href*="fonts.googleapis"]');
  const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => {
    link.addEventListener("load", r, { once: true });
    link.addEventListener("error", r, { once: true });
  });
  return sheet.then(() => Promise.all(FONTS.map((f) => document.fonts.load(f))));
}
const planetColor = new THREE.Color(PASTEL_FSOS);
let cloudReady = false;
const fontsLoaded = fontsReady().catch(() => {});
Promise.race([fontsLoaded, new Promise((r) => setTimeout(r, 4000))]).then(() => {
  buildCloud();
  cloudReady = true;
  fontsLoaded.then(() => {
    if (FONTS.every((f) => document.fonts.check(f))) { paintAtlas(); atlas.needsUpdate = true; }
  });
});

// ── The porcelain figure ─────────────────────────────────────────────────────
// Smooth, faceless stock-figure parts. Each part hangs from the joint it
// grows out of, so the body can grow down from the head.
// A soft studio for the glaze to reflect: a paper room with two softboxes
function studio() {
  const pm = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: PAPER, side: THREE.BackSide })));
  const softbox = (w, h, at, power) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.98, 0.94).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.copy(at);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  softbox(7, 4, new THREE.Vector3(5, 7, 6), 3);
  softbox(5, 3, new THREE.Vector3(-7, 2, -3), 1.4);
  const tex = pm.fromScene(room, 0.04).texture;
  pm.dispose();
  return tex;
}
const porcelain = new THREE.MeshPhysicalMaterial({
  color: PORCELAIN, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
  envMap: studio(), envMapIntensity: 0.4,
});
const body = new THREE.Group();
scene.add(body);
const parts = [];
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const shade = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
// A tapered limb from a to b (radii ra → rb) with rounded ends, grown from a
function limb(a, b, ra, rb, order) {
  const g = new THREE.Group();
  g.position.copy(a);
  const dir = b.clone().sub(a), len = dir.length();
  const inner = new THREE.Group();
  const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 40, 1, true), porcelain));
  shaft.position.y = len / 2;
  const capA = shade(new THREE.Mesh(new THREE.SphereGeometry(ra, 32, 20), porcelain));
  const capB = shade(new THREE.Mesh(new THREE.SphereGeometry(rb, 32, 20), porcelain));
  capB.position.y = len;
  inner.add(shaft, capA, capB);
  inner.quaternion.setFromUnitVectors(UP, dir.normalize());
  g.add(inner);
  body.add(g);
  parts.push({ g, order });
}
// An ellipsoid centred on c, grown from anchor
function blob(anchor, c, sx, sy, sz, order) {
  const g = new THREE.Group();
  g.position.copy(anchor);
  const m = shade(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), porcelain));
  m.scale.set(sx, sy, sz);
  m.position.copy(c).sub(anchor);
  g.add(m);
  body.add(g);
  parts.push({ g, order });
}
{
  // Neck and torso
  limb(V(0, 7.95), V(0, 7.25), 0.25, 0.3, 0);
  // One smooth piece from hips to shoulders
  const torso = new THREE.LatheGeometry([
    [0.0, 4.4], [0.34, 4.44], [0.58, 4.6], [0.68, 4.85], [0.66, 5.25], [0.6, 5.7], [0.68, 6.3],
    [0.82, 6.85], [0.88, 7.1], [0.78, 7.33], [0.52, 7.46], [0.28, 7.5], [0.0, 7.5],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const tg = new THREE.Group();
  tg.position.set(0, 7.45, 0);
  const tm = shade(new THREE.Mesh(torso, porcelain));
  tm.position.y = -7.45;
  tm.scale.z = 0.64;
  tg.add(tm);
  body.add(tg);
  parts.push({ g: tg, order: 1 });
  // Arms: relaxed, a little away from the body
  for (const s of [-1, 1]) {
    blob(V(s * 0.84, 7.1), V(s * 0.9, 7.08), 0.3, 0.3, 0.3, 2);
    limb(V(s * 0.95, 7.02), V(s * 1.13, 5.55, 0.04), 0.23, 0.19, 3);
    limb(V(s * 1.13, 5.55, 0.04), V(s * 1.21, 4.25, 0.16), 0.185, 0.145, 4);
    blob(V(s * 1.21, 4.25, 0.16), V(s * 1.22, 3.97, 0.18), 0.15, 0.27, 0.11, 5);
  }
  // Legs and feet
  for (const s of [-1, 1]) {
    limb(V(s * 0.36, 4.7), V(s * 0.42, 2.6, 0.02), 0.38, 0.28, 4);
    limb(V(s * 0.42, 2.6, 0.02), V(s * 0.43, 0.64), 0.27, 0.19, 5);
    blob(V(s * 0.43, 0.64), V(s * 0.44, 0.48, 0.18), 0.19, 0.16, 0.36, 6);
  }
  // Round porcelain base
  const bg = new THREE.Group();
  const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.3, 96), porcelain));
  base.position.y = 0.15;
  bg.add(base);
  body.add(bg);
  parts.push({ g: bg, order: 7 });
}
parts.forEach((p) => p.g.scale.setScalar(0.0001));

// ── Head → home ──────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2(-2, -2);
const drift = { x: 0, y: 0, tx: 0, ty: 0 };

window.addEventListener("pointermove", (e) => {
  drift.tx = (e.clientX / window.innerWidth) * 2 - 1;
  drift.ty = (e.clientY / window.innerHeight) * 2 - 1;
  const r = canvas.getBoundingClientRect();
  pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}, { passive: true });

canvas.setAttribute("role", "link");
canvas.setAttribute("aria-label", "Return to the Mulvium home page via the figure's head");
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.intersectObject(planet).length) goHome();
});

function goHome() {
  // Same exit as page-transition.js: flag the loading screen, fade, navigate
  sessionStorage.setItem("ls-entering", "1");
  document.body.style.transition = "opacity 350ms ease";
  document.body.style.opacity = "0";
  setTimeout(() => { window.location.href = "../../index.html"; }, 350);
}

// ── Prose rises in as it scrolls into view (same .rv classes as the home page)
{
  const els = document.querySelectorAll(".fsos-prose-header, .fsos-prose-body > p");
  els.forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("rv-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
}

// ── Framing: close on the head, then the whole figure ────────────────────────
// Both views fit their subject to the screen; tall screens step back.
let distHead = 5, distFig = 20;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  distHead = Math.max(HEAD_R / 0.62 / tanHalf, (HEAD_R + 0.45) / (tanHalf * camera.aspect));
  distFig = Math.max((FIG_TOP / 2 + 1.5) / tanHalf, 2.6 / (tanHalf * camera.aspect));
}
window.addEventListener("resize", resize);
resize();

// Don't render while the stage is scrolled out of view
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);

// ── Timeline ─────────────────────────────────────────────────────────────────
// The planet arrives as the loading screen opens; once the overlay has gone,
// its surface resolves into words; then the body grows and the camera draws
// back to show the figure.
const clock = new THREE.Clock();
let holeT = Infinity, doneT = Infinity, openT = Infinity;
function onHole() { if (!isFinite(holeT)) holeT = clock.getElapsedTime(); }
function onDone() { onHole(); if (!isFinite(doneT)) doneT = clock.getElapsedTime(); }
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

const RESOLVE = 2.2;        // planet surface → words
const HOLD = 0.9;           // a moment to read them
const REVEAL = 3.2;         // body grows, camera draws back
const GLINT_EVERY = 0.35;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const tmpColor = new THREE.Color(), camDir = new THREE.Vector3(), nWorld = new THREE.Vector3();
const target = new THREE.Vector3(), viewDir = new THREE.Vector3();
const viewHead = new THREE.Vector3(0, 0.16, 1).normalize(), viewFig = new THREE.Vector3(0, 0.1, 1).normalize();
let lastT = 0, nextGlint = 0, colorsDirty = false, settled = false;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  if (!onScreen) return;

  // The resolve begins once the overlay has gone and the cloud is built;
  // words facing the viewer go first
  if (!isFinite(openT) && isFinite(doneT) && cloudReady) {
    openT = motionOK ? Math.max(t, doneT + 0.5) : -100;
    wordMesh.visible = true;
    headGroup.updateMatrixWorld();
    wordSpans.forEach((s) => {
      nWorld.copy(s.n).transformDirection(headGroup.matrixWorld);
      s.delay = (1 - nWorld.dot(viewHead)) * 0.5 * 0.9;
    });
  }
  const since = t - openT;

  // Arrival: the planet swells into place
  const a = isFinite(holeT) ? (motionOK ? clamp01((t - holeT) / 1.1) : 1) : 0;
  headGroup.scale.setScalar(Math.max(0.0001, easeOutBack(a)));

  // Resolve: the solid planet falls away, leaving only its words, and each
  // word deepens from the planet's green to its own
  const r = isFinite(openT) ? clamp01(since / RESOLVE) : 0;
  const away = smooth(0.15, 0.85, r);
  planetMat.opacity = 1 - away;
  planetMat.depthWrite = away < 0.01;
  planet.visible = away < 1;
  planet.scale.setScalar(lerp(1, 0.94, away));
  if (wordMesh && r < 1) {
    settled = false;
    wordSpans.forEach((s) => {
      const k = smooth(0, 1, (since - s.delay) / (RESOLVE * 0.6));
      setWordColor(s, tmpColor.copy(planetColor).lerp(s.tone, k));
    });
    colorsDirty = true;
  } else if (wordMesh && r >= 1 && !settled) {
    wordSpans.forEach((s) => setWordColor(s, s.tone));
    settled = true;
    colorsDirty = true;
  }

  // Reveal: the body grows down from the head as the camera draws back
  const g = isFinite(openT) ? clamp01((since - RESOLVE - HOLD) / REVEAL) : 0;
  parts.forEach((p) => {
    const k = clamp01((g - p.order * 0.075) / 0.4);
    p.g.scale.setScalar(Math.max(0.0001, easeOutBack(k)));
  });
  const c = easeInOut(clamp01((g - 0.04) / 0.9));
  target.lerpVectors(HEAD_C, FIG_C, c);
  viewDir.lerpVectors(viewHead, viewFig, c).normalize();
  const dist = distHead * Math.pow(distFig / distHead, c);
  camera.position.copy(target).addScaledVector(viewDir, dist);
  if (motionOK) {
    const k = 1 - Math.pow(0.02, dt);
    drift.x += (drift.tx - drift.x) * k;
    drift.y += (drift.ty - drift.y) * k;
    camera.position.x += drift.x * dist * 0.02;
    camera.position.y += -drift.y * dist * 0.012;
  }
  camera.lookAt(target);
  camDir.copy(camera.position).sub(HEAD_C).normalize();

  // Once whole, the head turns a little, as if thinking, and words light up
  if (motionOK && g >= 1 && settled) {
    headGroup.rotation.y = Math.sin((since - RESOLVE - HOLD - REVEAL) * 0.35) * 0.4;
    headGroup.updateMatrixWorld();
    if (t >= nextGlint) {
      const front = wordSpans.filter((s) => s.lit <= 0 && nWorld.copy(s.n).transformDirection(headGroup.matrixWorld).dot(camDir) > 0.3);
      if (front.length) front[Math.floor(Math.random() * front.length)].lit = 1e-4;
      nextGlint = t + GLINT_EVERY * (0.6 + Math.random() * 0.8);
    }
  }
  if (settled) {
    wordSpans.forEach((s) => {
      if (s.lit <= 0) return;
      s.lit += dt / 1.6;
      const k = s.lit >= 1 ? 0 : Math.sin(Math.PI * s.lit);
      setWordColor(s, tmpColor.copy(s.tone).lerp(GLINT, k * 0.85));
      if (s.lit >= 1) s.lit = 0;
      colorsDirty = true;
    });
  }
  if (colorsDirty) { wordColors.needsUpdate = true; colorsDirty = false; }

  renderer.render(scene, camera);
}
animate();

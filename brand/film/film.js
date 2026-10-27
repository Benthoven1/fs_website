// film.js — Mulvium's launch film, drawn from the site's own pieces: the
// landing page's porcelain cosmos and night sky (js/main.js), MulviumSOS's
// sphere of words (js/fsos.js, with its own vocabulary and packing), the
// Fiscal Sponsorship page's bowl (js/bowl.js), the Contact Us page's network
// (js/contact-mesh.js), the hero's rising words, the navbar's wordmark, and
// lines from the site and the founder's letter.
//
// Every frame is a function of time alone: film.seek(t) draws the frame at t
// seconds, so render.js can capture the film frame by frame, and the page
// plays itself, in time with its score, when opened in a browser. The cue
// times live in cues.json, which the score (score.py) is written to as well.
// ?format=reel draws it at 1080 × 1920 for phones, from the same timeline.
//
// Six acts:
//   I    0–15    Millions of ideas, as stars, met in flight
//   II   15–27   The organization you have to build: a sphere of its work
//   III  27–52   One light: the cosmos gathers; who brings what; it exists
//   IV   52–65   The bowl, a project for each line of the founder's letter
//   V    65–78   The next great expansion: a network of institutions
//   VI   78–88   The wordmark, through many faces to its own
import * as THREE from "three";
import CLOUD from "../../js/fsos-cloud.js";
import { vocabulary, STYLES, slotSize, drawWord } from "../../js/fsos-words.js";

const CUES = await (await fetch("cues.json")).json();
const PARAMS = new URLSearchParams(location.search);
const RENDER = PARAMS.has("render");
const REEL = PARAMS.get("format") === "reel";
const W = REEL ? 1080 : 1920, H = REEL ? 1920 : 1080;
const DURATION = CUES.duration;
document.documentElement.dataset.format = REEL ? "reel" : "wide";
// The reel sees the same scenes through a taller window: each field of view
// is widened so that as much of each scene fits across its narrow width
const fovFor = (f) => (REEL ? (360 / Math.PI) * Math.atan(Math.tan((f * Math.PI) / 360) * 1.75) : f);

// ── Time helpers ──────────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // main.js's
const cubicInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const smooth = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };

// cubic-bezier(0.16, 1, 0.3, 1): the hero's words rising
function bezier(x1, y1, x2, y2) {
  const bx = (s) => 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3;
  const by = (s) => 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (bx(s) < x) lo = s; else hi = s; }
    return by(s);
  };
}
const riseEase = bezier(0.16, 1, 0.3, 1);

// A smooth path through [time, value] keys: monotone cubic Hermite, so a value
// never overshoots its keys, and it comes to rest at the first and last
function track(keys) {
  const n = keys.length, m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const d0 = (keys[i][1] - keys[i - 1][1]) / (keys[i][0] - keys[i - 1][0]);
    const d1 = (keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]);
    m[i] = d0 * d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1);
  }
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1], h = t1 - t0;
    const s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m[i + 1];
  };
}

// Seeded randomness, so every render places everything the same way
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── The renderer and the light of the landing page (js/main.js) ──────────────
const PASTEL_STAR    = 0xF0D5BB;
const PASTEL_IFO     = 0xC4DDB8;
const PASTEL_CASTLES = 0xB8CAE0;
const PASTEL_EDU     = 0xE0B8C8;
const PASTEL_ZONES   = 0xB8DDD8;
const CREAM_DEEP     = 0xcdbe96;
const PAPER          = 0xeceae5;
const STAR_RADIUS    = 1.25;

const stage = document.getElementById("stage");
stage.style.width = W + "px";
stage.style.height = H + "px";
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: RENDER });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 600);
const PAPER_COLOR = new THREE.Color(PAPER);
const NIGHT_COLOR = new THREE.Color(0x060412);
const STAR_COLOR  = new THREE.Color(PASTEL_STAR);
const WHITE       = new THREE.Color(0xffffff);
const BLACK       = new THREE.Color(0x000000);
const bgColor = new THREE.Color(PAPER);
scene.background = bgColor;

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
// Only the bowl casts shadows (js/bowl.js)
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.radius = 8;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.03;
Object.assign(keyLight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

const porcelain = (color, roughness = 0.38, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

// ── The cosmos, as the landing page builds it ────────────────────────────────
// The star is Mulvium's; here the four planets are the four who make an
// institution exist, and the blue one opens into the Fiscal Sponsorship bowl
const ORBITS = [
  { id: "ifo",       radius: 3.0, radius2D: 2.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_IFO,
    tilt: [0, 0, 0],                                  speed: 0.36, phase: 0.0 },
  { id: "castles",   radius: 3.8, radius2D: 4.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_CASTLES,
    tilt: [Math.PI / 2, 0, 0],                        speed: 0.26, phase: 1.1 },
  { id: "education", radius: 4.5, radius2D: 6.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_EDU,
    tilt: [Math.PI / 3.2, Math.PI / 5 + Math.PI / 2, 0], speed: 0.22, phase: 2.4 },
  { id: "zones",     radius: 5.0, radius2D: 8.5, ringTube: 0.045, planetSize: 0.42, planetColor: PASTEL_ZONES,
    tilt: [Math.PI / 3.2, Math.PI / 5, 0],            speed: 0.18, phase: 3.8 },
];

const cosmos = new THREE.Group();
scene.add(cosmos);
const star = new THREE.Mesh(
  new THREE.SphereGeometry(STAR_RADIUS, 96, 96),
  new THREE.MeshStandardMaterial({ color: PASTEL_STAR, roughness: 0.38, metalness: 0, emissive: 0x000000, emissiveIntensity: 0 })
);
cosmos.add(star);
const orbits = ORBITS.map((def) => {
  const pivot = new THREE.Group();
  cosmos.add(pivot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius, def.ringTube, 24, 256), porcelain(CREAM_DEEP, 0.35));
  pivot.add(ring);
  const rotator = new THREE.Group();
  pivot.add(rotator);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(def.planetSize, 64, 64), porcelain(def.planetColor));
  planet.position.x = def.radius;
  rotator.add(planet);
  return { def, pivot, ring, rotator, planet };
});
const orbitOf = (id) => orbits.find((o) => o.def.id === id);

// The orbits' own clock, quick while the cosmos gathers itself; integrated once
const orbitSpeed = track([[0, 1], [28.5, 1], [31, 3.2], [33, 1.8], [37, 1], [DURATION, 1]]);
const CLOCK_DT = 1 / 240;
const clockTable = new Float32Array(Math.ceil((DURATION + 1) / CLOCK_DT) + 1);
for (let i = 1; i < clockTable.length; i++) clockTable[i] = clockTable[i - 1] + orbitSpeed(i * CLOCK_DT) * CLOCK_DT;
const orbitClock = (t) => {
  const f = Math.max(0, t) / CLOCK_DT, i = Math.min(clockTable.length - 2, Math.floor(f));
  return lerp(clockTable[i], clockTable[i + 1], f - i);
};

// ── Stars: the landing page's night sky, and a deep field to fly through ─────
function starTint(r, col, i) {
  const ct = r();
  if (ct < 0.15) { col[i * 3] = 1; col[i * 3 + 1] = 0.92 + r() * 0.08; col[i * 3 + 2] = 0.76 + r() * 0.14; }
  else if (ct < 0.28) { col[i * 3] = 0.8 + r() * 0.15; col[i * 3 + 1] = 0.88 + r() * 0.12; col[i * 3 + 2] = 1; }
  else { const v = 0.88 + r() * 0.12; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
}
function starField(count, seed, place) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), size = new Float32Array(count),
        tw = new Float32Array(count), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y, z, s] = place(r);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; size[i] = s;
    tw[i] = r() * Math.PI * 2;
    starTint(r, col, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aTwinkle", new THREE.BufferAttribute(tw, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  return g;
}
const STAR_FRAG = `
  varying float vAlpha;
  varying vec3  vColor;
  void main() {
    vec2  uv = gl_PointCoord - vec2(0.5);
    float a  = (1.0 - smoothstep(0.25, 0.5, length(uv))) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
  vertexShader: `
    attribute float aSize; attribute float aTwinkle; attribute vec3 aColor;
    uniform float uTime; uniform float uOpacity;
    varying float vAlpha; varying vec3 vColor;
    void main() {
      vAlpha = uOpacity * (0.72 + 0.28 * sin(uTime * 1.7 + aTwinkle));
      vColor = aColor;
      gl_PointSize = aSize * (0.88 + 0.12 * sin(uTime * 1.1 + aTwinkle * 1.4));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: STAR_FRAG,
  transparent: true, depthTest: false, depthWrite: false,
});
const sky = new THREE.Points(starField(4500, 7, (r) => {
  const s0 = r(), spread = s0 < 0.6 ? 16 : s0 < 0.85 ? 45 : 110;
  const x = (r() - 0.5) * spread * 2, y = r() * 2, z = (r() - 0.5) * spread * 2, sr = r();
  return [x, y, z, sr < 0.5 ? 1.0 + r() : sr < 0.85 ? 2.0 + r() * 1.5 : 3.5 + r() * 2.5];
}), skyMat);
scene.add(sky);

const deepMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
  vertexShader: `
    attribute float aSize; attribute float aTwinkle; attribute vec3 aColor;
    uniform float uTime; uniform float uOpacity;
    varying float vAlpha; varying vec3 vColor;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float d = -mv.z;
      float s = aSize * 34.0 / max(d, 0.1);
      vAlpha = uOpacity * (0.74 + 0.26 * sin(uTime * 1.7 + aTwinkle))
             * smoothstep(0.6, 5.0, d) * (1.0 - smoothstep(220.0, 330.0, d))
             * clamp(s, 0.18, 1.0);
      vColor = aColor;
      gl_PointSize = clamp(s, 1.0, 9.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: STAR_FRAG,
  transparent: true, depthTest: false, depthWrite: false,
});
const deepField = new THREE.Points(starField(7000, 11, (r) => {
  let x, y;
  do { x = (r() - 0.5) * 140; y = (r() - 0.5) * 90; } while (Math.abs(x) < 1.6 && Math.abs(y) < 1.2);
  const sr = r();
  return [x, y, 60 - r() * 380, sr < 0.55 ? 0.6 + r() * 0.8 : sr < 0.9 ? 1.4 + r() * 1.4 : 2.8 + r() * 2.4];
}), deepMat);
deepField.frustumCulled = false;
scene.add(deepField);

// ── Act II: the sphere of work, MulviumSOS's (js/fsos.js) ─────────────────────
// Every word M.SOS's agents handle, placed as js/fsos-cloud.js packs them,
// inking in ahead of the camera until they fill the night
const SPHERE_C = new THREE.Vector3(0, 0, -76), SPHERE_R = 5.6;
const sphereGroup = new THREE.Group();
sphereGroup.position.copy(SPHERE_C);
scene.add(sphereGroup);
// M.SOS's greens, lifted to read on the night
const TONES = {
  agent: [0xeef4e6],
  focus: [0xd3e6c7, 0xc4ddb8],
  work:  [0x9fbb92, 0xa9c49c, 0xb4cda7, 0x93ad86, 0xbdd3b0, 0x8ea880],
};
const GOLD = new THREE.Color(0xffd98c);
// The jobs the stamps fall on: the first six that face the camera as each lands
const STAMPED = ["bylaws", "Budgets", "grant report", "payroll", "Press", "permits", "form 990", "insurance",
  "board minutes", "contracts", "invoices", "audit trail", "state filings", "hiring", "cash flow", "policies"];
const sphereRot = (t) => 0.1 * t + 0.035 * Math.max(0, t - 19) ** 2;
const sphereScale = (t) => {
  let s = 1;
  for (const h of CUES.hits) if (t >= h) s += 0.045 * Math.exp(-(t - h) * 6);
  return s;
};
let words = null; // built once the fonts are in
function buildSphere() {
  const ATLAS_W = 2048, PAD = 6;
  const atlasCanvas = document.createElement("canvas");
  const actx = atlasCanvas.getContext("2d");
  const entries = vocabulary();
  let x = 0, y = 0, rowH = 0;
  for (const en of entries) {
    const slot = slotSize(actx, en.text, STYLES[en.kind]);
    const w = slot.w + PAD * 2, h = slot.h + PAD * 2;
    if (x + w > ATLAS_W) { x = 0; y += rowH; rowH = 0; }
    Object.assign(en, { x, y, w, h });
    x += w; rowH = Math.max(rowH, h);
  }
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = y + rowH;
  actx.fillStyle = "#ffffff";
  for (const en of entries) drawWord(actx, en.text, STYLES[en.kind], en.x + en.w / 2, en.y + en.h / 2, en.w - PAD * 2);
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;

  const r = rng(20261002);
  const byKey = new Map(entries.map((en) => [en.kind + ":" + en.text, en]));
  const placed = [];
  for (const [kind, text, nx, ny, nz, ex, ey, ez, w, h] of CLOUD) {
    const en = byKey.get(kind + ":" + text);
    if (!en) continue;
    const n = new THREE.Vector3(nx, ny, nz), e = new THREE.Vector3(ex, ey, ez);
    placed.push({ en, n, e, u: new THREE.Vector3().crossVectors(n, e), w, h });
  }
  let verts = 0;
  const segs = placed.map((p) => Math.max(2, Math.ceil(p.w / 0.06)));
  segs.forEach((s) => { verts += (s + 1) * 2; });
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const col = new Float32Array(verts * 4), index = [];
  const AW = atlasCanvas.width, AH = atlasCanvas.height;
  let v = 0;
  const d1 = new THREE.Vector3(), d = new THREE.Vector3();
  const spans = placed.map((p, wi) => {
    const S = segs[wi], first = v;
    const tones = TONES[p.en.kind], tone = new THREE.Color(tones[Math.floor(r() * tones.length)]);
    const rad = p.en.kind === "agent" ? 1.04 : 1 + r() * 0.035;
    const u0 = (p.en.x + PAD) / AW, u1 = (p.en.x + p.en.w - PAD) / AW;
    const vTop = 1 - (p.en.y + PAD) / AH, vBot = 1 - (p.en.y + p.en.h - PAD) / AH;
    for (let i = 0; i <= S; i++) {
      const s = -p.w / 2 + (p.w * i) / S;
      d1.copy(p.n).multiplyScalar(Math.cos(s)).addScaledVector(p.e, Math.sin(s));
      for (let j = 0; j < 2; j++) {
        const tt = j === 0 ? -p.h / 2 : p.h / 2;
        d.copy(d1).multiplyScalar(Math.cos(tt)).addScaledVector(p.u, Math.sin(tt));
        pos.set([d.x * rad, d.y * rad, d.z * rad], v * 3);
        nor.set([d.x, d.y, d.z], v * 3);
        uv.set([u0 + ((u1 - u0) * i) / S, j === 0 ? vBot : vTop], v * 2);
        v++;
      }
      if (i < S) { const a = first + i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    return { first, count: v - first, tone, n: p.n, text: p.en.text, start: 0, litAt: 1e9, key: "" };
  });
  // Words ink in in a shuffled order, coming faster and faster
  const order = spans.map((s, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  order.forEach((i, rank) => {
    spans[i].start = CUES.ink[0] + (CUES.ink[1] - CUES.ink[0]) * Math.pow(rank / order.length, 1.3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const colors = new THREE.BufferAttribute(col, 4);
  geo.setAttribute("color", colors);
  geo.setIndex(index);
  // Flat type, seen from both sides; words round the back fade into the night
  const mat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.35 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = { value: NIGHT_COLOR };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec3 wN = normalize(mat3(modelMatrix) * normal);
        vec3 wP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFacing = dot(wN, normalize(cameraPosition - wP));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFacing;\nuniform vec3 uNight;")
      .replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
        diffuseColor.rgb = mix(uNight, diffuseColor.rgb, mix(0.16, 1.0, smoothstep(-0.35, 0.55, vFacing)));`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  sphereGroup.add(mesh);

  // Each stamp falls on the job, of those not yet stamped, that faces the
  // camera most squarely as it lands
  const nn = new THREE.Vector3(), toCam = new THREE.Vector3(), q = new THREE.Quaternion(), eu = new THREE.Euler();
  const used = new Set();
  CUES.hits.forEach((h) => {
    flyCam(h, false);
    eu.set(0.22, sphereRot(h), 0);
    q.setFromEuler(eu);
    let best = null, bestF = -2;
    for (const s of spans) {
      if (!STAMPED.includes(s.text) || used.has(s.text) || s.start > h) continue;
      nn.copy(s.n).applyQuaternion(q);
      toCam.copy(camera.position).sub(SPHERE_C).normalize();
      const f = nn.dot(toCam);
      if (f > bestF) { bestF = f; best = s; }
    }
    if (best) { best.litAt = h; used.add(best.text); }
  });
  words = { mesh, spans, colors };
}
const _c = new THREE.Color();
function drawSphere(t) {
  if (!words) return;
  sphereGroup.rotation.set(0.22, sphereRot(t), 0);
  sphereGroup.scale.setScalar(SPHERE_R * sphereScale(t));
  const arr = words.colors.array;
  let dirty = false;
  for (const s of words.spans) {
    const ink = seg(t, s.start, s.start + 0.45);
    const lit = seg(t, s.litAt, s.litAt + 0.12);
    _c.copy(s.tone).lerp(GOLD, lit);
    const key = ink.toFixed(3) + lit.toFixed(3);
    if (key === s.key) continue;
    s.key = key;
    dirty = true;
    for (let k = 0; k < s.count; k++) {
      const o = (s.first + k) * 4;
      arr[o] = _c.r; arr[o + 1] = _c.g; arr[o + 2] = _c.b; arr[o + 3] = ink;
    }
  }
  if (dirty) words.colors.needsUpdate = true;
}

// ── Act IV: the Fiscal Sponsorship bowl (js/bowl.js) ─────────────────────────
// The blue planet's upper half lifts away: it was a bowl all along. Four
// projects drop into it, each wearing one of the loading screen's pictures.
const bowlWorld = new THREE.Group();
scene.add(bowlWorld);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
bowlWorld.add(ground);
const BR = 1.55, BT = 0.12;
const profile = [];
for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * BR, BR - Math.cos(a) * BR)); }
for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; profile.push(new THREE.Vector2(BR - BT / 2 + Math.cos(a) * -BT / 2, BR + Math.sin(a) * -BT / 2 * 0.6)); }
for (let i = 40; i >= 0; i--) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * (BR - BT), BR - Math.cos(a) * (BR - BT) + BT * 0.4)); }
const shellGeo = new THREE.LatheGeometry(profile, 160);
const vessel = new THREE.Group();
bowlWorld.add(vessel);
const whole = new THREE.Mesh(new THREE.SphereGeometry(BR, 96, 64), porcelain(PASTEL_CASTLES, 0.34));
whole.position.y = BR;
whole.castShadow = true;
vessel.add(whole);
const bowl = new THREE.Mesh(shellGeo, porcelain(PASTEL_CASTLES, 0.34, { side: THREE.DoubleSide }));
bowl.castShadow = bowl.receiveShadow = true;
vessel.add(bowl);
const lidPivot = new THREE.Group();
lidPivot.position.y = BR;
vessel.add(lidPivot);
const lidMat = porcelain(PASTEL_CASTLES, 0.34, { side: THREE.DoubleSide, transparent: true });
const lid = new THREE.Mesh(shellGeo, lidMat);
lid.scale.y = -1;
lid.position.y = BR;
lid.castShadow = true;
const lidFade = { value: 1 };
const lidDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
lidDepth.onBeforeCompile = (sh) => {
  sh.uniforms.uFade = lidFade;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uFade;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed = mix(vec3(0.0, ${(BR * 0.55).toFixed(3)}, 0.0), transformed, uFade);`);
};
lid.customDepthMaterial = lidDepth;
lidPivot.add(lid);
const bowlRing = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.045, 24, 256), porcelain(CREAM_DEEP, 0.35));
bowlRing.rotation.set(Math.PI / 2 - 0.22, 0.18, 0);
bowlRing.position.y = 1.15;
bowlRing.castShadow = true;
bowlWorld.add(bowlRing);
// The loading screen's pictures, in its order, glazed like painted porcelain
const PICTURES = ["../../Musical.webp", "../../Pictorial.webp", "../../Luxor.webp", "../../Batad.webp"];
const SPR = 0.5, SPD = 0.7, DROP = 5;
const projects = PICTURES.map((src, i) => {
  const ang = i * Math.PI / 2 + 0.5;
  const x = Math.cos(ang) * SPD, z = Math.sin(ang) * SPD;
  const rr = BR - BT - SPR;
  const rest = new THREE.Vector3(x, BR - Math.sqrt(Math.max(0, rr * rr - x * x - z * z)), z);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SPR, 64, 64), porcelain(0xf0e5d0, 0.36));
  mesh.rotation.order = "YXZ";
  mesh.rotation.x = -0.74;
  mesh.castShadow = mesh.receiveShadow = true;
  vessel.add(mesh);
  return { mesh, src, rest, from: new THREE.Vector3(x * 0.35, rest.y + DROP, z * 0.35) };
});
const picturesReady = Promise.all(projects.map((p) => new Promise((res) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.filter = "saturate(0.8) contrast(0.92) brightness(1.04)";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(244, 237, 224, 0.2)";
    ctx.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    p.mesh.material.map = tex;
    p.mesh.material.color.setHex(0xffffff);
    p.mesh.material.needsUpdate = true;
    res();
  };
  img.onerror = res;
  img.src = p.src;
})));
const easeOutBack = (x) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function poseBowl(t) {
  // It arrives as on its own page: the planet swells into place and its ring
  // closes in around it
  const enter = CUES.toBowl[1];
  vessel.scale.setScalar(Math.max(0.0001, easeOutBack(seg(t, enter + 0.15, enter + 1.25))));
  bowlRing.scale.setScalar(lerp(3.2, 1, easeInOut(seg(t, enter + 0.2, enter + 2.1))));
  const o = seg(t, CUES.lid, CUES.lid + 1.6), lift = easeInOut(o);
  lidPivot.position.y = BR + lift * 1.1;
  lidPivot.rotation.x = -0.35 * lift;
  lidMat.opacity = 1 - smooth(0.25, 1, o);
  whole.visible = o === 0;
  bowl.visible = o > 0;
  lidFade.value = 1 - smooth(0.04, 0.42, o);
  lid.castShadow = lidFade.value > 0.001;
  lid.visible = o > 0 && o < 1;
  vessel.rotation.y = 0.3 + 0.1 * (t - enter);
  projects.forEach((p, i) => {
    const k = t - CUES.drops[i];
    p.mesh.visible = k >= 0;
    if (k < 0) return;
    if (k < 0.62) {
      const f = k / 0.62;
      p.mesh.position.lerpVectors(p.from, p.rest, f);
      p.mesh.position.y = lerp(p.from.y, p.rest.y, f * f);
      p.mesh.scale.setScalar(Math.max(0.0001, smooth(0, 0.25, f)));
      p.mesh.castShadow = f > 0.75;
    } else {
      const s = clamp01((k - 0.62) / 0.38);
      p.mesh.position.copy(p.rest);
      p.mesh.position.y += Math.sin(Math.PI * s) * 0.14 * (1 - s);
      p.mesh.scale.setScalar(1);
      p.mesh.castShadow = true;
    }
    p.mesh.rotation.y = -Math.PI / 2 - vessel.rotation.y + (i - 1.5) * 0.18;
  });
}
// The bowl's own view, stepped back on a tall frame so its ring fits across
const BOWL_LOOK = new THREE.Vector3(0, 1.55, 0);
const BOWL_DIR = new THREE.Vector3(0, 4.85, 7.6).normalize();
const BOWL_DIST = Math.max(10.6, 3.1 / (Math.tan((16 * Math.PI) / 180) * (W / H)));
function bowlCam(t) {
  const enter = CUES.toBowl[1];
  // A slow settle onto the bowl's view, then a slow drift in
  const k = expoOut(seg(t, enter, enter + 3));
  camera.fov = 32;
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  const dist = lerp(BOWL_DIST * 1.1, BOWL_DIST, k) * (1 - 0.05 * seg(t, enter + 3, CUES.network));
  camera.position.copy(BOWL_LOOK).addScaledVector(BOWL_DIR, dist);
  camera.position.x += Math.sin((t - enter) * 0.35) * 0.3 * k;
  camera.lookAt(BOWL_LOOK);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// ── Projection: a world point to stage pixels ────────────────────────────────
const _v = new THREE.Vector3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z };
}
function screenRadius(p, r) {
  const d = _v.copy(p).sub(camera.position).length();
  return (r / d) * (H / 2 / Math.tan((camera.fov * Math.PI) / 360));
}

// ── Cameras ──────────────────────────────────────────────────────────────────
// Acts I and II fly forward through the deep field, past every idea, toward
// the sphere of work; each stamp shakes it
const flyZ = track([[0, 40], [6, 30], [10, 6], [13, -24], [15.5, -42], [20, -51], [24.75, -63]]);
function shake(t) {
  let s = 0;
  for (const h of CUES.hits) if (t >= h) s += Math.exp(-(t - h) * 7) * Math.sin((t - h) * 52);
  return s;
}
function flyCam(t, withShake = true) {
  const k = withShake ? shake(t) : 0;
  const settle = 1 - smooth(14, 18, t); // the drift settles as the sphere comes
  camera.fov = fovFor(50);
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  camera.position.set(Math.sin(t * 0.13) * 1.2 * settle, (Math.cos(t * 0.11) * 0.8 - 0.8) * settle, flyZ(t));
  camera.rotation.set(Math.sin(t * 0.09) * 0.04 * settle + k * 0.006, Math.sin(t * 0.07) * 0.06 * settle + k * 0.004,
    Math.sin(t * 0.05) * 0.03 * settle, "YXZ");
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// The cosmos is seen from a point on a sphere around it: azimuth and
// elevation in degrees, distance, field of view and a roll
function orbitCam({ az, el, dist, fov = 42, roll = 0, target = null }) {
  const a = (az * Math.PI) / 180, e = (Math.min(el, 89.95) * Math.PI) / 180;
  camera.fov = fovFor(fov);
  camera.clearViewOffset();
  camera.position.set(Math.cos(e) * Math.sin(a) * dist, Math.sin(e) * dist, Math.cos(e) * Math.cos(a) * dist);
  // "Up" is the direction of rising elevation, which stays defined overhead
  camera.up.set(-Math.sin(e) * Math.sin(a), Math.cos(e), -Math.sin(e) * Math.cos(a));
  camera.lookAt(target || _origin);
  if (roll) camera.rotateZ((roll * Math.PI) / 180);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
const _origin = new THREE.Vector3();

// Act III: overhead in the night, then down to the landing page's angle,
// held at the centre while its words are set above and below it and its
// spheres are named
const G = {
  az:   track([[27.75, 0], [33, 28], [35.6, 12], [38.6, -4], [CUES.toBowl[1], -12]]),
  el:   track([[27.75, 89.9], [33, 89.9], [35.6, 46], [38.6, 12], [CUES.toBowl[1], 10.5]]),
  dist: track([[27.75, 24], [33, 24], [35.6, 19.5], [38.6, 18.8], [41, 18.8], [44, 17.8], [CUES.toBowl[1], 17.2]]),
  roll: track([[27.75, 0], [33, 0], [35.2, -5], [38.6, 0]]),
};
function genesisCam(t) {
  // The reel stands back while the spheres are named, to leave their callouts
  // room above and below
  const back = REEL ? 1 + 0.22 * smooth(...CUES.glide, t) * (1 - smooth(...CUES.release, t)) : 1;
  orbitCam({ az: G.az(t), el: G.el(t), dist: G.dist(t) * back, roll: G.roll(t) });
}

// ── The cosmos's state through the film ──────────────────────────────────────
// t2d: 0 is the landing page's 3D view, 1 its overhead orbit view
// exp: the landing page's expansion, 0 at rest, 1 rings out and star radiant
// night: paper (0) to night (1)
const T2D = track([[27.75, 1], [33, 1], [38.5, 0]]);
const EXP = (t) => (t < CUES.rise ? 1 : 1 - easeInOut(seg(t, CUES.rise, CUES.bloom)));
const NIGHT = (t) => 1 - cubicInOut(seg(t, 32.95, 33.12));
// While the spheres are named, each glides along its ring into a quadrant of
// its own (planned in quadrantPlan, below), so no callout's leader crosses
// the cosmos; they hold there, drifting, until the cosmos has faded
const glideTo = new Map(); // orbit -> the angle it holds
// Each held angle is taken in the turn of the ring nearest to where its sphere
// would be midway through gliding in (and midway through letting go), so the
// sphere eases there along the shorter way and never jumps a turn
const nearestTurn = (angle, near) => angle + 2 * Math.PI * Math.round((near - angle) / (2 * Math.PI));
function poseCosmos(t, t2d, exp, glide = true) {
  const eased = easeInOut(t2d), pe = easeInOut(exp), clock = orbitClock(t);
  const letGo = t > (CUES.glide[1] + CUES.release[0]) / 2;
  const w = glide ? (letGo ? 1 - smooth(...CUES.release, t) : smooth(...CUES.glide, t)) : 0;
  const settled = orbitClock((CUES.glide[0] + CUES.glide[1]) / 2);
  const ref = letGo ? orbitClock((CUES.release[0] + CUES.release[1]) / 2) : settled;
  for (const o of orbits) {
    const [rx, ry, rz] = o.def.tilt;
    const free = o.def.phase + o.def.speed * clock;
    const held = glideTo.get(o);
    // Held, a sphere still drifts on at a tenth of its pace, so nothing stops dead
    const hold = held === undefined ? free
      : nearestTurn(held, o.def.phase + o.def.speed * ref) + 0.1 * o.def.speed * (clock - settled);
    o.rotator.rotation.z = lerp(free, hold, w);
    o.planet.rotation.y = 0.08 * t;
    o.pivot.rotation.set(lerp(rx, Math.PI / 2, eased), lerp(ry, 0, eased), lerp(rz, 0, eased));
    const s = lerp(1, o.def.radius2D / o.def.radius, eased) * (1 + pe * 10);
    o.pivot.scale.set(s, s, s);
    const fade = 1 - pe;
    for (const m of [o.ring.material, o.planet.material]) { m.opacity = fade; m.transparent = exp > 0; }
    o.ring.visible = o.planet.visible = !(exp > 0 && fade < 0.02);
  }
  const shrink = lerp(1, 0.04, pe), pulse = 1 + Math.sin(t * 1.1) * 0.01;
  star.scale.setScalar(pulse * shrink);
  star.material.color.copy(STAR_COLOR).lerp(WHITE, pe);
  star.material.emissive.copy(BLACK).lerp(WHITE, pe);
  star.material.emissiveIntensity = pe * 0.2;
  star.material.roughness = lerp(0.38, 0.2, pe);
}

// ── DOM layers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const css = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
const show = (el, on) => css(el, "display", on ? "" : "none");
for (const id of ["net", "leads"]) {
  $(id).setAttribute("viewBox", `0 0 ${W} ${H}`);
  $(id).setAttribute("width", W);
  $(id).setAttribute("height", H);
}
// The landing page's "gooey" visibility: fully there at 1, blurred away toward 0
function goo(el, f, maxBlur = 60) {
  if (f <= 0.001) { css(el, "opacity", "0"); css(el, "filter", "none"); return; }
  if (f >= 0.999) { css(el, "opacity", "1"); css(el, "filter", "none"); return; }
  css(el, "opacity", Math.pow(f, 0.4).toFixed(3));
  css(el, "filter", `blur(${Math.min(6 / f - 6, maxBlur).toFixed(2)}px)`);
}
// Words in masks, each rising at its own speed (the hero's statement)
const DUR = [1.05, 1.3, 0.95, 1.4, 1.15, 0.9, 1.35, 1.0, 1.25];
function maskWords(el, text) {
  el.textContent = "";
  return text.split(/\s+/).map((w, i) => {
    const mask = document.createElement("span");
    mask.className = "hw";
    const inner = document.createElement("span");
    inner.textContent = w;
    mask.appendChild(inner);
    el.append(mask, " ");
    return { el: inner, d: 0.08 * i + 0.05 * ((i * 7) % 3), dur: DUR[i % DUR.length] };
  });
}
function riseWords(words, t, t0) {
  for (const w of words) {
    const p = riseEase(seg(t, t0 + w.d, t0 + w.d + w.dur));
    css(w.el, "transform", p >= 1 ? "none" : `translateY(${((1 - p) * 115).toFixed(2)}%)`);
  }
}

// Captions, one line each. A line is set for the wide frame (w), the reel
// (r) or both: [x, y, text], x null to centre it, y the top of the line; a
// right-set line (class r) is placed by its right edge.
// fade: enters by blurring in, not rising; cut: leaves on the cut
const CX = null;
const LINES = [
  // I
  { t: [1.5, 6.0],     cls: "moon",       w: [CX, 470, "Millions of people have ideas"], r: [CX, 760, "Millions of people"] },
  { t: [1.8, 6.0],     cls: "moon",       r: [CX, 838, "have ideas"] },
  { t: [3.0, 6.0],     cls: "moon it",    w: [CX, 548, "for things that should exist."], r: [CX, 950, "for things that"] },
  { t: [3.3, 6.0],     cls: "moon it",    r: [CX, 1028, "should exist."] },
  // II
  { t: [15.0, 17.5],   cls: "moon",       w: [CX, 503, "The problem isn’t a lack of ideas."], r: [CX, 840, "The problem isn’t"] },
  { t: [15.3, 17.5],   cls: "moon",       r: [CX, 918, "a lack of ideas."] },
  { t: [18.0, CUES.cut], cls: "moon sm",  w: [CX, 820, "It’s the organization you have to build before you can begin."], r: [CX, 1330, "It’s the organization"], cut: true },
  { t: [18.3, CUES.cut], cls: "moon sm",  r: [CX, 1398, "you have to build"], cut: true },
  { t: [18.6, CUES.cut], cls: "moon sm it", r: [CX, 1466, "before you can begin."], cut: true },
  { t: [25.5, 27.0],   cls: "moon it",    w: [CX, 503, "So most ideas never begin."], r: [CX, 860, "So most ideas"], fade: true },
  { t: [25.5, 27.0],   cls: "moon it",    r: [CX, 938, "never begin."], fade: true },
  // III: the norm, framing the centred cosmos above and below
  { t: [CUES.beneath, 42.6], cls: "ink sm",          w: [CX, 58, "At Mulvium, we change the norm"], r: [CX, 300, "At Mulvium, we change the norm"] },
  { t: [CUES.beneath + 0.6, 42.6], cls: "ink sm it", w: [CX, 958, "and we build the organization beneath you."], r: [CX, 1380, "and we build the organization"] },
  { t: [CUES.beneath + 0.85, 42.6], cls: "ink sm it", r: [CX, 1448, "beneath you."] },
  { t: [CUES.exists, 52.0], cls: "ink it xl",         w: [CX, 842, "It exists."], r: [CX, 1420, "It exists."] },
  // IV: the founder's letter, set around the bowl
  ...letter(),
  // V: over the network
  { t: [CUES.expansion[0], 72.5], cls: "ink",           w: [CX, 462, "The next great expansion of human creativity"], r: [CX, 690, "The next great expansion"] },
  { t: [CUES.expansion[0] + 0.25, 72.5], cls: "ink",    r: [CX, 766, "of human creativity"] },
  { t: [CUES.expansion[1], 72.5], cls: "ink it",        w: [CX, 540, "won’t come from making it easier to create content."], r: [CX, 860, "won’t come from making it"] },
  { t: [CUES.expansion[1] + 0.25, 72.5], cls: "ink it", r: [CX, 936, "easier to create content."] },
  { t: [CUES.will, CUES.wordsOut], cls: "ink",          w: [CX, 412, "It will come from making it easier to create"], r: [CX, 744, "It will come from making it"] },
  { t: [CUES.will + 0.25, CUES.wordsOut], cls: "ink",   r: [CX, 820, "easier to create"] },
  { t: [CUES.institutions, CUES.wordsOut], cls: "clay it xl", w: [CX, 500, "institutions."], r: [CX, 912, "institutions."] },
];
// Four lines of the founder's letter round the bowl: in its four corners on
// the wide frame, above and below it on the reel
function letter() {
  const [a, b, c, d] = CUES.letter, out = CUES.letterOut;
  const L = 47, rows = (t0, cls, x, y, lines, side) => lines.map((text, i) => {
    const line = { t: [t0 + i * 0.22, out], cls: cls + (i === lines.length - 1 ? " it" : "") };
    line[side] = [x, y + i * L, text];
    return line;
  });
  return [
    { t: [a, out], cls: "ink lg l", w: [110, 120, "Institutions"] },
    { t: [a + 0.3, out], cls: "ink sm it l", w: [114, 230, "change the world."] },
    ...rows(b, "ink xs r", 1810, 140, ["Institutions can simply be", "one person with a vision", "to do something beautiful", "and something authentic."], "w"),
    ...rows(c, "ink xs l", 114, 760, ["Changing the world", "starts with helping", "your neighbor."], "w"),
    ...rows(d, "ink xs r", 1810, 714, ["All you need is", "an appetite for good,", "a vision, and the", "willingness to bring", "it to life."], "w"),
    // The reel
    { t: [a, out], cls: "ink lg", r: [CX, 236, "Institutions"] },
    { t: [a + 0.3, out], cls: "ink sm it", r: [CX, 344, "change the world."] },
    ...rows(b, "ink xs", CX, 436, ["Institutions can simply be one person", "with a vision to do something beautiful", "and something authentic."], "r"),
    ...rows(c, "ink xs", CX, 1356, ["Changing the world starts", "with helping your neighbor."], "r"),
    ...rows(d, "ink xs", CX, 1478, ["All you need is an appetite for good,", "a vision, and the willingness", "to bring it to life."], "r"),
  ];
}
const CAPS = LINES.filter((c) => (REEL ? c.r : c.w)).map((c) => {
  const [x, y, text] = REEL ? c.r : c.w;
  const el = document.createElement("div");
  el.className = "cap " + c.cls + (x === CX ? " c" : "");
  if (x === CX) el.style.left = W / 2 + "px";
  else if (c.cls.split(" ").includes("r")) el.style.right = W - x + "px";
  else el.style.left = x + "px";
  el.style.top = y + "px";
  $("captions").appendChild(el);
  const words = c.fade ? null : maskWords(el, text);
  if (c.fade) el.textContent = text;
  return { ...c, el, words };
});
function drawCaptions(t) {
  for (const c of CAPS) {
    const [t0, t1] = c.t;
    const on = t >= t0 && (c.cut ? t < t1 : t < t1 + 0.8);
    show(c.el, on);
    if (!on) continue;
    if (c.fade) goo(c.el, Math.min(seg(t, t0, t0 + 1.1), 1 - seg(t, t1, t1 + 0.8)));
    else {
      riseWords(c.words, t, t0);
      goo(c.el, 1 - seg(t, t1, t1 + 0.75));
    }
  }
}

// ── Act I: the ideas, met in flight ──────────────────────────────────────────
const IDEAS = [
  "orchestra", "film festival", "museum", "community garden", "scholarship fund",
  "choir", "research institute", "public library", "dance company", "poetry press",
  "jazz series", "science camp", "theater company", "food pantry", "art residency",
  "youth sports league", "historical society", "music school", "literacy program",
  "seed library", "documentary", "makerspace", "chamber ensemble", "botanical garden",
  "conservation trust", "oral history project", "mural project", "writers’ workshop",
  "community radio station", "after-school program", "heritage festival", "bird sanctuary",
  "summer academy", "reading room", "folk archive", "new cultural institution",
];
function ideaEl(text, parent) {
  const el = document.createElement("div");
  el.className = "idea";
  el.innerHTML = "<i></i><span></span>";
  el.lastChild.textContent = text;
  parent.appendChild(el);
  return el;
}
// Each idea is placed where it should first be seen, just after it lights,
// clear of the words; the flight then carries it past and out of the frame
const flyIdeas = [];
CUES.ideas.forEach((at, i) => {
  const r = rng(5 + i * 101);
  const fwd = new THREE.Vector3(), dir = new THREE.Vector3();
  // Anywhere across the frame: a name on its right half reads leftward
  const clear = REEL
    ? (x, y) => !(y > 680 && y < 1120) && y > 260 && y < 1640 && x > 70 && x < W - 70
    : (x, y) => !(x > 420 && x < 1500 && y > 380 && y < 700) && y > 190 && y < 890 && x > 90 && x < W - 90;
  // Left and right in turn, so both halves of the frame hold as many; a
  // name reads away from the middle, so its words stay in its own half,
  // unless that would run it off the frame's edge
  const right = i % 2 === 1, LABEL = 320;
  const flipAt = (x) => (right ? x > W - LABEL - 20 : x > W / 2 - LABEL / 2);
  // A name's box on screen, as drawFlyIdeas will set it
  const box = (pos, text, flip) => {
    const p = toScreen(pos), depth = _v.copy(pos).sub(camera.position).dot(fwd);
    if (depth <= 1.5) return null;
    const sc = Math.max(0.62, Math.min(1.6, 19 / depth)), w = (18 + text.length * 14) * sc, h = 42 * sc;
    return flip ? [p.x - w, p.y - h / 2, p.x, p.y + h / 2] : [p.x, p.y - h / 2, p.x + w, p.y + h / 2];
  };
  // Of the places tried, the first whose name meets no other name in flight
  // over the seconds after it lights
  const LOOK = Array.from({ length: 12 }, (_, k) => 0.05 + k * 0.35);
  let best = null;
  for (let tries = 0; tries < 300 && !(best && best.hits === 0); tries++) {
    let x, y;
    do { x = (right ? 0.5 + 0.5 * r() : 0.5 * r()) * W; y = r() * H; } while (!clear(x, y));
    const depth = 15 + r() * 9;
    flyCam(at + 0.6, false);
    camera.getWorldDirection(fwd);
    dir.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const pos = camera.position.clone().addScaledVector(dir, depth / dir.dot(fwd));
    let hits = 0;
    for (const dt of LOOK) {
      flyCam(at + dt, false);
      camera.getWorldDirection(fwd);
      const a = box(pos, IDEAS[i], flipAt(x));
      if (!a) continue;
      for (const o of flyIdeas) {
        if (o.at < at - 4) continue;
        const b = box(o.pos, IDEAS[o.i], o.flip);
        if (b && a[0] < b[2] + 18 && b[0] < a[2] + 18 && a[1] < b[3] + 12 && b[1] < a[3] + 12) hits++;
      }
    }
    if (!best || hits < best.hits) best = { pos, flip: flipAt(x), hits };
  }
  const el = ideaEl(IDEAS[i], $("ideas"));
  if (best.flip) el.classList.add("flip");
  flyIdeas.push({ at, i, pos: best.pos, flip: best.flip, el });
});
function drawFlyIdeas(t, on) {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  for (const d of flyIdeas) {
    // Any idea still in view as Act II begins goes out with the flight
    let a = on ? expoOut(seg(t, d.at, d.at + 0.55)) * (1 - smooth(14.6, 15.6, t)) : 0;
    const depth = _v.copy(d.pos).sub(camera.position).dot(fwd);
    a *= clamp01((depth - 1.5) / 3.5);
    if (a <= 0.002 || depth <= 0.5) { show(d.el, false); continue; }
    const p = toScreen(d.pos);
    if (p.x < -500 || p.x > W + 100 || p.y < -100 || p.y > H + 100) { show(d.el, false); continue; }
    show(d.el, true);
    const s = Math.max(0.62, Math.min(1.6, 19 / depth));
    css(d.el, "transform", `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${s.toFixed(3)})`);
    css(d.el, "opacity", a.toFixed(3));
    css(d.el.firstChild, "transform", `scale(${(1 + 2.2 * (1 - expoOut(seg(t, d.at, d.at + 0.7)))).toFixed(3)})`);
  }
}

// ── Act III: who brings what — a callout for each of the four spheres ────────
const TAGS = [
  { sphere: "ifo",       name: "you",       status: "bring the idea" },
  { sphere: "castles",   name: "patrons",   status: "bring the capital" },
  { sphere: "education", name: "mulvium",   status: "brings the institution" },
  { sphere: "zones",     name: "neighbors", status: "share in its beauty" },
].map((g, i) => {
  const el = document.createElement("div");
  el.className = "tag";
  el.innerHTML = "<b></b><em></em>";
  el.children[0].textContent = g.name;
  el.children[1].textContent = g.status;
  $("tags").appendChild(el);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "6");
  $("leads").append(line, dot);
  return { ...g, el, line, dot, at: CUES.tags[i], out: CUES.exists - 0.25 };
});
// The quadrants: top left, top right, bottom left, bottom right
const QUADS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const _wp = new THREE.Vector3();
// For each sphere, the angle on its ring that carries it deepest into each
// quadrant as the camera sees it while they are named; then the pairing of
// spheres and quadrants that does best by all four together
function quadrantPlan() {
  const tRef = (CUES.tags[0] + CUES.exists) / 2;
  poseCosmos(tRef, 0, 0, false);
  genesisCam(tRef);
  const half = Math.min(W, H) / 2;
  const best = orbits.map((o) => {
    const from = o.def.phase + o.def.speed * orbitClock((CUES.glide[0] + CUES.glide[1]) / 2);
    const out = QUADS.map(() => ({ score: -Infinity, angle: 0 }));
    for (let k = 0; k < 240; k++) {
      const angle = (k / 240) * Math.PI * 2;
      o.rotator.rotation.z = angle;
      cosmos.updateMatrixWorld(true);
      o.planet.getWorldPosition(_wp);
      const p = toScreen(_wp);
      const sx = (p.x - W / 2) / half, sy = (p.y - H / 2) / half;
      // Clear of the star, and of the frame's edges
      if (Math.hypot(sx, sy) < 0.34 || p.x < 110 || p.x > W - 110 || p.y < 110 || p.y > H - 110) continue;
      // ...and as little travel as will do
      const travel = Math.abs(Math.atan2(Math.sin(angle - from), Math.cos(angle - from)));
      QUADS.forEach(([qx, qy], q) => {
        const score = Math.min(sx * qx, sy * qy) + 0.35 * (sx * qx + sy * qy) - 0.12 * travel;
        if (score > out[q].score) out[q] = { score, angle };
      });
    }
    return out;
  });
  let plan = null, top = -Infinity;
  const perm = (arr, k = 0) => {
    if (k === arr.length) {
      const sum = arr.reduce((acc, q, i) => acc + best[i][q].score, 0);
      if (sum > top) { top = sum; plan = arr.slice(); }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      perm(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  perm([0, 1, 2, 3]);
  // Each callout stands just beyond its sphere, further into its quadrant
  orbits.forEach((o, i) => {
    const [qx, qy] = QUADS[plan[i]];
    glideTo.set(o, best[i][plan[i]].angle);
    o.rotator.rotation.z = best[i][plan[i]].angle;
    cosmos.updateMatrixWorld(true);
    const p = toScreen(o.planet.getWorldPosition(_wp));
    // (on the reel, above or below the cosmos, on its side)
    const x = REEL ? (qx < 0 ? 280 : 800) : Math.max(280, Math.min(W - 280, p.x + qx * 230));
    const y = REEL ? (qy < 0 ? 400 : 1420) : Math.max(50, Math.min(H - 170, qy < 0 ? p.y - 200 : p.y + 90));
    TAGS.find((g) => g.sphere === o.def.id).anchor = [x, y];
  });
}
quadrantPlan();
function drawTags(t) {
  for (const g of TAGS) {
    const on = t >= g.at && t < g.out + 0.6;
    show(g.el, on);
    css(g.line, "display", on ? "" : "none");
    css(g.dot, "display", on ? "" : "none");
    if (!on) continue;
    const planet = orbitOf(g.sphere).planet;
    planet.getWorldPosition(_wp);
    const p = toScreen(_wp), rp = screenRadius(_wp, 0.42 * planet.scale.x);
    const a = expoOut(seg(t, g.at, g.at + 0.6)) * (1 - seg(t, g.out, g.out + 0.5));
    const [ax, ay] = g.anchor, h = g.el.offsetHeight;
    css(g.el, "transform", `translate(${ax}px, ${(ay + (1 - a) * 16).toFixed(1)}px)`);
    css(g.el, "opacity", a.toFixed(3));
    // The leader runs from the callout's nearer edge to the sphere's
    const below = p.y > ay + h / 2;
    const sx = ax, sy = below ? ay + h + 14 : ay - 14;
    const dx = p.x - sx, dy = p.y - sy, len = Math.hypot(dx, dy) || 1;
    const ex = p.x - (dx / len) * (rp + 6), ey = p.y - (dy / len) * (rp + 6);
    const k = cubicInOut(seg(t, g.at + 0.15, g.at + 0.85));
    g.line.setAttribute("x1", sx.toFixed(1));
    g.line.setAttribute("y1", sy.toFixed(1));
    g.line.setAttribute("x2", lerp(sx, ex, k).toFixed(1));
    g.line.setAttribute("y2", lerp(sy, ey, k).toFixed(1));
    g.line.setAttribute("opacity", a.toFixed(3));
    g.dot.setAttribute("cx", ex.toFixed(1));
    g.dot.setAttribute("cy", ey.toFixed(1));
    g.dot.setAttribute("opacity", (a * seg(t, g.at + 0.75, g.at + 0.95)).toFixed(3));
  }
}
// A named sphere swells, as one does when hovered on the landing page
function swell(t) {
  for (const o of orbits) {
    const g = TAGS.find((x) => x.sphere === o.def.id);
    const k = easeInOut(seg(t, g.at, g.at + 0.5)) * (1 - easeInOut(seg(t, g.out, g.out + 0.6)));
    o.planet.scale.setScalar(1 + 0.2 * k);
  }
}

// ── Act V: the network, the Contact Us page's (js/contact-mesh.js) ───────────
// The cosmos's five spheres and a shell of small vertices, every vertex tied
// to its nearest neighbours. They appear gathered in the middle, then
// separate, the edges stretching out between them; signals travel the edges,
// ripples spread through the graph, and the ideas take their places in it.
// At the close it all gathers back to the point the wordmark opens from.
const netWorld = new THREE.Group();
scene.add(netWorld);
const NET_FOV = REEL ? 64 : 45, NET_Z = 11;
const netHy = NET_Z * Math.tan((NET_FOV * Math.PI) / 360), netHx = netHy * (W / H);
const EDGE_RGB = [168, 150, 106], FLASH_RGB = [143, 90, 66];
const netSphere = new THREE.SphereGeometry(1, 32, 32);
const nodes = [];
function addNode(nx, ny, z, size, color, main) {
  const mesh = new THREE.Mesh(netSphere, new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0, emissive: color, emissiveIntensity: 0 }));
  netWorld.add(mesh);
  const n = { mesh, size, main, nx, ny, base: new THREE.Vector3(nx * netHx * 0.92, ny * netHy * 0.92, z),
              from: new THREE.Vector3(), pos: new THREE.Vector3(), edges: [], hops: new Map(), bob: nodes.length * 1.7 };
  nodes.push(n);
  return n;
}
// The five spheres hold the corners and the crown, clear of the words
const MAIN_AT = REEL
  ? [["star", 0, 0.74], ["ifo", -0.6, 0.52], ["castles", 0.6, 0.52], ["education", -0.6, -0.48], ["zones", 0.6, -0.48]]
  : [["star", 0, 0.7], ["ifo", -0.8, 0.46], ["castles", 0.8, 0.46], ["education", -0.8, -0.52], ["zones", 0.8, -0.52]];
const netMain = {};
for (const [id, nx, ny] of MAIN_AT) {
  const color = id === "star" ? PASTEL_STAR : ORBITS.find((o) => o.id === id).planetColor;
  netMain[id] = addNode(nx, ny, id === "star" ? -0.5 : 0, id === "star" ? 0.5 : 0.38, color, true);
}
// The band the words take, as a share of half the height
const NET_BAND = REEL ? [-0.17, 0.36] : [-0.3, 0.32];
const inBand = (n) => n.ny > NET_BAND[0] && n.ny < NET_BAND[1] && (REEL || Math.abs(n.nx) < 0.82);
{
  const r = rng(77), N = REEL ? 46 : 58, minPx = REEL ? 92 : 98;
  let tries = 0;
  while (nodes.length < N + 5 && tries++ < 40000) {
    const c = { nx: -0.95 + r() * 1.9, ny: -0.9 + r() * 1.8 };
    if (inBand({ nx: c.nx, ny: c.ny + 0.04 }) || inBand({ nx: c.nx, ny: c.ny - 0.04 })) continue;
    const px = (c.nx * W) / 2, py = (c.ny * H) / 2;
    if (nodes.some((n) => Math.hypot((n.nx * W) / 2 - px, (n.ny * H) / 2 - py) < (n.main ? minPx * 1.5 : minPx))) continue;
    addNode(c.nx, c.ny, (r() - 0.5) * 2.2, 0.075 + r() * 0.05, 0xded5c2, false);
  }
}
// Edges: each vertex to its nearest neighbours, never across the words
const netSvg = $("net");
const edges = [], edgeKeys = new Set();
const pxDist = (a, b) => Math.hypot(((a.nx - b.nx) * W) / 2, ((a.ny - b.ny) * H) / 2);
const across = (a, b) => {
  const mid = (NET_BAND[0] + NET_BAND[1]) / 2;
  return (a.ny - mid) * (b.ny - mid) < 0 && (REEL || Math.abs(a.nx) < 0.82 || Math.abs(b.nx) < 0.82);
};
for (const n of nodes) {
  nodes.filter((m) => m !== n && !across(n, m)).sort((p, q) => pxDist(n, p) - pxDist(n, q)).slice(0, n.main ? 4 : 3).forEach((m) => {
    const ia = nodes.indexOf(n), ib = nodes.indexOf(m), key = Math.min(ia, ib) + "-" + Math.max(ia, ib);
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    netSvg.appendChild(line);
    const e = { a: n, b: m, line, drawAt: 0 };
    edges.push(e);
    n.edges.push(e); m.edges.push(e);
  });
}
// How many edges each vertex is from each of the five spheres, for ripples
for (const id of Object.keys(netMain)) {
  const src = netMain[id];
  src.hops.set(src, 0);
  const queue = [src];
  while (queue.length) {
    const n = queue.shift(), h = src.hops.get(n);
    for (const e of n.edges) {
      const m = e.a === n ? e.b : e.a;
      if (!src.hops.has(m)) { src.hops.set(m, h + 1); queue.push(m); }
    }
  }
}
// The entrance: gathered in the middle, then out to their places
const NET_T0 = CUES.network;
{
  const r = rng(91), GOLDEN = Math.PI * (3 - Math.sqrt(5));
  nodes.forEach((n, i) => {
    const k = (i + 0.5) / nodes.length, y = 1 - 2 * k, rr = Math.sqrt(1 - y * y), th = GOLDEN * i;
    const reach = n.main ? 0.3 : 0.6 + 0.6 * Math.cbrt(k);
    n.from.set(Math.cos(th) * rr * reach, y * reach, Math.sin(th) * rr * reach);
    n.scaleAt = NET_T0 + 0.15 + i * 0.008;
    n.spreadAt = NET_T0 + 0.85 + (n.main ? 0 : r() * 0.3);
  });
  edges.forEach((e, i) => { e.drawAt = NET_T0 + 1.0 + i * 0.006; });
}
// Signals travelling the edges
const SIGNALS = Array.from({ length: 16 }, (_, k) => {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("r", "4");
  netSvg.appendChild(c);
  return { el: c, dur: 1.1 + (k % 5) * 0.22, phase: k * 0.37 };
});
const hash = (n) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
// The ideas take their places on small vertices, clear of the frame's edges
const netIdeas = (() => {
  const r = rng(53);
  // In a shuffled order, each far enough from the last ones that no two names touch
  const spots = [];
  nodes.filter((n) => !n.main && n.ny < 0.86 && n.ny > (REEL ? -0.64 : -0.86) && Math.abs(n.nx) < 0.93)
    .map((n) => [r(), n]).sort((a, b) => a[0] - b[0]).forEach(([, n]) => {
      // A name runs about 300px from its vertex, leftward on the right
      const span = (m) => { const x = (m.nx * W) / 2; return m.nx > 0.1 ? [x - 310, x + 10] : [x - 10, x + 310]; };
      const [a0, a1] = span(n), py = (-n.ny * H) / 2;
      if (spots.some((m) => { const [b0, b1] = span(m); return a0 < b1 && b0 < a1 && Math.abs((-m.ny * H) / 2 - py) < 48; })) return;
      spots.push(n);
    });
  return CUES.netIdeas.slice(0, spots.length).map((at, i) => {
    const el = ideaEl(IDEAS[i], $("ideas"));
    el.classList.add("ink");
    if (spots[i].nx > 0.1) el.classList.add("flip");
    return { at, node: spots[i], el };
  });
})();
// Ripples spread from a sphere through the graph, a beat per edge
const RIPPLE_FROM = { star: ["star"], sides: ["ifo", "castles"], low: ["education", "zones"] };
const rippleShape = (x) => (x < 0 ? 0 : (1 - Math.exp(-x * 25)) * Math.exp(-x * 2.6));
function netPulse(n, t) {
  let p = 0;
  for (const [at, from, strength] of CUES.ripples) {
    for (const id of RIPPLE_FROM[from]) {
      const hops = netMain[id].hops.get(n);
      if (hops !== undefined) p += strength * rippleShape(t - at - hops * 0.12);
    }
  }
  return Math.min(1.4, p);
}
// Where it all gathers: the wordmark's centre
const MARK_Y = REEL ? 0.43 : 0.44;
const GATHER = new THREE.Vector3(0, (1 - 2 * MARK_Y) * netHy, 0);
function netCam(t) {
  camera.fov = NET_FOV;
  camera.clearViewOffset();
  camera.up.set(0, 1, 0);
  camera.position.set(Math.sin(t * 0.2) * 0.35, Math.cos(t * 0.17) * 0.22, lerp(NET_Z + 0.8, NET_Z - 0.4, seg(t, NET_T0, CUES.gather[1])));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
function poseNet(t) {
  netWorld.rotation.y = Math.sin((t - NET_T0) * 0.18) * 0.1;
  netWorld.updateMatrixWorld(true);
  const g = Math.pow(seg(t, ...CUES.gather), 3);
  for (const n of nodes) {
    const sc = easeOutBack(seg(t, n.scaleAt, n.scaleAt + 0.5));
    const sp = 1 - Math.pow(1 - seg(t, n.spreadAt, n.spreadAt + 1.6), 3);
    n.pos.lerpVectors(n.from, n.base, sp);
    n.pos.x += Math.sin(t * 0.5 + n.bob) * 0.05 * sp;
    n.pos.y += Math.cos(t * 0.43 + n.bob) * 0.05 * sp;
    n.pos.lerp(GATHER, g);
    n.pulse = netPulse(n, t);
    n.mesh.position.copy(n.pos);
    n.mesh.scale.setScalar(Math.max(0.0001, n.size * sc * (1 + 0.25 * Math.min(1, n.pulse)) * (1 - 0.9 * g)));
    n.mesh.material.emissiveIntensity = 0.22 * n.pulse;
  }
}
const mixRGB = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",")})`;
function drawNet(t) {
  const g = seg(t, ...CUES.gather);
  for (const n of nodes) {
    n.mesh.getWorldPosition(_wp);
    const p = toScreen(_wp);
    n.sx = p.x; n.sy = p.y; n.sr = screenRadius(_wp, n.mesh.scale.x);
  }
  for (const e of edges) {
    const d = seg(t, e.drawAt, e.drawAt + 0.5);
    if (d <= 0 || g >= 1) { css(e.line, "display", "none"); continue; }
    css(e.line, "display", "");
    const { a, b } = e, dx = b.sx - a.sx, dy = b.sy - a.sy, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const x1 = a.sx + ux * a.sr, y1 = a.sy + uy * a.sr;
    const x2 = lerp(x1, b.sx - ux * b.sr, d), y2 = lerp(y1, b.sy - uy * b.sr, d);
    const flash = Math.min(1, (a.pulse + b.pulse) / 2);
    e.line.setAttribute("x1", x1.toFixed(1)); e.line.setAttribute("y1", y1.toFixed(1));
    e.line.setAttribute("x2", x2.toFixed(1)); e.line.setAttribute("y2", y2.toFixed(1));
    e.line.setAttribute("stroke", mixRGB(EDGE_RGB, FLASH_RGB, flash));
    e.line.setAttribute("stroke-width", (1.6 + 1.8 * flash).toFixed(2));
    e.line.setAttribute("stroke-opacity", ((0.55 + 0.4 * flash) * (1 - g)).toFixed(3));
  }
  // Signals, once the graph is drawn and until it gathers
  const live = seg(t, NET_T0 + 2.6, NET_T0 + 3.2) * (1 - seg(t, CUES.gather[0], CUES.gather[0] + 0.4));
  for (const [k, s] of SIGNALS.entries()) {
    const u = (t - NET_T0 + s.phase) / s.dur, cycle = Math.floor(u), f = u - cycle;
    const e = edges[Math.floor(hash(k * 131 + cycle * 977) * edges.length)];
    if (!e || live <= 0) { css(s.el, "display", "none"); continue; }
    css(s.el, "display", "");
    const back = hash(k * 17 + cycle) < 0.5;
    const [p0, p1] = back ? [e.b, e.a] : [e.a, e.b];
    s.el.setAttribute("cx", lerp(p0.sx, p1.sx, f).toFixed(1));
    s.el.setAttribute("cy", lerp(p0.sy, p1.sy, f).toFixed(1));
    s.el.setAttribute("opacity", (Math.sin(Math.PI * f) * 0.85 * live).toFixed(3));
  }
  // The ideas, each by its vertex
  const fade = 1 - seg(t, CUES.gather[0], CUES.gather[0] + 0.6);
  for (const d of netIdeas) {
    const a = expoOut(seg(t, d.at, d.at + 0.6)) * fade;
    show(d.el, a > 0.002);
    if (a <= 0.002) continue;
    const n = d.node, off = (n.sr + 10) * (d.el.classList.contains("flip") ? -1 : 1);
    css(d.el, "transform", `translate(${(n.sx + off).toFixed(1)}px, ${n.sy.toFixed(1)}px)`);
    css(d.el, "opacity", a.toFixed(3));
  }
}

// ── Act VI: the wordmark — the navbar's many faces, many more, then its own ──
const brand = $("brand"), mark = brand.querySelector(".mark"), brandCta = brand.querySelector(".cta");
const MARK_PX = REEL ? 118 : 150;
// The navbar's wordmark, each letter in its own face (css/style.css .bl-1 to .bl-7)
const NAV_FACES = [
  ["M", "Cinzel", 500], ["U", "Playfair Display", 500], ["L", "Cinzel", 400], ["V", "Italiana", 400, "normal", true],
  ["i", "Inter", 900], ["u", "Cormorant SC", 500, "normal", false, 1.22], ["M", "Cinzel", 500],
];
// ...and the faces it passes through on the way to its own
const FACES = [
  ["Abril Fatface", 400], ["Bodoni Moda", 700], ["DM Serif Display", 400], ["DM Serif Display", 400, "italic"],
  ["Fraunces", 300], ["Fraunces", 900], ["Space Mono", 700], ["Syne", 800], ["Unbounded", 700], ["Bebas Neue", 400],
  ["Monoton", 400], ["Rubik Mono One", 400], ["Josefin Sans", 100], ["UnifrakturMaguntia", 400], ["Orbitron", 900],
  ["Archivo Black", 400], ["Caveat", 700], ["Poiret One", 400], ["Limelight", 400], ["Yeseva One", 400],
  ["Zilla Slab", 700], ["Righteous", 400], ["Lobster", 400], ["Shrikhand", 400], ["Rye", 400], ["Syncopate", 700],
  ["Cormorant Garamond", 300, "italic"], ["IBM Plex Mono", 300], ["Bungee", 400], ["Pirata One", 400], ["Gloock", 400],
  ["Playfair Display", 900], ["Playfair Display", 400, "italic"], ["Cinzel", 400], ["Italiana", 400], ["Inter", 900],
  ["Cormorant SC", 500], ["Major Mono Display", 400],
];
const FINAL = "MULVIUM";
const markLetters = [...FINAL].map((ch, j) => {
  const el = document.createElement("span");
  mark.appendChild(el);
  return { el, j, key: "" };
});
// Each letter's cell is as wide as its own glyph in the final face, with the
// hero's tracking, so every face before it is centred where it will land
function sizeCells() {
  const c = document.createElement("canvas").getContext("2d");
  c.font = `400 ${MARK_PX}px Lora`;
  for (const l of markLetters) l.el.style.width = (c.measureText(FINAL[l.j]).width + MARK_PX * 0.3).toFixed(1) + "px";
  mark.style.top = (H * MARK_Y - MARK_PX * 0.5).toFixed(0) + "px";
  brandCta.dataset.top = (H * MARK_Y + MARK_PX * 0.62 + 40).toFixed(0);
}
function setFace(l, key, ch, family, weight, style = "normal", outline = false, size = 1) {
  if (l.key === key) return;
  l.key = key;
  l.el.textContent = ch;
  l.el.style.fontFamily = `"${family}"`;
  l.el.style.fontWeight = String(weight);
  l.el.style.fontStyle = style;
  l.el.style.fontSize = size === 1 ? "" : size + "em";
  l.el.style.color = outline ? "transparent" : "";
  l.el.style.webkitTextStroke = outline ? `${(MARK_PX * 0.012).toFixed(1)}px #1b1613` : "";
}
function drawBrand(t) {
  const on = t >= CUES.wordmark;
  show(brand, on);
  if (!on) return;
  const [c0, c1] = CUES.cycle, [s0] = CUES.settle;
  goo(mark, seg(t, CUES.wordmark, CUES.wordmark + 0.9), 40);
  for (const l of markLetters) {
    const j = l.j, start = c0 + j * 0.05, land = s0 + j * 0.14;
    let pop = 1;
    if (t < start) {
      const [ch, fam, wt, st, outline, size] = NAV_FACES[j];
      setFace(l, "nav", ch, fam, wt, st, outline, size);
    } else if (t < land) {
      // Faster and faster through the faces, then slowing as it nears its own
      const dur = c1 - c0, u = clamp01((t - start) / dur);
      const step = Math.floor(3 * (t - start) + (9 * dur / Math.PI) * (1 - Math.cos(Math.PI * u)));
      const [fam, wt, st = "normal"] = FACES[Math.floor(hash(j * 977 + step * 31) * FACES.length)];
      const ch = hash(j * 131 + step * 7) < 0.3 ? FINAL[j].toLowerCase() : FINAL[j];
      setFace(l, `c${step}`, ch, fam, wt, st);
    } else {
      setFace(l, "final", FINAL[j], "Lora", 400);
      pop = 1 + 0.1 * (1 - expoOut(seg(t, land, land + 0.45)));
    }
    css(l.el, "transform", pop === 1 ? "none" : `scale(${pop.toFixed(3)})`);
  }
  css(mark, "transform", `scale(${lerp(0.72, 1, expoOut(seg(t, CUES.wordmark, CUES.wordmark + 1.2))).toFixed(4)})`);
  const c = expoOut(seg(t, CUES.cta, CUES.cta + 0.9));
  css(brandCta, "top", (Number(brandCta.dataset.top) + (1 - c) * 24).toFixed(0) + "px");
  css(brandCta, "opacity", c.toFixed(3));
}

// ── The lens: grain, vignette, letterbox ────────────────────────────────────
const grain = $("grain"), gctx = grain.getContext("2d");
grain.width = W / 2;
grain.height = H / 2;
const grainFrames = (() => {
  const r = rng(99), out = [];
  for (let k = 0; k < 8; k++) {
    const img = gctx.createImageData(W / 2, H / 2);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    out.push(img);
  }
  return out;
})();
let lastGrain = -1;
const bars = [...$("bars").children];
const glow = $("glow"), streak = $("streak"), black = $("black"), flash = $("flash"), halo = $("halo"),
      vignette = $("vignette"), veil = $("veil"), scrim = $("scrim");

// ── One frame ────────────────────────────────────────────────────────────────
function seek(t) {
  t = Math.max(0, Math.min(DURATION, t));
  const fly = t < CUES.cut;
  const cosmosOn = !fly && t >= CUES.spark - 0.3 && t < CUES.toBowl[1];
  const inBowl = t >= CUES.toBowl[1] && t < CUES.network;
  const netOn = t >= CUES.network && t < CUES.gather[1] + 0.05;
  let nightness = 0;

  deepField.visible = sphereGroup.visible = fly;
  cosmos.visible = sky.visible = cosmosOn;
  bowlWorld.visible = inBowl;
  netWorld.visible = netOn;
  if (fly) {
    nightness = 1;
    flyCam(t);
    bgColor.copy(NIGHT_COLOR);
    deepMat.uniforms.uTime.value = t;
    deepMat.uniforms.uOpacity.value = seg(t, 0.2, 3.2) * (1 - 0.5 * seg(t, 17, CUES.cut));
    drawSphere(t);
  } else if (cosmosOn) {
    poseCosmos(t, T2D(t), EXP(t));
    swell(t);
    cosmos.updateMatrixWorld(true);
    genesisCam(t);
    nightness = NIGHT(t);
    bgColor.copy(PAPER_COLOR).lerp(NIGHT_COLOR, nightness);
    skyMat.uniforms.uTime.value = t;
    skyMat.uniforms.uOpacity.value = nightness * lerp(0.2, 1, seg(t, CUES.spark, 31));
  } else if (inBowl) {
    bowlCam(t);
    poseBowl(t);
    bgColor.copy(PAPER_COLOR);
  } else {
    bgColor.copy(PAPER_COLOR);
    if (netOn) { netCam(t); poseNet(t); }
  }
  const blackout = t < 1.2 ? 1 - seg(t, 0, 1.2) : t >= CUES.cut && t < CUES.spark ? 1 - seg(t, CUES.spark - 0.25, CUES.spark) : 0;
  if (blackout < 1) renderer.render(scene, camera);
  css(black, "opacity", blackout.toFixed(3));
  css(scrim, "opacity", (seg(t, 17.6, 18.2) * (t < CUES.cut ? 1 : 0)).toFixed(3));

  // From the cosmos to the bowl, and the bowl to the network, through paper
  const N0 = CUES.network, [b0, b1, b2] = CUES.toBowl;
  const v = t >= N0 - 0.6 && t < N0 + 0.5 ? Math.min(seg(t, N0 - 0.6, N0), 1 - seg(t, N0, N0 + 0.5))
    : t >= b0 && t < b2 ? Math.min(seg(t, b0, b1), 1 - seg(t, b1, b2)) : 0;
  css(veil, "opacity", v.toFixed(3));

  show($("ideas"), fly || netOn);
  drawFlyIdeas(t, fly);

  // The star's light: a spark in the dark, then the bloom
  let gA = 0, gS = 0.1;
  if (cosmosOn && t < 34.5) {
    gA = expoOut(seg(t, CUES.spark, CUES.spark + 0.35)) * (1 - seg(t, CUES.bloom + 0.2, 34.5));
    gS = lerp(0.07, 0.6, expoIn(seg(t, CUES.rise, CUES.bloom)));
  }
  show(glow, gA > 0.001);
  show(streak, gA > 0.001);
  if (gA > 0.001) {
    const sp = toScreen(star.getWorldPosition(_wp));
    css(glow, "transform", `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px) scale(${gS.toFixed(3)})`);
    css(glow, "opacity", gA.toFixed(3));
    css(streak, "transform", `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px) scale(${(0.35 + gS * 0.9).toFixed(3)}, ${(0.6 + gS * 0.6).toFixed(3)})`);
    css(streak, "opacity", (gA * 0.85).toFixed(3));
  }

  const tagsOn = cosmosOn && t >= CUES.tags[0] && t < CUES.exists + 0.5;
  show($("tags"), tagsOn);
  show($("leads"), tagsOn);
  if (tagsOn) drawTags(t);
  show(netSvg, netOn);
  if (netOn) drawNet(t);
  else for (const d of netIdeas) show(d.el, false);

  // Words
  drawCaptions(t);
  const haloA = seg(t, CUES.exists - 0.2, CUES.exists + 0.4) * (1 - seg(t, 51.8, 52.6));
  show(halo, haloA > 0.001);
  css(halo, "transform", REEL ? "translate(540px, 1490px) scale(0.85, 0.5)" : "translate(960px, 880px) scale(1.1, 0.55)");
  css(halo, "opacity", haloA.toFixed(3));
  drawBrand(t);

  // The flash at the bloom
  const fl = Math.pow(seg(t, CUES.bloom - 0.6, CUES.bloom), 2.0) * (1 - expoOut(seg(t, CUES.bloom, CUES.bloom + 1.6))) * 0.96;
  css(flash, "opacity", fl.toFixed(3));

  // The lens
  const gi = Math.floor(t * CUES.fps) % grainFrames.length;
  if (gi !== lastGrain) { gctx.putImageData(grainFrames[gi], 0, 0); lastGrain = gi; }
  css(grain, "opacity", lerp(0.05, 0.085, nightness).toFixed(3));
  css(vignette, "opacity", lerp(0.32, 0.95, nightness).toFixed(3));
  const bar = REEL ? 0 : 140 * (1 - cubicInOut(seg(t, CUES.bloom, CUES.bloom + 1.8)));
  for (const b of bars) css(b, "height", bar.toFixed(1) + "px");
}

// ── Ready, and playing ───────────────────────────────────────────────────────
const fontsReady = Promise.all([
  "400 62px Lora", "italic 400 62px Lora", "500 62px Lora", "italic 500 62px Lora",
  "400 40px 'Major Mono Display'", "400 48px 'IBM Plex Sans'", "500 30px 'IBM Plex Sans'",
  ...[...NAV_FACES.map(([, f, w, st]) => [f, w, st]), ...FACES].map(([f, w, st = "normal"]) => `${st} ${w} 100px "${f}"`),
].map((f) => document.fonts.load(f, "MULVIUMmulvium"))).then(() => document.fonts.ready);
const ready = Promise.all([fontsReady, picturesReady]).then(() => {
  buildSphere();
  sizeCells();
  // Compile every material the film will need, before the first frame counts
  for (const t of [20, 30, 47, 58, 70, 81, 0]) seek(t);
});
window.film = { seek, ready, duration: DURATION, fps: CUES.fps, width: W, height: H };

if (!RENDER) {
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit();
  addEventListener("resize", fit);
  const audio = $("score"), play = $("play");
  const from = parseFloat(PARAMS.get("t")) || 0;
  // The score, held whole, so it can start anywhere on any server
  const scoreReady = fetch(audio.getAttribute("src"))
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => { audio.src = URL.createObjectURL(b); }, () => {});
  Promise.all([ready, scoreReady]).then(() => {
    seek(from);
    play.hidden = false;
    // The score is the clock; without it, the page keeps its own
    let clock = null;
    const loop = () => {
      const t = clock !== null ? from + (performance.now() - clock) / 1000 : audio.currentTime;
      seek(t);
      if (t < DURATION) requestAnimationFrame(loop);
    };
    const silent = () => { if (clock === null) clock = performance.now(); };
    play.addEventListener("click", () => {
      play.hidden = true;
      const start = () => {
        audio.currentTime = from; // only takes once the score's length is known
        audio.play().catch(silent);
        requestAnimationFrame(loop);
      };
      if (audio.readyState >= 1) start();
      else {
        audio.addEventListener("loadedmetadata", start, { once: true });
        audio.addEventListener("error", () => { silent(); requestAnimationFrame(loop); }, { once: true });
        audio.load();
      }
    });
  });
}

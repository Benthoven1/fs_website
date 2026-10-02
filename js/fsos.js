// fsos.js — the FSOS page scene: a planet made of the work.
// FSOS's green planet arrives as the loading screen opens, then its surface
// turns into the vocabulary of running a nonprofit: the twelve agents, what
// each looks after, and the everyday work between them, laid on the sphere so
// it keeps its shape. The planet itself draws in to a small core, the Chief of
// Staff, which keeps sending threads of light out to the work: tasks being
// picked up. Clicking the core returns home.
import * as THREE from "three";

const canvas = document.getElementById("fsos-canvas");
if (!canvas) throw new Error("fsos: #fsos-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — mirrors js/main.js
const PAPER       = 0xeceae5;
const PASTEL_FSOS = 0xc4ddb8;
const THREAD      = 0xb8925a;
const INK         = "#5a3e1b";
const INK_SOFT    = "#8a6030";
const INK_MONO    = "#7d6a52";

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const FOV = 36;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
const VIEW_DIR = new THREE.Vector3(0, 1.6, 9.2).normalize();
const BASE_DIST = 10.6;
let dist = BASE_DIST;

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);

// ── The vocabulary ───────────────────────────────────────────────────────────
// The twelve agents, what each looks after, and the work between them.
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

const STYLES = {
  agent: { font: '500 80px "Cormorant SC"', color: INK, h: 0.34, alpha: 1 },
  focus: { font: '500 80px "Cormorant Garamond"', color: INK_SOFT, h: 0.27, alpha: 0.92 },
  work:  { font: '400 64px "DM Mono"', color: INK_MONO, h: 0.165, alpha: 0.85 },
};

function wordTexture(text, style) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = style.font;
  const px = parseFloat(style.font.split(" ")[1]);
  c.width = Math.ceil(ctx.measureText(text).width + px * 0.5);
  c.height = Math.ceil(px * 1.45);
  ctx.font = style.font;                 // resizing the canvas resets its state
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = style.color;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return { tex, aspect: c.width / c.height };
}

// ── The globe: the planet, then the words on its surface ─────────────────────
const R = 2.25, CORE = 0.62;
const globe = new THREE.Group();
globe.rotation.x = 0.18;
scene.add(globe);

const hub = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64),
  new THREE.MeshStandardMaterial({ color: PASTEL_FSOS, roughness: 0.34, metalness: 0, emissive: PASTEL_FSOS, emissiveIntensity: 0 }));
hub.scale.setScalar(R);
globe.add(hub);

// Words sit on a Fibonacci sphere, the agents spaced evenly through it so
// they never bunch together; each lies flat on the surface, facing out.
const words = [];
const ORIGIN = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
let wordsReady = false;
function buildWords() {
  const N = AGENTS.length + FOCUS.length + WORK.length;
  const slots = new Array(N).fill(null);
  const place = (list, kind, offset) => list.forEach((w, k) => {
    let i = Math.round(((k + offset) * N) / list.length) % N;
    while (slots[i]) i = (i + 1) % N;
    slots[i] = [kind, w];
  });
  place(AGENTS, "agent", 0.5);
  place(FOCUS, "focus", 0);
  let w = 0;
  for (let i = 0; i < N; i++) if (!slots[i]) slots[i] = ["work", WORK[w++]];

  const golden = Math.PI * (3 - Math.sqrt(5));
  slots.forEach(([kind, text], i) => {
    const y = 1 - ((i + 0.5) / N) * 2, rr = Math.sqrt(1 - y * y), th = i * golden;
    const n = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    const style = STYLES[kind];
    const mesh = new THREE.Mesh(UNIT_PLANE,
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0 }));
    mesh.position.copy(n).multiplyScalar(R);
    // Face outward along the normal, in the globe's own frame
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(n, ORIGIN, UP));
    mesh.visible = false;
    globe.add(mesh);
    const word = { mesh, n, kind, text, style, alpha: style.alpha, delay: 0, lit: 0, w: 1 };
    paint(word);
    words.push(word);
  });
  wordsReady = true;
}

function paint(word) {
  const { tex, aspect } = wordTexture(word.text, word.style);
  if (word.mesh.material.map) word.mesh.material.map.dispose();
  word.mesh.material.map = tex;
  word.mesh.material.needsUpdate = true;
  word.w = word.style.h * aspect;
}

// Words are drawn into textures, so wait for the font stylesheet and then the
// fonts themselves (but not forever); if they arrive later, repaint.
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const FONTS = [STYLES.agent.font, STYLES.focus.font, STYLES.work.font];
function fontsReady() {
  const link = document.querySelector('link[href*="fonts.googleapis"]');
  const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => {
    link.addEventListener("load", r, { once: true });
    link.addEventListener("error", r, { once: true });
  });
  return sheet.then(() => Promise.all(FONTS.map((f) => document.fonts.load(f))));
}
const fontsLoaded = fontsReady().catch(() => {});
Promise.race([fontsLoaded, new Promise((r) => setTimeout(r, 4000))]).then(() => {
  buildWords();
  fontsLoaded.then(() => {
    if (FONTS.every((f) => document.fonts.check(f))) words.forEach(paint);
  });
});

// ── Threads: the core hands work out ─────────────────────────────────────────
const threads = [0, 1, 2].map(() => {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: THREAD, transparent: true, opacity: 0, depthWrite: false }));
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2dcae, transparent: true, opacity: 0 }));
  line.visible = spark.visible = false;
  globe.add(line, spark);
  return { line, spark, word: null, t0: -Infinity };
});
const THREAD_DUR = 1.5, THREAD_EVERY = 0.85;

// ── Hub → home ───────────────────────────────────────────────────────────────
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
canvas.setAttribute("aria-label", "Return to the Mulvium home page via the central planet");
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.intersectObject(hub).length) goHome();
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

// ── Resize: the globe always fits; tall screens step back ────────────────────
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  dist = Math.max(BASE_DIST, (R + 0.55) / (tanHalf * camera.aspect));
}
window.addEventListener("resize", resize);
resize();

// Don't render while the stage is scrolled out of view
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);

// ── Timeline ─────────────────────────────────────────────────────────────────
// The planet arrives as the loading screen opens; once the overlay is gone,
// its surface turns to words, front first, as it draws in to the core.
const clock = new THREE.Clock();
let holeT = Infinity, doneT = Infinity, openT = Infinity;
function onHole() { if (!isFinite(holeT)) holeT = clock.getElapsedTime(); }
function onDone() { onHole(); if (!isFinite(doneT)) doneT = clock.getElapsedTime(); }
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

const TURN = 2.4;           // planet → words
const WORD_RISE = 0.8;      // each word surfacing

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const camDir = new THREE.Vector3(), nWorld = new THREE.Vector3(), hubScale = new THREE.Vector3();
let lastT = 0, nextThread = 0;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  if (!onScreen) return;

  // Camera first: the words' depth fade depends on where it stands
  camera.position.copy(VIEW_DIR).multiplyScalar(dist);
  if (motionOK) {
    const k = 1 - Math.pow(0.02, dt);
    drift.x += (drift.tx - drift.x) * k;
    drift.y += (drift.ty - drift.y) * k;
    camera.position.x += drift.x * 0.2;
    camera.position.y += -drift.y * 0.12;
  }
  camera.lookAt(0, 0, 0);
  camDir.copy(camera.position).normalize();

  if (motionOK) globe.rotation.y += dt * 0.09;
  globe.updateMatrixWorld();

  // The turn begins once the overlay has gone and the words are drawn; each
  // word's moment depends on how directly it faces the viewer then
  if (!isFinite(openT) && isFinite(doneT) && wordsReady) {
    openT = motionOK ? Math.max(t, doneT + 0.5) : -100;
    words.forEach((w) => {
      nWorld.copy(w.n).transformDirection(globe.matrixWorld);
      w.delay = (1 - nWorld.dot(camDir)) * 0.5 * (TURN - WORD_RISE);
      w.mesh.visible = true;
    });
  }

  // Arrival, then the planet draws in to the core
  const a = isFinite(holeT) ? (motionOK ? clamp01((t - holeT) / 1.1) : 1) : 0;
  const since = t - openT;
  const turn = isFinite(openT) ? clamp01(since / TURN) : 0;
  const hover = turn >= 1 && hubHover();
  const coreR = lerp(R, CORE, easeInOut(turn)) * (hover ? 1.15 : 1);
  hubScale.setScalar(Math.max(0.0001, coreR * easeOutBack(a)));
  hub.scale.lerp(hubScale, turn < 1 ? 1 : 1 - Math.pow(0.001, dt));
  canvas.style.cursor = hover ? "pointer" : "default";

  // Words: surface in a ripple, then dim with distance round the back
  words.forEach((w) => {
    if (!w.mesh.visible) return;
    const k = easeInOut(clamp01((since - w.delay) / WORD_RISE));
    w.mesh.position.copy(w.n).multiplyScalar(R * lerp(0.94, 1, k));
    nWorld.copy(w.n).transformDirection(globe.matrixWorld);
    const facing = nWorld.dot(camDir);
    const depth = lerp(0.12, 1, clamp01((facing + 0.25) / 0.9));
    w.mesh.material.opacity = k * Math.min(1, w.alpha * depth + w.lit * 0.6);
    const grow = 1 + w.lit * 0.16;
    w.mesh.scale.set(w.w * grow, w.style.h * grow, 1);
    w.facing = facing;
  });

  // Threads: once the turn is done, the core keeps handing out work
  const running = motionOK && turn >= 1;
  if (running && t >= nextThread) {
    const free = threads.find((th) => t - th.t0 > THREAD_DUR);
    const busy = new Set(threads.map((th) => th.word));
    const choices = words.filter((w) => w.facing > 0.35 && !busy.has(w));
    if (free && choices.length) {
      if (free.word) free.word.lit = 0;
      free.word = choices[Math.floor(Math.random() * choices.length)];
      free.t0 = t;
    }
    nextThread = t + THREAD_EVERY * (0.7 + Math.random() * 0.6);
  }
  let glow = 0;
  threads.forEach((th) => {
    const u = (t - th.t0) / THREAD_DUR;
    const live = running && th.word && u >= 0 && u <= 1;
    th.line.visible = th.spark.visible = live;
    if (!live) { if (th.word) th.word.lit = 0; return; }
    const target = th.word.mesh.position;
    const from = nWorld.copy(target).normalize().multiplyScalar(hub.scale.x);
    const reach = clamp01(u / 0.35);                       // the thread runs out to the word
    const end = from.clone().lerp(target, easeInOut(reach));
    th.line.geometry.attributes.position.setXYZ(0, from.x, from.y, from.z);
    th.line.geometry.attributes.position.setXYZ(1, end.x, end.y, end.z);
    th.line.geometry.attributes.position.needsUpdate = true;
    const fade = 1 - clamp01((u - 0.55) / 0.45);
    th.line.material.opacity = 0.9 * fade;
    th.spark.position.copy(end);
    th.spark.material.opacity = reach < 1 ? 1 : fade;
    th.word.lit = reach < 1 ? 0 : Math.sin(Math.PI * clamp01((u - 0.35) / 0.65));
    glow = Math.max(glow, 1 - reach);
  });
  hub.material.emissiveIntensity = 0.12 * glow;

  renderer.render(scene, camera);
}

function hubHover() {
  if (pointerNdc.x < -1.5) return false;
  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.intersectObject(hub).length > 0;
}

animate();

// fsos.js — the FSOS page scene: the reference workforce.
// FSOS's green planet is the hub (the Chief of Staff); twelve specialist
// agents orbit it, each with its focus on the inner ring at the same angle.
// As the loading screen opens, the rings and labels collapse inward from far
// out, as they did when this view lived on the home page.
import * as THREE from "three";

const canvas = document.getElementById("fsos-canvas");
if (!canvas) throw new Error("fsos: #fsos-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — mirrors js/main.js
const PAPER      = 0xeceae5;
const PASTEL_FSOS = 0xc4ddb8;
const CREAM_DEEP = 0xcdbe96;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);

const CAM = new THREE.Vector3(0, 1.8, 6.8);
const LOOK_AT = new THREE.Vector3(0, 0, 0);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.copy(CAM);
camera.lookAt(LOOK_AT);

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xfff1d8, 0.5);
fillLight.position.set(-8, 3, -4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xf1e4bf, 0.55);
rimLight.position.set(-2, -6, -8);
scene.add(rimLight);

const porcelain = (color, roughness = 0.38) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

// ── Hub and reference rings ──────────────────────────────────────────────────
const hub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 64, 64), porcelain(PASTEL_FSOS));
scene.add(hub);

// Same rings as the home page's two inner orbits, laid flat at their
// agent-circle radii (tube weights scale with them)
const RINGS = [
  { r: 2.8,  tube: 0.045 * (2.8 / 3.0) },
  { r: 1.55, tube: 0.045 * (1.55 / 3.8) },
];
const rings = RINGS.map(({ r, tube }) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 24, 256), porcelain(CREAM_DEEP, 0.35));
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  return ring;
});

// ── Agent circle ─────────────────────────────────────────────────────────────
// The FSOS reference workforce. Long and short names alternate so neighbours
// never collide at the front of the ring.
const AGENTS = [
  ["Research", "Comparables"], ["Grants", "Funders"], ["Communications", "Press"],
  ["Venue", "Halls"], ["Development", "Donors"], ["Finance", "Budgets"],
  ["Artistic Planning", "Repertoire"], ["Rehearsal", "Schedules"], ["Marketing", "Audiences"],
  ["Personnel", "Musicians"], ["Operations", "Logistics"], ["Production", "Staging"],
];

// Labels share one canvas height, so every word renders at the same type size;
// the canvas widens to fit the word and the sprite keeps its aspect.
const LABEL_H = 256;
function drawLabel(text, fontSize, color) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = `${fontSize}px "Cormorant Garamond", serif`;
  ctx.font = font;
  c.width  = Math.max(LABEL_H, Math.ceil(ctx.measureText(text).width + fontSize * 0.6));
  c.height = LABEL_H;
  ctx.font = font;                       // resizing the canvas resets its state
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, c.width / 2, c.height / 2);
  return c;
}

function makeLabel(text, { fontSize = 72, height = 0.75, color = "#5a3e1b" } = {}) {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: true, depthWrite: true, opacity: 0 });
  const s = new THREE.Sprite(mat);
  const paint = () => {
    const c = drawLabel(text, fontSize, color);
    if (mat.map) mat.map.dispose();
    mat.map = new THREE.CanvasTexture(c);
    mat.needsUpdate = true;
    s.scale.set(height * c.width / c.height, height, 1);
  };
  paint();
  // Word widths depend on the web font: repaint once it has loaded
  if (!document.fonts.check(`${fontSize}px "Cormorant Garamond"`)) document.fonts.ready.then(paint);
  scene.add(s);
  return s;
}

const agentLabels = AGENTS.map(([name]) => makeLabel(name, { height: 0.75 }));
const focusLabels = AGENTS.map(([, focus]) => makeLabel(focus, { height: 0.5, color: "#8a6030" }));

// ── Hub → home ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2(-2, -2);
const drift = { x: 0, y: 0, tx: 0, ty: 0 };
let hubHover = false;

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
  const els = document.querySelectorAll(".fsos-prose-header, .fsos-prose-body > p, .fsos-prose-footnote");
  els.forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("rv-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
}

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// Don't render while the stage is scrolled out of view
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);

// ── Entrance: everything collapses inward as the loading screen opens ────────
const clock = new THREE.Clock();
let holeT = Infinity;
function onHole() { if (!isFinite(holeT)) holeT = clock.getElapsedTime(); }
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
setTimeout(onHole, 6000); // safety if the overlay never reports

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

const hubScale = new THREE.Vector3();
let angle = 0, lastT = 0;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  if (!onScreen) return;

  const reveal = isFinite(holeT) ? (motionOK ? Math.min(1, (t - holeT) / 1.9) : 1) : 0;
  const mul = lerp(7, 1, easeInOut(reveal));
  rings.forEach((r) => r.scale.setScalar(mul));

  if (motionOK) angle += dt * 0.18;
  const bobT = t * 0.4;
  const fade = Math.min(1, reveal * 1.6);
  agentLabels.forEach((s, i) => {
    const th = angle + (i / 12) * Math.PI * 2, r = 3.6 * mul;
    s.position.set(Math.sin(th) * r, motionOK ? Math.sin(bobT + i * 0.52) * 0.12 : 0, Math.cos(th) * r);
    s.material.opacity = fade;
  });
  focusLabels.forEach((s, i) => {
    const th = angle + (i / 12) * Math.PI * 2, r = 2.2 * mul;
    s.position.set(Math.sin(th) * r, motionOK ? Math.sin(bobT + i * 0.52 + 0.3) * 0.08 : 0, Math.cos(th) * r);
    s.material.opacity = fade * 0.85;
  });

  // Hub: slow spin; grows a touch under the pointer to invite the way home
  hub.rotation.y += 0.08 * dt;
  raycaster.setFromCamera(pointerNdc, camera);
  hubHover = raycaster.intersectObject(hub).length > 0;
  canvas.style.cursor = hubHover ? "pointer" : "default";
  const target = hubHover ? 1.18 : 1;
  hub.scale.lerp(hubScale.setScalar(target), 1 - Math.pow(0.001, dt));

  // Gentle pointer parallax
  camera.position.copy(CAM);
  if (motionOK) {
    const k = 1 - Math.pow(0.02, dt);
    drift.x += (drift.tx - drift.x) * k;
    drift.y += (drift.ty - drift.y) * k;
    camera.position.x += drift.x * 0.16;
    camera.position.y += -drift.y * 0.16 * 0.55;
  }
  camera.lookAt(LOOK_AT);

  renderer.render(scene, camera);
}
animate();

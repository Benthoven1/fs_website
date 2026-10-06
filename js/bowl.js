// bowl.js — the Fiscal Sponsorship page's opening scene.
// The blue planet from the home page arrives on its orbit ring, then its
// upper half lifts away: the planet was a bowl all along. Four projects drop
// into it one after another, and it holds them. Each project sphere wears
// one of the loading screen's four pictures, glazed like painted porcelain,
// so nothing inside reads as another planet; the page's four projects
// below use the same pictures.
import * as THREE from "three";
import { scrollCue } from "./scroll-cue.js";

const canvas = document.getElementById("fs-canvas");
if (!canvas) throw new Error("bowl: #fs-canvas not found");

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Palette — the planet and porcelain tones mirror js/main.js
const PAPER       = 0xeceae5;
const PASTEL_FS   = 0xb8cae0; // Fiscal Sponsorship's planet on the home page
const CREAM_DEEP  = 0xcdbe96;
const IVORY       = [0xf4ede0, 0xe9ddc6, 0xf0e5d0, 0xe4d6ba];   // until the pictures load
// The loading screen's pictures, in its order (css/style.css, #ls-f1 to #ls-f4).
// The same files, so they are already in the browser's cache.
const PICTURES    = ["../../Musical.webp", "../../Pictorial.webp", "../../image-13.webp", "../../Horticulture.webp"];

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

const FOV = 32;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
const LOOK_AT = new THREE.Vector3(0, 1.55, 0);
const VIEW_DIR = new THREE.Vector3(0, 4.85, 7.6).normalize();

scene.add(new THREE.AmbientLight(0xfff7e8, 0.35));
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cfb0, 0.75));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 10, 8);
keyLight.castShadow = true;
const SHADOW_MAP = window.innerWidth < 720 ? 1024 : 2048;
keyLight.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
keyLight.shadow.radius = 8;
// Bias keeps the bowl's own curved walls from shadowing themselves in
// stripes once the lid is off
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

// Paper floor that only receives the soft shadow
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── The planet: two thick-walled halves that meet at the rim ─────────────────
// The lower half is the bowl. The upper half is the same shell mirrored.
// Until it opens, a whole sphere stands in for the pair, so the closed
// planet shows no seam.
const R = 1.55, T = 0.12;
const profile = [];
for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * R, R - Math.cos(a) * R)); }
for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; profile.push(new THREE.Vector2(R - T / 2 + Math.cos(a) * -T / 2, R + Math.sin(a) * -T / 2 * 0.6)); }
for (let i = 40; i >= 0; i--) { const a = (i / 40) * Math.PI / 2; profile.push(new THREE.Vector2(Math.sin(a) * (R - T), R - Math.cos(a) * (R - T) + T * 0.4)); }
const shellGeo = new THREE.LatheGeometry(profile, 160);

// Everything that turns slowly together: the bowl, its lid, and the projects
const vessel = new THREE.Group();
scene.add(vessel);

const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), porcelain(PASTEL_FS, 0.34));
planet.position.y = R;
planet.castShadow = true;
vessel.add(planet);

const bowl = new THREE.Mesh(shellGeo, porcelain(PASTEL_FS, 0.34, { side: THREE.DoubleSide }));
bowl.castShadow = true;
bowl.receiveShadow = true;
vessel.add(bowl);

// The upper half pivots at the rim's centre, so it can lift and tip like a lid
const lidPivot = new THREE.Group();
lidPivot.position.y = R;
vessel.add(lidPivot);
const lidMat = porcelain(PASTEL_FS, 0.34, { side: THREE.DoubleSide, transparent: true });
const lid = new THREE.Mesh(shellGeo, lidMat);
lid.scale.y = -1;
lid.position.y = R;
lid.castShadow = true;
// The lid's shadow shrinks away as the lid begins to lift: in the shadow
// pass alone, the lid is drawn shrinking toward its own middle, so its
// shadow gets smaller and is gone before it can travel off across the floor
const lidFade = { value: 1 };
const lidDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
lidDepth.onBeforeCompile = (sh) => {
  sh.uniforms.uFade = lidFade;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uFade;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed = mix(vec3(0.0, ${(R * 0.55).toFixed(3)}, 0.0), transformed, uFade);`);
};
lid.customDepthMaterial = lidDepth;
lidPivot.add(lid);

// A picture wrapped round a sphere, softened toward porcelain: a little less
// saturated and contrasty, under a thin ivory glaze
function glazeOnto(material, src) {
  const img = new Image();
  img.decoding = "async";
  img.src = new URL(src, document.baseURI).href;
  img.decode().then(() => {
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
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    material.map = tex;
    material.color.setHex(0xffffff);
    material.needsUpdate = true;
  }).catch(() => {}); // keeps its ivory if the picture can't load
}

// ── The projects: four painted spheres that settle against the bowl's floor ──
const SR = 0.5, SD = 0.7, DROP = 5;
const projects = IVORY.map((color, i) => {
  const ang = i * Math.PI / 2 + 0.5;
  const x = Math.cos(ang) * SD, z = Math.sin(ang) * SD;
  const r = R - T - SR;
  const rest = new THREE.Vector3(x, R - Math.sqrt(Math.max(0, r * r - x * x - z * z)), z);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SR, 64, 64), porcelain(color, 0.36));
  // Each sphere turns the middle of its picture toward the viewer, tipped up
  // to meet the camera's downward gaze (kept so as the bowl turns; see animate)
  mesh.rotation.order = "YXZ";
  mesh.rotation.x = -0.74;
  glazeOnto(mesh.material, PICTURES[i]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  vessel.add(mesh);
  return { mesh, rest, from: new THREE.Vector3(x * 0.35, rest.y + DROP, z * 0.35) };
});

// ── The planet's orbit ring, kept around it throughout ───────────────────────
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.045, 24, 256), porcelain(CREAM_DEEP, 0.35));
ring.rotation.set(Math.PI / 2 - 0.22, 0.18, 0);
ring.position.y = 1.15;
ring.castShadow = true;
scene.add(ring);

// ── Framing: the ring always fits the width; tall screens step back ──────────
const RING_HALF_W = 3.1;
const BASE_DIST = 10.6;
let dist = BASE_DIST;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  dist = Math.max(BASE_DIST, RING_HALF_W / (tanHalf * camera.aspect));
}
window.addEventListener("resize", resize);
resize();

// Gentle pointer parallax
const drift = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  drift.tx = (e.clientX / window.innerWidth) * 2 - 1;
  drift.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

// Don't render while the stage is scrolled out of view
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);

// ── Timeline ─────────────────────────────────────────────────────────────────
// The planet and its ring arrive as the loading screen opens; the bowl opens
// once the overlay has gone.
const clock = new THREE.Clock();
let holeT = Infinity, openT = Infinity;
function onHole() { if (!isFinite(holeT)) holeT = clock.getElapsedTime(); }
function onDone() {
  onHole();
  if (!isFinite(openT)) openT = clock.getElapsedTime() + (motionOK ? 0.6 : -100);
}
// ls.js flags each event on window (e.g. window["__mulvium_ls-hole"]) for late listeners
if (window["__mulvium_ls-hole"]) onHole(); else document.addEventListener("mulvium:ls-hole", onHole);
if (window["__mulvium_ls-done"]) onDone(); else document.addEventListener("mulvium:ls-done", onDone);
setTimeout(onDone, 10000); // safety if the overlay never reports

const LIFT_DUR = 1.6;          // the upper half lifts and fades
const DROP_START = 0.9;        // first project begins to fall (after openT)
const DROP_GAP = 0.42;         // between projects
const FALL = 0.62, SETTLE = 0.38;
const HELD_AT = DROP_START + DROP_GAP * (projects.length - 1) + FALL + SETTLE;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const cue = scrollCue(document.getElementById("fs-cue"));
let lastT = 0;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, t - lastT);
  lastT = t;
  if (!onScreen) return;

  // Arrival: the planet swells into place and its ring closes in around it
  const a = isFinite(holeT) ? (motionOK ? clamp01((t - holeT) / 1.1) : 1) : 0;
  vessel.scale.setScalar(Math.max(0.0001, easeOutBack(a)));
  const rr = isFinite(holeT) ? (motionOK ? clamp01((t - holeT) / 1.9) : 1) : 0;
  ring.scale.setScalar(lerp(3.2, 1, easeInOut(rr)));
  ring.visible = rr > 0;

  // Opening: the upper half lifts, tips back, and fades away
  const since = t - openT;
  const o = isFinite(openT) ? clamp01(since / LIFT_DUR) : 0;
  const lift = easeInOut(o);
  lidPivot.position.y = R + lift * 1.1;
  lidPivot.rotation.x = -0.35 * lift;
  lidMat.opacity = 1 - smooth(0.25, 1, o);
  planet.visible = o === 0;
  bowl.visible = o > 0;
  lidFade.value = 1 - smooth(0.04, 0.42, o);
  lid.castShadow = lidFade.value > 0.001;
  lid.visible = o > 0 && o < 1;

  // The projects drop in one after another and settle with a small rebound
  projects.forEach((p, i) => {
    const k = isFinite(openT) ? since - DROP_START - i * DROP_GAP : -1;
    if (k < 0) { p.mesh.visible = false; return; }
    p.mesh.visible = true;
    if (k < FALL) {
      const f = k / FALL;
      p.mesh.position.lerpVectors(p.from, p.rest, f);
      p.mesh.position.y = lerp(p.from.y, p.rest.y, f * f);   // falls, gathering speed
      p.mesh.scale.setScalar(Math.max(0.0001, smooth(0, 0.25, f)));
      // High up, its shadow would land far off to the side; it joins near the bowl
      p.mesh.castShadow = f > 0.75;
    } else {
      p.mesh.castShadow = true;
      const s = clamp01((k - FALL) / SETTLE);
      p.mesh.position.copy(p.rest);
      p.mesh.position.y += Math.sin(Math.PI * s) * 0.14 * (1 - s);
      p.mesh.scale.setScalar(1);
    }
  });

  // Once it holds them, the bowl turns slowly
  if (motionOK) vessel.rotation.y += dt * 0.1;
  projects.forEach((p, i) => { p.mesh.rotation.y = -Math.PI / 2 - vessel.rotation.y + (i - 1.5) * 0.18; });

  cue.ready(isFinite(openT) && since > HELD_AT - 0.2);

  // Camera: the fixed view, stepped back on tall screens, with a little parallax
  camera.position.copy(LOOK_AT).addScaledVector(VIEW_DIR, dist);
  if (motionOK) {
    const kk = 1 - Math.pow(0.02, dt);
    drift.x += (drift.tx - drift.x) * kk;
    drift.y += (drift.ty - drift.y) * kk;
    camera.position.x += drift.x * 0.25;
    camera.position.y += -drift.y * 0.14;
  }
  camera.lookAt(LOOK_AT);

  renderer.render(scene, camera);
}
animate();

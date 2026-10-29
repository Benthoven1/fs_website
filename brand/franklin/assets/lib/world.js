// world.js — the film's one 3D world: a clean, modern model of an
// eighteenth-century commons. A sage meadow by the Delaware, stylised trees,
// sand paths, and four stone plots on which Franklin's institutions are built
// one after the other, plus a fifth plot with one foundation shared. Every
// frame is a pure function of the film's time t (HyperFrames seeks frames out
// of order): parts arrive on a schedule that build.mjs writes from the
// narration's word timings.
//
// Surfaces are flat colours, never noise textures, so nothing shimmers in
// motion; the period is in the materials (walnut, oak, brass, pewter, leather,
// brick, slate) and in the archive's own documents, open on each lectern.
// Units are centimetres of a table model; y is up; the camera looks from the
// front right (+x, +z).
import * as THREE from "./three/three.module.min.js";
import { RoundedBoxGeometry } from "./three/RoundedBoxGeometry.js";

const SKY = "#EEF0EC";
const COL = {
  stone: "#E8E3D9", stoneDark: "#CFC7B8", walnut: "#7A5640", oak: "#B68C63", iron: "#45423F",
  brass: "#D2AE66", pewter: "#B9BFC3", leather: "#86523A", leatherRed: "#9C4B35", brick: "#B2664B",
  trim: "#F6F2EA", slate: "#646C76", copper: "#76A08C", ground: "#C8D2B4", sand: "#E6DDCB", water: "#AAC4CB",
  rose: "#9A5571", ghost: "#7E7468",
};
export const PLOTS = { library: [-160, -150], fire: [160, -150], hospital: [-160, 150], academy: [160, 150], shared: [640, 0] };
const DOCS = { library: "almanac", fire: "stove", hospital: "declaration", academy: "charter", shared: "constitution4" };

// ── easing and small helpers ───────────────────────────────────────────────
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const inOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const outCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const outBack = (x) => { x = clamp01(x); const c = 1.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const span = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a)));
// a seeded hash: every tree and binding is the same in every frame
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const mats = {};
// metals get a little emissive lift: there is no environment map to reflect
const mat = (color, rough = 0.6, { metal = 0, flat = false } = {}) => mats[`${color}/${rough}/${metal}/${flat}`] ||= new THREE.MeshStandardMaterial({
  color, roughness: rough, metalness: metal, flatShading: flat, emissive: metal ? color : "#000000", emissiveIntensity: metal ? 0.18 : 0,
});
const BRASS = () => mat(COL.brass, 0.35, { metal: 0.25 });
const PEWTER = () => mat(COL.pewter, 0.35, { metal: 0.25 });
const IRON = () => mat(COL.iron, 0.5, { metal: 0.15 });
const EDGE = new THREE.LineBasicMaterial({ color: "#3B332F", transparent: true, opacity: 0.22 });
const GHOST = new THREE.LineDashedMaterial({ color: COL.ghost, transparent: true, opacity: 0, dashSize: 3, gapSize: 2.2 });
const GHOST_START = GHOST.clone(); // the plots' outlines, drawn from the first frame

// A solid with a fine drawn outline (from the sharp shape, so rounded boxes
// still read with crisp corners, as in a technical drawing)
function solid(geo, sharp, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(sharp || geo, 30), EDGE));
  return g;
}
function box(w, h, d, material, { r = 1.4 } = {}) {
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)); geo.translate(0, h / 2, 0);
  const sharp = new THREE.BoxGeometry(w, h, d); sharp.translate(0, h / 2, 0);
  return solid(geo, sharp, material);
}
function cyl(rTop, rBot, h, material, { seg = 36 } = {}) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg); geo.translate(0, h / 2, 0);
  return solid(geo, null, material);
}
function roof(w, d, h, material) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
  return solid(geo, null, material);
}
const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };
const group = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => g.add(k)); return g; };

// ── the world ──────────────────────────────────────────────────────────────
export async function createWorld(canvas, labelLayer, S) {
  const W = canvas.width, H = canvas.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // the archive's documents, laid open on each plot's lectern
  const loader = new THREE.TextureLoader();
  const docs = Object.fromEntries(await Promise.all(Object.entries(DOCS).map(async ([plot, name]) => {
    const t = await loader.loadAsync(new URL(`../img/${name}.jpg`, import.meta.url).href);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return [plot, t];
  })));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 2000, 6000);

  // a clear morning: warm sun from the upper left, open sky, a green bounce
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#C3CCAA", 1.45));
  const sun = new THREE.DirectionalLight("#FFF6EA", 2.0);
  sun.position.set(-420, 1500, 620); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -1000, right: 1000, top: 1000, bottom: -1000, near: 100, far: 3400 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
  sun.target.position.set(240, 0, 0); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#E4ECF8", 0.35); fill.position.set(700, 380, -300); scene.add(fill);

  // the land: a sage meadow, flat around the commons, easing into low hills
  {
    const geo = new THREE.PlaneGeometry(10000, 10000, 160, 160); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const d = Math.max(Math.abs(x - 240) - 800, Math.abs(z) - 700, 0);
      const n = 0.6 + 0.4 * Math.sin(x * 0.0018 + 1.3) * Math.cos(z * 0.0015);
      p.setY(i, smooth(d / 1400) * 160 * n);
    }
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, mat(COL.ground, 0.95)); land.receiveShadow = true; scene.add(land);
  }
  // the Delaware, a calm band behind the commons
  {
    const river = new THREE.Mesh(new THREE.PlaneGeometry(9000, 140), mat(COL.water, 0.4));
    river.rotation.x = -Math.PI / 2; river.position.set(0, 0.6, -560); river.receiveShadow = true; scene.add(river);
  }
  // sand paths: a cross between the four plots and a lane to the fifth
  {
    const lane = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), mat(COL.sand, 0.9)); m.position.set(x, 0.4, z); m.receiveShadow = true; scene.add(m); };
    lane(44, 900, 0, 40); lane(1500, 42, 340, 0);
  }
  // trees: stylised, faceted crowns in a few greens
  {
    const greens = ["#7F9D68", "#6E8F5C", "#8FAA72", "#759566"];
    const bark = mat(COL.walnut, 0.8);
    let placed = 0;
    for (let i = 0; placed < 70 && i < 3000; i++) {
      const x = -900 + hash(i * 3.1) * 2500, z = -470 + hash(i * 5.7) * 1250;
      // keep the plots clear, and the ground in front of them, where the camera looks in
      const nearPlot = Object.values(PLOTS).some(([px, pz]) => x - px > -(px > 500 ? 260 : 190) && x - px < (px > 500 ? 520 : 420) && z - pz > -190 && z - pz < 480);
      if (nearPlot || (Math.abs(x) < 60 && z > -430 && z < 520) || (Math.abs(z) < 60 && x > -60 && x < 1100) || z < -470) continue;
      const s = 0.75 + hash(i * 9.3) * 0.6, col = greens[Math.floor(hash(i * 2.9) * greens.length)];
      const t = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * s, 3 * s, 24 * s, 8), bark); tr.position.y = 12 * s;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(19 * s, 1), mat(col, 0.85, { flat: true })); crown.position.y = 36 * s; crown.scale.y = 1.15;
      [tr, crown].forEach((m) => { m.castShadow = true; m.receiveShadow = true; t.add(m); });
      t.position.set(x, 0, z); t.rotation.y = hash(i) * 6; scene.add(t); placed++;
    }
  }

  const camera = new THREE.PerspectiveCamera(34, W / H, 5, 14000);

  // ── parts ────────────────────────────────────────────────────────────────
  // Every part has a home and arrives into it along one direction; until it
  // arrives (once the blueprints are up) its dashed outline stands in its place
  const parts = [], anchors = {};
  const DIRS = { up: [0, 1, 0], down: [0, -1, 0], left: [-1, 0, 0], right: [1, 0, 0], back: [0, 0, -1], front: [0, 0, 1] };
  function part(plot, obj, { order, from = "up", dist, ghostFrom = "ghosts", name } = {}) {
    const [cx, cz] = PLOTS[plot];
    const home = obj.position.clone().add(new THREE.Vector3(cx, 0, cz));
    obj.position.copy(home); scene.add(obj);
    const ghost = new THREE.Group();
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      if (o.isLineSegments && o.material === EDGE) {
        const l = new THREE.LineSegments(o.geometry, ghostFrom === "start" ? GHOST_START : GHOST);
        l.computeLineDistances(); l.applyMatrix4(o.matrixWorld); ghost.add(l);
      }
    });
    scene.add(ghost);
    const b = new THREE.Box3().setFromObject(obj), h = b.max.y - b.min.y;
    const d = dist ?? (from === "down" ? h + 6 : from === "up" ? 520 : 640);
    const p = { plot, obj, ghost, home, order, from, d, at: Infinity, dur: from === "down" ? 0.9 : 0.75 };
    parts.push(p);
    if (name) anchors[`${plot}.${name}`] = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
    return p;
  }

  // A plot's foundation: a stone slab, and along its back what every
  // institution needs under it: rules (a walnut lectern with the articles
  // open on it), members (an oak card cabinet) and money (an iron-strapped chest)
  const SLAB = 14;
  function foundation(plot, { w = 230, d = 220, s = 1, hopper = false } = {}) {
    part(plot, box(w, SLAB, d, mat(COL.stone, 0.75), { r: 3 }), { order: 0, from: "down", ghostFrom: "start", name: "slab" });
    const bz = -d / 2 + 38 * s;
    const desk = at(box(36 * s, 2.5 * s, 40 * s, mat(COL.walnut, 0.6)), 0, 22 * s, 0); desk.rotation.x = 0.45;
    const page = new THREE.Mesh(new THREE.PlaneGeometry(30 * s, 34 * s), new THREE.MeshStandardMaterial({ map: docs[plot], roughness: 0.85 }));
    page.rotation.x = -Math.PI / 2 + 0.45; page.position.set(0, 25.6 * s, 0.6 * s);
    const lect = group(box(30 * s, 22 * s, 26 * s, mat(COL.walnut, 0.6)), desk, page);
    part(plot, at(lect, -w / 2 + 40 * s, SLAB, bz), { order: 1, from: "left", name: "rules" });
    const cab = group(box(34 * s, 40 * s, 30 * s, mat(COL.oak, 0.6)));
    for (const y of [9, 22, 33]) {
      cab.add(at(box(30 * s, 0.6, 0.8, mat(COL.walnut)), 0, (y + 4) * s, 15 * s));
      cab.add(at(box(8 * s, 2 * s, 2 * s, BRASS(), { r: 0.6 }), 0, y * s, 15.4 * s));
    }
    part(plot, at(cab, 0, SLAB, bz), { order: 2, from: "back", name: "members" });
    const chest = group(box(42 * s, 26 * s, 32 * s, mat(COL.oak, 0.6)), at(box(44 * s, 8 * s, 34 * s, mat(COL.oak, 0.6)), 0, 26 * s, 0));
    for (const x of [-14, 14]) chest.add(at(box(4 * s, 34.4 * s, 34.4 * s, IRON(), { r: 0.6 }), x * s, -0.2, 0));
    chest.add(at(box(6 * s, 9 * s, 2 * s, BRASS(), { r: 0.6 }), 0, 19 * s, 17.4 * s));
    if (hopper) chest.add(at(cyl(13, 7, 9, BRASS()), 0, 34 * s, 0));
    part(plot, at(chest, w / 2 - 40 * s, SLAB, bz), { order: 3, from: "right", name: "money" });
    return { bz };
  }

  // ── library: subscriptions run into the chest; the chest fills the shelves
  const lib = {};
  {
    const P = "library";
    const f = foundation(P, { hopper: true });
    const bc = group(), CW = 72, CH = 94, CD = 24, wood = mat(COL.walnut, 0.6);
    bc.add(at(box(4, CH, CD, wood), -CW / 2 + 2, 0, 0), at(box(4, CH, CD, wood), CW / 2 - 2, 0, 0),
      at(box(CW, CH, 3, wood), 0, 0, -CD / 2 + 1.5), at(box(CW + 6, 5, CD + 3, wood), 0, CH, 0));
    const shelfY = [0, 31, 62];
    for (const y of shelfY) bc.add(at(box(CW, 4, CD, wood), 0, y, 0));
    part(P, at(bc, -62, SLAB, 40), { order: 4, from: "back", name: "case" });
    // the collection, in the library's blue with calf and morocco among it
    const BIND = ["#4D6D96", "#5A7AA3", "#3F5F88", "#8B5A3C", "#6D3A33", "#4F6B57", "#6A86AB"];
    lib.books = [];
    shelfY.forEach((y, s) => {
      let x = -CW / 2 + 5;
      for (let n = 0; x < CW / 2 - 8; n++) {
        const bw = 4 + hash(s * 17 + n) * 2.6, bh = 19 + hash(s * 31 + n * 3) * 7;
        const b = at(box(bw, bh, 17, mat(BIND[Math.floor(hash(s * 7 + n * 5) * BIND.length)], 0.65), { r: 0.5 }), -62 + x + bw / 2 + PLOTS[P][0], SLAB + y + 4, 41 + PLOTS[P][1]);
        b.visible = false; scene.add(b);
        lib.books.push({ obj: b, home: b.position.clone() });
        x += bw + 0.6;
      }
    });
    const TX = 46, TZ = 46;
    part(P, at(box(112, 5, 76, mat(COL.oak, 0.6), { r: 2 }), TX, SLAB, TZ), { order: 5, from: "front", name: "tray" });
    lib.stacks = [];
    for (let c = 0; c < 10; c++) for (let r = 0; r < 5; r++)
      lib.stacks.push(part(P, at(cyl(4.4, 4.4, 6.4, BRASS(), { seg: 24 }), TX - 45 + c * 10, SLAB + 5, TZ - 26 + r * 13), { order: 6 + (c * 5 + r) * 0.02, from: "up", dist: 260 }));
    lib.mouth = new THREE.Vector3(230 / 2 - 40 + PLOTS[P][0], SLAB + 34 + 9 + 2, f.bz + PLOTS[P][1]);
  }

  // ── fire company: thirty leather buckets on the company's rack ───────────
  {
    const P = "fire";
    foundation(P);
    const rack = group(), RW = 168, BARS = [36, 66, 96], oak = mat(COL.oak, 0.6);
    rack.add(at(box(7, 108, 7, oak), -RW / 2, 0, 0), at(box(7, 108, 7, oak), RW / 2, 0, 0), at(box(RW + 16, 6, 12, oak), 0, 0, 0));
    for (const y of BARS) { const bar = cyl(1.6, 1.6, RW, IRON(), { seg: 12 }); bar.rotation.z = Math.PI / 2; bar.position.set(RW / 2, y, 0); rack.add(bar); }
    part(P, at(rack, 0, SLAB, 40), { order: 4, from: "down", name: "rack" });
    BARS.forEach((y, row) => {
      for (let i = 0; i < 10; i++) {
        const lm = mat(hash(row * 10 + i) > 0.5 ? COL.leather : COL.leatherRed, 0.7);
        const bk = group(cyl(5.4, 4.2, 13, lm, { seg: 20 }), at(cyl(5.6, 5.6, 1.4, mat("#EFE6D2", 0.7), { seg: 20 }), 0, 7, 0));
        const handle = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 6, 18, Math.PI), IRON()); handle.position.y = 13; handle.castShadow = true; bk.add(handle);
        part(P, at(bk, -RW / 2 + 12 + i * 16, SLAB + y - 17.5, 40), { order: 5 + (row * 10 + i) * 0.04, from: "up", dist: 300 });
      }
    });
    const bell = group(box(6, 130, 6, oak), at(box(26, 5, 6, oak), 4, 126, 0), at(cyl(5, 9, 13, BRASS()), 12, 110, 0));
    part(P, at(bell, -100, SLAB, 82), { order: 4.5, from: "up", name: "bell" });
  }

  // ── hospital: the matching grant ─────────────────────────────────────────
  const hosp = {};
  {
    const P = "hospital";
    foundation(P);
    const COIN = 4, N = 20, R = 15, MARK = 4 + N * COIN, BAR = MARK + 44, HELD = 34, oak = mat(COL.oak, 0.6);
    const col = () => group(cyl(R + 3, R + 3, 4, mat(COL.stoneDark, 0.7)), at(box(6, BAR + 6, 6, oak), 0, 0, -R - 8), at(box(6, 6, R + 12, oak), 0, BAR, -R / 2 - 2));
    const AX = -48, DX = 48, Z = 38;
    part(P, at(col(), AX, SLAB, Z), { order: 4, from: "left", name: "assemblyCol" });
    part(P, at(col(), DX, SLAB, Z), { order: 4.4, from: "right", name: "donorCol" });
    const rod = cyl(1.4, 1.4, DX - AX, IRON(), { seg: 12 }); rod.rotation.z = Math.PI / 2;
    part(P, at(group(rod), DX, SLAB + BAR + 2.5, Z - R - 8), { order: 5, from: "back" });
    hosp.paddle = part(P, at(box(R + 8, 2.4, 6, IRON(), { r: 0.8 }), DX - 2, SLAB + MARK + 1, Z), { order: 5.2, from: "right", name: "mark" });
    // the Assembly's £2,000 in pewter, hung up until the donors match it
    const held = group();
    for (let n = 0; n < N; n++) held.add(at(cyl(R, R, COIN - 0.25, PEWTER(), { seg: 36 }), 0, 4 + n * COIN, 0));
    held.add(at(cyl(1, 1, BAR - MARK - HELD + 2, IRON(), { seg: 8 }), 0, MARK, 0));
    hosp.held = part(P, at(held, AX, SLAB + HELD, Z), { order: 5.6, from: "up", name: "held" });
    hosp.coins = [];
    for (let n = 0; n < N; n++) {
      const c = at(cyl(R, R, COIN - 0.25, BRASS(), { seg: 36 }), DX + PLOTS[P][0], SLAB + 4 + n * COIN, Z + PLOTS[P][1]);
      c.visible = false; scene.add(c); hosp.coins.push({ obj: c, home: c.position.clone() });
    }
    hosp.HELD = HELD;
    anchors["hospital.donors"] = new THREE.Vector3(DX + PLOTS[P][0], SLAB + MARK + 10, Z + PLOTS[P][1]);
    anchors["hospital.assembly"] = new THREE.Vector3(AX + PLOTS[P][0], SLAB + HELD + MARK + 10, Z + PLOTS[P][1]);
  }

  // ── academy: a Georgian hall in brick, with a portico and a cupola ───────
  {
    const P = "academy", Z = 30, BW = 150, trim = mat(COL.trim, 0.6);
    foundation(P);
    part(P, at(box(BW, 8, 80, mat(COL.stoneDark, 0.75), { r: 1 }), 0, SLAB, Z), { order: 4, from: "down" });
    part(P, at(box(BW - 20, 50, 56, mat(COL.brick, 0.8), { r: 0.8 }), 0, SLAB + 8, Z - 10), { order: 4.4, from: "down", name: "hall" });
    for (let i = 0; i < 6; i++) part(P, at(cyl(3.4, 4, 46, trim, { seg: 18 }), -50 + i * 20, SLAB + 8, Z + 24), { order: 4.8 + i * 0.08, from: "up", dist: 240 });
    part(P, at(box(BW - 4, 7, 74, trim, { r: 1 }), 0, SLAB + 56, Z), { order: 5.5, from: "up", dist: 260 });
    part(P, at(roof(BW, 72, 26, mat(COL.slate, 0.7)), 0, SLAB + 63, Z), { order: 5.8, from: "up", dist: 260, name: "roof" });
    part(P, at(group(box(16, 14, 16, trim), at(roof(18, 18, 10, mat(COL.copper, 0.6)), 0, 14, 0)), 0, SLAB + 80, Z), { order: 6.1, from: "up", dist: 300 });
  }

  // ── the shared foundation: services once, sockets for projects ──────────
  const shared = {};
  {
    const P = "shared";
    foundation(P, { w: 330, d: 230, s: 1.35 });
    part(P, at(box(300, 2, 6, BRASS(), { r: 0.8 }), 0, SLAB, -6), { order: 4, from: "left", name: "bus" });
    const XS = [-117, -39, 39, 117];
    XS.forEach((x, i) => {
      part(P, at(box(52, 1.6, 52, mat(COL.stoneDark, 0.8), { r: 1 }), x, SLAB, 50), { order: 4.4 + i * 0.1, from: "down" });
      part(P, at(box(4, 1.6, 50, BRASS(), { r: 0.6 }), x, SLAB, 15), { order: 4.4 + i * 0.1, from: "down" });
    });
    // three projects already hosted
    const house = (h, wall, top) => group(box(40, h, 40, wall), at(roof(42, 42, 14, mat(top, 0.7)), 0, h, 0));
    [[XS[0], house(32, mat(COL.brick, 0.8), COL.slate)], [XS[1], house(26, mat(COL.oak, 0.6), COL.copper)], [XS[2], house(38, mat(COL.trim, 0.6), COL.slate)]]
      .forEach(([x, g], i) => part(P, at(g, x, SLAB + 1.6, 50), { order: 5 + i * 0.2, from: "up", dist: 300 }));
    shared.newp = part(P, at(house(36, mat(COL.trim, 0.6), COL.rose), XS[3], SLAB + 1.6, 50), { order: 99, from: "up", dist: 360, name: "new" });
  }

  // marks for "rules, members, money" on all four plots at once
  const rings = [];
  for (const plot of ["library", "fire", "hospital", "academy"]) for (const what of ["rules", "members", "money"]) {
    const a = anchors[`${plot}.${what}`];
    const r = new THREE.Mesh(new THREE.TorusGeometry(30, 1.8, 8, 64), new THREE.MeshStandardMaterial({ color: "#C27A55", roughness: 0.4, emissive: "#C27A55", emissiveIntensity: 0.35 }));
    r.rotation.x = -Math.PI / 2; r.position.set(a.x, SLAB + 1.2, a.z); r.visible = false; scene.add(r);
    rings.push({ obj: r, what });
  }

  // ── schedule ─────────────────────────────────────────────────────────────
  for (const [plot, [t0, t1]] of Object.entries(S.build)) {
    const ps = parts.filter((p) => p.plot === plot && p.order < 99);
    const max = Math.max(...ps.map((p) => p.order));
    ps.forEach((p) => (p.at = t0 + (t1 - t0) * (p.order / max)));
  }
  shared.newp.at = S.events.nowNew;

  // ── camera ───────────────────────────────────────────────────────────────
  const DIR = new THREE.Vector3(0.62, 0.62, 1).normalize();
  const HIGH = new THREE.Vector3(0.45, 1.05, 1).normalize();
  function shot(s) {
    const [kind, plot, what] = s.split(":");
    if (kind === "wide") return { target: new THREE.Vector3(0, 330, 20), dist: 2700, dir: HIGH.clone() };
    if (kind === "all4") return { target: new THREE.Vector3(0, 120, 20), dist: 2350, dir: HIGH.clone() };
    const [cx, cz] = PLOTS[plot];
    if (kind === "plot") return { target: new THREE.Vector3(cx, 40, cz + 6), dist: plot === "shared" ? 1250 : 1000, dir: DIR.clone() };
    if (kind === "mid") return { target: new THREE.Vector3(cx, 40, cz + 6), dist: 760, dir: DIR.clone() };
    if (kind === "close") return { target: anchors[`${plot}.${what}`].clone().add(new THREE.Vector3(0, -8, 0)), dist: 560, dir: DIR.clone() };
    throw new Error("shot " + s);
  }
  const cams = S.cam.map((c) => ({ ...c, s: shot(c.shot) }));
  function cameraAt(t) {
    let cur = { target: cams[0].s.target.clone(), dist: cams[0].s.dist, dir: cams[0].s.dir.clone() };
    for (const c of cams.slice(1)) {
      if (t <= c.t) break;
      const e = inOut((t - c.t) / c.dur);
      cur = { target: cur.target.clone().lerp(c.s.target, e), dist: Math.exp(Math.log(cur.dist) + (Math.log(c.s.dist) - Math.log(cur.dist)) * e), dir: cur.dir.clone().lerp(c.s.dir, e).normalize() };
    }
    const drift = cur.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.06 * Math.sin(t * 0.07));
    camera.position.copy(cur.target).addScaledVector(drift, cur.dist);
    camera.lookAt(cur.target);
  }

  // ── labels: names on the model, projected to the screen ──────────────────
  const labels = (S.labels || []).map((l) => {
    const el = document.createElement("div");
    el.className = "wl";
    el.innerHTML = `<span class="wl-t">${l.text}</span><i class="wl-l"></i><b class="wl-d"></b>`;
    labelLayer.appendChild(el);
    if (!anchors[l.anchor]) throw new Error("no anchor " + l.anchor);
    return { ...l, el, a: anchors[l.anchor] };
  });
  const v = new THREE.Vector3();

  // ── a frame ──────────────────────────────────────────────────────────────
  function renderAt(t) {
    GHOST.opacity = 0.75 * smooth((t - S.ghosts) / 0.8);
    GHOST_START.opacity = Math.max(0.75 * smooth((t - 0.2) / 0.8), GHOST.opacity);
    for (const p of parts) {
      const k = (t - p.at) / p.dur, arrived = t >= p.at;
      p.obj.visible = arrived;
      p.ghost.visible = !arrived || k < 0.6;
      if (!arrived) continue;
      const e = p.from === "down" ? outCubic(k) : outBack(k), d = DIRS[p.from];
      p.obj.position.set(p.home.x + d[0] * p.d * (1 - e), p.home.y + d[1] * p.d * (1 - e), p.home.z + d[2] * p.d * (1 - e));
    }
    // library: each stack lifts, rides to the hopper and drops in; then the books
    {
      const [c0, c1] = S.events.libCoins;
      lib.stacks.forEach((p, i) => {
        if (t < p.at + p.dur) return;
        const u = (t - (c0 + (c1 - c0) * (i / lib.stacks.length))) / 0.85;
        if (u <= 0) return;
        if (u >= 1) { p.obj.visible = false; return; }
        const e = inOut(Math.min(1, u / 0.78));
        const pos = p.home.clone().lerp(lib.mouth, e); pos.y += Math.sin(Math.PI * e) * 46;
        if (u > 0.78) pos.y = lib.mouth.y - 14 * ((u - 0.78) / 0.22);
        p.obj.position.copy(pos);
      });
      const [b0, b1] = S.events.libBooks;
      lib.books.forEach((b, i) => {
        const k = (t - (b0 + (b1 - b0) * (i / lib.books.length))) / 0.5;
        b.obj.visible = k > 0; b.obj.position.copy(b.home); b.obj.position.z -= 30 * (1 - outCubic(k));
      });
    }
    // hospital: the donors' coins stack up; at the mark the paddle lifts and the
    // Assembly's coins drop onto their platform
    {
      const [d0, d1] = S.events.hospDonors, tt = S.events.hospTrip;
      hosp.coins.forEach((c, n) => {
        const k = (t - (d0 + (d1 - d0) * (n / hosp.coins.length))) / 0.3;
        c.obj.visible = k > 0; c.obj.position.copy(c.home); c.obj.position.y += 60 * Math.pow(1 - clamp01(k), 2);
      });
      if (t >= hosp.paddle.at + hosp.paddle.dur) hosp.paddle.obj.position.y = hosp.paddle.home.y + 6 * outCubic((t - tt) / 0.15);
      if (t >= hosp.held.at + hosp.held.dur) {
        const k = clamp01((t - tt - 0.15) / 0.34);
        hosp.held.obj.position.y = hosp.held.home.y - hosp.HELD * k * k;
        hosp.held.obj.children[hosp.held.obj.children.length - 1].visible = k === 0;
      }
    }
    for (const r of rings) {
      const k = (t - S.events.turn[r.what]) / 0.45;
      r.obj.visible = k > 0 && t < S.events.turnEnd;
      const s = 0.6 + 0.4 * outBack(k); r.obj.scale.set(s, s, s);
    }
    cameraAt(t);
    renderer.render(scene, camera);
    for (const l of labels) {
      const k = Math.min(span(t, l.t0, l.t0 + 0.3), 1 - span(t, l.t1 - 0.25, l.t1));
      if (k <= 0) { l.el.style.opacity = 0; continue; }
      v.copy(l.a).project(camera);
      l.el.style.opacity = k;
      l.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
    }
  }
  return { renderAt, anchors };
}

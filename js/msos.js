// msos.js — the MulviumSOS page's figures (the scene is js/fsos.js, the text
// motion js/fiscal.js). Two are M.SOS's own, brought from its web app
// (Benthoven1/MulviumSOS): the workspace canvas, where work flows from the
// blueprint to the agents and on to review, and an agent at work, its steps
// and its draft arriving as it writes. Then the market's figures count up,
// and the operating-system figure lights each layer's counterpart.

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));
function whenSeen(el, fn, threshold = 0.25) {
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); fn(); } }, { threshold });
  io.observe(el);
}
function inView(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
}

// ── The workspace canvas ────────────────────────────────────────────────────
// As in M.SOS's workspace: the idea and the memory feed the blueprint, which
// sends work to each agent; finished work goes to the lead's review, then to
// approval. Working agents glow and their lines flow; work waiting on a
// person turns the lines toward review orange.
{
  const demo = document.getElementById("cv-demo");
  const world = demo && demo.querySelector(".cv-world");
  if (world) {
    const W = 1380, H = 306, AW = 222, AH = 86, SW = 232, SH = 76;
    const SIDES = [
      { id: "idea", x: 0, y: 36, title: "The founder’s idea", note: "From the first consultation", tone: "star", out: true },
      { id: "memory", x: 0, y: 194, title: "Institutional memory", note: "Sourced, and growing", tone: "sage", out: true },
      { id: "plan", x: 300, y: 115, title: "The blueprint", note: "Mission, programs, budget, timeline", tone: "slate", out: true, in: true },
      { id: "review", x: 1148, y: 36, title: "The lead’s review", note: "", tone: "clay", in: true },
      { id: "approve", x: 1148, y: 194, title: "Approvals", note: "The founder decides; the sponsor signs", tone: "rose", in: true },
    ];
    const AGENTS = [
      ["Research", "Reading on festival audiences"],
      ["Grants", "Drafting a letter of inquiry"],
      ["Budget", "Building three scenarios"],
      ["Programs", "Sequencing five days of concerts"],
      ["Press", "Writing the announcement"],
      ["Awards", "Shortlisting festival prizes"],
    ].map(([title, task], i) => ({
      id: "a" + i, title, task, state: "queued",
      x: 610 + Math.floor(i / 3) * 268, y: (i % 3) * 110,
    }));
    const LABEL = { queued: "Up next", working: null, you: "Waiting on you: review", done: "Finished" };
    const DOT = { queued: "st-queued", working: "st-working", you: "st-you", done: "st-done" };

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "cv-edges");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("aria-hidden", "true");
    world.style.width = W + "px";
    world.style.height = H + "px";
    world.appendChild(svg);

    // An orthogonal path through the waypoints, with rounded corners (as in M.SOS)
    function route(points, r = 12) {
      let d = `M ${points[0][0]} ${points[0][1]}`;
      for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i - 1], [cx, cy] = points[i], [nx, ny] = points[i + 1];
        const inLen = Math.hypot(cx - px, cy - py), outLen = Math.hypot(nx - cx, ny - cy);
        const k = Math.min(r, inLen / 2, outLen / 2);
        const ax = cx - ((cx - px) / (inLen || 1)) * k, ay = cy - ((cy - py) / (inLen || 1)) * k;
        const bx = cx + ((nx - cx) / (outLen || 1)) * k, by = cy + ((ny - cy) / (outLen || 1)) * k;
        d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
      }
      const last = points[points.length - 1];
      return `${d} L ${last[0]} ${last[1]}`;
    }
    const curve = (sx, sy, tx, ty) => {
      const dx = Math.max(40, (tx - sx) / 2);
      return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
    };
    const edge = (d, cls = "") => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "cv-edge " + cls);
      svg.appendChild(p);
      return p;
    };

    const side = Object.fromEntries(SIDES.map((s) => [s.id, s]));
    const mid = (n, h) => n.y + h / 2;
    edge(curve(SW, mid(side.idea, SH), side.plan.x, mid(side.plan, SH)));
    edge(curve(SW, mid(side.memory, SH), side.plan.x, mid(side.plan, SH)));
    edge(route([[side.review.x + SW / 2, side.review.y + SH], [side.approve.x + SW / 2, side.approve.y]]), "dashed");
    const trunkIn = 572, trunkOut = 1110;
    AGENTS.forEach((a) => {
      const sy = mid(side.plan, SH), ay = mid(a, AH);
      const pts = a.x === 610
        ? [[side.plan.x + SW, sy], [trunkIn, sy], [trunkIn, ay], [a.x, ay]]
        : [[side.plan.x + SW, sy], [trunkIn, sy], [trunkIn, 98], [a.x - 23, 98], [a.x - 23, ay], [a.x, ay]];
      a.inEdge = edge(route(pts));
      const ox = a.x + AW, ry = mid(side.review, SH);
      const outPts = a.x === 610
        ? [[ox, ay], [ox + 23, ay], [ox + 23, a.y >= 110 ? 208 : 98], [trunkOut, a.y >= 110 ? 208 : 98], [trunkOut, ry], [side.review.x, ry]]
        : [[ox, ay], [trunkOut, ay], [trunkOut, ry], [side.review.x, ry]];
      a.outEdge = edge(route(outPts), "tone-you is-off");
    });

    const node = (n, kind) => {
      const el = document.createElement("div");
      el.className = "cv-node " + (kind === "agent" ? "cv-agent" : "cv-side kind-" + n.id);
      Object.assign(el.style, { left: n.x + "px", top: n.y + "px", width: (kind === "agent" ? AW : SW) + "px", height: (kind === "agent" ? AH : SH) + "px" });
      const icon = kind === "agent"
        ? `<span class="cv-icon">${n.title.slice(0, 2).toUpperCase()}</span>`
        : `<span class="cv-icon side"><span class="sphere sphere-${n.tone}"></span></span>`;
      const handles = (n.in || kind === "agent" ? '<span class="cv-handle in"></span>' : "") + (n.out || kind === "agent" ? '<span class="cv-handle out"></span>' : "");
      el.innerHTML = `${handles}${icon}<span class="cv-body"><span class="cv-title"><span class="cv-title-text">${n.title}</span></span><span class="cv-status">${kind === "agent" ? '<span class="cv-dot st-queued"></span>' : ""}<span class="cv-status-text">${kind === "agent" ? "Up next" : n.note}</span></span></span>`;
      world.appendChild(el);
      return el;
    };
    SIDES.forEach((s) => { s.el = node(s, "side"); });
    AGENTS.forEach((a) => { a.el = node(a, "agent"); });
    const reviewNote = side.review.el.querySelector(".cv-status-text");
    const nWorking = demo.querySelector(".cv-n-working"), nYou = demo.querySelector(".cv-n-you");

    function set(a, state) {
      a.state = state;
      a.el.classList.toggle("working", state === "working");
      a.el.querySelector(".cv-icon").classList.toggle("working", state === "working");
      a.el.querySelector(".cv-dot").className = "cv-dot " + DOT[state];
      a.el.querySelector(".cv-status-text").textContent = LABEL[state] || a.task;
      a.inEdge.classList.toggle("tone-working", state === "working");
      a.outEdge.classList.toggle("is-off", state !== "you");
      const working = AGENTS.filter((x) => x.state === "working").length;
      const you = AGENTS.filter((x) => x.state === "you").length;
      nWorking.textContent = working;
      nYou.textContent = you;
      reviewNote.textContent = you ? `${you} draft${you > 1 ? "s" : ""} to review` : "Nothing waiting";
      side.review.el.classList.toggle("is-you", you > 0);
    }

    // Fit the world to the figure's width, but never so small it can't be
    // read: on a phone the canvas scrolls sideways instead
    const canvas = demo.querySelector(".cv-canvas");
    function fit() {
      const pad = 28, k = Math.max(0.56, Math.min(1, (canvas.clientWidth - pad * 2) / W));
      world.style.transform = `translate(${pad}px, ${pad + 26}px) scale(${k})`;
      canvas.style.height = H * k + pad * 2 + 26 + "px";
    }
    addEventListener("resize", fit);
    fit();
    requestAnimationFrame(() => world.classList.add("ready"));

    // The work: each agent takes its task, drafts, waits on review, finishes;
    // then the round begins again
    const order = [0, 3, 1, 4, 2, 5];
    async function round() {
      AGENTS.forEach((a) => set(a, "queued"));
      await wait(900);
      const runs = order.map(async (i, k) => {
        const a = AGENTS[i];
        await wait(700 * k + 300);
        set(a, "working");
        await wait(3200 + (i % 3) * 900);
        set(a, "you");
        await wait(2600 + k * 350);
        set(a, "done");
      });
      await Promise.all(runs);
      await wait(2600);
    }
    if (still) {
      [0, 3].forEach((i) => set(AGENTS[i], "working"));
      [1].forEach((i) => set(AGENTS[i], "you"));
      [2, 5].forEach((i) => set(AGENTS[i], "done"));
    } else {
      whenSeen(demo, async () => {
        for (;;) {
          while (document.hidden || !inView(demo)) await wait(600);
          await round();
        }
      }, 0.3);
    }
  }
}

// ── An agent at work ────────────────────────────────────────────────────────
// As in M.SOS: the steps it takes, then the draft as it writes it, with a
// caret; then it stops and waits for a person
{
  const demo = document.getElementById("lw-demo");
  if (demo) {
    const doing = demo.querySelector(".lw-doing");
    const steps = demo.querySelector(".live-steps");
    const text = demo.querySelector(".lw-text");
    const review = demo.querySelector(".lw-review");
    const state = demo.querySelector(".lw-state");
    const approve = demo.querySelector(".lw-approve"), back = demo.querySelector(".lw-back");
    const STEPS = [
      ["is reading the blueprint", "Read the blueprint and the festival’s budget"],
      ["is searching for funders", "Found foundations that fund music festivals and education"],
      ["is checking the guidelines", "Checked one foundation’s deadline and limits"],
      ["is drafting the letter", "Began the letter"],
    ];
    const DRAFT = "The Beethoven Bicentennial Festival asks for the Foundation’s support of five days of concerts and conversation in 2027, the 200th anniversary of Beethoven’s death. Solo, chamber, vocal, and orchestral programs will be open to the town’s students without charge, and every talk will be filmed and shared. [1]";
    const STATE0 = state.innerHTML;
    let decided = null;

    async function run() {
      steps.replaceChildren();
      text.textContent = "";
      review.hidden = true;
      state.innerHTML = STATE0;
      approve.disabled = back.disabled = false;
      demo.classList.remove("is-waiting", "is-done");
      for (const [now, done] of STEPS) {
        doing.textContent = now;
        await wait(1100);
        const li = document.createElement("li");
        li.textContent = done;
        steps.appendChild(li);
      }
      const caret = document.createElement("span");
      caret.className = "caret";
      caret.setAttribute("aria-hidden", "true");
      text.appendChild(caret);
      for (let i = 0; i <= DRAFT.length; i += 3) {
        caret.before(DRAFT.slice(text.textContent.length, i));
        await wait(28);
      }
      caret.before(DRAFT.slice(text.textContent.length));
      caret.remove();
      doing.textContent = "has stopped, and is waiting for a person";
      demo.classList.add("is-waiting");
      review.hidden = false;
      await new Promise((r) => { decided = r; });
      await wait(4200);
    }
    const decide = (ok) => {
      if (!decided) return;
      approve.disabled = back.disabled = true;
      demo.classList.remove("is-waiting");
      demo.classList.add("is-done");
      state.innerHTML = ok
        ? '<span class="cv-key st-done" aria-hidden="true"></span>Approved. A person sends it.'
        : '<span class="cv-key st-working" aria-hidden="true"></span>Sent back with a note; Grants revises it.';
      doing.textContent = ok ? "is finished" : "is revising";
      const r = decided; decided = null; r();
    };
    approve.addEventListener("click", () => decide(true));
    back.addEventListener("click", () => decide(false));
    whenSeen(demo, async () => {
      for (;;) {
        while (document.hidden || !inView(demo)) await wait(600);
        await run();
      }
    }, 0.4);
  }
}

// ── The market's figures count up as they arrive ───────────────────────────
document.querySelectorAll(".msos-stats strong[data-count]").forEach((el) => {
  const to = parseFloat(el.dataset.count), dec = String(el.dataset.count).includes(".") ? 1 : 0;
  const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
  const fmt = (v) => pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  if (still) return;
  el.textContent = fmt(0);
  whenSeen(el, () => {
    const t0 = performance.now(), D = 1600;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(dec ? Math.round(to * e * 10) / 10 : Math.round(to * e));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, 0.6);
});

// ── The operating system: a layer lights its counterpart; the stacks build
// from the hardware up as the figure comes into view (css/msos.css) ────────
{
  const fig = document.getElementById("os-stack");
  if (fig) {
    const lit = (sel) => {
      fig.querySelectorAll(".is-lit").forEach((e) => e.classList.remove("is-lit"));
      if (sel) fig.querySelectorAll(sel).forEach((e) => e.classList.add("is-lit"));
    };
    fig.querySelectorAll(".os-part").forEach((el) => {
      const sel = `.os-part[data-p="${el.dataset.p}"]`;
      el.addEventListener("pointerenter", () => lit(sel));
      el.addEventListener("click", (e) => { e.stopPropagation(); lit(sel); });
    });
    fig.querySelectorAll(".os-layer").forEach((el) => {
      const sel = `.os-layer[data-l="${el.dataset.l}"]`;
      el.addEventListener("pointerenter", (e) => { if (!e.target.closest(".os-part")) lit(sel); });
      el.addEventListener("click", () => lit(sel));
    });
    fig.addEventListener("pointerleave", () => lit(null));
    whenSeen(fig, () => fig.classList.add("is-in"), 0.2);
  }
}

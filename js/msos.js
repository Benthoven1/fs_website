// msos.js — the MulviumSOS page's interactive figures (the scene is
// js/fsos.js, the text motion js/fiscal.js): the example blueprint, whose
// open question the founder can settle; the agent rosters, each agent's work
// drawn from js/fsos-words.js; the month of Grove's work, approved at once;
// and the operating-system figure, whose layers light their counterparts.
import { WORKFORCE, AGENCY } from "./fsos-words.js";

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── The blueprint: the open question takes the founder's answer ─────────────
{
  const btn = document.querySelector(".msos-decide");
  const row = document.getElementById("msos-bp-open");
  if (btn && row) {
    const ans = row.querySelector(".msos-bp-ans");
    const dot = row.querySelector(".msos-basis");
    btn.addEventListener("click", () => {
      const decided = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(decided));
      row.classList.add("is-changing");
      setTimeout(() => {
        ans.innerHTML = decided ? ans.dataset.decided : ans.dataset.default;
        dot.className = "msos-basis msos-basis--" + (decided ? "stated" : "assumed");
        dot.querySelector(".hidden-text").textContent = decided ? "Stated by the founder" : "Assumed";
        row.classList.toggle("is-decided", decided);
        row.classList.remove("is-changing");
      }, still ? 0 : 260);
      btn.firstChild.textContent = decided ? "Undo " : "The founder decides ";
    });
  }
}

// ── Rosters: choose an agent to see the work it handles ─────────────────────
{
  const teams = { atelier: WORKFORCE, grove: AGENCY };
  document.querySelectorAll(".msos-roster").forEach((roster) => {
    const team = teams[roster.dataset.team] || [];
    const name = roster.querySelector(".msos-work-name");
    const focus = roster.querySelector(".msos-work-head em");
    const list = roster.querySelector(".msos-work-list");
    const btns = roster.querySelectorAll(".msos-agent-btn");
    const show = (btn) => {
      const a = team.find((x) => x.agent === btn.dataset.agent);
      if (!a || btn.getAttribute("aria-pressed") === "true" && list.childElementCount) return;
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      name.textContent = a.agent;
      focus.textContent = a.focus.toLowerCase();
      list.replaceChildren(...a.work.map((w, i) => {
        const li = document.createElement("li");
        li.textContent = w;
        li.style.setProperty("--i", i);
        return li;
      }));
      // restart the chips' entrance
      list.classList.remove("is-new");
      void list.offsetWidth;
      list.classList.add("is-new");
    };
    btns.forEach((b) => {
      b.addEventListener("click", () => show(b));
      b.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) show(b); });
    });
  });
}

// ── Grove's month: approve it all at once ───────────────────────────────────
{
  const cal = document.getElementById("msos-cal");
  const btn = cal && cal.querySelector(".msos-approve");
  if (btn) {
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Approved ✓" : "Approve the month";
      cal.classList.toggle("is-approved", on);
    });
  }
}

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
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { fig.classList.add("is-in"); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(fig);
  }
}

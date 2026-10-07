// scroll-cue.js — the "Scroll" cue at the foot of the Oak, FSOS and Fiscal
// Sponsorship scenes. It shows once its scene says it is ready, fades away as
// soon as the reader scrolls, and comes back a moment after they return to
// the top. The fades themselves are CSS transitions on .is-shown.
const AT_TOP = 4;          // px of scroll still counted as the top
const RETURN_AFTER = 1400; // ms back at the top before the cue returns

export function scrollCue(el) {
  if (!el) return { ready() {} };
  let ready = false, atTop = window.scrollY <= AT_TOP, timer = 0;
  const show = (on) => el.classList.toggle("is-shown", on);

  window.addEventListener("scroll", () => {
    const top = window.scrollY <= AT_TOP;
    if (top === atTop) return;
    atTop = top;
    clearTimeout(timer);
    if (!top) show(false);
    else if (ready) timer = setTimeout(() => show(atTop), RETURN_AFTER);
  }, { passive: true });

  return {
    // Called by the scene, every frame or once: is it time for the cue?
    ready(on) {
      if (on === ready) return;
      ready = on;
      clearTimeout(timer);
      show(ready && atTop);
    },
  };
}

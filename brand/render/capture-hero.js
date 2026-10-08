// capture-hero.js — captures the landing page's hero at social-media sizes,
// after the loading screen and the entrance have played. Hides the "Click a
// sphere" hint, the custom cursor and the docked footer; `cosmos` images also
// hide the wordmark and statements.
//
// From the repository root, with Playwright installed:
//   python3 -m http.server 8765 &
//   node brand/render/capture-hero.js brand/
// It writes <name>@2x.png; brand/README.md says how the exact sizes were made.
const { chromium } = require("playwright");

const OUT = process.argv[2] || "./";
const HIDE = "#cosmos-hint,.cur-star,.cur-ring,#site-footer{display:none!important}";
const NOTEXT = ".hero-wrap,.hero-statements{visibility:hidden!important}";
const SHOTS = [
  ["mulvium-hero-1920x1080", 1920, 1080, HIDE],
  ["mulvium-hero-1080x1080", 1080, 1080, HIDE],
  ["mulvium-hero-1200x630", 1200, 630, HIDE],
  ["mulvium-hero-1500x500", 1500, 500, HIDE],
  ["mulvium-hero-1584x396", 1584, 396, HIDE],
  ["mulvium-cosmos-1080x1080", 1080, 1080, HIDE + NOTEXT],
];

(async () => {
  // Software WebGL, so it runs on a machine without a GPU
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const [name, w, h, css] of SHOTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    }), css);
    await page.goto("http://localhost:8765/index.html", { waitUntil: "load" });
    await page.waitForTimeout(14000); // loading screen, entrance, a slow software renderer
    await page.screenshot({ path: OUT + name + "@2x.png" });
    await ctx.close();
  }
  await browser.close();
})();

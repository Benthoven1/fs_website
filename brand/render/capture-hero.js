// capture-hero.js — captures the landing page's hero at social-media sizes,
// after the loading screen and the entrance have played, in three sets:
//   mulvium-hero-*      the hero as it stands: wordmark, statement, mission
//   mulvium-wordmark-*  the wordmark only
//   mulvium-cosmos-*    no text at all
// Every set hides the "Click a sphere" hint, the custom cursor and the docked
// footer.
//
// From the repository root, with Playwright installed:
//   python3 -m http.server 8765 &
//   node brand/render/capture-hero.js brand/
// It writes <name>@2x.png; brand/README.md says how the exact sizes were made.
const { chromium } = require("playwright");

const OUT = process.argv[2] || "./";
const HIDE = "#cosmos-hint,.cur-star,.cur-ring,#site-footer{display:none!important}";
const SETS = [
  ["mulvium-hero", HIDE],
  ["mulvium-wordmark", HIDE + ".hero-statements{visibility:hidden!important}"],
  ["mulvium-cosmos", HIDE + ".hero-wrap,.hero-statements{visibility:hidden!important}"],
];
const SIZES = [[1920, 1080], [1080, 1080], [1200, 630], [1500, 500], [1584, 396]];
const ONLY = process.argv[3] ? process.argv[3].split(",") : null; // e.g. mulvium-wordmark
const SHOTS = [];
for (const [set, css] of SETS) {
  if (ONLY && !ONLY.includes(set)) continue;
  for (const [w, h] of SIZES) SHOTS.push([`${set}-${w}x${h}`, w, h, css]);
}

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

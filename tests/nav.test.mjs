// Sidebar nav behaviour on both doc pages: it stays put while the page
// scrolls, the scrollspy follows, and the mobile drawer opens and closes.
//
//   node tests/nav.test.mjs
//
import { BASE, check, launchBrowser, openDoc, overflowProbe, report }
  from "./lib/harness.mjs";

const b = await launchBrowser();
for (const [label, path, anchor] of [
  ["Guide", "/how_it_works/guide/", "unsubscribe"],
  ["Tech ref", "/how_it_works/", "gas-contacts"],
]) {
  console.log("\n=== " + label + " ===");
  const ctx = await b.newContext({ viewport: { width: 1400, height: 768 } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.fill("#pw-input", "lx1234"); await p.click(".pw-gate__button"); await p.waitForTimeout(600);

  const before = await p.evaluate(() => document.querySelector(".toc").getBoundingClientRect().top);
  await p.evaluate(() => window.scrollTo(0, 3000));
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => document.querySelector(".toc").getBoundingClientRect().top);
  check("nav stays put while the page scrolls", Math.abs(after - before) < 2, `${before} -> ${after}`);

  await p.evaluate((a) => document.getElementById(a).scrollIntoView(), anchor);
  await p.waitForTimeout(700);
  const cur = await p.evaluate(() => document.querySelector("a.toc__link.is-current")?.getAttribute("href"));
  check(`scrollspy highlights the new section (${anchor})`, cur === "#" + anchor, String(cur));
  await ctx.close();

  // mobile drawer
  const m = await b.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(BASE + path, { waitUntil: "networkidle" });
  await mp.fill("#pw-input", "lx1234"); await mp.click(".pw-gate__button"); await mp.waitForTimeout(600);
  check("hamburger shown on mobile",
    await mp.evaluate(() => getComputedStyle(document.querySelector(".navbar")).display === "flex"));
  await mp.click("#nav-toggle"); await mp.waitForTimeout(400);
  check("  drawer opens", await mp.evaluate(() => document.querySelector(".toc").classList.contains("is-open")));
  await mp.click(`a.toc__link[href="#${anchor}"]`); await mp.waitForTimeout(700);
  check("  tapping the new link closes it and goes there",
    await mp.evaluate((a) => {
      const closed = !document.querySelector(".toc").classList.contains("is-open");
      const r = document.getElementById(a).getBoundingClientRect();
      return closed && r.top > -200 && r.top < window.innerHeight;
    }, anchor));
  await m.close();
}
await b.close();
report();

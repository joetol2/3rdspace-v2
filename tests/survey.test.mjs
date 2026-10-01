// The community survey page, reached only by QR code.
//
// Two properties here are easy to break by accident and expensive to notice:
// that the page is NOT linked from anywhere on the site, and that it is a
// real prerendered page rather than the SPA fallback. The second is why the
// QR scan lands cleanly instead of flashing the homepage first.
//
// The URL is also a one-way door: once the codes are printed on Laura's
// flyers, /survey/ cannot move without reprinting them.
//
//   node tests/survey.test.mjs
//
import { BASE, check, launchBrowser, report } from "./lib/harness.mjs";

const b = await launchBrowser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

console.log("\n=== the QR code lands on a real page, not the fallback ===");
{
  const res = await page.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  // 200, not 404. GitHub Pages serves 404.html for unprerendered routes, and
  // the router then swaps the right page in: it works, but a stranger scanning
  // a flyer sees the homepage first. This asserts the file genuinely exists.
  check("the URL serves its own page", res && res.status() === 200,
    String(res && res.status()));

  // And the HTML is the survey BEFORE any JavaScript runs, which is what a
  // slow phone, a link preview or a scraper sees.
  const raw = await (await fetch(BASE + "/survey/")).text();
  check("  the survey is in the HTML itself, not painted on afterwards",
    /Community Survey/.test(raw), raw.slice(0, 120));
}

console.log("\n=== it sits inside the site, not on its own ===");
{
  const shell = await page.evaluate(() => ({
    header: !!document.querySelector("header"),
    footer: !!document.querySelector("footer"),
    navLinks: document.querySelectorAll("header a").length,
    h1: document.querySelector("h1")?.innerText.trim() || "",
  }));
  check("the site header is there", shell.header);
  check("  with its navigation", shell.navLinks > 3, String(shell.navLinks));
  check("the site footer is there", shell.footer);
  check("  and the page is titled Community Survey",
    shell.h1 === "Community Survey", shell.h1);
}

console.log("\n=== nothing on the site points at it ===");
{
  // Every page a visitor can reach, checked for a link to /survey/. If the
  // survey ever needs to be public this test is the thing to delete, on
  // purpose, rather than something to work around.
  const PAGES = ["/", "/calendar/", "/request/", "/mission/", "/details/",
    "/support/", "/news/", "/contact/", "/join/", "/guidelines/",
    "/accessibility/", "/privacy/"];
  const found = [];
  for (const p of PAGES) {
    const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
    if (!res) continue;
    await page.waitForTimeout(150);
    const hits = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /\/survey/.test(h)));
    if (hits.length) found.push(p + " -> " + hits.join(", "));
  }
  check("no page links to the survey", found.length === 0, found.join(" | "));
}

console.log("\n=== and search engines are told to leave it alone ===");
{
  await page.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  const robots = await page.evaluate(() =>
    document.querySelector('meta[name="robots"]')?.getAttribute("content") || "");
  check("it is noindex while the body is still a placeholder",
    /noindex/.test(robots), robots || "(no robots meta)");
}

console.log("\n=== a dark-mode phone cannot paint it black ===");
{
  // Reported as "I see the header flash and then it goes black", on a phone,
  // on this page. The deployed file was correct and rendered correctly in a
  // light browser, which left the browser's own canvas as the candidate.
  //
  // Nothing on this site ever adds the .dark class, so the page is always
  // light — but with no color-scheme declared, a browser set to dark
  // appearance paints its canvas black behind and around it. This page is the
  // one most exposed to that: no hero, no photographs, almost nothing but
  // background. The header is an <img> and shows up either way.
  const ctxDark = await b.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const dark = await ctxDark.newPage();
  await dark.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  const paint = await dark.evaluate(() => ({
    scheme: getComputedStyle(document.documentElement).colorScheme,
    html: getComputedStyle(document.documentElement).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
  }));
  // Parse to a number so "black" is caught however the browser spells it.
  const lightness = (c) => {
    const n = c.match(/[\d.]+/g);
    if (!n || n.length < 3) return null;
    return c.startsWith("oklch") ? Number(n[0]) : Number(n[0]) / 255;
  };
  check("the page declares itself light", /light/.test(paint.scheme), paint.scheme);
  check("  html carries a background of its own, not the browser's",
    paint.html !== "rgba(0, 0, 0, 0)" && paint.html !== "transparent", paint.html);
  check("  and it is a light one", (lightness(paint.html) ?? 0) > 0.8, paint.html);
  check("  as is the body's", (lightness(paint.body) ?? 0) > 0.8, paint.body);
  await ctxDark.close();
}

console.log("\n=== the placeholder says something useful ===");
{
  // Somebody may scan a code before the survey is finished. Better that they
  // land on a sentence than on an empty page.
  const text = await page.evaluate(() => document.body.innerText);
  check("it explains what the page is for", /what you would like to see/i.test(text));
  check("  and admits it is not ready yet", /not quite ready/i.test(text));
}

await ctx.close();
await b.close();
report();

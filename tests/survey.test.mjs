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

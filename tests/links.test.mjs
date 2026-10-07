// Every internal link on the site points at a route that exists, in the form
// the route actually has.
//
// The router is configured with trailingSlash: "always", so "/mission/" is the
// route's name and "/mission" is not a route. Links written without the slash
// used to be everywhere, and the typecheck said so in eleven places while
// three more were hidden behind `as any`.
//
// Those are fixed and navLinks is now typed against the router's own list, so
// the compiler catches that class in config and in literal <Link to="...">.
// It cannot catch CTAButton, whose href is a runtime string carrying tel:,
// mailto: and values out of data arrays, and it cannot catch a link added
// tomorrow in a component nobody typed. This reads the hrefs off the built
// pages instead, which is the level a visitor experiences anyway.
//
// Why it matters, given the router normalises the slash at render time: a
// visitor clicking through is fine either way, but anything that reads the
// markup rather than running it is not. A missing slash reaching the HTML is
// a link that 404s on GitHub Pages when pasted into a message, opened in a new
// tab or followed by a crawler, which is the same flash-of-the-wrong-page the
// survey route is prerendered to avoid.
//
//   node tests/links.test.mjs
//
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { BASE, REPO_ROOT, check, launchBrowser, report } from "./lib/harness.mjs";

// The routes, from the one place that defines them: the files themselves.
// Hardcoding the list here would make this test agree with whatever it was
// told rather than with the site.
const routeFiles = readdirSync(resolve(REPO_ROOT, "src/routes"))
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"));
const ROUTES = new Set(
  routeFiles.map((f) => {
    const name = f.replace(/\.tsx$/, "");
    return name === "index" ? "/" : `/${name}/`;
  })
);

console.log("  routes found: " + [...ROUTES].sort().join(" "));

// Pages a visitor can reach. The two doc pages under public/ are plain static
// HTML outside the router and are covered by tests/docs.test.mjs.
const PAGES = ["/", "/calendar/", "/request/", "/mission/", "/details/",
  "/support/", "/news/", "/contact/", "/join/", "/guidelines/",
  "/accessibility/", "/privacy/", "/survey/", "/about/"];

const b = await launchBrowser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();

/** Every internal page link on the current document, hash and query stripped. */
const collect = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/"))
      // Assets are files, not routes, and are linked by their real filename.
      .filter((h) => !/^\/assets\//.test(h))
      .filter((h) => !/\.(png|jpe?g|webp|svg|ico|json|css|js|txt|xml)$/i.test(h))
  );

const bad = [];
const unknown = [];
let total = 0;

for (const p of PAGES) {
  const res = await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
  if (!res) continue;
  await page.waitForTimeout(200);
  for (const href of await collect()) {
    total++;
    const path = href.split("#")[0].split("?")[0];
    if (path === "") continue; // a bare "#section" link on the same page
    if (!path.endsWith("/")) bad.push(`${p} -> ${href}`);
    else if (/\/\//.test(path)) bad.push(`${p} -> ${href} (double slash)`);
    else if (!ROUTES.has(path)) unknown.push(`${p} -> ${href}`);
  }
}

console.log("\n=== every internal link is canonical ===");
check(`${total} links checked across ${PAGES.length} pages`, total > 40, String(total));
check("all of them end in a trailing slash", bad.length === 0, bad.join(" | "));
check("  and all of them name a route that exists", unknown.length === 0, unknown.join(" | "));

console.log("\n=== the check can actually fail ===");
{
  // Same reasoning as the self-check in diagram.test.mjs: a sweep that reports
  // "nothing wrong" is worthless until it has been shown to report something.
  // Both failure modes are planted here, because they are caught by different
  // branches above and a detector that only sees one of them would have passed
  // this whole file while the other walked straight through.
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.setAttribute("href", "/mission");          // right route, wrong form
    document.body.appendChild(a);
    const c = document.createElement("a");
    c.setAttribute("href", "/not-a-page/");      // right form, no such route
    document.body.appendChild(c);
  });
  const planted = await collect();
  const noSlash = planted.filter((h) => !h.split("#")[0].endsWith("/"));
  const notARoute = planted.filter((h) => {
    const path = h.split("#")[0];
    return path.endsWith("/") && !ROUTES.has(path);
  });
  check("a missing trailing slash is spotted", noSlash.length === 1, noSlash.join(" | "));
  check("  and so is a link to nothing", notARoute.length === 1, notARoute.join(" | "));
}

console.log("\n=== the header navigation ===");
{
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() =>
    [...document.querySelectorAll("header nav a")].map((a) => ({
      href: a.getAttribute("href"), text: a.innerText.trim(),
    })));
  check("the nav rendered its links", nav.length >= 6, String(nav.length));
  const navBad = nav.filter((l) => !ROUTES.has(l.href.split("#")[0]));
  check("  every one of them is a real route", navBad.length === 0,
    JSON.stringify(navBad));
  // The one that is easy to get wrong: Contact is /request/ plus a hash, so
  // it is the only nav entry where the path and the label disagree.
  const contact = nav.find((l) => /contact/i.test(l.text));
  check("  Contact points at the request page's contact section",
    contact && /^\/request\/#contact$/.test(contact.href),
    contact ? contact.href : "(not found)");
}

await ctx.close();
await b.close();
report();

// Does the calendar keep its events when you arrive by a link?
//
// Reproduces production's shape: events baked into the prerendered HTML, and
// the Google feed blocked in the browser exactly as CORS blocks it. Clicking
// a <Link> never requests the prerendered file, so the loader runs in the
// browser, and before the fix that meant an empty calendar.
//
//   node tests/lib/prerender-stub.mjs   (build with a stubbed feed)
//   python3 tests/lib/serve.py &
//   node tests/calendar-nav.test.mjs
//
import { BASE, check, launchBrowser, openDoc, overflowProbe, report }
  from "./lib/harness.mjs";

// Does clicking a nav link to /calendar/ lose the event data, and does adding
// a query string change anything? The Google feed is blocked in the browser
// here exactly as CORS blocks it in production, while the prerendered HTML
// carries real events (see prerender_stub.mjs). That is production's shape.
const b = await launchBrowser();

async function session() {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const attempts = [];
  // Stand in for the CORS wall: the browser is not allowed to read the feed.
  await ctx.route("**calendar.google.com/**", (route) => {
    attempts.push(route.request().url());
    route.abort("failed");
  });
  const p = await ctx.newPage();
  return { ctx, p, attempts };
}

const eventsShown = (p) =>
  p.evaluate(() => /Quilting Guild Meetup/.test(document.body.innerText));

const results = [];

// --- 1. Hard load, no query string -----------------------------------------
{
  const { ctx, p, attempts } = await session();
  await p.goto(BASE + "/calendar/", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  results.push(["hard load  /calendar/", await eventsShown(p), attempts.length]);
  await ctx.close();
}

// --- 2. Hard load, WITH the proposed query string ---------------------------
{
  const { ctx, p, attempts } = await session();
  await p.goto(BASE + "/calendar/?mainNav", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  results.push(["hard load  /calendar/?mainNav", await eventsShown(p), attempts.length]);
  await ctx.close();
}

// --- 3. Client-side nav: click the Calendar link in the header --------------
{
  const { ctx, p, attempts } = await session();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.click('header a[href="/calendar/"]');
  await p.waitForTimeout(1200);
  results.push(["click nav  -> /calendar/", await eventsShown(p), attempts.length]);
  await ctx.close();
}

// --- 4. Client-side nav to the SAME url the user proposes -------------------
// Rewrite the header link's href to carry the query string, then click it,
// to show whether the string alone changes the outcome.
{
  const { ctx, p, attempts } = await session();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.querySelector('header a[href="/calendar/"]').setAttribute("href", "/calendar/?mainNav");
  });
  await p.click('header a[href="/calendar/?mainNav"]');
  await p.waitForTimeout(1200);
  results.push(["click nav  -> /calendar/?mainNav", await eventsShown(p), attempts.length,
                p.url().replace(BASE, "")]);
  await ctx.close();
}

// --- 5. A route with no prerendered file at all (404.html SPA fallback) -----
{
  const { ctx, p, attempts } = await session();
  await p.goto(BASE + "/request/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.click('a[href="/calendar/"]');
  await p.waitForTimeout(1200);
  results.push(["click from /request/", await eventsShown(p), attempts.length]);
  await ctx.close();
}

console.log("");
console.log("  path                             events?  browser tried the feed?");
console.log("  " + "-".repeat(66));
for (const [name, ok, tries, url] of results) {
  console.log("  " + name.padEnd(33) + (ok ? "YES    " : "NO     ").padEnd(9)
    + (tries ? `yes (${tries}x)` : "no") + (url ? "   landed on " + url : ""));
}
console.log("");

// The table above is for reading; these are what actually fail the build.
// Every way into the page must show the events, and none of them may reach
// out to Google, because in a real browser that request is blocked by CORS
// and comes back as an empty calendar.
check("all five routes into the calendar show events",
  results.every(([, ok]) => ok),
  results.filter(([, ok]) => !ok).map(([n]) => n).join("; "));

check("  and none of them fetch the Google feed from the browser",
  results.every(([, , tries]) => tries === 0),
  results.filter(([, , t]) => t).map(([n, , t]) => `${n} (${t}x)`).join("; "));

check("  including a click, which is the case that was broken",
  results.some(([n, ok]) => n.startsWith("click nav") && ok));

await b.close();
report();

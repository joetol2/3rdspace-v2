// A calendar that cannot be loaded must say so, rather than showing the
// reassuring "no upcoming events" that makes a broken feed look like a quiet
// week. An empty calendar and an unreadable one are different things.
//
//   node tests/calendar-failure.test.mjs
//
import { BASE, check, launchBrowser, openDoc, overflowProbe, report }
  from "./lib/harness.mjs";

const b = await launchBrowser();

// The JSON is unreachable. A visitor clicking through should be TOLD, not
// shown a reassuring "no upcoming events" that looks like a quiet week.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route("**/calendar-events.json", r => r.abort("failed"));
  await ctx.route("**calendar.google.com/**", r => r.abort("failed"));
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.click('header a[href="/calendar/"]');
  await p.waitForTimeout(1500);
  const t = await p.evaluate(() => document.body.innerText);
  check("says the calendar could not be loaded", t.includes("could not be loaded"));
  check("  does NOT claim there is simply nothing on", !t.includes("No upcoming events found"));
  check("  offers Google Calendar as a way through", t.includes("view it on Google Calendar"));
  await ctx.close();
}

// A calendar that genuinely has nothing on it is not a failure.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route("**/calendar-events.json", r =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await ctx.route("**calendar.google.com/**", r => r.abort("failed"));
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.click('header a[href="/calendar/"]');
  await p.waitForTimeout(1500);
  const t = await p.evaluate(() => document.body.innerText);
  check("an empty feed still reads as an empty calendar", t.includes("No upcoming events found"));
  check("  and is not reported as an error", !t.includes("could not be loaded"));
  await ctx.close();
}

await b.close();
report();

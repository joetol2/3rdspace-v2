// The /staff-approve/ page, with the decision flow switched off.
//
// This page is the dangerous half of the switch-off. Every request email ever
// sent while the flow was on still carries working Approve and Decline links,
// and those links do not expire. The page posts its decision with
// mode: "no-cors", which means it CANNOT read the reply, so it shows "done"
// whatever the script says. Left unguarded it would tell whoever clicked that
// a booking was approved while the Apps Script quietly refused, and with the
// staff confirmation email switched off there would be nothing to contradict
// it.
//
// So: the page must refuse before it offers a button, and it must not post.
//
//   node tests/staff-approve.test.mjs
//
import { BASE, check, launchBrowser, report } from "./lib/harness.mjs";

const b = await launchBrowser();

// A link exactly as an old email would have built it: a real id, a real
// token, and the review details in the query string.
const OLD_LINK =
  "/staff-approve/?action=approve&id=req-abc&token=tok-xyz" +
  "&name=Jane%20Requester&eventName=Rehearsal&date=Nov%2014,%202026" +
  "&start=6:00%20PM&end=8:00%20PM";

async function open(path) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  const posts = [];
  // Catch any attempt to reach the Apps Script, the way the real page would.
  await ctx.route("**script.google.com/**", (route) => {
    posts.push(route.request().method());
    route.abort("failed");
  });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { ctx, page, posts };
}

console.log("\n=== an old approve link explains itself ===");
{
  const { ctx, page, posts } = await open(OLD_LINK);
  const text = await page.evaluate(() => document.body.innerText);

  check("it says approvals are handled by email now",
    /Approvals are handled by email now/i.test(text), text.slice(0, 160));
  check("  and that nothing was changed by opening it",
    /Nothing has been changed/i.test(text));
  check("  it says where bookings actually come from",
    /Google Calendar/.test(text));

  // The whole point. A button here is a button that lies.
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll("button")].map((el) => el.innerText.trim()).join(" | "));
  check("  there is no confirm button", !/confirm/i.test(buttons), buttons);
  check("  and no approve or decline button", !/approve|decline/i.test(buttons), buttons);

  check("  nothing was posted to the Apps Script", posts.length === 0, posts.join(","));
  await ctx.close();
}

console.log("\n=== decline and cancel links are refused too ===");
for (const action of ["decline", "cancel"]) {
  const { ctx, page, posts } = await open(OLD_LINK.replace("action=approve", "action=" + action));
  const text = await page.evaluate(() => document.body.innerText);
  check(`${action}: same message`, /Approvals are handled by email now/i.test(text));
  check(`  ${action}: nothing posted`, posts.length === 0, posts.join(","));
  await ctx.close();
}

console.log("\n=== the message does not depend on the link being well formed ===");
{
  // A truncated link, which is what a mail client that mangles long URLs
  // produces. It must not fall through to the "Link not valid" branch and
  // send somebody hunting for a working one.
  const { ctx, page } = await open("/staff-approve/?action=approve");
  const text = await page.evaluate(() => document.body.innerText);
  check("a half-broken link gets the same explanation",
    /Approvals are handled by email now/i.test(text), text.slice(0, 160));
  check("  and is not told the link is invalid",
    !/Link not valid/i.test(text));
  await ctx.close();
}

console.log("\n=== the manual rebuild button is untouched ===");
{
  // Not part of the decision flow, and it matters more than it used to: with
  // approvals gone, nothing else asks the site to rebuild on demand.
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const res = await page.goto(BASE + "/staff-approve/gevalt/", { waitUntil: "networkidle" });
  check("the Oy Gevalt page still loads", res && res.status() === 200,
    String(res && res.status()));
  const text = await page.evaluate(() => document.body.innerText);
  check("  and still offers its button", /gevalt/i.test(text) || /rebuild/i.test(text),
    text.slice(0, 120));
  await ctx.close();
}

await b.close();
report();

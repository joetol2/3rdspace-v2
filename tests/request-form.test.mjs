// Can somebody actually submit a space request?
//
// Nothing covered this, which is a poor place to have a gap: the form is the
// only way a request enters the system, and if it breaks the failure is
// almost silent. The page still says "Request received" whatever happens,
// because the POST is mode: "no-cors" and cannot read a reply, so a broken
// form looks exactly like a quiet fortnight.
//
// Written while chasing "the manager is not getting request emails". If no
// request ever left the browser, that is what it would look like.
//
//   node tests/request-form.test.mjs
//
import { BASE, check, launchBrowser, report } from "./lib/harness.mjs";

const b = await launchBrowser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1600 } });

// Catch the submission instead of letting it reach Google.
const posted = [];
await ctx.route("**script.google.com/**", (route) => {
  posted.push(route.request().postData() || "");
  // An opaque success, which is all the page can see anyway.
  route.fulfill({ status: 200, body: "" });
});

const page = await ctx.newPage();

// Two errors are artefacts of running here and are not the site's:
//
//   ERR_CERT_AUTHORITY_INVALID  this test fulfils the Apps Script request
//                               itself, and the sandbox proxy's certificate
//                               is not one chromium trusts.
//   React #418                  a hydration mismatch. /request/ is not
//                               prerendered, so the static server hands back
//                               404.html and React reconciles the router onto
//                               it. That happens on GitHub Pages too; it is
//                               the cost of the SPA fallback and predates any
//                               of this. Worth fixing one day, unrelated here.
//
// Everything else still fails the test, which is the point of keeping it.
const KNOWN = [/ERR_CERT_AUTHORITY_INVALID/, /react\.dev\/errors\/418/];
const errors = [];
const note = (m) => { if (!KNOWN.some((re) => re.test(m))) errors.push(m); };
page.on("pageerror", (e) => note(e.message));
page.on("console", (m) => { if (m.type() === "error") note("console: " + m.text()); });

await page.goto(BASE + "/request/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

console.log("\n=== the form loads at all ===");
{
  check("no page errors on load", errors.length === 0, errors.join(" | "));
  const fields = await page.evaluate(() =>
    document.querySelectorAll("form input, form select, form textarea").length);
  check("the form rendered its fields", fields > 10, String(fields));
}

console.log("\n=== the mailing list tick box is there and starts unticked ===");
{
  const box = await page.evaluate(() => {
    const el = document.querySelector('input[name="joinMailingList"]');
    return el ? { checked: el.checked, required: el.required } : null;
  });
  check("the box exists", box !== null);
  check("  unticked by default", box && box.checked === false, JSON.stringify(box));
  check("  and not required", box && box.required === false, JSON.stringify(box));
}

console.log("\n=== filling it in and submitting ===");
{
  // Fill every required control. Radio groups need a click on one member;
  // setting .value on a radio the way you would a text box does nothing, which
  // is what left the submit button correctly disabled the first time this ran.
  await page.evaluate(() => {
    const set = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const all = [...document.querySelectorAll("form input, form select, form textarea")];

    // One click per radio group. Prefer an option that does not drag in
    // another required field: picking "Recurring request" makes the pattern
    // box mandatory, which is a different test than this one.
    const groups = new Map();
    for (const el of all) if (el.type === "radio") {
      if (!groups.has(el.name)) groups.set(el.name, []);
      groups.get(el.name).push(el);
    }
    for (const [, members] of groups) {
      const plain = members.find((m) => !/recur/i.test(m.value)) || members[0];
      plain.click();
    }

    // The date and time inputs carry no name attribute, so they are filled by
    // position: first date is the preferred one, second is the optional end
    // date and stays blank; first time is the start, second the end. Matching
    // on name here quietly set both times the same and the form told me so.
    const dates = all.filter((el) => el.type === "date");
    const times = all.filter((el) => el.type === "time");
    const future = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
    if (dates[0]) set(dates[0], future);
    if (times[0]) set(times[0], "13:00");
    if (times[1]) set(times[1], "16:00");

    for (const el of all) {
      if (el.type === "radio" || el.type === "date" || el.type === "time") continue;
      if (el.name === "website" || el.type === "hidden") continue;
      if (el.type === "checkbox") { if (el.required && !el.checked) el.click(); continue; }
      if (el.type === "number") { set(el, "20"); continue; }
      if (el.type === "email") { set(el, "formtest@example.com"); continue; }
      if (el.type === "tel") { set(el, "805-555-0100"); continue; }
      if (el.tagName === "SELECT") {
        const opt = [...el.options].find((o) => o.value && !/recur/i.test(o.value));
        if (opt) set(el, opt.value);
        continue;
      }
      if (!el.value) set(el, "Form test");
    }
  });
  // Tick the mailing list box so the payload carries a true.
  await page.evaluate(() => {
    const el = document.querySelector('input[name="joinMailingList"]');
    if (el && !el.checked) el.click();
  });
  await page.waitForTimeout(200);

  const blocked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")]
      .find((b) => b.type === "submit" || /send|submit|request/i.test(b.innerText));
    if (!btn) return "no submit button found";
    if (btn.disabled) return "submit button is disabled: " + btn.innerText.trim();
    btn.click();
    return "";
  });
  check("the submit button was clickable", blocked === "", blocked);

  await page.waitForTimeout(2500);

  check("something was actually POSTed to the Apps Script", posted.length > 0,
    "nothing left the browser");
  check("  and no error was thrown doing it", errors.length === 0, errors.join(" | "));
}

console.log("\n=== what the Apps Script would receive ===");
if (posted.length) {
  let payload = null;
  try { payload = JSON.parse(posted[0]); } catch (e) { /* form-encoded fallback */ }
  check("the body is JSON the script can read", payload !== null,
    posted[0].slice(0, 120));

  if (payload) {
    console.log("     keys: " + Object.keys(payload).sort().join(", "));
    check("  formType says space_request", payload.formType === "space_request",
      String(payload.formType));
    check("  the email is there", !!payload.email, String(payload.email));
    check("  a submissionId is there, so a retry cannot double-book",
      typeof payload.submissionId === "string" && payload.submissionId.length > 10,
      String(payload.submissionId));
    check("  the honeypot is empty, or the script discards it silently",
      !payload.website, JSON.stringify(payload.website));
    check("  joinMailingList came through as a real boolean true",
      payload.joinMailingList === true, JSON.stringify(payload.joinMailingList));
    check("  oneTimeRecurring is present, which the conflict window needs",
      "oneTimeRecurring" in payload, JSON.stringify(payload.oneTimeRecurring));
    check("  preferredDate is present", !!payload.preferredDate, String(payload.preferredDate));
  }
}

await ctx.close();
await b.close();
report();

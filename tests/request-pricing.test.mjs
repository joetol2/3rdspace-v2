// The live estimate on the request form.
//
// The numbers themselves are covered by tests/pricing.test.ts and
// tests/pricing-gs.test.cjs. This is about the form around them: that the
// estimate reacts to what somebody actually clicks, that it never shows a
// zero, that stale answers are cleared rather than left feeding it, and that
// everything it worked out reaches the Apps Script.
//
// Worth testing in a browser rather than in isolation because the failure mode
// is specific: an estimate that is correct but stuck. Somebody changes their
// end time, the figure does not move, and they submit against a price nobody
// is going to charge them.
//
//   node tests/request-pricing.test.mjs
//
import { BASE, check, launchBrowser, report } from "./lib/harness.mjs";

const b = await launchBrowser();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1600 } });

const posted = [];
await ctx.route("**script.google.com/**", (route) => {
  posted.push(route.request().postData() || "");
  route.fulfill({ status: 200, body: "" });
});

const page = await ctx.newPage();

// Same two known artefacts as tests/request-form.test.mjs: the sandbox
// proxy's certificate, and the hydration mismatch that comes from /request/
// being served by the 404.html SPA fallback. Both predate this work.
const KNOWN = [/ERR_CERT_AUTHORITY_INVALID/, /react\.dev\/errors\/418/];
const errors = [];
const note = (m) => { if (!KNOWN.some((re) => re.test(m))) errors.push(m); };
page.on("pageerror", (e) => note(e.message));
page.on("console", (m) => { if (m.type() === "error") note("console: " + m.text()); });

await page.goto(BASE + "/request/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// --- driving the form ------------------------------------------------------

async function pick(name, value) {
  await page.evaluate(([n, v]) => {
    const el = [...document.querySelectorAll(`input[type="radio"][name="${n}"]`)]
      .find((r) => r.value === v);
    if (!el) throw new Error(`no radio ${n}="${v}"`);
    el.click();
  }, [name, value]);
  await page.waitForTimeout(120);
}

async function setTimes(start, end) {
  await page.evaluate(([s, e]) => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    // The time inputs carry no name attribute, so they go by position: first
    // is the start, second is the end.
    const times = [...document.querySelectorAll('form input[type="time"]')];
    set(times[0], s);
    set(times[1], e);
  }, [start, end]);
  await page.waitForTimeout(120);
}

async function setDates(first, last) {
  await page.evaluate(([f, l]) => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const dates = [...document.querySelectorAll('form input[type="date"]')];
    set(dates[0], f);
    if (dates[1]) set(dates[1], l);
  }, [first, last]);
  await page.waitForTimeout(120);
}

const future = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const estimate = () =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="estimate"]');
    return el ? el.innerText.replace(/\s+/g, " ").trim() : "(no estimate block)";
  });

async function setCount(n) {
  await page.evaluate((v) => {
    const el = document.querySelector("#meetings-per-month");
    if (!el) throw new Error("no meetings-per-month field");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, n);
  await page.waitForTimeout(120);
}

// ==========================================================================
console.log("\n=== the rates are visible before anything is filled in ===");
{
  const text = await page.evaluate(() => document.body.innerText);
  check("the form opens with the rates on it", /\$40/.test(text) && /\$75/.test(text), "");
  check("  and says outdoor is extra", /\$150/.test(text));
  const e = await estimate();
  check("the estimate asks for what it needs rather than showing $0",
    /still need/i.test(e), e);
  // The cleaning notice legitimately contains "$75", so the check is for a
  // quoted TOTAL rather than for the absence of a dollar sign.
  check("  and quotes nothing", !/Total/.test(e) && !/Estimated minimum price/.test(e), e);
}

// ==========================================================================
console.log("\n=== a two hour indoor meeting ===");
{
  await pick("useType", "Meeting");
  await pick("oneTimeRecurring", "One-time request");
  await pick("requestedArea", "Indoor space");
  await setDates(future(30), "");
  await setTimes("10:00", "12:00");
  const e = await estimate();
  check("it is $40 per meeting", /\$40/.test(e) && /per meeting/.test(e), e);
  check("  labelled as an estimated minimum", /Estimated minimum price/i.test(e), e);
  check("  with the explanation the brief asks for",
    /minimum estimate based on your selections/i.test(e), e);
  check("  and the booking is still said not to be confirmed",
    /does not confirm your booking/i.test(e), e);
}

console.log("\n=== one minute more is not a meeting ===");
{
  await setTimes("10:00", "12:01");
  const e = await estimate();
  check("it becomes Contact us for pricing", /Contact us for pricing/.test(e), e);
  check("  and no longer shows $40", !/\$40/.test(e), e);
  check("  and says why", /up to 2 hours/i.test(e), e);
  // The whole point: a request that cannot be priced must still be sendable.
  const disabled = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")].find((x) => x.type === "submit");
    return btn ? btn.disabled : "no button";
  });
  check("  and the request can still be submitted", disabled === false, String(disabled));
}

// ==========================================================================
console.log("\n=== the event thresholds, on the page ===");
{
  await pick("useType", "Private event");
  await setTimes("10:00", "14:00");
  let e = await estimate();
  check("exactly four hours is $75", /\$75/.test(e) && /per event/.test(e), e);

  await setTimes("10:00", "14:01");
  e = await estimate();
  check("  four hours and a minute is $150", /\$150/.test(e), e);

  await setTimes("09:00", "17:00");
  e = await estimate();
  check("  exactly eight hours is still $150", /\$150/.test(e), e);

  await setTimes("08:00", "17:00");
  e = await estimate();
  check("  nine hours needs a person", /Contact us for pricing/.test(e), e);
}

// ==========================================================================
console.log("\n=== adding the outdoor area shows where the money goes ===");
{
  await setTimes("10:00", "13:00");
  await pick("requestedArea", "Both");
  let e = await estimate();
  check("a half day using both areas is $225", /\$225/.test(e), e);
  check("  broken into the indoor rate", /\$75/.test(e), e);
  check("  and the outdoor charge", /\$150/.test(e), e);

  await pick("requestedArea", "Outdoor / parking lot");
  e = await estimate();
  check("outdoor on its own is $150", /\$150/.test(e), e);
  check("  with no indoor line item", !/Indoor/.test(e), e);
}

console.log("\n=== not knowing the area is an answer, not an error ===");
{
  await pick("requestedArea", "Not sure yet");
  const e = await estimate();
  check("it quotes rather than nags", /Contact us for pricing/.test(e), e);
  check("  and says what is unsettled", /area/i.test(e), e);
}

// ==========================================================================
console.log("\n=== recurring meetings are priced by the month ===");
{
  await pick("useType", "Meeting");
  await pick("requestedArea", "Indoor space");
  await setTimes("10:00", "12:00");
  await pick("oneTimeRecurring", "Recurring request");

  const asked = await page.evaluate(() => !!document.querySelector("#meetings-per-month"));
  check("it asks how many meetings a month", asked);

  const help = await page.evaluate(() => {
    const lab = document.querySelector('label[for="meetings-per-month"]');
    // The explanation is a sibling of the label, inside the same block.
    return lab ? lab.parentElement.innerText : "";
  });
  check("  and warns that some months hold five", /five/i.test(help), help.slice(0, 200));

  await setCount(2);
  let e = await estimate();
  check("two meetings is $80 for the month",
    /\$80/.test(e) && /per calendar month/.test(e), e);

  await setCount(4);
  e = await estimate();
  check("  four meetings is still $80, not four times anything", /\$80/.test(e), e);

  await setCount(5);
  e = await estimate();
  check("  five needs a person", /Contact us for pricing/.test(e), e);
  check("  and says the plan covers four", /four/i.test(e), e);

  await setCount(4);
  await pick("requestedArea", "Outdoor / parking lot");
  e = await estimate();
  check("four outdoor-only meetings are $150 per meeting",
    /\$150/.test(e) && /per meeting/.test(e), e);
  check("  and $600 for that month", /\$600/.test(e), e);

  // No cap on the input: a bigger series has to stay submittable so it can be
  // quoted, rather than being refused by a max attribute.
  const max = await page.evaluate(() => {
    const el = document.querySelector("#meetings-per-month");
    return el ? el.getAttribute("max") : "missing";
  });
  check("the count is not capped at four", max === null, String(max));
}

console.log("\n=== a count that varies ===");
{
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('input[type="checkbox"]')]
      .find((c) => /varies/i.test(c.closest("label")?.innerText || ""));
    if (!box) throw new Error("no varies box");
    box.click();
  });
  await page.waitForTimeout(150);
  const e = await estimate();
  check("it needs a person", /Contact us for pricing/.test(e), e);
  const disabled = await page.evaluate(() =>
    document.querySelector("#meetings-per-month")?.disabled);
  check("  and the number box is no longer in play", disabled === true, String(disabled));
}

// ==========================================================================
console.log("\n=== changing an answer clears what no longer applies ===");
{
  // This is the one that bites. The count field disappears when a request
  // stops being a recurring meeting, but if its value stayed in state it
  // would still be in the payload and still feeding the estimate.
  await pick("oneTimeRecurring", "One-time request");
  await page.waitForTimeout(150);
  const gone = await page.evaluate(() => !document.querySelector("#meetings-per-month"));
  check("the meetings field goes away", gone);

  await pick("requestedArea", "Indoor space");
  await setTimes("10:00", "12:00");
  const e = await estimate();
  check("  and the estimate is the one-time rate again", /\$40/.test(e), e);

  await pick("oneTimeRecurring", "Recurring request");
  await page.waitForTimeout(150);
  const emptied = await page.evaluate(() => {
    const el = document.querySelector("#meetings-per-month");
    return el ? el.value : "(missing)";
  });
  check("  and coming back, the old count has been cleared", emptied === "", emptied);
}

// ==========================================================================
console.log("\n=== the extra question is only asked when it is needed ===");
{
  await pick("useType", "Meeting");
  let asked = await page.evaluate(() =>
    !!document.querySelector('input[name="pricingCategory"]'));
  check("a meeting is not asked whether it is a meeting", asked === false);

  await pick("useType", "Workshop or class");
  asked = await page.evaluate(() =>
    !!document.querySelector('input[name="pricingCategory"]'));
  check("  nor is a workshop", asked === false);

  await pick("useType", "Community gathering");
  asked = await page.evaluate(() =>
    !!document.querySelector('input[name="pricingCategory"]'));
  check("a community gathering is asked, because it genuinely could be either", asked);

  const defs = await page.evaluate(() => {
    const el = document.querySelector('input[name="pricingCategory"]');
    return el ? el.closest("fieldset").innerText : "";
  });
  check("  and is given the definitions to choose by",
    /up to 2 hours/i.test(defs) && /celebration/i.test(defs), defs.slice(0, 200));

  await pick("oneTimeRecurring", "One-time request");
  await pick("requestedArea", "Indoor space");
  await setTimes("10:00", "12:00");
  let e = await estimate();
  check("  until it is answered there is no figure", !/\$\d+ per/.test(e), e);
  check("  and it says what is missing", /still need/i.test(e), e);

  await pick("pricingCategory", "Meeting");
  e = await estimate();
  check("  answered as a meeting, it is $40", /\$40/.test(e), e);

  await pick("pricingCategory", "Event");
  e = await estimate();
  check("  answered as an event, it is $75", /\$75/.test(e), e);
}

// ==========================================================================
console.log("\n=== the cleaning charge is stated and never added in ===");
{
  const e = await estimate();
  check("the notice is there", /\$75 cleaning charge/.test(e), e);
  check("  and says it is not included", /not included in the estimate/i.test(e), e);
  // The total is the rate, not the rate plus cleaning.
  const total = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="estimate"]');
    const m = el.innerText.match(/Total\s*\$(\d+)/);
    return m ? Number(m[1]) : null;
  });
  check("  the total is $75, the event rate, not $150", total === 75, String(total));
}

console.log("\n=== a reduced fee request keeps the standard figure visible ===");
{
  await pick("lowCost", "Yes");
  const e = await estimate();
  check("the estimate is still shown", /\$75/.test(e), e);
  check("  with the reduced fee note beside it",
    /Reduced fee requested/.test(e) && /standard pricing/i.test(e), e);
  check("  and no reduction has been worked out for them",
    !/discount|reduced to|\$\d+ off/i.test(e), e);

  // And on a request that needs a person, the two coexist.
  await setTimes("07:00", "20:00");
  const e2 = await estimate();
  check("on a custom-priced request both appear",
    /Contact us for pricing/.test(e2) && /Reduced fee requested/.test(e2), e2);
  await setTimes("10:00", "13:00");
  await pick("lowCost", "No");
}

// ==========================================================================
console.log("\n=== a multi-day booking is a quote, a repeating one too ===");
{
  await setDates(future(30), future(32));
  let e = await estimate();
  check("more than one day needs a person", /Contact us for pricing/.test(e), e);
  check("  and says so in those words", /more than one day/i.test(e), e);
  await setDates(future(30), "");

  await pick("useType", "Creative event");
  await pick("oneTimeRecurring", "Recurring request");
  e = await estimate();
  check("a repeating event needs a person", /Contact us for pricing/.test(e), e);
  check("  and no figure is shown", !/Total/.test(e), e);
}

// ==========================================================================
console.log("\n=== on a phone ===");
{
  const small = await ctx.newPage();
  await small.setViewportSize({ width: 390, height: 844 });
  await small.goto(BASE + "/request/", { waitUntil: "networkidle" });
  await small.waitForTimeout(600);
  const fits = await small.evaluate(() => {
    const el = document.querySelector('[data-testid="estimate"]');
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, width: window.innerWidth };
  });
  check("the estimate fits the screen",
    fits.left >= 0 && fits.right <= fits.width + 1, JSON.stringify(fits));
  const ref = await small.evaluate(() => {
    const el = [...document.querySelectorAll("div")]
      .find((d) => /What it costs/.test(d.innerText || ""));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, width: window.innerWidth };
  });
  check("  and so does the rate list", ref && ref.left >= 0 && ref.right <= ref.width + 1,
    JSON.stringify(ref));
  await small.close();
}

console.log("\n=== by keyboard ===");
{
  // The two controls pricing added are a radio group and a number box. Both
  // have to be reachable and operable without a mouse.
  await pick("useType", "Meeting");
  await pick("requestedArea", "Indoor space");
  // Two hours, or the estimate below is correctly a quote rather than a rate
  // and the assertion would be measuring the wrong thing.
  await setTimes("10:00", "12:00");
  await pick("oneTimeRecurring", "Recurring request");
  await page.waitForTimeout(150);
  const reachable = await page.evaluate(() => {
    const el = document.querySelector("#meetings-per-month");
    if (!el) return "missing";
    el.focus();
    return document.activeElement === el ? "" : "could not focus";
  });
  check("the meetings box takes focus", reachable === "", reachable);
  await page.keyboard.type("3");
  await page.waitForTimeout(150);
  const e = await estimate();
  check("  and typing into it moves the estimate", /\$80/.test(e), e);

  const labelled = await page.evaluate(() => {
    const el = document.querySelector("#meetings-per-month");
    const lab = document.querySelector('label[for="meetings-per-month"]');
    return { hasLabel: !!lab, text: lab ? lab.innerText.trim() : "", type: el.type };
  });
  check("  it has a label tied to it", labelled.hasLabel, JSON.stringify(labelled));
  check("  and is a number field", labelled.type === "number", labelled.type);

  const live = await page.evaluate(() =>
    document.querySelector('[data-testid="estimate"]').getAttribute("aria-live"));
  check("the estimate announces itself when it changes", live === "polite", String(live));
}

// ==========================================================================
console.log("\n=== what reaches the Apps Script ===");
{
  await page.goto(BASE + "/request/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await pick("useType", "Meeting");
  await pick("publicPrivate", "Public event");
  await pick("oneTimeRecurring", "One-time request");
  await pick("lowCost", "Yes");
  await pick("requestedArea", "Indoor space");
  await pick("calendarVisibility", "Show as Booked event");
  await pick("petApproval", "No");
  await setDates(future(30), "");
  await setTimes("10:00", "12:00");

  await page.evaluate(() => {
    const set = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    for (const el of document.querySelectorAll("form input, form textarea")) {
      if (["radio", "date", "time", "hidden"].includes(el.type)) continue;
      if (el.name === "website") continue;
      if (el.type === "checkbox") { if (el.required && !el.checked) el.click(); continue; }
      if (el.type === "number") { set(el, "12"); continue; }
      if (el.type === "email") { set(el, "pricing@example.com"); continue; }
      if (el.type === "tel") { set(el, "805-555-0199"); continue; }
      if (!el.value) set(el, "Pricing test");
    }
  });
  await page.waitForTimeout(200);

  const blocked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")].find((x) => x.type === "submit");
    if (!btn) return "no submit button";
    if (btn.disabled) return "disabled";
    btn.click();
    return "";
  });
  check("it submitted", blocked === "", blocked);
  await page.waitForTimeout(2500);

  const payload = posted.length ? JSON.parse(posted[posted.length - 1]) : null;
  check("something was posted", payload !== null);
  if (payload) {
    check("  the category is carried", payload.pricingCategory === "meeting",
      String(payload.pricingCategory));
    check("  the status is carried", payload.pricingStatus === "estimate",
      String(payload.pricingStatus));
    check("  the amount is carried", payload.pricingAmount === 40,
      JSON.stringify(payload.pricingAmount));
    check("  the billing unit is carried", payload.pricingUnit === "per meeting",
      String(payload.pricingUnit));
    check("  the breakdown is carried", /Indoor meeting/.test(payload.pricingBreakdown || ""),
      String(payload.pricingBreakdown));
    check("  the reduced fee request is carried",
      payload.reducedFeeRequested === true, JSON.stringify(payload.reducedFeeRequested));
    check("  and the inputs it was worked out from are too",
      payload.requestedArea === "Indoor space" && payload.startTime === "10:00" &&
      payload.endTime === "12:00",
      JSON.stringify([payload.requestedArea, payload.startTime, payload.endTime]));
  }
}

console.log("\n=== a custom-priced request never posts a zero ===");
{
  await page.goto(BASE + "/request/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await pick("useType", "Private event");
  await pick("publicPrivate", "Private gathering");
  await pick("oneTimeRecurring", "One-time request");
  await pick("lowCost", "No");
  await pick("requestedArea", "Indoor space");
  await pick("calendarVisibility", "Show as Unavailable");
  await pick("petApproval", "No");
  await setDates(future(30), "");
  // Twelve hours: past every event limit.
  await setTimes("08:00", "20:00");

  await page.evaluate(() => {
    const set = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    for (const el of document.querySelectorAll("form input, form textarea")) {
      if (["radio", "date", "time", "hidden"].includes(el.type)) continue;
      if (el.name === "website") continue;
      if (el.type === "checkbox") { if (el.required && !el.checked) el.click(); continue; }
      if (el.type === "number") { set(el, "60"); continue; }
      if (el.type === "email") { set(el, "custom@example.com"); continue; }
      if (el.type === "tel") { set(el, "805-555-0188"); continue; }
      if (!el.value) set(el, "Long event");
    }
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("form button")].find((x) => x.type === "submit");
    if (btn && !btn.disabled) btn.click();
  });
  await page.waitForTimeout(2500);

  const payload = posted.length ? JSON.parse(posted[posted.length - 1]) : null;
  check("it was submitted despite needing a quote", payload !== null);
  if (payload) {
    check("  the status says custom", payload.pricingStatus === "custom",
      String(payload.pricingStatus));
    // The whole reason this test exists. Zero is a price.
    check("  the amount is empty, not 0", payload.pricingAmount === "",
      JSON.stringify(payload.pricingAmount));
    check("  the unit is empty too", payload.pricingUnit === "",
      JSON.stringify(payload.pricingUnit));
    check("  and the summary says to contact us",
      /Contact us for pricing/.test(payload.pricingSummary || ""),
      String(payload.pricingSummary));
  }
}

// ==========================================================================
console.log("\n=== /details/ quotes the same numbers as the form ===");
{
  // Both read src/lib/pricing.ts, so this cannot drift while that stays true.
  // It is here to catch the day somebody types a rate straight into one of
  // the two pages, which is how the published price and the quoted price come
  // apart without anybody noticing until a customer does.
  const details = await ctx.newPage();
  await details.goto(BASE + "/details/", { waitUntil: "networkidle" });
  await details.waitForTimeout(400);
  const text = await details.evaluate(() => document.body.innerText);

  for (const [label, amount] of [
    ["one-time indoor meeting", "$40"],
    ["recurring indoor meetings", "$80"],
    ["half-day indoor event", "$75"],
    ["full-day indoor event", "$150"],
    ["one-time meeting, both areas", "$190"],
    ["recurring meetings, both areas", "$230"],
    ["half-day event, both areas", "$225"],
    ["full-day event, both areas", "$300"],
  ]) {
    check(`${label} is published as ${amount}`, text.includes(amount));
  }
  check("the cleaning charge is published too", /\$75/.test(text) && /cleaning/i.test(text));
  check("  and the definitions people choose by are there",
    /up to 2 hours/i.test(text) && /celebration/i.test(text));
  check("  along with what needs a person",
    /priced individually/i.test(text), "");
  check("  and that setup and cleanup do not count towards the limits",
    /setup and cleanup/i.test(text) && /does not count/i.test(text), "");

  // Four rows of booking against three columns of area.
  const grid = await details.evaluate(() => {
    const t = document.querySelector("table");
    return t ? { rows: t.querySelectorAll("tbody tr").length,
                 cols: t.querySelectorAll("thead th").length } : null;
  });
  check("it is laid out as a real table", grid && grid.rows === 4 && grid.cols === 4,
    JSON.stringify(grid));

  await details.setViewportSize({ width: 390, height: 844 });
  await details.waitForTimeout(250);
  const overflow = await details.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("  and on a phone the table does not stretch the page",
    overflow <= 1, String(overflow));
  await details.close();
}

check("no unexpected errors throughout", errors.length === 0, errors.join(" | "));

await ctx.close();
await b.close();
report();

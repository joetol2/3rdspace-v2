// The pricing rules, server side.
//
// Runs tests/fixtures/pricing-cases.json against computePricing in
// google-apps-script/mailing-list.gs: the same file tests/pricing.test.ts runs
// against src/lib/pricing.ts.
//
// That duplication is the point. The form posts JSON from a page the
// requester is looking at, so the amount in the payload is a claim. The server
// works the price out again from the answers and stores its own figure. Two
// implementations of one rule set drift unless something forces them not to,
// and this file is that something: change a rate in one language and the other
// language's run of these cases fails.
//
//   node tests/pricing-gs.test.cjs
//
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "google-apps-script", "mailing-list.gs"), "utf8");
const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "pricing-cases.json"), "utf8"));

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

// Enough of Apps Script to evaluate the file. The pricing functions touch none
// of it, but the file is evaluated whole.
const logged = [];
const scope = {
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => null, insertSheet: () => null }) },
  People: {}, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail() {} }, Logger: { log() {} },
  Session: { getScriptTimeZone: () => "America/Los_Angeles" },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
  Utilities: { getUuid: () => "u", formatDate: (d) => d.toISOString(), sleep() {} },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 204, getContentText: () => "" }) },
  CalendarApp: { getCalendarById: () => ({ getEvents: () => [], getEventById: () => null }) },
  HtmlService: { createHtmlOutput: (h) => String(h) },
  ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }) },
  console: { log: (m) => logged.push(String(m)), error: (m) => logged.push(String(m)) },
};
const names = Object.keys(scope);
const call = (body) =>
  new Function(...names, SRC + "\n; return (" + body + ");")(...names.map((n) => scope[n]));

const computePricing = call("computePricing");
const pricingInputsFromPayload = call("pricingInputsFromPayload");
const pricingForRequest = call("pricingForRequest");
const describePricing = call("describePricing");
const pricingDurationMinutes = call("pricingDurationMinutes");
const pricingCategoryFromUseType = call("pricingCategoryFromUseType");

// ==========================================================================
console.log("\n=== the same cases the website is held to ===");
for (const c of FIXTURE.cases) {
  const got = computePricing(c.input);
  const e = c.expect;

  if (got.status !== e.status) {
    check(c.name, false, `expected ${e.status}, got ${got.status}`);
    continue;
  }
  if (got.status !== "estimate") {
    check(c.name + " -> " + got.status, true);
    continue;
  }
  const problems = [];
  if (got.amount !== e.amount) problems.push(`amount ${got.amount} not ${e.amount}`);
  if (got.unit !== e.unit) problems.push(`unit "${got.unit}" not "${e.unit}"`);
  if (got.lines.length !== e.lines) problems.push(`${got.lines.length} line(s) not ${e.lines}`);
  if ((got.monthlyTotal || null) !== (e.monthlyTotal || null)) {
    problems.push(`monthly ${got.monthlyTotal} not ${e.monthlyTotal}`);
  }
  const sum = got.lines.reduce((t, l) => t + l.amount, 0);
  if (sum !== got.amount) problems.push(`lines total ${sum}, headline ${got.amount}`);
  check(c.name + " -> $" + got.amount + " " + got.unit, problems.length === 0, problems.join("; "));
}

// ==========================================================================
console.log("\n=== the form's own answers map onto those inputs ===");
for (const c of FIXTURE.answerCases) {
  // The same derivation cases the website is held to. This is the step before
  // the rate table: the words the form posts, turned into facts.
  const got = pricingInputsFromPayload(c.answers);
  const wrong = Object.keys(c.expectInput).filter((k) => got[k] !== c.expectInput[k]);
  const status = computePricing(got).status;
  if (status !== c.expectStatus) wrong.push(`status ${status} not ${c.expectStatus}`);
  check(c.name, wrong.length === 0,
    wrong.map((k) => `${k}=${JSON.stringify(got[k])}`).join(", "));
}

console.log("\n=== and the mapping holds for the odds and ends ===");
{
  const base = {
    useType: "Meeting", oneTimeRecurring: "One-time request",
    requestedArea: "Indoor space", startTime: "10:00", endTime: "12:00",
    preferredDate: "2026-11-02",
  };
  const i = pricingInputsFromPayload(base);
  check("Meeting, one-time, indoor, 2 hours",
    i.category === "meeting" && i.recurring === false && i.area === "indoor" &&
    i.durationMinutes === 120 && i.multiDay === false, JSON.stringify(i));

  check("  'Outdoor / parking lot' is the outdoor area",
    pricingInputsFromPayload({ ...base, requestedArea: "Outdoor / parking lot" }).area === "outdoor");
  check("  'Both' is both",
    pricingInputsFromPayload({ ...base, requestedArea: "Both" }).area === "both");
  check("  'Not sure yet' on the area is distinct from unanswered",
    pricingInputsFromPayload({ ...base, requestedArea: "Not sure yet" }).area === "unsure" &&
    pricingInputsFromPayload({ ...base, requestedArea: "" }).area === "");
  check("  'Not sure yet' on recurrence is distinct from unanswered",
    pricingInputsFromPayload({ ...base, oneTimeRecurring: "Not sure yet" }).recurring === "unsure" &&
    pricingInputsFromPayload({ ...base, oneTimeRecurring: "" }).recurring === null);

  // An end date later than the preferred date is the only thing that makes a
  // booking multi-day. A recurring series' last date is NOT in this field,
  // and conflating the two is a bug this project has already had once.
  check("a later end date is multi-day",
    pricingInputsFromPayload({ ...base, endDate: "2026-11-04" }).multiDay === true);
  check("  the same date is not",
    pricingInputsFromPayload({ ...base, endDate: "2026-11-02" }).multiDay === false);
  check("  and no end date is not",
    pricingInputsFromPayload({ ...base, endDate: "" }).multiDay === false);

  check("a blank meeting count is not a zero",
    pricingInputsFromPayload({ ...base, meetingsPerMonth: "" }).meetingsPerMonth === null);
  check("  'Varies' is not a zero either",
    pricingInputsFromPayload({ ...base, meetingsPerMonth: "Varies" }).meetingsPerMonth === null);
  check("  a real count comes through as a number",
    pricingInputsFromPayload({ ...base, meetingsPerMonth: "3" }).meetingsPerMonth === 3);
  check("  and so does one that arrives as a number",
    pricingInputsFromPayload({ ...base, meetingsPerMonth: 3 }).meetingsPerMonth === 3);
}

// ==========================================================================
console.log("\n=== the category is derived, not accepted ===");
{
  // The requester's extra answer is honoured only where "Type of use" leaves
  // the question genuinely open. Where it does not, a payload claiming
  // otherwise changes nothing: that field is as editable as any other on the
  // page, and the gap between $40 and $150 is worth having a rule about.
  const lying = {
    useType: "Workshop or class", pricingCategory: "meeting",
    oneTimeRecurring: "One-time request", requestedArea: "Indoor space",
    startTime: "09:00", endTime: "11:00", preferredDate: "2026-11-02",
  };
  const p = pricingForRequest(lying);
  check("a workshop claiming to be a meeting is still an event", p.category === "event", p.category);
  check("  and is priced as one", p.amount === 75, String(p.amount));

  // Where the type of use really is ambiguous, the answer is used, because
  // there the requester was asked a question rather than shown a total.
  const ambiguous = { ...lying, useType: "Community gathering", pricingCategory: "meeting" };
  const q = pricingForRequest(ambiguous);
  check("a community gathering answered as a meeting is a meeting", q.category === "meeting");
  check("  and is priced as one", q.amount === 40, String(q.amount));
  check("  while the same request left unanswered cannot be priced",
    pricingForRequest({ ...lying, useType: "Community gathering", pricingCategory: "" })
      .status === "incomplete");
}

// ==========================================================================
console.log("\n=== the browser's figure is recorded, never used ===");
{
  const honest = {
    useType: "Meeting", oneTimeRecurring: "One-time request",
    requestedArea: "Indoor space", startTime: "10:00", endTime: "12:00",
    preferredDate: "2026-11-02", pricingAmount: 40, email: "a@b.com",
  };
  const ok = pricingForRequest(honest);
  check("agreement is noted", ok.clientAgrees === true);
  check("  and the amount is the server's", ok.amount === 40);

  logged.length = 0;
  const tampered = { ...honest, pricingAmount: 1 };
  const bad = pricingForRequest(tampered);
  check("a payload claiming $1 does not get $1", bad.amount === 40, String(bad.amount));
  check("  the disagreement is flagged", bad.clientAgrees === false);
  check("  and logged rather than thrown", logged.some((l) => /\[pricing\]/.test(l)),
    logged.join(" | "));
  check("  what the browser claimed is kept, for looking at later",
    bad.clientAmount === 1, String(bad.clientAmount));
}

// ==========================================================================
console.log("\n=== a request that needs a person is not a free booking ===");
{
  // This is the one that would be expensive to get wrong. Written as 0 into
  // the sheet, a custom-priced request reads as a booking at no charge, and
  // sums with the rest of the column as one.
  const multiDay = pricingForRequest({
    useType: "Private event", oneTimeRecurring: "One-time request",
    requestedArea: "Indoor space", startTime: "10:00", endTime: "14:00",
    preferredDate: "2026-11-02", endDate: "2026-11-04",
  });
  check("multi-day is custom", multiDay.status === "custom");
  check("  its amount is null, not 0", multiDay.amount === null, String(multiDay.amount));
  check("  its unit is empty", multiDay.unit === "");
  check("  its breakdown is empty", multiDay.breakdown === "");
  check("  and its summary says to contact us",
    /Contact us for pricing/.test(multiDay.summary), multiDay.summary);
  check("  with no dollar figure anywhere in it", !/\$/.test(multiDay.summary), multiDay.summary);

  const recurringEvent = pricingForRequest({
    useType: "Creative event", oneTimeRecurring: "Recurring request",
    requestedArea: "Indoor space", startTime: "10:00", endTime: "13:00",
    preferredDate: "2026-11-02",
  });
  check("a recurring event is custom", recurringEvent.status === "custom");
  check("  and is also not a zero", recurringEvent.amount === null);

  const fiveMeetings = pricingForRequest({
    useType: "Meeting", oneTimeRecurring: "Recurring request",
    requestedArea: "Indoor space", startTime: "10:00", endTime: "12:00",
    preferredDate: "2026-11-02", meetingsPerMonth: 5,
  });
  check("five meetings in a month is custom", fiveMeetings.status === "custom");
  check("  and is not a zero", fiveMeetings.amount === null);
}

// ==========================================================================
console.log("\n=== the breakdown reads as a sentence, not a struct ===");
{
  const both = pricingForRequest({
    useType: "Meeting", oneTimeRecurring: "Recurring request",
    requestedArea: "Both", startTime: "10:00", endTime: "12:00",
    preferredDate: "2026-11-02", meetingsPerMonth: 4,
  });
  check("the $230 month shows where it comes from",
    /Indoor recurring meeting plan, monthly: \$80/.test(both.breakdown) &&
    /Outdoor \/ parking lot: \$150/.test(both.breakdown), both.breakdown);
  check("  and the summary carries the billing unit",
    both.summary === "$230 per calendar month", both.summary);

  const outdoor = pricingForRequest({
    useType: "Meeting", oneTimeRecurring: "Recurring request",
    requestedArea: "Outdoor / parking lot", startTime: "10:00", endTime: "12:00",
    preferredDate: "2026-11-02", meetingsPerMonth: 4,
  });
  check("outdoor-only carries no interior line item",
    !/Indoor/.test(outdoor.breakdown), outdoor.breakdown);
  check("  and states the month alongside the per-meeting rate",
    outdoor.summary === "$150 per meeting; $600 for that month", outdoor.summary);
}

// ==========================================================================
console.log("\n=== an old request from before pricing existed still works ===");
{
  // There are rows in the sheet, and drafts in people's browsers, submitted
  // before any of this existed. They carry no pricing fields at all. They
  // must come through as "we do not know", never as zero.
  const old = pricingForRequest({
    name: "Someone", email: "old@example.com",
    useType: "Community gathering", oneTimeRecurring: "One-time request",
    requestedArea: "Indoor space", startTime: "18:00", endTime: "20:00",
    preferredDate: "2026-11-02",
  });
  check("it is handled without throwing", Boolean(old));
  check("  it is not priced at zero", old.amount === null, String(old.amount));
  check("  and it says what is missing", old.status === "incomplete", old.status);

  const empty = pricingForRequest({});
  check("an entirely empty payload is survivable", empty.status === "incomplete");
  check("  and still not a zero", empty.amount === null);
  check("undefined is survivable too", pricingForRequest(undefined).status === "incomplete");
}

// ==========================================================================
console.log("\n=== the two ports agree on the pieces, not just the totals ===");
{
  check("duration ignores everything but the two times",
    pricingDurationMinutes("14:00", "18:00") === 240 &&
    pricingDurationMinutes("14:00", "18:01") === 241 &&
    pricingDurationMinutes("18:00", "14:00") === null);
  check("the use types that already decide the category",
    pricingCategoryFromUseType("Meeting") === "meeting" &&
    pricingCategoryFromUseType("Workshop or class") === "event" &&
    pricingCategoryFromUseType("Private event") === "event" &&
    pricingCategoryFromUseType("Community gathering") === "ask");
  check("describePricing never prints a bare zero",
    describePricing({ status: "custom", reason: "x" }).indexOf("$") === -1);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

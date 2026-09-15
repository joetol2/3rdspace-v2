// The calendar page shows the venue's time, whoever is looking.
//
// 3RD SPACE is one room in Santa Ynez. An event at seven in the evening is at
// seven in the evening whether you read the page from California, New York or
// Tokyo, because you are planning a drive to the building either way. Every
// other thing that states a time already works like this: the reply email, a
// flyer, Laura on the telephone.
//
// The page used to render with getHours(), which is the BROWSER's clock, so a
// 10:30 rehearsal read as 1:30 PM to somebody in New York. That is the same
// class of bug as the one that made the build publish Pacific times seven
// hours early, at the other end of the pipe.
//
// So this loads the real page in browsers pinned to four different timezones
// and asserts the rendered text is identical. A test that only ever runs in
// one zone cannot see this at all.
//
//   node tests/venue-time.test.mjs
//
import { BASE, check, launchBrowser, report } from "./lib/harness.mjs";

const b = await launchBrowser();

// Two on either side of the venue, one of them a day ahead, plus the venue
// itself as the control.
const ZONES = ["America/Los_Angeles", "UTC", "America/New_York", "Asia/Tokyo"];

async function renderIn(timezoneId) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1400 }, timezoneId });
  const page = await ctx.newPage();
  await page.goto(BASE + "/calendar/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const out = await page.evaluate(() => {
    const clean = (s) => s.replace(/\s+/g, " ").trim();
    const lists = [...document.querySelectorAll("li")].map((li) => clean(li.innerText));
    // The month grid's day cells, so a date landing on the wrong day shows up.
    const grid = clean(document.body.innerText).match(/January|February|March|April|May|June|July|August|September|October|November|December/g) || [];
    return {
      // What the browser thinks it is, to prove the pin actually took.
      browserZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      rows: lists,
      months: grid,
      note: clean(document.body.innerText).match(/All times are [A-Z]{2,5}, the time at the space\./)?.[0] || "",
      body: clean(document.body.innerText),
    };
  });
  await ctx.close();
  return out;
}

const results = {};
for (const z of ZONES) results[z] = await renderIn(z);

console.log("\n=== the browser really is in the zone we asked for ===");
for (const z of ZONES) {
  check(`${z} -> ${results[z].browserZone}`, results[z].browserZone === z,
    results[z].browserZone);
}

console.log("\n=== every visitor sees the same times ===");
{
  const control = results["America/Los_Angeles"];
  check("the venue's own view has event rows to compare",
    control.rows.length > 0, String(control.rows.length));

  for (const z of ZONES.slice(1)) {
    const other = results[z];
    check(`${z} sees the same rows as Santa Ynez`,
      JSON.stringify(other.rows) === JSON.stringify(control.rows),
      "first difference: " +
        (control.rows.find((r, i) => r !== other.rows[i]) || "(count " +
          control.rows.length + " vs " + other.rows.length + ")") +
        "  vs  " + (other.rows.find((r, i) => r !== control.rows[i]) || "(none)"));
  }
}

console.log("\n=== and the same month, so nothing slipped a day ===");
for (const z of ZONES.slice(1)) {
  check(`${z} opens on the same month`,
    results[z].months[0] === results["America/Los_Angeles"].months[0],
    results[z].months[0] + " vs " + results["America/Los_Angeles"].months[0]);
}

console.log("\n=== the page says which clock it is on ===");
{
  const note = results["America/Los_Angeles"].note;
  check("the note is there", /^All times are/.test(note), note || "(missing)");
  check("  and names a Pacific zone", /\b(PDT|PST)\b/.test(note), note);
  check("  it says the same thing to a visitor in Tokyo",
    results["Asia/Tokyo"].note === note, results["Asia/Tokyo"].note);
  check("  and it is said once, not on every row",
    (results["America/Los_Angeles"].body.match(/All times are/g) || []).length === 1,
    String((results["America/Los_Angeles"].body.match(/All times are/g) || []).length));
}

await b.close();
report();

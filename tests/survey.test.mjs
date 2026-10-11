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

console.log("\n=== the survey itself ===");
{
  await page.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const text = await page.evaluate(() => document.body.innerText);
  check("it explains what the page is for", /what you would like to see/i.test(text));
  check("  and says every question is optional", /every question is optional/i.test(text));

  // Scoped to #survey throughout. The footer's mailing-list signup is a
  // second form on every page of the site, with a required email in it, so an
  // unscoped count measures the footer as well and reads as a page fault.
  const shape = await page.evaluate(() => ({
    form: document.querySelectorAll("#survey form").length,
    fieldsets: document.querySelectorAll("#survey form fieldset").length,
    inputs: document.querySelectorAll("#survey form input, #survey form textarea").length,
  }));
  check("there is one form", shape.form === 1, String(shape.form));
  check("  with its questions grouped", shape.fieldsets > 5, String(shape.fieldsets));
  check("  and plenty to answer", shape.inputs > 30, String(shape.inputs));

  // Nothing may be required. A half-answered survey is still data, and a
  // required field is the most reliable way to turn that person into nothing.
  const required = await page.evaluate(() =>
    document.querySelectorAll("#survey form [required]").length);
  check("no question is compulsory", required === 0, String(required));
}

console.log("\n=== it will not send an empty survey ===");
{
  const before = await page.evaluate(() =>
    document.querySelector('#survey form button[type="submit"]').disabled);
  check("the button starts disabled", before === true, String(before));

  await page.evaluate(() => {
    const t = document.querySelector("#q-programmingWanted");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
      .set.call(t, "More music please");
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() =>
    document.querySelector('#survey form button[type="submit"]').disabled);
  check("  one answer is enough to enable it", after === false, String(after));
}

console.log("\n=== every question is on the page from the start ===");
{
  // The kids section used to stay hidden until somebody answered Yes. It does
  // not any more, so the things to prove are the opposite of what they were:
  // all of it is there before anything is answered, and answering the kids
  // question either way changes nothing about what is on screen.
  const kidFields = () => page.evaluate(() => ({
    gate: !!document.querySelector('input[name="kidsInterest"]'),
    ages: !!document.querySelector('input[name="kidsAges"]'),
    nature: !!document.querySelector('input[name="natureInterest"]'),
    withKids: !!document.querySelector('input[name="programWithKids"]'),
    importance: !!document.querySelector('input[name="natureImportance"]'),
  }));

  const allThere = (f) => f.gate && f.ages && f.nature && f.withKids && f.importance;

  let f = await kidFields();
  check("the whole kids section is there before anything is answered",
    allThere(f), JSON.stringify(f));

  const answerGate = (value) => page.evaluate((v) => {
    [...document.querySelectorAll('input[name="kidsInterest"]')]
      .find((r) => r.value === v).click();
  }, value);

  await answerGate("No");
  await page.waitForTimeout(200);
  f = await kidFields();
  check("  answering No hides nothing", allThere(f), JSON.stringify(f));

  await answerGate("Yes");
  await page.waitForTimeout(200);
  f = await kidFields();
  check("  answering Yes changes nothing either", allThere(f), JSON.stringify(f));
}

console.log("\n=== it says kids, not children ===");
{
  const text = await page.evaluate(() =>
    document.querySelector("#survey").innerText);
  check("nothing on the page says children", !/child/i.test(text),
    (text.match(/[^\n]*child[^\n]*/i) || [""])[0]);
  check("  and the kids questions are there", /kids/i.test(text));
}

console.log("\n=== what reaches the spreadsheet ===");
{
  const posted = [];
  await ctx.route("**script.google.com/**", (route) => {
    posted.push(route.request().postData() || "");
    route.fulfill({ status: 200, body: "" });
  });

  await page.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const setText = (sel, v) => {
      const el = document.querySelector(sel);
      const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const tick = (name, value) =>
      [...document.querySelectorAll(`input[name="${name}"]`)]
        .find((i) => i.value === value).click();

    setText("#q-programmingWanted", "Pottery and poetry");
    // Ticked LAST to FIRST on purpose. The cell is a joined string, so click
    // order would mean the same three answers arrive written three different
    // ways and the column could not be sorted or grouped.
    tick("topics", "Crafts");
    tick("topics", "Music");
    tick("topics", "Art");
    setText("#q-topics-other", "welding");
    tick("mixedAge", "Yes");
    tick("weekPart", "Weekends");
    tick("days", "Saturday");
    tick("kidsInterest", "No");
    tick("kidsAges", "5 to 6");
  });
  await page.waitForTimeout(250);

  await page.evaluate(() =>
    document.querySelector('#survey form button[type="submit"]').click());
  await page.waitForTimeout(2000);

  check("something was posted", posted.length > 0, "nothing left the browser");
  const payload = posted.length ? JSON.parse(posted[posted.length - 1]) : null;
  if (payload) {
    check("  it is a survey response", payload.formType === "survey_response",
      String(payload.formType));
    check("  the free text came through",
      payload.programmingWanted === "Pottery and poetry",
      String(payload.programmingWanted));
    check("  a multi-select arrives as a list",
      Array.isArray(payload.topics), JSON.stringify(payload.topics));
    check("  with the Other answer folded in, and last",
      (payload.topics || []).slice(-1)[0] === "Other: welding",
      JSON.stringify(payload.topics));
    check("  a yes/no answer is its word", payload.mixedAge === "Yes",
      String(payload.mixedAge));
    check("  a single-choice answer is a string", payload.weekPart === "Weekends",
      String(payload.weekPart));

    // Sorted into the order the question lists them, not the order clicked.
    // The options run Civic, Youth culture, Art, Music, Games, Food, Crafts,
    // and they were ticked Crafts, Music, Art.
    check("  a multi-select comes back in the question's order, not click order",
      (payload.topics || []).join(" | ") === "Art | Music | Crafts | Other: welding",
      JSON.stringify(payload.topics));

    // Nothing is conditional any more, so an answer in the kids section is
    // sent even from somebody who said No to it.
    check("  kids answers are sent even after answering No",
      payload.kidsAges && payload.kidsAges.includes("5 to 6"),
      JSON.stringify(payload.kidsAges));
    check("  along with the kids question itself", payload.kidsInterest === "No",
      String(payload.kidsInterest));

    // Nobody filled in a name or an email, and that has to be allowed.
    check("  it submitted with no email at all", !payload.email,
      JSON.stringify(payload.email));
    check("  the mailing list box is a real false, not missing",
      payload.joinMailingList === false, JSON.stringify(payload.joinMailingList));
    check("  the honeypot is empty", !payload.website, JSON.stringify(payload.website));
    check("  and a submissionId is there, so a retry cannot double-count",
      typeof payload.submissionId === "string" && payload.submissionId.length > 10);
  }

  const thanks = await page.evaluate(() => document.body.innerText);
  check("the person is thanked", /thank you/i.test(thanks));
}

console.log("\n=== on a phone ===");
{
  const small = await ctx.newPage();
  await small.setViewportSize({ width: 390, height: 844 });
  await small.goto(BASE + "/survey/", { waitUntil: "networkidle" });
  await small.waitForTimeout(500);
  const overflow = await small.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("nothing is cropped off the right edge", overflow <= 1, String(overflow));
  const tap = await small.evaluate(() => {
    const boxes = [...document.querySelectorAll('#survey form input[type="checkbox"], #survey form input[type="radio"]')];
    const small = boxes.filter((b) => {
      const r = b.closest("label").getBoundingClientRect();
      return r.height < 24;
    });
    return { total: boxes.length, cramped: small.length };
  });
  check("  the choices are big enough to tap", tap.cramped === 0,
    tap.cramped + " of " + tap.total + " under 24px");
  await small.close();
}

await ctx.close();
await b.close();
report();

// The workflow diagram: what happens when somebody asks to use the space.
//
// Built as a CSS grid rather than drawn wires, so unlike the system map there
// is nothing to collide. What can still go wrong is the phone layout: in one
// column the grid's DOM order puts every stage header at the top, stranded
// from the cards they belong to, which is what these check.
//
//   node tests/workflow.test.mjs
//
import { BASE, check, launchBrowser, openDoc, overflowProbe, report }
  from "./lib/harness.mjs";

const b = await launchBrowser();
const PATH = "/how_it_works/workflow/";

console.log("\n=== it says the things it exists to say ===");
{
  const { page, ctx } = await openDoc(b, PATH, 1280, 1000);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
  for (const phrase of [
    "What happens when somebody asks to use the space",
    "it is not confirmed yet",          // the thing requesters most often ask about
    "TIME CONFLICT",
    "That email is the proof",          // the broken-screen reassurance
    "If you do nothing",
    "does not come to you",             // the digest no longer reaching her
    "cancel link",
    "The mailing list is a separate thing",
    "Never in To",                      // the one mistake no code can prevent
  ]) check(`says "${phrase.slice(0, 38)}"`, t.includes(phrase));
  check("no em dashes", !t.includes("—"));
  check("no unreplaced tokens", !/__[A-Z][A-Z_]*__/.test(t));
  await ctx.close();
}

console.log("\n=== the grid is a grid ===");
{
  const { page, ctx } = await openDoc(b, PATH, 1280, 1000);
  const m = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".cell")];
    const heads = [...document.querySelectorAll(".stagehead")];
    const lanes = [...document.querySelectorAll(".lanehead")];
    // Every card in a lane must sit at the same vertical band as its lane head.
    const rows = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().top / 5)));
    return { cells: cells.length, heads: heads.length, lanes: lanes.length, bands: rows.size };
  });
  check("three lanes", m.lanes === 3, String(m.lanes));
  check("four stages", m.heads === 4, String(m.heads));
  check("twelve cells", m.cells === 12, String(m.cells));
  check("  laid out in three rows, not twelve", m.bands === 3, `${m.bands} bands`);
  await ctx.close();
}

console.log("\n=== every link goes somewhere real ===");
{
  const { page, ctx } = await openDoc(b, PATH, 1280, 1000);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")));
  for (const h of [...new Set(hrefs)]) {
    const res = await page.request.get(BASE + h);
    check(`${h} -> ${res.status()}`, res.status() === 200);
  }
  await ctx.close();
}

console.log("\n=== the other three pages link to it ===");
{
  for (const from of ["/how_it_works/", "/how_it_works/guide/", "/how_it_works/diagram/"]) {
    const { page, ctx } = await openDoc(b, from, 1280, 900);
    check(`${from} links to the workflow`,
      await page.evaluate(() => !!document.querySelector('a[href="/how_it_works/workflow/"]')));
    await ctx.close();
  }
}

console.log("\n=== on a phone, no card is stranded from its stage ===");
{
  const { page, ctx } = await openDoc(b, PATH, 390, 844);
  const m = await page.evaluate(() => {
    const headsShown = [...document.querySelectorAll(".stagehead")]
      .filter((el) => getComputedStyle(el).display !== "none").length;
    const cells = [...document.querySelectorAll(".cell")];
    const withCards = cells.filter((c) => c.querySelector(".card:not(.card--empty)"));
    const labelled = withCards.filter((c) => {
      const s = c.querySelector(".cell__stage");
      return s && getComputedStyle(s).display !== "none";
    });
    return { headsShown, withCards: withCards.length, labelled: labelled.length };
  });
  check("the stage header row is gone", m.headsShown === 0, String(m.headsShown));
  check("  and every card carries its stage instead",
    m.labelled === m.withCards && m.withCards > 0, `${m.labelled}/${m.withCards}`);
  await ctx.close();
}

console.log("\n=== nothing is cropped off the right edge ===");
for (const w of [360, 390, 768, 900, 1280, 1600]) {
  const { page, ctx } = await openDoc(b, PATH, w, 900);
  const cropped = await page.evaluate(overflowProbe);
  check(`${w}px clean`, cropped.length === 0, cropped.slice(0, 3).join("; "));
  await ctx.close();
}

await b.close();
report();

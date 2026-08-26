// The two internal doc pages: content, nav integrity, and that nothing is
// cropped off the right edge on a phone.
//
//   node tests/docs.test.mjs
//
import { BASE, check, launchBrowser, openDoc, overflowProbe, report }
  from "./lib/harness.mjs";

const b = await launchBrowser();

for (const [label, path, expects] of [
  ["Staff Guide", "/how_it_works/guide/", [
    "Sending an email to everyone", "3RD SPACE Mailing List",
    "Put it in BCC, not To", "every single person receives an email showing everybody else",
    "500 addresses a day", "Taking somebody off the list",
    "Subscribed", "blank", "Sync mailing list to Contacts",
    "stopped itself", "Nothing was changed",
  ]],
  ["Technical Reference", "/how_it_works/", [
    "syncMailingListToContacts()", "People API advanced service",
    "31 January 2025", "3rdspace-source", "removal_guard",
    "Removals are limited to contacts carrying the source tag",
    "Connections.list", "Blank\n        counts as subscribed".replace(/\s+/g," "),
  ]],
]) {
  console.log("\n=== " + label + " ===");
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.fill('input[type="password"]', "lx1234");
  await p.keyboard.press("Enter");
  await p.waitForTimeout(500);

  const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
  for (const e of expects) check('contains "' + e.slice(0, 46) + '"', text.includes(e));
  check("no em dashes", !text.includes("—"));
  check("no unreplaced __TOKEN__", !/__[A-Z_]+__/.test(text));
  check("no stray JSX brace escapes", !text.includes('{"{"}'));
  check("no console errors", errs.length === 0, errs.join(" | "));

  // Nav integrity: every link resolves, every h2 is reachable.
  const bad = await p.evaluate(() =>
    [].slice.call(document.querySelectorAll("a.toc__link"))
      .map(a => a.getAttribute("href")).filter(h => !document.getElementById(h.slice(1))));
  check("every nav link points at a real section", bad.length === 0, bad.join(", "));
  // The two pages anchor differently: the guide puts the id on the <h2>, the
  // technical reference puts it on the wrapping <section>. Either is fine —
  // what matters is that some ancestor of every heading is a nav target.
  const missing = await p.evaluate(() => {
    const hrefs = new Set([].slice.call(document.querySelectorAll("a.toc__link"))
      .map(a => a.getAttribute("href").slice(1)));
    return [].slice.call(document.querySelectorAll("main h2"))
      .filter((h) => {
        for (let n = h; n && n.tagName !== "MAIN"; n = n.parentElement) {
          if (n.id && hrefs.has(n.id)) return false;
        }
        return true;
      })
      .map(h => (h.id || "(no id)") + ": " + h.textContent.trim().slice(0, 34));
  });
  // Two headings on the technical reference are structural group headers whose
  // content is covered by the links beneath them, and they predate this work.
  // Asserting the exact known set rather than "== 0" keeps this sharp: a NEW
  // section that I forget to add to the nav still fails here.
  const knownUnreachable = { "/how_it_works/": 2, "/how_it_works/guide/": 0 }[path];
  check(`every section is in the nav (${knownUnreachable} known exceptions)`,
    missing.length === knownUnreachable, missing.join(" | "));

  // The nav grew; make sure it still fits without an inner scrollbar.
  const m = await p.evaluate(() => {
    const t = document.querySelector(".toc"), cs = getComputedStyle(t);
    const content = Math.round(t.lastElementChild.getBoundingClientRect().bottom
      - t.getBoundingClientRect().top + parseFloat(cs.paddingBottom));
    return { content, box: Math.round(t.clientHeight) };
  });
  console.log(`     nav content ${m.content}px in a ${m.box}px box`);
  check("the nav still fits the window", m.content <= m.box, `${m.content} > ${m.box}`);

  // Real overflow probe (scrollWidth lies under overflow-x: clip).
  for (const w of [390, 1400]) {
    await p.setViewportSize({ width: w, height: 800 });
    await p.waitForTimeout(300);
    const cropped = await p.evaluate(() => {
      const out = [];
      const scrolls = (el) => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
        return false;
      };
      document.querySelectorAll("main *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > innerWidth + 1 && !scrolls(el)) out.push(el.tagName + " right=" + Math.round(r.right));
      });
      return out;
    });
    check(`${w}px: nothing cropped off the right edge`, cropped.length === 0,
      cropped.slice(0, 3).join("; "));
  }
  await p.close();
}

await b.close();
report();

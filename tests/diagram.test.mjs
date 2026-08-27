// The system map's wire labels must not sit on each other or on the text
// underneath them. Rebuilt after the original checker was lost with a scratch
// directory; the diagram is hand-tuned, so this is what says whether a change
// disturbed it.
//
//   node tests/diagram.test.mjs
//
import { launchBrowser, BASE, DOC_PASSWORD } from "./lib/harness.mjs";
const WIDTHS = [1280, 1600, 1920];
const b = await launchBrowser();
let bad = 0;
for (const W of WIDTHS) {
const ctx = await b.newContext({ viewport: { width: W, height: 1200 } });
const p = await ctx.newPage();
await p.goto(BASE + "/how_it_works/diagram/", { waitUntil: "networkidle" });
await p.fill('input[type="password"]', DOC_PASSWORD);
await p.keyboard.press("Enter");
await p.waitForTimeout(1000);

// A detector that cannot report a collision is worse than no detector, so
// prove it on a deliberate one before trusting the clean result.
const probe = () => {
  // Tight glyph boxes, not element boxes: a .node__desc spans the whole card,
  // so comparing element rects invents collisions that are not there.
  const glyphRects = (el) => {
    const out = [];
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3 && c.textContent.trim()) {
          const r = document.createRange();
          r.selectNodeContents(c);
          for (const rect of r.getClientRects()) if (rect.width > 1 && rect.height > 1) out.push(rect);
        } else if (c.nodeType === 1) walk(c);
      }
    };
    walk(el);
    return out;
  };
  const overlap = (a, b) =>
    a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

  const labels = [...document.querySelectorAll(".wire-label")].map((el) => ({
    el, text: el.textContent.trim().replace(/\s+/g, " "), rect: el.getBoundingClientRect(),
  }));
  const others = [...document.querySelectorAll(".node, .panel__head, .lane, .legend, .subgroup")]
    .flatMap((el) => glyphRects(el).map((r) => ({ owner: el.className.split(" ")[0], rect: r })));

  const hits = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (overlap(labels[i].rect, labels[j].rect))
        hits.push(`LABEL x LABEL   "${labels[i].text}"  ><  "${labels[j].text}"`);
    }
    for (const o of others) {
      if (overlap(labels[i].rect, o.rect)) {
        hits.push(`LABEL x TEXT    "${labels[i].text}"  ><  ${o.owner}`);
        break;
      }
    }
  }
  return { total: labels.length, hits: [...new Set(hits)] };
};

const selfCheck = await p.evaluate((fn) => {
  const run = eval("(" + fn + ")");
  const before = run().hits.length;
  // Park one label exactly on another.
  const ls = document.querySelectorAll(".wire-label");
  const a = ls[0].getBoundingClientRect(), t = ls[1].getBoundingClientRect();
  ls[0].style.transform = `translate(${t.left - a.left}px, ${t.top - a.top}px)`;
  const after = run().hits.length;
  ls[0].style.transform = "";
  return { before, after };
}, probe.toString());

const report = await p.evaluate((fn) => eval("(" + fn + ")")(), probe.toString());
console.log(`${W}px: ${report.total} wire labels, ${report.hits.length} collisions` +
  (report.hits.length ? ":" : "") +
  `   [self-check: ${selfCheck.before} -> ${selfCheck.after} when a label is parked on another, ` +
  (selfCheck.after > selfCheck.before ? "detector works]" : "DETECTOR IS BLIND]"));
report.hits.forEach((h) => console.log("    " + h));
if (report.hits.length || selfCheck.after <= selfCheck.before) bad = 1;
await ctx.close();
}
await b.close();
process.exit(bad);

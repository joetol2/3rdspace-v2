// Shared plumbing for the browser tests.
//
// Everything here is resolved rather than hardcoded, because these were
// written inside one particular container and are meant to outlive it.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE_DIR = resolve(REPO_ROOT, ".output/public");
export const PORT = Number(process.env.TEST_PORT || 8943);
export const BASE = `http://127.0.0.1:${PORT}`;

/** The password on the internal doc pages. Not security, just a speed bump. */
export const DOC_PASSWORD = "lx1234";

let pass = 0;
let fail = 0;

export function check(name, condition, detail) {
  if (condition) {
    pass++;
    console.log("  PASS " + name);
  } else {
    fail++;
    console.log("  FAIL " + name + (detail ? " -> " + detail : ""));
  }
}

export function report() {
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

/**
 * Find playwright wherever it happens to live: a project devDependency, a
 * global install, or an explicit path. PLAYWRIGHT_MODULE overrides.
 */
export async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    "/opt/node22/lib/node_modules/playwright/index.js",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const mod = await import(candidate);
      const pw = mod.default ?? mod;
      if (pw && pw.chromium) return pw;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    "Could not find playwright. Install it (bun add -d playwright) or set " +
      "PLAYWRIGHT_MODULE to its entry point."
  );
}

export async function launchBrowser() {
  const pw = await loadPlaywright();
  // Use a preinstalled chromium if one is where we expect, otherwise let
  // playwright pick its own.
  const explicit = process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium";
  const options = existsSync(explicit) ? { executablePath: explicit } : {};
  return pw.chromium.launch(options);
}

/** Open a gated internal doc page and get past the password. */
export async function openDoc(browser, path, width = 1400, height = 768) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  !! page error: " + e.message));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.fill("#pw-input", DOC_PASSWORD);
  await page.click(".pw-gate__button");
  await page.waitForTimeout(600);
  return { page, ctx };
}

/**
 * Elements whose right edge is past the viewport.
 *
 * Both doc pages set overflow-x: clip on html and body, which means
 * scrollWidth can never exceed clientWidth: the page cannot scroll sideways
 * because the overflow is cropped, not because it fits. Checking scrollWidth
 * there reports a clean page while content is being cut off. This measures
 * where things actually land, ignoring anything inside a box that scrolls
 * sideways on purpose.
 */
export const overflowProbe = () => {
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
    if (r.right > innerWidth + 1 && !scrolls(el)) {
      out.push(el.tagName + "." + String(el.className).slice(0, 24) + " right=" + Math.round(r.right));
    }
  });
  return out;
};

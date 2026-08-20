/**
 * Write the parsed Google Calendar feed to .output/public/calendar-events.json.
 *
 * The browser cannot fetch Google's .ics itself: the feed sends no
 * Access-Control-Allow-Origin, so a client-side navigation to /calendar was
 * silently coming up empty. This bakes the same data onto our own origin at
 * build time so the loader can read it without CORS in the way.
 *
 * Run with bun (it reads the TypeScript directly, so this shares the one real
 * ical parser in src/lib/calendar.ts rather than growing a second copy).
 *
 * Exits non-zero if the feed cannot be read, which fails the deploy rather
 * than shipping an empty calendar. A feed with no events is not a failure and
 * writes an empty array.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CALENDAR_JSON_PATH, fetchCalendarEvents } from "../src/lib/calendar";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, ".output/public", CALENDAR_JSON_PATH);

let events;
try {
  events = await fetchCalendarEvents();
} catch (err) {
  console.error("");
  console.error("  Could not read the 3RD SPACE calendar feed.");
  console.error("  " + (err instanceof Error ? err.message : String(err)));
  console.error("");
  console.error("  Failing the build on purpose: deploying now would put an");
  console.error("  empty calendar on the live site with nothing to say why.");
  console.error("");
  process.exit(1);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(events));
console.log(`Written: .output/public/${CALENDAR_JSON_PATH} (${events.length} events)`);

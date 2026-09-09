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

import { CALENDAR_JSON_PATH, describeFeed, fetchCalendarFeed } from "../src/lib/calendar";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, ".output/public", CALENDAR_JSON_PATH);

let events;
try {
  // Describe what came back, not just how much of it survived. "3 events" is
  // a healthy-looking number that says nothing about the events the parser
  // dropped, or about a weekly booking published once because the feed
  // carries recurrence as a rule rather than as repeated entries.
  const feed = describeFeed(await fetchCalendarFeed());
  events = feed.kept;

  console.log(`  feed: ${feed.vevents} VEVENT block(s)`);
  console.log(`        ${feed.recurring} recurring (RRULE), ${feed.withoutSummary} with no SUMMARY, ${feed.cancelled} cancelled, ${feed.overrides} moved occurrence(s)`);
  console.log(`        ${feed.bookings} booking(s) kept, expanded to ${feed.kept.length} dated occurrence(s)`);

  // A block is expected to disappear only for a reason we can name. Comparing
  // against the raw block count would report a hundred phantom losses now
  // that one weekly booking expands into a hundred occurrences.
  const expected = feed.vevents - feed.overrides - feed.cancelled - feed.withoutSummary;
  if (feed.bookings < expected) {
    console.log(`        ${expected - feed.bookings} DROPPED by the parser for no stated reason`);
  }

  // One line per booking rather than per occurrence: a weekly booking used to
  // print a hundred near-identical lines and bury everything else.
  const now = new Date().toISOString();
  const bookings = new Map<string, typeof feed.kept>();
  for (const e of feed.kept) {
    const key = e.seriesId || e.id;
    bookings.set(key, [...(bookings.get(key) || []), e]);
  }
  const lines = [...bookings.values()].map((occ) => {
    const next = occ.find((e) => e.end >= now) || occ[occ.length - 1];
    return {
      at: next.start,
      text: `        - ${next.start.slice(0, 16).replace("T", " ")}  ${next.title}` +
        (next.repeats ? `  [${next.repeats}, ${occ.length} occurrences]` : ""),
    };
  });
  for (const l of lines.sort((a, b) => a.at.localeCompare(b.at))) console.log(l.text);
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

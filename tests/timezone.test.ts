// What time an event is, regardless of what machine built the site.
//
// Written after the website showed a 10:30 rehearsal as 3:30 in the morning.
// parseIcalDate read "DTSTART;TZID=America/Los_Angeles:20260918T103000" with
// new Date(y, mo, d, h, min), which interprets those components in the
// MACHINE's timezone and ignores the TZID entirely. The site is built by
// GitHub Actions, which runs in UTC, so every Pacific time was published seven
// hours early, eight in winter.
//
// It hid for months because building the same commit on a Pacific laptop gives
// the right answer, and because the existing tests read times back with
// getHours(), so they asserted whatever zone they ran in and agreed with the
// bug.
//
// Every assertion here therefore reads in the CALENDAR's zone and nothing
// else. run.sh runs this file three times under different TZ values; a test
// that only runs in one zone cannot see this class of bug at all.
//
//   TZ=UTC bun tests/timezone.test.ts
//
import { parseIcal, publicEventTimes } from "../src/lib/calendar";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, x?: string) =>
  c ? (pass++, console.log("  PASS " + n))
    : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

const ZONE = "America/Los_Angeles";
const inZone = (iso: string, zone = ZONE) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

const NOW = new Date(2026, 8, 15, 12, 0);
const ics = (...lines: string[]) => ["BEGIN:VCALENDAR", ...lines, "END:VCALENDAR"].join("\r\n");
const vevent = (o: Record<string, string>) =>
  ["BEGIN:VEVENT", ...Object.entries(o).map(([k, v]) => `${k}:${v}`), "END:VEVENT"];

const BUILD_TZ = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log("\n=== built in " + BUILD_TZ + " ===");

// ==========================================================================
{
  const e = parseIcal(ics(...vevent({
    UID: "choir", SUMMARY: "Resistance Choir",
    "DTSTART;TZID=America/Los_Angeles": "20260918T103000",
    "DTEND;TZID=America/Los_Angeles": "20260918T120000",
  })), NOW)[0];

  check("a 10:30 Pacific event is 10:30 Pacific",
    inZone(e.start) === "09/18/2026, 10:30", inZone(e.start));
  check("  and ends at 12:00", inZone(e.end) === "09/18/2026, 12:00", inZone(e.end));
  // The absolute instant, which is what actually gets baked into the JSON.
  check("  which is 17:30 UTC in September",
    e.start === "2026-09-18T17:30:00.000Z", e.start);
}

{
  // Winter, when Pacific is eight hours behind rather than seven. Hard-coding
  // a single offset anywhere would pass in one season and fail in the other.
  const e = parseIcal(ics(...vevent({
    UID: "winter", SUMMARY: "Winter evening",
    "DTSTART;TZID=America/Los_Angeles": "20261211T190000",
    "DTEND;TZID=America/Los_Angeles": "20261211T210000",
  })), NOW)[0];
  check("a December 19:00 is still 19:00 Pacific",
    inZone(e.start) === "12/11/2026, 19:00", inZone(e.start));
  check("  which is 03:00 UTC the NEXT day",
    e.start === "2026-12-12T03:00:00.000Z", e.start);
}

{
  // A weekly booking straddling the end of DST on 1 November 2026. The wall
  // clock must not move, which means the UTC instant MUST.
  const events = parseIcal(ics(...vevent({
    UID: "dst", SUMMARY: "Choir",
    "DTSTART;TZID=America/Los_Angeles": "20261023T103000",
    "DTEND;TZID=America/Los_Angeles": "20261023T120000",
    RRULE: "FREQ=WEEKLY;BYDAY=FR;COUNT=4",
  })), NOW);
  const local = events.map((e) => inZone(e.start).split(", ")[1]);
  check("every occurrence is 10:30 Pacific across the clock change",
    local.every((t) => t === "10:30"), JSON.stringify(local));
  const utc = events.map((e) => e.start.slice(11, 16));
  check("  so the UTC instants shift by an hour, as they must",
    utc[0] === "17:30" && utc[utc.length - 1] === "18:30", JSON.stringify(utc));
}

{
  // A feed line already in UTC must NOT be shifted again.
  const e = parseIcal(ics(...vevent({
    UID: "utc", SUMMARY: "Already UTC",
    DTSTART: "20260918T173000Z", DTEND: "20260918T190000Z",
  })), NOW)[0];
  check("a Z time is taken as the instant it already is",
    e.start === "2026-09-18T17:30:00.000Z", e.start);
  check("  which reads as 10:30 Pacific", inZone(e.start) === "09/18/2026, 10:30", inZone(e.start));
}

{
  // No TZID and no Z. The spec calls this floating and says to read it in the
  // viewer's zone; for a venue with one building that is never what is meant.
  const e = parseIcal(ics(...vevent({
    UID: "floating", SUMMARY: "No zone given",
    DTSTART: "20260918T103000", DTEND: "20260918T120000",
  })), NOW)[0];
  check("a floating time is read as the calendar's own zone",
    inZone(e.start) === "09/18/2026, 10:30", inZone(e.start));
}

{
  // A moved occurrence. The override is matched by comparing an instant
  // against the events already emitted; comparing it against a wall-clock
  // reading instead published every moved week twice on a UTC runner.
  const moved = parseIcal(ics(
    ...vevent({
      UID: "choir", SUMMARY: "Choir",
      "DTSTART;TZID=America/Los_Angeles": "20260904T103000",
      "DTEND;TZID=America/Los_Angeles": "20260904T120000", RRULE: "FREQ=WEEKLY;BYDAY=FR",
    }),
    ...vevent({
      UID: "choir", SUMMARY: "Choir (later)",
      "RECURRENCE-ID;TZID=America/Los_Angeles": "20260918T103000",
      "DTSTART;TZID=America/Los_Angeles": "20260918T140000",
      "DTEND;TZID=America/Los_Angeles": "20260918T153000",
    }),
  ), NOW);
  const onThe18th = moved.filter((e) => inZone(e.start).startsWith("09/18/2026"));
  check("a moved week appears once, not twice", onThe18th.length === 1,
    JSON.stringify(onThe18th.map((e) => inZone(e.start))));
  check("  at its new time, in Pacific",
    onThe18th.length === 1 && inZone(onThe18th[0].start) === "09/18/2026, 14:00",
    onThe18th[0] && inZone(onThe18th[0].start));
}

{
  // The public hours: the calendar event is booked over the padded window,
  // and the site subtracts the setup and cleanup to show the real hours.
  // Those subtractions happen on instants, so they must survive the fix.
  const e = parseIcal(ics(...vevent({
    UID: "padded", SUMMARY: "Padded booking",
    "DTSTART;TZID=America/Los_Angeles": "20260918T093000",
    "DTEND;TZID=America/Los_Angeles": "20260918T123000",
    DESCRIPTION: "Setup minutes: 30\\nCleanup minutes: 30",
  })), NOW)[0];
  const pub = publicEventTimes(e);
  check("published hours strip the padding and stay Pacific",
    inZone(pub.start) === "09/18/2026, 10:00" && inZone(pub.end) === "09/18/2026, 12:00",
    inZone(pub.start) + " to " + inZone(pub.end));
}

{
  // An all-day event should land on its stated day, not the day before.
  const e = parseIcal(ics(...vevent({
    UID: "allday", SUMMARY: "All day thing",
    "DTSTART;VALUE=DATE": "20260918", "DTEND;VALUE=DATE": "20260919",
  })), NOW)[0];
  check("an all-day event is on its stated day",
    inZone(e.start).startsWith("09/18/2026"), inZone(e.start));
  check("  and is flagged all-day", e.allDay === true);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

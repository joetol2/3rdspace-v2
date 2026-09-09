// Recurring events in the calendar feed.
//
// An ics feed states a repeating booking ONCE and attaches a rule; it does not
// repeat the entry. The parser used to read the entry and ignore the rule, so
// the Resistance Choir was published on 21 August and never again, and the
// site's September was blank while Google Calendar showed it every Friday.
//
//   bun tests/recurrence.test.ts
//
import { parseIcal, upcomingByBooking } from "../src/lib/calendar";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, x?: string) =>
  c ? (pass++, console.log("  PASS " + n))
    : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

const NOW = new Date(2026, 8, 9, 12, 0); // 9 Sep 2026, matching the live case

function ics(...lines: string[]) {
  return ["BEGIN:VCALENDAR", ...lines, "END:VCALENDAR"].join("\r\n");
}
function vevent(o: Record<string, string>) {
  return ["BEGIN:VEVENT", ...Object.entries(o).map(([k, v]) => `${k}:${v}`), "END:VEVENT"];
}
const on = (events: any[], y: number, m: number) =>
  events.filter((e) => { const d = new Date(e.start); return d.getFullYear() === y && d.getMonth() === m; });

// ==========================================================================
console.log("\n=== the real one: Resistance Choir, weekly on Friday ===");
{
  const feed = ics(...vevent({
    UID: "choir", SUMMARY: "Resistance Choir",
    "DTSTART;TZID=America/Los_Angeles": "20260821T103000",
    "DTEND;TZID=America/Los_Angeles": "20260821T120000",
    RRULE: "FREQ=WEEKLY;BYDAY=FR",
  }));
  const events = parseIcal(feed, NOW);
  const sept = on(events, 2026, 8);
  const days = sept.map((e) => new Date(e.start).getDate()).sort((a, b) => a - b);
  check("September is no longer empty", sept.length > 0, String(sept.length));
  check("  every Friday in September: 4, 11, 18, 25",
    JSON.stringify(days) === "[4,11,18,25]", JSON.stringify(days));
  check("  each one is still 10:30",
    sept.every((e) => new Date(e.start).getHours() === 10 && new Date(e.start).getMinutes() === 30));
  check("  and still 90 minutes long",
    sept.every((e) => +new Date(e.end) - +new Date(e.start) === 90 * 60 * 1000));
  check("  occurrences have distinct ids", new Set(sept.map((e) => e.id)).size === sept.length);
  check("  it keeps going into October", on(events, 2026, 9).length >= 4);
  check("  and did not start before its first date",
    events.every((e) => new Date(e.start) >= new Date(2026, 7, 21)));
}

console.log("\n=== a one-off is still a one-off ===");
{
  const feed = ics(...vevent({
    UID: "once", SUMMARY: "Botanic Garden Annual Strategic",
    "DTSTART;TZID=America/Los_Angeles": "20261017T083000",
    "DTEND;TZID=America/Los_Angeles": "20261017T133000",
  }));
  const events = parseIcal(feed, NOW);
  check("exactly one", events.length === 1, String(events.length));
  check("  on the right day", new Date(events[0].start).getDate() === 17);
}

console.log("\n=== the rule's own limits are respected ===");
{
  const every2 = parseIcal(ics(...vevent({
    UID: "a", SUMMARY: "Fortnightly", "DTSTART;TZID=America/Los_Angeles": "20260904T100000",
    "DTEND;TZID=America/Los_Angeles": "20260904T110000", RRULE: "FREQ=WEEKLY;BYDAY=FR;INTERVAL=2",
  })), NOW);
  const d = on(every2, 2026, 8).map((e) => new Date(e.start).getDate());
  check("INTERVAL=2 skips a week", JSON.stringify(d) === "[4,18]", JSON.stringify(d));

  const counted = parseIcal(ics(...vevent({
    UID: "b", SUMMARY: "Three times", "DTSTART;TZID=America/Los_Angeles": "20260904T100000",
    "DTEND;TZID=America/Los_Angeles": "20260904T110000", RRULE: "FREQ=WEEKLY;BYDAY=FR;COUNT=3",
  })), NOW);
  check("COUNT=3 gives three", counted.length === 3, String(counted.length));

  const until = parseIcal(ics(...vevent({
    UID: "c", SUMMARY: "Until", "DTSTART;TZID=America/Los_Angeles": "20260904T100000",
    "DTEND;TZID=America/Los_Angeles": "20260904T110000",
    RRULE: "FREQ=WEEKLY;BYDAY=FR;UNTIL=20260919T000000Z",
  })), NOW);
  const ud = until.map((e) => new Date(e.start).getDate());
  check("UNTIL stops it", JSON.stringify(ud) === "[4,11,18]", JSON.stringify(ud));

  const multi = parseIcal(ics(...vevent({
    UID: "d", SUMMARY: "MWF", "DTSTART;TZID=America/Los_Angeles": "20260907T090000",
    "DTEND;TZID=America/Los_Angeles": "20260907T100000", RRULE: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6",
  })), NOW);
  check("BYDAY with three days gives three a week", multi.length === 6, String(multi.length));
}

console.log("\n=== a cancelled or moved single occurrence ===");
{
  const withEx = parseIcal(ics(...vevent({
    UID: "choir", SUMMARY: "Resistance Choir",
    "DTSTART;TZID=America/Los_Angeles": "20260821T103000",
    "DTEND;TZID=America/Los_Angeles": "20260821T120000",
    RRULE: "FREQ=WEEKLY;BYDAY=FR",
    "EXDATE;TZID=America/Los_Angeles": "20260911T103000",
  })), NOW);
  const days = on(withEx, 2026, 8).map((e) => new Date(e.start).getDate());
  check("EXDATE removes just that week", JSON.stringify(days) === "[4,18,25]", JSON.stringify(days));

  const moved = parseIcal(ics(
    ...vevent({
      UID: "choir", SUMMARY: "Resistance Choir",
      "DTSTART;TZID=America/Los_Angeles": "20260821T103000",
      "DTEND;TZID=America/Los_Angeles": "20260821T120000", RRULE: "FREQ=WEEKLY;BYDAY=FR",
    }),
    ...vevent({
      UID: "choir", SUMMARY: "Resistance Choir (later start)",
      "RECURRENCE-ID;TZID=America/Los_Angeles": "20260918T103000",
      "DTSTART;TZID=America/Los_Angeles": "20260918T140000",
      "DTEND;TZID=America/Los_Angeles": "20260918T153000",
    }),
  ), NOW);
  const sept = on(moved, 2026, 8);
  const eighteenth = sept.filter((e) => new Date(e.start).getDate() === 18);
  check("a moved week appears once, not twice", eighteenth.length === 1, String(eighteenth.length));
  check("  at its new time", eighteenth[0] && new Date(eighteenth[0].start).getHours() === 14,
    eighteenth[0] && eighteenth[0].start);
  check("  and the other weeks are untouched",
    sept.filter((e) => new Date(e.start).getHours() === 10).length === 3);
}

console.log("\n=== the clocks changing does not move a booking ===");
{
  // US DST ends 1 Nov 2026. A 10:30 booking must stay 10:30 either side.
  const events = parseIcal(ics(...vevent({
    UID: "dst", SUMMARY: "Choir", "DTSTART;TZID=America/Los_Angeles": "20261023T103000",
    "DTEND;TZID=America/Los_Angeles": "20261023T120000", RRULE: "FREQ=WEEKLY;BYDAY=FR;COUNT=4",
  })), NOW);
  const times = events.map((e) => { const d = new Date(e.start); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; });
  check("every occurrence is still 10:30", times.every((t) => t === "10:30"), JSON.stringify(times));
  check("  spanning the change", events.length === 4 &&
    new Date(events[3].start) > new Date(2026, 10, 1), String(events.length));
}

console.log("\n=== an endless rule stays bounded ===");
{
  const events = parseIcal(ics(...vevent({
    UID: "daily", SUMMARY: "Every day forever",
    "DTSTART;TZID=America/Los_Angeles": "20200101T090000",
    "DTEND;TZID=America/Los_Angeles": "20200101T100000", RRULE: "FREQ=DAILY",
  })), NOW);
  check("it terminates", events.length > 0 && events.length <= 750, String(events.length));
  check("  and stays near today, not back in 2020",
    events.every((e) => new Date(e.start) >= new Date(2025, 8, 1)),
    events[0] && events[0].start);
}

console.log("\n=== monthly ===");
{
  const nth = parseIcal(ics(...vevent({
    UID: "m", SUMMARY: "Second Friday", "DTSTART;TZID=America/Los_Angeles": "20260911T180000",
    "DTEND;TZID=America/Los_Angeles": "20260911T200000", RRULE: "FREQ=MONTHLY;BYDAY=2FR;COUNT=3",
  })), NOW);
  const d = nth.map((e) => { const x = new Date(e.start); return `${x.getMonth() + 1}/${x.getDate()}`; });
  check("2nd Friday each month", JSON.stringify(d) === '["9/11","10/9","11/13"]', JSON.stringify(d));
}

console.log("\n=== the upcoming list shows each booking once, not each occurrence ===");
{
  // The live shape: a weekly choir and one meeting six weeks out. Before the
  // dedupe the list was eight identical choir rows and the meeting was gone.
  const events = parseIcal(ics(
    ...vevent({
      UID: "choir", SUMMARY: "Resistance Choir",
      "DTSTART;TZID=America/Los_Angeles": "20260911T183000",
      "DTEND;TZID=America/Los_Angeles": "20260911T203000", RRULE: "FREQ=WEEKLY;BYDAY=FR",
    }),
    ...vevent({
      UID: "garden", SUMMARY: "Botanic Garden meeting",
      "DTSTART;TZID=America/Los_Angeles": "20261017T170000",
      "DTEND;TZID=America/Los_Angeles": "20261017T190000",
    }),
  ), NOW);

  const list = upcomingByBooking(events, NOW, 8);
  const titles = list.map((e) => e.title);
  check("one row per booking", titles.length === 2, JSON.stringify(titles));
  check("  the meeting survives the weekly booking",
    titles.includes("Botanic Garden meeting"), JSON.stringify(titles));
  check("  and the choir shows its NEXT date, not its first",
    list[0].title === "Resistance Choir" && list[0].start.startsWith("2026-09-11"),
    list[0] && list[0].start);
  check("  labelled as repeating, so one row does not read as one night",
    list[0].repeats === "Weekly", String(list[0] && list[0].repeats));
  check("  a one-off carries no repeat label",
    list[1].repeats === undefined, String(list[1] && list[1].repeats));

  // Past occurrences must not win the series just because they come first.
  const past = upcomingByBooking(events, new Date(2026, 9, 20, 12, 0), 8);
  check("after a date, the next occurrence is the next FUTURE one",
    past.length === 1 && past[0].start.startsWith("2026-10-23"), JSON.stringify(past.map((e) => e.start)));

  check("the limit still caps the list",
    upcomingByBooking(events, NOW, 1).length === 1);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

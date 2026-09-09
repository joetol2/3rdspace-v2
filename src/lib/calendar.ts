const ICAL_URL =
  "https://calendar.google.com/calendar/ical/3rdspacesyv%40gmail.com/public/basic.ics";

export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  allDay: boolean;
  description?: string;
  location?: string;
  /** Same on every occurrence of one repeating booking, so a list can show
   *  the next one rather than the next eight of the same thing. */
  seriesId?: string;
  /** "Weekly", "Every 2 weeks", "Monthly"... Present only when it repeats.
   *  Without it, showing a single date for a weekly booking would read as a
   *  one-off, which is worse than the flood it replaces. */
  repeats?: string;
};

function unfoldLines(raw: string): string {
  return raw.replace(/\r?\n[ \t]/g, "");
}

function parseIcalDate(raw: string): { date: Date; allDay: boolean } {
  // raw is the full property line, e.g.:
  //   DTSTART;TZID=America/Los_Angeles:20260628T100000
  //   DTSTART;VALUE=DATE:20260628
  //   DTSTART:20260628T100000Z
  const colon = raw.indexOf(":");
  const params = raw.slice(0, colon).toUpperCase();
  const val = raw.slice(colon + 1).trim();
  const allDay =
    params.includes("VALUE=DATE") ||
    (!params.includes("DATE-TIME") && val.length === 8);

  const y = parseInt(val.slice(0, 4), 10);
  const mo = parseInt(val.slice(4, 6), 10) - 1;
  const d = parseInt(val.slice(6, 8), 10);

  if (allDay) {
    return { date: new Date(y, mo, d), allDay: true };
  }

  const h = parseInt(val.slice(9, 11) || "0", 10);
  const min = parseInt(val.slice(11, 13) || "0", 10);
  const isUtc = val.endsWith("Z");

  const date = isUtc
    ? new Date(Date.UTC(y, mo, d, h, min))
    : new Date(y, mo, d, h, min);

  return { date, allDay: false };
}

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/**
 * How far either side of the build we bother generating occurrences.
 *
 * A weekly booking with no end date is infinite, so something has to bound
 * it. The site shows a month grid you can page through plus a list of what is
 * coming, and the build runs twice a day, so this window rolls forward on its
 * own. MAX_OCCURRENCES is a second belt: a malformed rule cannot spin.
 */
const RECURRENCE_MONTHS_BACK = 12;
const RECURRENCE_MONTHS_FORWARD = 24;
const MAX_OCCURRENCES = 750;

type Rule = {
  freq: string;
  interval: number;
  count: number | null;
  until: Date | null;
  byDay: string[];
};

function parseRRule(value: string): Rule | null {
  if (!value) return null;
  const parts: Record<string, string> = {};
  for (const bit of value.split(";")) {
    const eq = bit.indexOf("=");
    if (eq > 0) parts[bit.slice(0, eq).toUpperCase()] = bit.slice(eq + 1);
  }
  const freq = (parts.FREQ || "").toUpperCase();
  if (!freq) return null;
  return {
    freq,
    interval: Math.max(1, parseInt(parts.INTERVAL || "1", 10) || 1),
    count: parts.COUNT ? parseInt(parts.COUNT, 10) : null,
    until: parts.UNTIL ? parseIcalDate("UNTIL:" + parts.UNTIL).date : null,
    // "2FR" (second Friday) keeps its ordinal; plain "FR" has none.
    byDay: (parts.BYDAY || "").split(",").map((d) => d.trim().toUpperCase()).filter(Boolean),
  };
}

/** A local-time day step. Using setDate rather than adding milliseconds keeps
 *  a 10:30 booking at 10:30 when the clocks change. */
function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

/** The nth (1-based, -1 for last) given weekday of a month. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  if (nth > 0) {
    const first = new Date(year, month, 1);
    const shift = (weekday - first.getDay() + 7) % 7;
    const day = 1 + shift + (nth - 1) * 7;
    const d = new Date(year, month, day);
    return d.getMonth() === month ? d : null;
  }
  const last = new Date(year, month + 1, 0);
  const shift = (last.getDay() - weekday + 7) % 7;
  const d = new Date(year, month, last.getDate() - shift);
  return d.getMonth() === month ? d : null;
}

/**
 * Every date a rule lands on, inside the window.
 *
 * An ics feed states a recurring booking once and attaches a rule; it does not
 * repeat the entry. Reading only the entry publishes the series on its first
 * date and never again, which is what emptied the site's September while
 * Google Calendar showed a choir every Friday.
 */
function expandRule(startDate: Date, rule: Rule, windowStart: Date, windowEnd: Date): Date[] {
  const out: Date[] = [];
  const stop = rule.until && rule.until < windowEnd ? rule.until : windowEnd;
  const push = (d: Date) => {
    if (d < startDate || d > stop) return;
    if (d >= windowStart) out.push(new Date(d));
  };

  if (rule.freq === "WEEKLY") {
    const days = rule.byDay.length
      ? rule.byDay.map((d) => WEEKDAYS.indexOf(d.slice(-2)))
      : [startDate.getDay()];
    // Anchor on the Sunday of DTSTART's week, then step whole weeks.
    let weekStart = addDays(startDate, -startDate.getDay());
    while (weekStart <= stop && out.length < MAX_OCCURRENCES) {
      for (const wd of days) {
        if (wd < 0) continue;
        const d = addDays(weekStart, wd);
        d.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        push(d);
      }
      weekStart = addDays(weekStart, 7 * rule.interval);
    }
  } else if (rule.freq === "DAILY") {
    let d = new Date(startDate);
    while (d <= stop && out.length < MAX_OCCURRENCES) {
      push(d);
      d = addDays(d, rule.interval);
    }
  } else if (rule.freq === "MONTHLY") {
    const ordinal = rule.byDay.length ? rule.byDay[0] : "";
    const nth = ordinal ? parseInt(ordinal, 10) || 0 : 0;
    const wd = ordinal ? WEEKDAYS.indexOf(ordinal.slice(-2)) : -1;
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= stop && out.length < MAX_OCCURRENCES) {
      let d: Date | null;
      if (wd >= 0 && nth !== 0) {
        d = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), wd, nth);
      } else {
        d = new Date(cursor.getFullYear(), cursor.getMonth(), startDate.getDate());
        if (d.getMonth() !== cursor.getMonth()) d = null; // e.g. the 31st of a short month
      }
      if (d) {
        d.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        push(d);
      }
      cursor = addMonths(cursor, rule.interval);
    }
  } else if (rule.freq === "YEARLY") {
    let d = new Date(startDate);
    while (d <= stop && out.length < MAX_OCCURRENCES) {
      push(d);
      d = new Date(d.getFullYear() + rule.interval, d.getMonth(), d.getDate(),
                   startDate.getHours(), startDate.getMinutes());
    }
  } else {
    return [new Date(startDate)];
  }

  out.sort((a, b) => a.getTime() - b.getTime());
  return rule.count ? out.slice(0, rule.count) : out;
}

function describeRule(rule: Rule): string {
  const every = (unit: string, plural: string) =>
    rule.interval === 1 ? unit : `Every ${rule.interval} ${plural}`;
  switch (rule.freq) {
    case "DAILY": return every("Daily", "days");
    case "WEEKLY": return every("Weekly", "weeks");
    case "MONTHLY": return every("Monthly", "months");
    case "YEARLY": return every("Yearly", "years");
    default: return "Repeats";
  }
}

type RawEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  rrule: string;
  exdates: number[];
  recurrenceId: Date | null;
};

export function parseIcal(raw: string, now: Date = new Date()): CalEvent[] {
  const text = unfoldLines(raw);
  const blocks: RawEvent[] = [];
  const veventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match: RegExpExecArray | null;

  while ((match = veventRe.exec(text)) !== null) {
    const block = match[1];

    const getVal = (key: string) => {
      const m = block.match(new RegExp(`^${key}[^:\\r\\n]*:([^\\r\\n]*)`, "m"));
      return m ? m[1].trim() : "";
    };
    const getLine = (key: string) => {
      const m = block.match(new RegExp(`^(${key}[^\\r\\n]*)`, "m"));
      return m ? m[1].trim() : "";
    };
    const unescape = (v: string) =>
      v.replace(/\\,/g, ",").replace(/\\n/g, "\n").replace(/\;/g, ";");

    const uid = getVal("UID");
    const summary = unescape(getVal("SUMMARY")).replace(/\n/g, " ");
    const desc = unescape(getVal("DESCRIPTION"));
    const location = unescape(getVal("LOCATION")).replace(/\n/g, " ");

    const startLine = getLine("DTSTART");
    const endLine = getLine("DTEND");
    if (!startLine || !summary) continue;

    const { date: startDate, allDay } = parseIcalDate(startLine);
    const { date: endDate } = endLine ? parseIcalDate(endLine) : { date: startDate };

    // A single edited or deleted occurrence arrives as its own VEVENT
    // carrying RECURRENCE-ID: the date of the occurrence it replaces.
    const recurrenceLine = getLine("RECURRENCE-ID");
    const exdates: number[] = [];
    const exRe = /^(EXDATE[^\r\n]*)/gm;
    let ex: RegExpExecArray | null;
    while ((ex = exRe.exec(block)) !== null) {
      const line = ex[1];
      const colon = line.indexOf(":");
      const prefix = line.slice(0, colon);
      for (const one of line.slice(colon + 1).split(",")) {
        exdates.push(parseIcalDate(`${prefix}:${one.trim()}`).date.getTime());
      }
    }

    blocks.push({
      uid,
      title: summary,
      description: desc || undefined,
      location: location || undefined,
      start: startDate,
      end: endDate,
      allDay,
      rrule: getVal("RRULE"),
      exdates,
      recurrenceId: recurrenceLine ? parseIcalDate(recurrenceLine).date : null,
    });
  }

  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - RECURRENCE_MONTHS_BACK);
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + RECURRENCE_MONTHS_FORWARD);

  // An override replaces the generated occurrence it names, so index them
  // before expanding anything.
  const overrides = new Map<string, RawEvent>();
  for (const b of blocks) {
    if (b.recurrenceId) overrides.set(`${b.uid}@${b.recurrenceId.getTime()}`, b);
  }

  const events: CalEvent[] = [];
  const emit = (b: RawEvent, start: Date, occurrence?: Date, repeats?: string) => {
    const duration = b.end.getTime() - b.start.getTime();
    events.push({
      id: occurrence ? `${b.uid || b.title}-${occurrence.toISOString()}` : b.uid || `${b.title}-${start.toISOString()}`,
      title: b.title,
      start: start.toISOString(),
      end: new Date(start.getTime() + duration).toISOString(),
      allDay: b.allDay,
      description: b.description,
      location: b.location,
      seriesId: b.uid || b.title,
      repeats,
    });
  };

  for (const b of blocks) {
    if (b.recurrenceId) continue; // emitted below, in place of its occurrence
    const rule = parseRRule(b.rrule);
    if (!rule) {
      emit(b, b.start);
      continue;
    }
    const repeats = describeRule(rule);
    for (const occurrence of expandRule(b.start, rule, windowStart, windowEnd)) {
      if (b.exdates.includes(occurrence.getTime())) continue;
      const override = overrides.get(`${b.uid}@${occurrence.getTime()}`);
      if (override) emit(override, override.start, occurrence, repeats);
      else emit(b, occurrence, occurrence, repeats);
    }
  }

  // Any override whose occurrence fell outside the window still belongs.
  for (const b of blocks) {
    if (!b.recurrenceId) continue;
    const already = events.some((e) => e.start === b.start.toISOString() && e.title === b.title);
    if (!already && b.start >= windowStart && b.start <= windowEnd) emit(b, b.start, b.recurrenceId);
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * The next occurrence of each distinct booking, soonest first.
 *
 * For an "Upcoming events" list, one row per booking rather than one per
 * occurrence. Now that recurrence expands, a weekly booking produces enough
 * occurrences to fill any such list on its own: the choir took all eight rows
 * and the October Botanic Garden meeting fell off the end. Callers pair this
 * with `repeats` on the row so the single line still reads as weekly.
 *
 * Expects `events` sorted by start, which is what parseIcal returns, so the
 * first occurrence of a series encountered is its next one.
 */
export function upcomingByBooking(events: CalEvent[], from: Date, limit: number): CalEvent[] {
  const seen = new Set<string>();
  const out: CalEvent[] = [];
  for (const e of events) {
    if (new Date(e.end) < from) continue;
    const series = e.seriesId || e.id;
    if (seen.has(series)) continue;
    seen.add(series);
    out.push(e);
    if (out.length === limit) break;
  }
  return out;
}

// Where the build writes the parsed feed, and where the browser reads it from.
// Same origin on purpose: see loadCalendarEvents below.
export const CALENDAR_JSON_PATH = "calendar-events.json";

/**
 * Fetch and parse the Google feed. Server/build side only.
 *
 * This THROWS on failure rather than returning an empty list. It used to
 * swallow everything and return [], which meant a dead feed rendered exactly
 * like a genuinely empty calendar: the build succeeded and shipped a page
 * saying "No upcoming events found. Check back soon." Throwing makes the
 * prerender step fail the build instead, so a broken feed can never deploy
 * quietly. A feed that legitimately has no events still parses fine and
 * returns [], which is a success and builds normally.
 */
export async function fetchCalendarFeed(): Promise<string> {
  const res = await fetch(ICAL_URL, {
    headers: { "User-Agent": "Mozilla/5.0 3rdspace-calendar-fetch/1.0" },
  });
  if (!res.ok) {
    throw new Error(`[calendar] feed fetch failed: ${res.status} ${res.statusText} (${ICAL_URL})`);
  }
  return await res.text();
}

export async function fetchCalendarEvents(): Promise<CalEvent[]> {
  return parseIcal(await fetchCalendarFeed());
}

/**
 * What the feed actually contained, for the build log.
 *
 * "3 events" told us the pipeline was healthy and nothing about why the site
 * disagreed with Google Calendar. The interesting numbers are the ones the
 * parser throws away: an event with no SUMMARY is dropped on purpose, which
 * is what a calendar shared as "free/busy only" produces, and a recurring
 * event appears in the feed once with an RRULE, so it is published on its
 * first date and never repeats.
 *
 * Counting kept events against VEVENT blocks stopped meaning anything once
 * recurrence expanded: one block legitimately becomes a hundred occurrences.
 * `bookings` is the comparable number — distinct bookings that survived — and
 * `overrides` is subtracted from the block count because a moved occurrence
 * arrives as its own block and folds back into the booking it belongs to.
 */
export function describeFeed(raw: string): {
  vevents: number;
  withoutSummary: number;
  recurring: number;
  cancelled: number;
  overrides: number;
  bookings: number;
  kept: CalEvent[];
} {
  const text = unfoldLines(raw);
  const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const has = (b: string, key: string) => new RegExp(`^${key}[^:\\r\\n]*:`, "m").test(b);
  const kept = parseIcal(raw);
  return {
    vevents: blocks.length,
    withoutSummary: blocks.filter((b) => !has(b, "SUMMARY")).length,
    recurring: blocks.filter((b) => has(b, "RRULE")).length,
    cancelled: blocks.filter((b) => /^STATUS:CANCELLED/m.test(b)).length,
    overrides: blocks.filter((b) => has(b, "RECURRENCE-ID")).length,
    bookings: new Set(kept.map((e) => e.seriesId || e.id)).size,
    kept,
  };
}

export type CalendarData = {
  events: CalEvent[];
  /** True only when the feed could not be READ. An empty calendar is not a failure. */
  failed: boolean;
};

/**
 * What the route loader calls.
 *
 * The loader runs in two very different places and the difference used to be
 * invisible:
 *
 *  - At build time (prerender), on the server, where fetching Google's .ics
 *    directly is fine: Node is not subject to CORS.
 *  - In the visitor's browser, on every client-side navigation. Clicking a
 *    <Link> to /calendar never asks the host for the prerendered page at all,
 *    it just runs this loader again. Fetching Google from there is blocked by
 *    CORS, the old code caught that and returned [], and the calendar came up
 *    empty. Hard-loading the URL worked, so the bug looked like it depended on
 *    how you arrived rather than on which side of the wire the loader ran.
 *
 * So the browser never talks to Google. The build writes the parsed events to
 * a JSON file on our own origin (scripts/build-calendar-json.ts) and the
 * browser reads that. Same data, same freshness, no CORS involved.
 */
export async function loadCalendarEvents(): Promise<CalendarData> {
  if (typeof window === "undefined") {
    return { events: await fetchCalendarEvents(), failed: false };
  }

  try {
    // BASE_URL carries the deployment's base path, so this keeps working if
    // the site ever moves under a subpath.
    const base = import.meta.env.BASE_URL || "/";
    const res = await fetch(`${base.replace(/\/$/, "")}/${CALENDAR_JSON_PATH}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return { events: (await res.json()) as CalEvent[], failed: false };
  } catch (err) {
    console.error("[calendar] could not load events:", err);
    return { events: [], failed: true };
  }
}

// The event description written by google-apps-script/mailing-list.gs
// (buildCalendarEventDescription) is only present when the requester chose
// "Show the event name" for Calendar Visibility — a flat list of
// "Label: value" lines. Keep these label strings in sync with that
// function if they change. Never includes the requester's name, email, or
// phone, regardless of that choice.
export type EventDetails = {
  organization: string;
  eventDescription: string;
  typeOfUse: string;
  publicPrivate: string;
  food: string;
  pets: string;
  accessibility: string;
};

function parseDescriptionFields(description: string | undefined): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!description) return fields;

  for (const line of description.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) fields[key] = value;
  }

  return fields;
}

// The calendar event is booked over the requester's setup and cleanup time
// as well as the event itself, because that is the window the space is
// genuinely unavailable and the only way the buffer survives the next
// booking (see createCalendarEventForRequest in the Apps Script). Those
// wider hours are right for staff and wrong for everyone else: published
// as-is they tell people the doors open 45 minutes before they do.
//
// The description carries the padding in minutes, so the public hours are
// just the event's own times pulled back in. Returns the raw times
// unchanged when there is no padding, when the event is all day, or when
// the description is absent (which is every booking the requester did not
// opt into showing publicly).
export function publicEventTimes(event: CalEvent): { start: string; end: string } {
  if (event.allDay || !event.description) return { start: event.start, end: event.end };

  const fields = parseDescriptionFields(event.description);
  let setup = Number.parseInt(fields["Setup minutes"] || "0", 10) || 0;
  let cleanup = Number.parseInt(fields["Cleanup minutes"] || "0", 10) || 0;

  // Bookings approved in the short window before the minutes fields existed
  // carry the padding only as prose on a "Space held" line, e.g. "45 min
  // setup before and 60 min cleanup after". Those events are on the
  // calendar now and would otherwise publish their padded hours forever,
  // so read the numbers back out rather than making anyone re-approve.
  if (setup <= 0 && cleanup <= 0 && fields["Space held"]) {
    const held = fields["Space held"];
    // The number has to sit directly against its own word. A looser gap
    // lets "45 min setup before and 60 min cleanup after" match 45 for
    // cleanup, because the wildcard happily runs across the other figure.
    setup = Number.parseInt((held.match(/(\d+)\s*min(?:ute)?s?\s+setup/i) || [])[1] || "0", 10) || 0;
    cleanup = Number.parseInt((held.match(/(\d+)\s*min(?:ute)?s?\s+cleanup/i) || [])[1] || "0", 10) || 0;
  }

  // Clamped, so a negative can never widen the published window outward.
  setup = Math.max(0, setup);
  cleanup = Math.max(0, cleanup);
  if (setup === 0 && cleanup === 0) return { start: event.start, end: event.end };

  const start = new Date(Date.parse(event.start) + setup * 60000);
  const end = new Date(Date.parse(event.end) - cleanup * 60000);
  // Nonsense padding (a hand-edited description, a hand-shortened event)
  // must not invert the times. Fall back rather than show an event that
  // ends before it starts.
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return { start: event.start, end: event.end };
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseEventDetails(description: string | undefined): EventDetails {
  const fields = parseDescriptionFields(description);
  return {
    organization: fields["Organization or group"] || "",
    eventDescription: fields["Event description"] || "",
    typeOfUse: fields["Type of use"] || "",
    publicPrivate: fields["Public or private"] || "",
    food: fields["Food or catering needs"] || "",
    pets: fields["Pet approval request"] || "",
    accessibility: fields["Accessibility, privacy, or parking needs"] || "",
  };
}

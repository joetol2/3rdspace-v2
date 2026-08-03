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

function parseIcal(raw: string): CalEvent[] {
  const text = unfoldLines(raw);
  const events: CalEvent[] = [];
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

    const uid = getVal("UID");
    const summary = getVal("SUMMARY")
      .replace(/\\,/g, ",")
      .replace(/\\n/g, " ")
      .replace(/\\;/g, ";");
    const desc = getVal("DESCRIPTION")
      .replace(/\\,/g, ",")
      .replace(/\\n/g, "\n")
      .replace(/\\;/g, ";");
    const location = getVal("LOCATION")
      .replace(/\\,/g, ",")
      .replace(/\\n/g, " ");

    const startLine = getLine("DTSTART");
    const endLine = getLine("DTEND");

    if (!startLine || !summary) continue;

    const { date: startDate, allDay } = parseIcalDate(startLine);
    const { date: endDate } = endLine
      ? parseIcalDate(endLine)
      : { date: startDate };

    events.push({
      id: uid || `${summary}-${startDate.toISOString()}`,
      title: summary,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay,
      description: desc || undefined,
      location: location || undefined,
    });
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

export async function fetchCalendarEvents(): Promise<CalEvent[]> {
  try {
    const res = await fetch(ICAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 3rdspace-calendar-fetch/1.0" },
    });
    if (!res.ok) {
      console.error(`[calendar] fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const text = await res.text();
    return parseIcal(text);
  } catch (err) {
    console.error(`[calendar] fetch threw:`, err);
    return [];
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

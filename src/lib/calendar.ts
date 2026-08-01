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

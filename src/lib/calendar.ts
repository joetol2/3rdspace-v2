import { createServerFn } from "@tanstack/react-start";

const ICAL_URL =
  "https://calendar.google.com/calendar/ical/1d07dd0460c9fd5dea1599edd7be242874aa2d3d530444cb98314e52230a5645%40group.calendar.google.com/public/basic.ics";

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

export const fetchCalendarEvents = createServerFn().handler(
  async (): Promise<CalEvent[]> => {
    try {
      const res = await fetch(ICAL_URL, {
        headers: { "User-Agent": "Mozilla/5.0 3rdspace-calendar-fetch/1.0" },
      });
      if (!res.ok) return [];
      const text = await res.text();
      return parseIcal(text);
    } catch {
      return [];
    }
  }
);

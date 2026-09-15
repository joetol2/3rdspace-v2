import { useState, useMemo } from "react";
import { parseEventDetails, publicEventTimes, upcomingByBooking, type CalEvent } from "@/lib/calendar";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The building's timezone. Every time on this page is shown in it.
 *
 * Not the visitor's. 3RD SPACE is one room in Santa Ynez, and an event at
 * seven in the evening is at seven in the evening whoever is reading. Every
 * other thing that states a time already works this way: the reply email, a
 * flyer, Laura on the telephone. The website was the one place that said
 * something different, and it is the place people check last, before setting
 * off. Somebody reading from another state is not attending from there; they
 * are planning a drive, so their own clock is no use to them either.
 *
 * Viewer-local time is right for a webinar. It is wrong for a room.
 */
const VENUE_TIMEZONE = "America/Los_Angeles";

/** How far a named zone sits from UTC at a given instant, in milliseconds. */
function zoneOffsetMs(instantMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"),
                         get("hour") % 24, get("minute"), get("second"));
  return asUtc - instantMs;
}

/**
 * A Date whose ORDINARY LOCAL GETTERS read as the venue's wall clock.
 *
 * Deliberately a shifted Date rather than a formatter. Everything on this page
 * reads times through getHours, getDate, getMonth and compares them against
 * grid cells, so one conversion here puts the whole component into venue time
 * without touching any of it. Formatting each call site separately would have
 * left the month grid and the "is this today" check on the viewer's clock
 * while the printed times moved, which is worse than either.
 *
 * For a visitor in Santa Ynez the shift is zero and nothing changes at all.
 *
 * Because the result is shifted, it is a display value only. Never compare one
 * of these against a real instant; see `now` versus `today` below.
 */
function isoToVenue(iso: string): Date {
  const ms = Date.parse(iso);
  const venue = zoneOffsetMs(ms, VENUE_TIMEZONE);
  const viewer = -new Date(ms).getTimezoneOffset() * 60000;
  return new Date(ms + venue - viewer);
}

/** Short label for the venue's current offset, e.g. "PDT". */
function venueZoneLabel(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENUE_TIMEZONE,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value || "Pacific";
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventSpansDay(event: CalEvent, day: Date): boolean {
  const start = isoToVenue(event.start);
  const end = isoToVenue(event.end);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return start <= dayEnd && end >= dayStart;
}

// Every place an event's hours are shown to the public goes through this,
// so the setup and cleanup padding is stripped consistently. Using
// e.start/e.end directly is the bug it exists to prevent.
function formatEventRange(e: CalEvent): string {
  if (e.allDay) return "All day";
  const { start, end } = publicEventTimes(e);
  return `${formatTime(start, false)} \u2013 ${formatTime(end, false)}`;
}

// Same public hours as the list rows, worded for the detail panel. A
// booking that genuinely runs past midnight names the closing day, since
// "11:00 PM to 2:00 AM" alone reads as impossible.
function publicRange(e: CalEvent): string {
  if (e.allDay) return "All day";
  const { start, end } = publicEventTimes(e);
  const s = isoToVenue(start);
  const t = isoToVenue(end);
  const times = `${formatTime(start, false)} to ${formatTime(end, false)}`;
  return sameDay(s, t) ? times : `${times} (ends ${formatDateFull(end).replace(/,[^,]*$/, "")})`;
}

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = isoToVenue(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
}

function formatDateFull(iso: string): string {
  const d = isoToVenue(iso);
  // timeZone UTC on purpose. `d` is already shifted so that its LOCAL getters
  // read venue time; letting toLocaleDateString apply the viewer's zone on top
  // would convert it a second time. UTC makes it print the components as they
  // stand, which is what every getHours() call on this page already sees.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())));
}

type Props = {
  events: CalEvent[];
  publicLink: string;
  /** The feed could not be read. Distinct from having no events to show. */
  failed?: boolean;
};

export function GoogleCalendar({ events, publicLink, failed = false }: Props) {
  // Two different "now"s, and mixing them up is the trap. `today` reads as
  // the venue's wall clock and drives the month grid and the today ring;
  // `now` is the real instant and is the only thing safe to compare against
  // event times, which are real instants too.
  const now = new Date();
  const today = isoToVenue(now.toISOString());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid: leading blanks + days
  const grid: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to complete weeks
  while (grid.length % 7 !== 0) grid.push(null);

  // Events for this month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const monthEvents = useMemo(
    () =>
      events.filter((e) => {
        const start = isoToVenue(e.start);
        const end = isoToVenue(e.end);
        return start <= monthEnd && end >= monthStart;
      }),
    [events, year, month]
  );

  // Upcoming events: the next occurrence of each booking, not the next eight
  // occurrences. A weekly booking would otherwise fill every row with the same
  // title. Each row says how often it repeats instead.
  const upcomingEvents = useMemo(() => upcomingByBooking(events, now, 8), [events]);

  // Events for selected day
  const selectedEvents = selectedDay
    ? monthEvents.filter((e) => eventSpansDay(e, selectedDay))
    : [];

  return (
    <div className="space-y-6">
      {/* Calendar card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="font-display text-base font-bold tracking-tight text-foreground">
            {MONTHS[month]} {year}
          </p>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            if (!day) {
              return <div key={`blank-${i}`} className="min-h-[56px] border-b border-r border-border/40 last:border-r-0 [&:nth-child(7n)]:border-r-0" />;
            }
            const dayEvents = monthEvents.filter((e) => eventSpansDay(e, day));
            const isToday = sameDay(day, today);
            const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() =>
                  setSelectedDay(isSelected ? null : day)
                }
                aria-label={`${formatDateFull(day.toISOString())}${hasEvents ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
                aria-pressed={isSelected}
                className={[
                  "relative min-h-[56px] border-b border-r border-border/40 px-1.5 pb-1.5 pt-1 text-left transition-colors [&:nth-child(7n)]:border-r-0",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isSelected ? "bg-muted" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium",
                    isToday
                      ? "bg-foreground text-background"
                      : "text-foreground/80",
                  ].join(" ")}
                >
                  {day.getDate()}
                </span>
                {hasEvents && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="block h-1.5 w-1.5 rounded-full bg-accent"
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="border-t border-border px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {formatDateFull(selectedDay.toISOString())}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="mt-2 text-sm text-foreground/75">No events on this day.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedEvents.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(e)}
                        className="text-left text-[15px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {e.title}
                      </button>
                      <p className="text-[13px] text-muted-foreground">
                        {formatEventRange(e)}
                      </p>
                      {e.location && (
                        <p className="mt-0.5 text-[13px] text-muted-foreground">{e.location}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Said once, under the calendar, rather than stamped on every row.
          Almost everyone reading this is local and needs no telling; the note
          is for the person checking from out of state, or on a phone that has
          picked up another timezone, who would otherwise have no way to know
          which clock these times are on. A hundred repetitions of "PT" across
          a month grid would cost every local reader to reassure a few. */}
      <p className="px-1 text-[13px] text-muted-foreground">
        All times are {venueZoneLabel()}, the time at the space.
      </p>

      {/* Upcoming events list */}
      {upcomingEvents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Upcoming events
            </p>
          </div>
          <ul className="divide-y divide-border">
            {upcomingEvents.map((e) => {
              const start = isoToVenue(e.start);
              return (
                <li key={e.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border border-border bg-muted/50 py-1.5 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHS[start.getMonth()].slice(0, 3)}
                    </span>
                    <span className="font-display text-xl font-black leading-none text-foreground">
                      {start.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(e)}
                      className="block max-w-full truncate text-left text-[15px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {e.title}
                    </button>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {formatEventRange(e)}
                      {e.repeats && (
                        <>
                          {" · "}
                          <span className="whitespace-nowrap">{e.repeats}</span>
                        </>
                      )}
                    </p>
                    {e.location && (
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{e.location}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Event details — appears only once an event is clicked in the day
          detail or upcoming events lists above. The calendar event only
          carries a description when the requester opted into "Show the
          event name" for Calendar Visibility; otherwise the title is a
          generic "Booked" / "Unavailable" and these extra fields just show
          their fallback text. Either way, the requester's contact info is
          never in the calendar event — that stays in the staff
          notification email and the Google Sheet only. */}
      {selectedEvent && (() => {
        const details = parseEventDetails(selectedEvent.description);
        const rows: { label: string; value: string }[] = [
          { label: "Event Name", value: selectedEvent.title || "Booked" },
          { label: "Organized by", value: details.organization || "Not given" },
          { label: "Description", value: details.eventDescription || "Not given" },
          {
            // Times only. The date is already the heading of the list this
            // panel opened from, so repeating it here is noise. Setup and
            // cleanup are stripped: the reserved window is staff business,
            // and publishing it just has people turning up early.
            label: "Start / End time",
            value: publicRange(selectedEvent),
          },
          { label: "Event Type", value: details.typeOfUse || "Not given" },
          { label: "Gathering Type", value: details.publicPrivate || "Not given" },
          { label: "Food/Catering", value: details.food || "None given" },
          { label: "Pets", value: details.pets || "Not answered" },
          { label: "Accessibility", value: details.accessibility || "None given" },
        ];

        return (
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Event Details
              </p>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close event details"
              >
                ×
              </button>
            </div>
            <dl className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.label} className="px-5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })()}

      {/* An unreadable feed and an empty one used to print the same reassuring
          sentence, so a broken calendar looked like a quiet week. */}
      {failed && (
        <p className="text-sm text-muted-foreground">
          The calendar could not be loaded just now. You can{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href={publicLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            view it on Google Calendar
          </a>{" "}
          instead, or try again in a few minutes.
        </p>
      )}

      {/* No events fallback */}
      {!failed && events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No upcoming events found. Check back soon.
        </p>
      )}

      {/* Hidden per request — re-enable by uncommenting if the subscribe
          link should come back.
      <p className="text-sm text-foreground/75">
        <a
          href={publicLink}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Subscribe to this calendar in Google Calendar <span aria-hidden="true">→</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      */}
    </div>
  );
}

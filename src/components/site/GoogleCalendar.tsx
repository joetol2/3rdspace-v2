import { useState, useMemo } from "react";
import type { CalEvent } from "@/lib/calendar";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoToLocal(iso: string): Date {
  return new Date(iso);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventSpansDay(event: CalEvent, day: Date): boolean {
  const start = isoToLocal(event.start);
  const end = isoToLocal(event.end);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return start <= dayEnd && end >= dayStart;
}

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = isoToLocal(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
}

function formatDateFull(iso: string): string {
  const d = isoToLocal(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  events: CalEvent[];
  publicLink: string;
};

export function GoogleCalendar({ events, publicLink }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
        const start = isoToLocal(e.start);
        const end = isoToLocal(e.end);
        return start <= monthEnd && end >= monthStart;
      }),
    [events, year, month]
  );

  // Upcoming events (from today forward, limited)
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => isoToLocal(e.end) >= today)
        .slice(0, 8),
    [events]
  );

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
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
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
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
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
                className={[
                  "relative min-h-[56px] border-b border-r border-border/40 px-1.5 pb-1.5 pt-1 text-left transition-colors [&:nth-child(7n)]:border-r-0",
                  "hover:bg-muted/50",
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
              <p className="mt-2 text-sm text-foreground/60">No events on this day.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedEvents.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <p className="text-[15px] font-medium text-foreground">{e.title}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {formatTime(e.start, e.allDay)}
                        {!e.allDay && ` – ${formatTime(e.end, false)}`}
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
              const start = isoToLocal(e.start);
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
                    <p className="truncate text-[15px] font-medium text-foreground">{e.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {formatTime(e.start, e.allDay)}
                      {!e.allDay && ` – ${formatTime(e.end, false)}`}
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

      {/* No events fallback */}
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No upcoming events found. Check back soon.
        </p>
      )}

      <p className="text-sm text-foreground/60">
        <a
          href={publicLink}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Subscribe to this calendar in Google Calendar →
        </a>
      </p>
    </div>
  );
}

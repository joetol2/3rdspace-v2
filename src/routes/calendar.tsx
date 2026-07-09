import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import { Section } from "@/components/site/Section";
import { GoogleCalendar } from "@/components/site/GoogleCalendar";
import { fetchCalendarEvents } from "@/lib/calendar";

export const Route = createFileRoute("/calendar")({
  loader: () => fetchCalendarEvents(),
  head: () => ({
    meta: [
      { title: "Calendar | 3RD SPACE" },
      {
        name: "description",
        content: "See upcoming public events and general space availability at 3RD SPACE in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/calendar" }],
  }),
  component: Page,
});

function Page() {
  const events = Route.useLoaderData();
  return (
    <Section id="calendar" eyebrow="Calendar" title="What's happening at 3RD SPACE" level="h1">
      <p>Use the calendar to see upcoming public events and general space availability before submitting a request.</p>
      <p className="text-sm text-muted-foreground">
        Some approved bookings may appear on the calendar as &ldquo;Booked event&rdquo; or &ldquo;Unavailable&rdquo; instead of showing the event name. This helps protect the privacy and safety of hosts, groups, and attendees while still showing when the space is reserved.
      </p>
      <div className="pt-2">
        <GoogleCalendar events={events} publicLink={site.GOOGLE_CALENDAR_PUBLIC_LINK} />
      </div>
      <div className="pt-2">
        <CTAButton href="/request">Request a Date</CTAButton>
      </div>
    </Section>
  );
}

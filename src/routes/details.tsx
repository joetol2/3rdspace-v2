import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import { Section } from "@/components/site/Section";
import spacePhoto from "@/img/inside_001.jpg";
import {
  formatUsd,
  CATEGORY_DEFINITIONS,
  CLEANING_CHARGE,
  RATE_LABELS,
  RATES,
  RECURRING_MEETINGS_INCLUDED,
} from "@/lib/pricing";

export const Route = createFileRoute("/details")({
  head: () => ({
    meta: [
      { title: "Details & Guidelines | 3RD SPACE" },
      {
        name: "description",
        content: "Space details, pricing, guidelines, and use policies for 3RD SPACE in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/details" }],
  }),
  component: Page,
});

/**
 * The published minimums.
 *
 * Every number comes from src/lib/pricing.ts, which is the same file the
 * request form prices against and the same rates the Apps Script recomputes
 * on submission. Typed out here a second time, this table would be wrong
 * within a month of the first rate change and nobody would notice until
 * somebody was quoted one figure and charged another.
 */
const RATE_ROWS = [
  "meetingOneTime",
  "meetingRecurring",
  "eventHalfDay",
  "eventFullDay",
] as const;

function PricingTable() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="font-display text-base font-bold text-foreground">
        Minimum pricing
      </p>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-foreground/75">
        All figures are minimums in US dollars. We confirm the final price after
        reading your request.
      </p>

      {/* A real table, because it is one: four kinds of booking against three
          choices of area. On a phone it scrolls sideways within its own box
          rather than stretching the page. */}
      <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-border text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-semibold">Booking</th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">Indoor</th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">Indoor and outdoor</th>
              <th scope="col" className="py-2 text-right font-semibold">Outdoor only</th>
            </tr>
          </thead>
          <tbody>
            {RATE_ROWS.map((key) => (
              <tr key={key} className="border-b border-border/60 align-top">
                <th scope="row" className="py-3 pr-4 font-normal text-foreground/80">
                  {RATE_LABELS[key]}
                </th>
                <td className="py-3 pr-4 text-right font-semibold text-foreground">
                  {formatUsd(RATES[key].indoor)}
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-foreground">
                  {formatUsd(RATES[key].both)}
                </td>
                <td className="py-3 text-right font-semibold text-foreground">
                  {formatUsd(RATES[key].outdoor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 space-y-2 text-[14.5px] text-foreground/80">
        <div className="flex items-baseline justify-between gap-4">
          <dt>Cleaning charge, if the space is left dirty</dt>
          <dd className="shrink-0 font-semibold text-foreground">
            {formatUsd(CLEANING_CHARGE)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 text-[13.5px] leading-relaxed text-foreground/70">
        <p>
          <strong className="text-foreground/85">Meeting</strong>{" "}
          {CATEGORY_DEFINITIONS.meeting}{" "}
          <strong className="text-foreground/85">Event</strong>{" "}
          {CATEGORY_DEFINITIONS.event}
        </p>
        <p>
          The recurring plan is a monthly minimum covering up to{" "}
          {RECURRING_MEETINGS_INCLUDED} meetings in a calendar month, not a price
          per meeting. It stays the same for a month with fewer. Outdoor-only
          recurring meetings are the exception and are charged per meeting.
        </p>
        <p>
          Setup and cleanup time does not count towards these limits. Tell us what
          you need and we will hold the space for it.
        </p>
        <p>
          Repeating events, bookings running over more than one day, more than
          four meetings in a calendar month, and anything longer than the hours
          above are priced individually. Send the request and we will come back
          to you.
        </p>
      </div>
    </div>
  );
}

function Page() {
  return (
    <>
      <Section id="details" title="Space Details" level="h1">
        <img
          src={spacePhoto}
          alt="Inside the 3RD SPACE event room"
          className="mx-auto w-full max-w-2xl rounded-2xl object-cover shadow-sm"
        />
        <p>
          3RD SPACE is available for both indoor and outdoor (parking lot) use, depending on your event.
        </p>
        <p>
          Pricing depends on whether your booking is a meeting or an event, how long it runs, which areas you need, and whether it repeats. The table below is the minimum for each. Low-cost and sliding scale access is available, and the request form has a box to ask about it.
        </p>
        <PricingTable />
        <p>Free Wi-Fi is available for approved uses of the space.</p>
        <p>We have tables and chairs available.</p>
        <p>
          Equipment rental referrals are available upon request, including audio, tents, lighting, and TVs/screens.
        </p>
        <p>
          If your event has specific accessibility needs, include them in your request.
        </p>
        <p className="text-[15px] text-foreground/70">{site.address.line1}, {site.address.line2}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <CTAButton href={site.phoneHref} variant="ghost">Call Us</CTAButton>{" "}
          <CTAButton href="/request">Request the Space</CTAButton>
        </div>
      </Section>

      <Section id="our-guidelines" title="Our Guidelines">
        <p>
          3RD SPACE is committed to keeping the space inclusive, accountable, respectful and well-cared for.
        </p>
        <p>
          Everyone who hosts, attends, volunteers, or partners with 3RD SPACE is expected to help protect the spirit of the space.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Practice inclusion</li>
          <li>Respect the staff, volunteers, organizers</li>
          <li>Kindness matters</li>
          <li>Respect the physical space</li>
          <li>Harassment of any kind is not tolerated.</li>
          <li>Respect boundaries</li>
          <li>Hate speech is never okay</li>
          <li>Don't be mean</li>
        </ul>
      </Section>

      <Section id="guidelines" title="Space Use Policies">
        <p>
          To keep 3RD SPACE safe, welcoming, accessible, and available for community use, all hosts and guests are expected to follow these policies.
        </p>

        <p>
          Alcohol, drugs, weapons & hazardous materials are not permitted, including flammable materials, toxic substances, chemicals, fuel, explosives, dangerous equipment, or anything else that could create a safety risk.
        </p>
        <p>
          Pets require approval for every event. Service animals are permitted in accordance with applicable law.
        </p>
        <p>Youth events must have appropriate adult supervision at all times.</p>
        <p>
          Outside food and catering are allowed with advance approval, including equipment and related set-up.
        </p>
        <p>Cooking is not permitted inside the space. Outdoor cooking may be allowed with advance approval.</p>
        <p>
          Smoking, vaping, candles, incense, open flames, heaters, and fire-related equipment must be approved in advance.
        </p>
        <p>Decorations must be approved in advance.</p>
        <p>
          Please do not use nails, screws, glitter, confetti, paint, smoke machines, adhesives that damage surfaces, or anything that marks walls, floors, furniture, or fixtures.
        </p>
        <p>
          Music, amplified sound, and group noise must not disturb neighboring properties or violate applicable county noise rules.
        </p>
        <p>Guests must park legally and respectfully.</p>
        <p>
          Please do not block driveways, fire lanes, neighboring businesses, private property, sidewalks, or access points.
        </p>
        <p>
          Photos and video may be taken at public 3RD SPACE events for website, newsletter, or promotional use. Hosts should let 3RD SPACE know if their gathering has privacy concerns.
        </p>

        <h3 id="setup-access-cleanup" className="scroll-mt-24 pt-2 font-display text-lg font-bold text-foreground">Setup and Cleanup</h3>
        <p>
          Hosts are responsible for setup and cleanup within their approved booking time. The space should be returned to the condition in which it was found. Trash, decorations, food, equipment, and personal items must be removed at the end of the event unless other arrangements are approved in advance.
        </p>
        <p>
          Access instructions will be provided after a booking is approved. Hosts are responsible for following the agreed access process and may not share access codes or access instructions without approval.
        </p>
        <p>Outside chairs, tables, decorations, supplies, furniture, and equipment must be approved in advance.</p>
        <p>All outside items must be removed at the end of the rental unless another arrangement has been approved.</p>
        <p>Equipment rental referrals are available upon request.</p>

        <h3 id="safety-permits-responsibility" className="scroll-mt-24 pt-2 font-display text-lg font-bold text-foreground">Fire and Safety Access</h3>
        <p>Exits, walkways, driveways, emergency access points must remain clear at all times.</p>
        <p>Some uses may require additional review, permits, or agency approval.</p>
        <p>
          3RD SPACE is not responsible for lost, stolen, or damaged personal property. Hosts may be responsible for damage to the space, furniture, fixtures, equipment, or property caused by their event, guests, vendors, or approved outside equipment.
        </p>
        <p>If you need to cancel or change your approved booking, please contact 3RD SPACE as soon as possible.</p>
        <p>Cancellation terms may vary.</p>
        <p>If payment or a deposit is required for your event, any refund or credit terms will be confirmed before approval.</p>
        <p>Repeated cancellations or last-minute changes may affect future booking approval.</p>
      </Section>
    </>
  );
}

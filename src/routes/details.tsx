import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import { Section } from "@/components/site/Section";
import spacePhoto from "@/img/inside_001.jpg";

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

function PricingRow({ label, price }: { label: string; price: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold text-foreground">{price}</dd>
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
          Pricing varies based on the type of event, length of use, attendance size, staffing needs, and whether the request qualifies for low-cost or sliding scale access.
        </p>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="font-display text-base font-bold text-foreground">General Pricing Minimums</p>
          <dl className="mt-3 space-y-2 text-[15px] text-foreground/80">
            <PricingRow label="Interior only — Half day (up to 4 hours)" price="$75" />
            <PricingRow label="Interior only — Full day" price="$150" />
            <PricingRow label="Add Exterior (outdoor / parking lot use)" price="$150" />
            <PricingRow label="Cleaning Charge (if left dirty)" price="$75" />
          </dl>
        </div>
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
          Alcohol, Drugs, Weapons & Hazardous Materials are not permitted, including flammable materials, toxic substances, chemicals, fuel, explosives, dangerous equipment, or anything else that could create a safety risk.
        </p>
        <p>
          Pets require approval for every event. Service animals are permitted in accordance with applicable law.
        </p>
        <p>Youth Events must have appropriate adult supervision at all times.</p>
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

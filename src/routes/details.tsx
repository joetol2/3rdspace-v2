import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { Accordion } from "@/components/site/Accordion";
import { CTAButton } from "@/components/site/CTAButton";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import { Section } from "@/components/site/Section";
import insideBg from "@/img/inside_IMG_3223.png";

export const Route = createFileRoute("/details")({
  head: () => ({
    meta: [
      { title: "Details & Guidelines | 3RD SPACE" },
      {
        name: "description",
        content: "Space details, pricing, community agreements, use policies, setup and access, and safety information for 3RD SPACE in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/details" }],
  }),
  component: Page,
});

type PolicyItem = { title: string; content: ReactNode };

function PolicyList({ items }: { items: PolicyItem[] }) {
  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.title}>
          <h3 className="font-display text-base font-bold text-foreground sm:text-lg">{item.title}</h3>
          <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-foreground/80 sm:text-base">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}

const communityAgreements = [
  {
    title: "Practice Inclusion",
    content: (
      <>
        <p>Programming should be created with intention.</p>
        <p>Hosts are asked to consider who is invited, who is represented, who may feel left out, and how the gathering can support a more welcoming experience.</p>
      </>
    ),
  },
  {
    title: "Respect the People Doing the Work",
    content: (
      <>
        <p>Please respect staff, volunteers, organizers, hosts, artists, and anyone helping care for the space.</p>
        <p>Kindness matters, especially toward people doing labor before, during, and after an event.</p>
      </>
    ),
  },
  {
    title: "Respect the Physical Space",
    content: (
      <>
        <p>Please clean up after yourself and leave the space ready for the next group.</p>
        <p>Damage, trash, or careless use takes time and money away from programming, artists, access, and long-term care of the space.</p>
      </>
    ),
  },
  {
    title: "Ask for Consent",
    content: (
      <>
        <p>Practice consent with friends, guests, and people you are meeting for the first time.</p>
        <p>Consent should be clear, ongoing, and freely given.</p>
        <p>Harassment of any kind is not tolerated.</p>
      </>
    ),
  },
  {
    title: "Respect Boundaries",
    content: (
      <>
        <p>People may have different boundaries around personal space, language, topics, privacy, and participation.</p>
        <p>If you are unsure whether a topic or action is welcome, ask first.</p>
        <p>No one is required to explain their boundaries.</p>
      </>
    ),
  },
  {
    title: "Protect Privacy",
    content: (
      <>
        <p>Please respect the privacy of others.</p>
        <p>Lessons from a conversation may be shared, but names, personal details, and identifying information should stay private unless permission has been given.</p>
      </>
    ),
  },
  {
    title: "Use Thoughtful Language",
    content: (
      <>
        <p>Hate speech is not welcome at 3RD SPACE.</p>
        <p>Please honor people's names and pronouns.</p>
        <p>Use content warnings when discussing sensitive experiences or topics.</p>
        <p>Speak from your own experience rather than speaking for everyone.</p>
      </>
    ),
  },
  {
    title: "Handle Conflict With Care",
    content: (
      <>
        <p>Conflict should be handled through communication, accountability, and repair whenever possible.</p>
        <p>We aim to call people in, not shame people out.</p>
        <p>Violence, belittling, intimidation, and arguing for the sake of argument are not welcome.</p>
      </>
    ),
  },
  {
    title: "Share the Space",
    content: (
      <>
        <p>Be aware of how much space you are taking up.</p>
        <p>Speak when you have something to share, and make room for other people to contribute.</p>
      </>
    ),
  },
  {
    title: "Practice Accountability",
    content: (
      <>
        <p>If your words or actions cause harm, listen, take responsibility, acknowledge the impact, apologize when needed, and commit to doing better.</p>
        <p>Assume positive intent when possible, while still being accountable for impact.</p>
      </>
    ),
  },
];

const spaceUsePolicies: PolicyItem[] = [
  { title: "No Alcohol", content: <p>Alcohol is not permitted at 3RD SPACE.</p> },
  { title: "No Illegal Drugs", content: <p>Illegal drugs are not permitted anywhere on the property.</p> },
  { title: "No Firearms or Weapons", content: <p>Firearms and weapons are not permitted at 3RD SPACE.</p> },
  {
    title: "No Hazardous Materials",
    content: (
      <p>
        Hazardous materials are not permitted. This includes flammable materials, toxic substances, chemicals, fuel, explosives, dangerous equipment, or anything that could create a safety risk.
      </p>
    ),
  },
  {
    title: "Pets",
    content: (
      <>
        <p>Pets require approval for every event.</p>
        <p>Approved pets must remain under the owner's control at all times. Owners are responsible for cleanup, behavior, and any damage caused by the pet.</p>
        <p>Service animals are permitted in accordance with applicable law.</p>
      </>
    ),
  },
  { title: "Youth Events", content: <p>Events involving minors must have appropriate adult supervision at all times.</p> },
  {
    title: "Food and Catering",
    content: (
      <>
        <p>Outside food and catering are allowed with advance approval.</p>
        <p>Cooking is not permitted inside the space. Outdoor cooking may be allowed with advance approval.</p>
        <p>Catering, cooking equipment, warming equipment, food service, or related setup needs may require additional review.</p>
      </>
    ),
  },
  {
    title: "Smoking and Open Flames",
    content: (
      <p>
        Smoking, vaping, candles, incense, open flames, heaters, cooking flames, and fire-related equipment must be approved in advance or may be prohibited depending on the event.
      </p>
    ),
  },
  {
    title: "Decorations",
    content: (
      <>
        <p>Decorations must be approved in advance.</p>
        <p>Please do not use nails, screws, glitter, confetti, paint, smoke machines, adhesives that damage surfaces, or anything that marks walls, floors, furniture, or fixtures.</p>
      </>
    ),
  },
  {
    title: "Noise",
    content: (
      <>
        <p>Hosts and guests must keep noise at a respectful level.</p>
        <p>Music, amplified sound, and group noise must not disturb neighboring properties or violate applicable county noise rules.</p>
      </>
    ),
  },
  {
    title: "Parking",
    content: (
      <>
        <p>Guests must park legally and respectfully.</p>
        <p>Please do not block driveways, fire lanes, neighboring businesses, private property, sidewalks, or access points.</p>
      </>
    ),
  },
  {
    title: "Photography and Media",
    content: (
      <>
        <p>Public events may be photographed or recorded for 3RD SPACE communications.</p>
        <p>Photos from public events may be used on the 3RD SPACE website and social channels.</p>
        <p>Please let us know in advance if your event has privacy needs or if any guests should not be photographed.</p>
      </>
    ),
  },
];

const setupAccessCleanup: PolicyItem[] = [
  {
    title: "Setup and Cleanup",
    content: (
      <>
        <p>Setup and cleanup time must be included in the requested rental window unless another arrangement has been approved.</p>
        <p>Hosts are responsible for leaving the space clean and ready for the next group.</p>
        <p>Trash, personal items, decorations, food, supplies, and outside equipment must be removed at the end of the rental unless another arrangement has been approved.</p>
      </>
    ),
  },
  {
    title: "Keys and Access",
    content: (
      <>
        <p>Access details will be provided after approval.</p>
        <p>Hosts are responsible for opening, closing, and securing the space according to the instructions provided.</p>
        <p>Lost keys, access devices, or lock-related costs may be charged to the host.</p>
      </>
    ),
  },
  {
    title: "Outside Equipment",
    content: (
      <>
        <p>Outside chairs, tables, decorations, supplies, furniture, and equipment must be approved in advance.</p>
        <p>All outside items must be removed at the end of the rental unless another arrangement has been approved.</p>
      </>
    ),
  },
  {
    title: "Equipment Rental Referrals",
    content: (
      <>
        <p>Equipment rental referrals are available upon request.</p>
        <p>If you need additional chairs, tables, audio equipment, tents, lighting, TVs/screens, or other event support, please call us.</p>
        <p>Phone: <a className="underline" href={site.phoneHref}>{site.phone}</a></p>
      </>
    ),
  },
];

const safetyPermitsResponsibility: PolicyItem[] = [
  {
    title: "Fire and Safety Access",
    content: (
      <p>Exits, walkways, driveways, emergency access points, and safety equipment must remain clear at all times.</p>
    ),
  },
  {
    title: "Permits and Approvals",
    content: (
      <>
        <p>Some uses may require additional review, permits, or agency approval.</p>
        <p>This may apply to larger gatherings, public events, tents, canopies, amplified sound, food service, temporary equipment, or activities that create added safety or operational needs.</p>
        <p>Please contact us before making plans that involve amplified sound, special equipment, food service, or a larger public gathering.</p>
      </>
    ),
  },
  {
    title: "Lost, Stolen, Missing, Broken, or Damaged Property",
    content: (
      <>
        <p>Hosts are responsible for any lost, stolen, missing, broken, or damaged items connected to their use of the space.</p>
        <p>This may include furniture, fixtures, equipment, keys, access devices, or other property belonging to 3RD SPACE.</p>
        <p>If something is damaged, broken, or missing during your use of the space, please notify us right away.</p>
        <p>Repair, replacement, cleaning, or recovery costs may be charged to the host.</p>
      </>
    ),
  },
  {
    title: "Cancellation Policy",
    content: (
      <>
        <p>If you need to cancel or change your approved booking, please contact 3RD SPACE as soon as possible.</p>
        <p>Cancellation terms may vary depending on the type of event, date, duration, setup needs, and any costs already committed for the booking.</p>
        <p>If payment or a deposit is required for your event, any refund or credit terms will be confirmed before approval.</p>
        <p>Repeated cancellations or last-minute changes may affect future booking approval.</p>
      </>
    ),
  },
];

function Page() {
  return (
    <>
      <div className="relative scroll-mt-24 border-t border-border/60" id="details">
        <ParallaxBg src={insideBg} overlay="bg-[rgba(245,240,225,0.78)]" />
        <Section title="Space Details" className="relative z-10 border-0 scroll-mt-0">
          <p>Free Wi-Fi is available for approved uses of the space.</p>
          <p>
            The space includes 24 chairs. Additional seating may be brought with advance approval.
          </p>
          <p>
            Equipment rental referrals are available upon request, including chairs, tables, audio, tents, lighting, and TVs/screens. Call us and we can point you in the right direction.
          </p>
          <p>
            The building is accessible. If your event has specific accessibility needs, include them in your request.
          </p>
          <p className="font-semibold text-foreground">Indoor maximum occupancy: 150.</p>
          <p>
            3RD SPACE is available for both indoor and outdoor (parking lot) use, depending on your event.
          </p>
          <p>
            Pricing varies based on the type of event, length of use, attendance size, staffing needs, and whether the request qualifies for low-cost or sliding scale access. Contact us for current pricing.
          </p>
          <p className="text-[15px] text-foreground/70">{site.address.line1}, {site.address.line2}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <CTAButton href={site.phoneHref} variant="ghost">Call Us</CTAButton>
            <CTAButton href="/request">Request the Space</CTAButton>
          </div>
        </Section>
      </div>

      <Section id="community-agreements" title="Community Agreements">
        <p>
          3RD SPACE is guided by community agreements that help keep the space respectful, inclusive, accountable, and cared for.
        </p>
        <p>
          Everyone who hosts, attends, volunteers, or partners with 3RD SPACE is expected to help protect the spirit of the space.
        </p>
        <Accordion items={communityAgreements} />
        <p className="pt-2">
          By using 3RD SPACE, you agree to help keep the space welcoming, respectful, accountable, and cared for.
        </p>
      </Section>

      <Section id="guidelines" title="Space Use Policies">
        <p>
          To keep 3RD SPACE safe, welcoming, accessible, and available for community use, all hosts and guests are expected to follow these policies.
        </p>
        <PolicyList items={spaceUsePolicies} />
      </Section>

      <Section id="setup-access-cleanup" title="Setup, Access & Cleanup">
        <PolicyList items={setupAccessCleanup} />
      </Section>

      <Section id="safety-permits-responsibility" title="Safety, Permits & Responsibility">
        <PolicyList items={safetyPermitsResponsibility} />
      </Section>
    </>
  );
}

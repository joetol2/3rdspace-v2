import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { Accordion } from "@/components/site/Accordion";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Guidelines | 3RD SPACE" },
      {
        name: "description",
        content: "Guidelines and policies for using 3RD SPACE in Santa Ynez, including local rules and our cancellation policy.",
      },
    ],
    links: [{ rel: "canonical", href: "/guidelines" }],
  }),
  component: Page,
});

const allGuidelineItems = [
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
    title: "Photography and Media",
    content: (
      <>
        <p>Public events may be photographed or recorded for 3RD SPACE communications.</p>
        <p>Photos from public events may be used on the 3RD SPACE website and social channels.</p>
        <p>Please let us know in advance if your event has privacy needs or if any guests should not be photographed.</p>
      </>
    ),
  },
  // Local rules
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
    title: "Fire and Safety Access",
    content: (
      <p>Exits, walkways, driveways, emergency access points, and safety equipment must remain clear at all times.</p>
    ),
  },
  // Cancellation
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
    <Section id="guidelines" eyebrow="Guidelines and Policies" title="Help us care for the space">
      <p>
        To keep 3RD SPACE safe, welcoming, accessible, and available for community use, all hosts and guests are expected to follow these guidelines. This includes local rules and our cancellation policy.
      </p>
      <Accordion items={allGuidelineItems} />
    </Section>
  );
}

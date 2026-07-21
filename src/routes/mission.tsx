import { createFileRoute } from "@tanstack/react-router";
import { CTAButton } from "@/components/site/CTAButton";
import { InfoCard } from "@/components/site/InfoCard";
import { Section } from "@/components/site/Section";
import doorPhoto from "@/img/IMG_6166.jpeg";

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: "Mission | 3RD SPACE" },
      {
        name: "description",
        content:
          "3RD SPACE is an inclusive and accessible hub for community life in the Santa Ynez Valley, offering low-cost and sliding-scale space for creative, cultural, civic, and community programming.",
      },
    ],
    links: [{ rel: "canonical", href: "/mission" }],
  }),
  component: Page,
});

const useTypes = [
  "Community programs and public conversations",
  "Workshops, classes, and creative sessions",
  "Wellness offerings and small-group gatherings",
  "Private events and approved celebrations",
  "Local meetings, nonprofit uses, and community organizing",
  "Partner-led programming and recurring events",
];

function Page() {
  return (
    <>
      <Section id="mission" title="Mission" level="h1">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
          <p>
            3RD SPACE is an inclusive and accessible hub for community life in the Santa Ynez Valley. By offering a low-cost and sliding-scale space for creative, cultural, civic, and community programming, we foster connection, support local justice work, and provide a safe place for people to gather, collaborate, and grow.
          </p>
          <img
            src={doorPhoto}
            alt="The 3RD SPACE entrance with an olive tree of community wishes"
            className="w-full rounded-2xl object-cover shadow-sm"
          />
        </div>
      </Section>

      <Section id="programs" title="Community Use">
        <div className="grid gap-4 sm:grid-cols-2">
          {useTypes.map((u) => (
            <InfoCard key={u} title={u} />
          ))}
        </div>
        <div className="pt-2">
          <CTAButton href="/request#contact">Contact</CTAButton>
        </div>
      </Section>
    </>
  );
}

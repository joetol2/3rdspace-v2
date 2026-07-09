import { createFileRoute } from "@tanstack/react-router";
import { CTAButton } from "@/components/site/CTAButton";
import { InfoCard } from "@/components/site/InfoCard";
import { Section } from "@/components/site/Section";

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
        <p>
          3RD SPACE is an inclusive and accessible hub for community life in the Santa Ynez Valley. By offering a low-cost and sliding-scale space for creative, cultural, civic, and community programming, we foster connection, support local justice work, and provide a safe place for people to gather, collaborate, and grow.
        </p>
      </Section>

      <Section id="programs" title="Programs, Gatherings & Community Use">
        <div className="grid gap-4 sm:grid-cols-2">
          {useTypes.map((u) => (
            <InfoCard key={u} title={u} />
          ))}
        </div>
        <div className="pt-2">
          <CTAButton href="/request">Request Space / Contact</CTAButton>
        </div>
      </Section>
    </>
  );
}

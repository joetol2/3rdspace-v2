import { createFileRoute } from "@tanstack/react-router";
import { CTAButton } from "@/components/site/CTAButton";
import { InfoCard } from "@/components/site/InfoCard";
import { Section } from "@/components/site/Section";
import { AboutSection } from "@/components/site/AboutSection";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | 3RD SPACE" },
      {
        name: "description",
        content:
          "Learn about 3RD SPACE, a welcoming community place in Santa Ynez, and the programs and gatherings it supports.",
      },
    ],
    links: [{ rel: "canonical", href: "/about" }],
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
  "Other uses reviewed case by case",
];

function Page() {
  return (
    <>
      <AboutSection />

      <Section id="programs" eyebrow="What Happens Here" title="Programs, gatherings, and community use">
        <p>3RD SPACE can be used for many kinds of local activity.</p>
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          {useTypes.map((u) => (
            <InfoCard key={u} title={u} />
          ))}
        </div>
        <p className="pt-2">
          If you have an idea for a gathering, class, event, or community program, we would like to hear from you.
        </p>
        <div className="pt-2">
          <CTAButton href="/request">Request the Space</CTAButton>
        </div>
      </Section>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { CTAButton } from "@/components/site/CTAButton";
import { InfoCard } from "@/components/site/InfoCard";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import { Section } from "@/components/site/Section";
import doorBg from "@/img/IMG_6166.jpeg";

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
      <div className="relative scroll-mt-24 border-t border-border/60">
        <ParallaxBg src={doorBg} overlay="bg-[rgba(245,240,225,0.78)]" />
        <Section id="mission" title="Mission" level="h1" className="relative z-10 border-0 scroll-mt-0">
          <p>
            3RD SPACE is an inclusive and accessible hub for community life in the Santa Ynez Valley. By offering a low-cost and sliding-scale space for creative, cultural, civic, and community programming, we foster connection, support local justice work, and provide a safe place for people to gather, collaborate, and grow.
          </p>
        </Section>
      </div>

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

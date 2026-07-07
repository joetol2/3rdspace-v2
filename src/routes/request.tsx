import { createFileRoute } from "@tanstack/react-router";
import { CTAButton } from "@/components/site/CTAButton";
import { Section } from "@/components/site/Section";
import { CollapsibleForm } from "@/components/site/RequestForm";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request the Space | 3RD SPACE" },
      {
        name: "description",
        content: "Request to use 3RD SPACE for your community gathering, workshop, or event in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/request" }],
  }),
  component: Page,
});

function Page() {
  return (
    <Section id="request" eyebrow="Request the Space" title="Tell us what you would like to host">
      <p>
        3RD SPACE welcomes thoughtful requests from local organizers, educators, artists, wellness practitioners, nonprofits, neighbors, and community groups.
      </p>
      <p>
        Some uses may qualify for low-cost or sliding scale access. All requests are reviewed before approval. Payment, when applicable, is handled offline after approval.
      </p>
      <div className="rounded-2xl border border-foreground/15 bg-card p-5">
        <p className="text-[15px] text-foreground/80">
          Submitting a request does not confirm the booking. Your date and time are confirmed only after approval from 3RD SPACE.
        </p>
      </div>
      <div className="pt-2">
        <CollapsibleForm />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="font-display text-lg font-bold">Want a walkthrough first?</p>
        <p className="mt-2 text-[15px] text-foreground/80">
          You can schedule a short call or in-person walkthrough with a host. This is an optional step and not the main booking path.
        </p>
        <div className="mt-4">
          <CTAButton href="/contact" variant="ghost">Get in touch</CTAButton>
        </div>
      </div>
    </Section>
  );
}

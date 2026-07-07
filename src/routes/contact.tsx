import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import { ContactBlock } from "@/components/site/ContactBlock";
import { MottoSection } from "@/components/site/MottoSection";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | 3RD SPACE" },
      {
        name: "description",
        content: "Contact 3RD SPACE for availability, pricing, space requests, and visiting details in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <Section id="contact" eyebrow="Contact and Visit" title="Get in touch">
        <p>
          For availability, pricing, space requests, equipment referrals, programming questions, donations, or support opportunities, please contact us.
        </p>
        <ContactBlock />
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-display text-lg font-bold">Address</p>
          <p className="mt-2 text-foreground/80">{site.address.line1}</p>
          <p className="text-foreground/80">{site.address.line2}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-foreground/80">
            <li>Parking details will be confirmed with approved hosts.</li>
            <li>Restroom and entrance details can be discussed before your event.</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <CTAButton href={`mailto:${site.email}`} variant="ghost">Email Us</CTAButton>
          <CTAButton href={site.phoneHref} variant="ghost">Call Us</CTAButton>
          <CTAButton href="/calendar" variant="ghost">View Calendar</CTAButton>
          <CTAButton href="/request">Request the Space</CTAButton>
        </div>
      </Section>
      <MottoSection />
    </>
  );
}

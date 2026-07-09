import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import { ContactBlock } from "@/components/site/ContactBlock";
import { Section } from "@/components/site/Section";
import { RequestFormPanel } from "@/components/site/RequestForm";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request Space / Contact | 3RD SPACE" },
      {
        name: "description",
        content: "Request to use 3RD SPACE for a gathering, meeting, workshop, event, or community use in Santa Ynez, or find contact information for the team.",
      },
    ],
    links: [{ rel: "canonical", href: "/request" }],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <Section id="request" eyebrow="Request Space / Contact" title="Tell us what you would like to host">
        <p>
          Use this form to request 3RD SPACE for a gathering, meeting, workshop, event, or community use. Submitting a request does not confirm your booking. The 3RD SPACE team will review your request and follow up.
        </p>
        <p>
          Some uses may qualify for low-cost or sliding-scale access. All requests are reviewed before approval.
        </p>
        <div className="pt-2">
          <RequestFormPanel />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-display text-lg font-bold">Want a walkthrough first?</p>
          <p className="mt-2 text-[15px] text-foreground/80">
            You can schedule a short call or in-person walkthrough with a host. This is an optional step and not the main booking path.
          </p>
          <div className="mt-4">
            <CTAButton href="/request#contact" variant="ghost">Get in touch</CTAButton>
          </div>
        </div>
      </Section>

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
        </div>
      </Section>
    </>
  );
}

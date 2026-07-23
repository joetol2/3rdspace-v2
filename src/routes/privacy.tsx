import { createFileRoute } from "@tanstack/react-router";
import { ContactBlock } from "@/components/site/ContactBlock";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | 3RD SPACE" },
      {
        name: "description",
        content: "How 3RD SPACE collects, uses, and protects information submitted through this website.",
      },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Page,
});

function Page() {
  return (
    <Section id="privacy" title="Privacy Policy" level="h1">
      <p>
        This policy explains what information 3RD SPACE collects through this website, how it's used, and who it's shared with. We've kept it short because this is a small community space, not a data-driven business, so we don't have anything more complicated to tell you.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Information we collect</p>
      <p>
        If you submit a space request through this site, we collect what you enter in the form: your name, email, phone number, and (optionally) an organization or group name, along with details about the event itself: the type of use, preferred date and time, expected attendance, description, and any notes about food, pets, furniture, sound equipment, or accessibility needs.
      </p>
      <p>
        If you email or call us directly using the links on this site, we receive whatever information you choose to share in that email or call, through our own email and phone accounts.
      </p>
      <p>
        We don't have a newsletter or mailing-list signup form on this site. If you email us asking to join a mailing list, we'll only use that email address for that purpose.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Cookies and tracking</p>
      <p>
        This site does not use cookies, analytics, or any advertising or tracking scripts. We don't track your browsing activity on this site or across other sites.
      </p>

      <p className="font-display text-lg font-bold text-foreground">How we use your information</p>
      <p>
        We use the information you submit to review and respond to your space request, coordinate booking details, and follow up by email or phone. We don't use it for marketing, and we don't sell or rent it to anyone.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Third-party services</p>
      <p>
        Space requests submitted through this site are processed using Google Forms and stored in a Google Sheet. Our public event calendar is powered by Google Calendar. Google's own privacy policy governs how they handle data on their systems. This website is hosted on GitHub Pages, which, like most web hosts, may automatically log basic technical information such as IP address and browser type for security and performance purposes.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Photos and video at events</p>
      <p>
        As described in our{" "}
        <a className="underline underline-offset-4 hover:text-accent" href="/details">
          Space Use Policies
        </a>
        , photos and video may be taken at public 3RD SPACE events for our website, newsletter, or promotional use. Let us know in advance if your gathering has privacy concerns.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Children's privacy</p>
      <p>
        This website is not directed at children, and we don't knowingly collect personal information from children through this site.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Your choices</p>
      <p>
        If you'd like to review, correct, or ask us to delete information you've submitted through this site, contact us and we'll take care of it.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Changes to this policy</p>
      <p>
        If this policy changes, we'll update this page. Check back occasionally if you want to know what's current.
      </p>

      <p className="font-display text-lg font-bold text-foreground">Contact us</p>
      <div className="pt-2">
        <ContactBlock />
      </div>
      <p className="pt-2 text-sm text-muted-foreground">Last updated: July 2026</p>
    </Section>
  );
}

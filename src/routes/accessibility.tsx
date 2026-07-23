import { createFileRoute } from "@tanstack/react-router";
import { ContactBlock } from "@/components/site/ContactBlock";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility | 3RD SPACE" },
      {
        name: "description",
        content: "3RD SPACE's commitment to web accessibility, and how to report an accessibility barrier on this site.",
      },
    ],
    links: [{ rel: "canonical", href: "/accessibility" }],
  }),
  component: Page,
});

function Page() {
  return (
    <Section id="accessibility" title="Accessibility" level="h1">
      <p>
        3RD SPACE is committed to making this website usable by the widest possible audience, including people with disabilities. We are working to meet the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.
      </p>
      <p>Steps we've taken include:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>A clear, consistent heading structure and a skip-to-content link on every page</li>
        <li>Keyboard-accessible navigation, forms, and calendar, with visible focus indicators</li>
        <li>Labeled form fields and descriptive alt text for images</li>
        <li>Text and background colors checked against WCAG contrast requirements</li>
        <li>Support for reduced-motion preferences</li>
      </ul>
      <p>
        This site has been checked with automated accessibility testing tools (axe-core) against zero known violations as of our last review, and with manual keyboard-navigation testing. Accessibility is ongoing work, and automated and manual testing can't catch every issue.
      </p>
      <p>
        If you run into a barrier using this site, please let us know so we can fix it. We take reports seriously and will do our best to address the issue promptly.
      </p>
      <div className="pt-2">
        <ContactBlock />
      </div>
      <p className="pt-2 text-sm text-muted-foreground">Last reviewed: July 2026</p>
    </Section>
  );
}

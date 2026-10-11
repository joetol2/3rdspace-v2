import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { SurveyForm } from "@/components/site/SurveyForm";

/**
 * The community survey, reached by QR code from Laura's print campaign.
 *
 * Deliberately not linked from anywhere on the site: the nav, the footer and
 * the sitemap all leave it alone. The printed code is the only way in, which
 * is the point.
 *
 * noindex while the body is still empty. A blank page in search results helps
 * nobody, and the QR is the entry route regardless. One line to remove when
 * the survey goes live, if being findable by search ever becomes useful.
 *
 * The URL is a one-way door. Once the codes are printed, /survey/ is fixed,
 * so nothing here should move or be renamed.
 *
 * It is also prerendered, which the other inner pages are not. See
 * scripts/prerender.mjs: everything else falls back to 404.html and flashes
 * the homepage before the router catches up, which is tolerable on a link and
 * a poor first impression when a stranger has just scanned a flyer, often on
 * one bar of signal.
 */
export const Route = createFileRoute("/survey")({
  head: () => ({
    meta: [
      { title: "Community Survey | 3RD SPACE" },
      {
        name: "description",
        content:
          "Tell 3RD SPACE what you would like to see at the space in Santa Ynez.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/survey" }],
  }),
  component: Page,
});

function Page() {
  return (
    <Section id="survey" eyebrow="3RD SPACE" title="Community Survey" level="h1">
      <p>
        We are working out what 3RD SPACE should be for. This is how you tell us:
        what you would like to see here, when it would suit you to come, and what
        would make the space more useful to you.
      </p>
      <p>
        <strong>Every question is optional.</strong> Answer as few or as many as
        you like. It is anonymous unless you choose to leave your name at the end.
      </p>
      <div className="pt-4">
        <SurveyForm />
      </div>
    </Section>
  );
}

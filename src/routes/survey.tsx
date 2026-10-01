import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";

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
      {/* ----------------------------------------------------------------
          EVERYTHING BETWEEN THESE MARKERS IS A PLACEHOLDER.

          Replace it with the survey once the questions are settled. Two
          shapes are expected:

          1. A Google Form in an iframe. Drop it straight in here. Give the
             iframe an explicit height, because a Google Form cannot resize
             its own frame from another origin and will otherwise show an
             inner scrollbar on a phone. Something like:

               <iframe
                 src="https://docs.google.com/forms/d/e/FORM_ID/viewform?embedded=true"
                 title="3RD SPACE community survey"
                 className="h-[1400px] w-full rounded-xl border border-border"
                 loading="lazy"
               />

             Worth knowing before choosing this: an embedded Google Form
             carries its own styling and will not look like the rest of the
             site, and some privacy blockers hide third-party iframes
             entirely, so a few people will see an empty box.

          2. A form built here, posting to the Apps Script the way
             RequestForm.tsx does, with answers landing in a new spreadsheet
             and an optional, unticked mailing-list box. More work, looks
             like the site, and nothing can block it.

          Until then this holding text stands in, so that a code scanned
          early lands somewhere deliberate rather than on an empty page.
      ---------------------------------------------------------------- */}
      <p>
        We are putting together a short survey to find out what people want
        from 3RD SPACE: what you would like to see here, when it would suit you
        to come, and what would make the space more useful to you.
      </p>
      <p>
        <strong>It is not quite ready yet.</strong> Please check back shortly,
        or come and talk to us at the space in the meantime. We would rather
        hear from you in person anyway.
      </p>
      {/* -------------------------- end placeholder -------------------- */}
    </Section>
  );
}

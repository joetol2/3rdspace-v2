import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { Accordion } from "@/components/site/Accordion";
import { CTAButton } from "@/components/site/CTAButton";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import { Section } from "@/components/site/Section";
import insideBg from "@/img/inside_IMG_3223.png";

export const Route = createFileRoute("/details")({
  head: () => ({
    meta: [
      { title: "Details | 3RD SPACE" },
      {
        name: "description",
        content: "Space details, pricing, and community agreements for 3RD SPACE in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/details" }],
  }),
  component: Page,
});

const communityAgreements = [
  {
    title: "Practice Inclusion",
    content: (
      <>
        <p>Programming should be created with intention.</p>
        <p>Hosts are asked to consider who is invited, who is represented, who may feel left out, and how the gathering can support a more welcoming experience.</p>
      </>
    ),
  },
  {
    title: "Respect the People Doing the Work",
    content: (
      <>
        <p>Please respect staff, volunteers, organizers, hosts, artists, and anyone helping care for the space.</p>
        <p>Kindness matters, especially toward people doing labor before, during, and after an event.</p>
      </>
    ),
  },
  {
    title: "Respect the Physical Space",
    content: (
      <>
        <p>Please clean up after yourself and leave the space ready for the next group.</p>
        <p>Damage, trash, or careless use takes time and money away from programming, artists, access, and long-term care of the space.</p>
      </>
    ),
  },
  {
    title: "Ask for Consent",
    content: (
      <>
        <p>Practice consent with friends, guests, and people you are meeting for the first time.</p>
        <p>Consent should be clear, ongoing, and freely given.</p>
        <p>Harassment of any kind is not tolerated.</p>
      </>
    ),
  },
  {
    title: "Respect Boundaries",
    content: (
      <>
        <p>People may have different boundaries around personal space, language, topics, privacy, and participation.</p>
        <p>If you are unsure whether a topic or action is welcome, ask first.</p>
        <p>No one is required to explain their boundaries.</p>
      </>
    ),
  },
  {
    title: "Protect Privacy",
    content: (
      <>
        <p>Please respect the privacy of others.</p>
        <p>Lessons from a conversation may be shared, but names, personal details, and identifying information should stay private unless permission has been given.</p>
      </>
    ),
  },
  {
    title: "Use Thoughtful Language",
    content: (
      <>
        <p>Hate speech is not welcome at 3RD SPACE.</p>
        <p>Please honor people's names and pronouns.</p>
        <p>Use content warnings when discussing sensitive experiences or topics.</p>
        <p>Speak from your own experience rather than speaking for everyone.</p>
      </>
    ),
  },
  {
    title: "Handle Conflict With Care",
    content: (
      <>
        <p>Conflict should be handled through communication, accountability, and repair whenever possible.</p>
        <p>We aim to call people in, not shame people out.</p>
        <p>Violence, belittling, intimidation, and arguing for the sake of argument are not welcome.</p>
      </>
    ),
  },
  {
    title: "Share the Space",
    content: (
      <>
        <p>Be aware of how much space you are taking up.</p>
        <p>Speak when you have something to share, and make room for other people to contribute.</p>
      </>
    ),
  },
  {
    title: "Practice Accountability",
    content: (
      <>
        <p>If your words or actions cause harm, listen, take responsibility, acknowledge the impact, apologize when needed, and commit to doing better.</p>
        <p>Assume positive intent when possible, while still being accountable for impact.</p>
      </>
    ),
  },
];

function Page() {
  return (
    <>
      <div className="relative scroll-mt-24 border-t border-border/60" id="details">
        <ParallaxBg src={insideBg} overlay="bg-[rgba(245,240,225,0.78)]" />
        <Section eyebrow="Space Details" title="What's included and what it costs" className="relative z-10 border-0 scroll-mt-0">
          <p>Free Wi-Fi is available for approved uses of the space.</p>
          <p>
            The space includes 24 chairs. Additional seating may be brought with advance approval.
          </p>
          <p>
            Equipment rental referrals are available upon request, including chairs, tables, audio, tents, lighting, and TVs/screens. Call us and we can point you in the right direction.
          </p>
          <p>
            The building is accessible. If your event has specific accessibility needs, include them in your request.
          </p>
          <p className="font-semibold text-foreground">Indoor maximum occupancy: 150.</p>
          <p>
            Pricing varies based on the type of event, length of use, attendance size, staffing needs, and whether the request qualifies for low-cost or sliding scale access. Contact us for current pricing.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <CTAButton href={site.phoneHref} variant="ghost">Call Us</CTAButton>
            <CTAButton href="/request">Request the Space</CTAButton>
          </div>
        </Section>
      </div>

      <Section id="community-agreements" eyebrow="Community Agreements" title="How we share the space">
        <p>
          3RD SPACE is guided by community agreements that help keep the space respectful, inclusive, accountable, and cared for.
        </p>
        <p>
          Everyone who hosts, attends, volunteers, or partners with 3RD SPACE is expected to help protect the spirit of the space.
        </p>
        <Accordion items={communityAgreements} />
        <p className="pt-2">
          By using 3RD SPACE, you agree to help keep the space welcoming, respectful, accountable, and cared for.
        </p>
      </Section>
    </>
  );
}

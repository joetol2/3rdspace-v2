import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { site, navLinks } from "@/config/site";
import { EmbedFrame } from "@/components/site/EmbedFrame";
import { Accordion } from "@/components/site/Accordion";
import logoBlack from "@/img/logo-black.png";
import logoWhite from "@/img/logo-white.png";
import taglineImg from "@/img/tagline.png";
import mottoImg from "@/img/motto.png";
import heroBg from "@/img/hero-bg.png";
import heroPhoto from "@/img/IMG_6065.jpeg";
import buildingPhoto from "@/img/IMG_5999.jpeg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3RD SPACE | A Safe Place to Gather in Santa Ynez" },
      {
        name: "description",
        content:
          "3RD SPACE is a welcoming community place in Santa Ynez for local programs, workshops, meetings, wellness offerings, private gatherings, and community-led events.",
      },
      { property: "og:title", content: "3RD SPACE" },
      { property: "og:description", content: "A safe place to gather in the Santa Ynez Valley." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Page,
});

function CTAButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const b =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base min-h-11";
  const styles =
    variant === "primary"
      ? "bg-foreground text-background hover:bg-foreground/85"
      : "border border-foreground/30 text-foreground hover:bg-foreground/5";
  return (
    <a href={href} className={`${b} ${styles} ${className}`}>
      {children}
    </a>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 border-t border-border/60 ${className}`}>
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-foreground/80 sm:text-lg">
          {children}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold leading-snug text-foreground">{title}</h3>
      {children ? (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

function ContactBlock() {
  return (
    <div className="space-y-1 text-foreground/80">
      <p>
        Email:{" "}
        <a className="font-medium text-foreground underline underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
          {site.email}
        </a>
      </p>
      <p>
        Phone:{" "}
        <a className="font-medium text-foreground underline underline-offset-4 hover:text-accent" href={site.phoneHref}>
          {site.phone}
        </a>
      </p>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-2" aria-label="3RD SPACE home">
          <img src={logoBlack} alt="3RD SPACE" className="h-10 w-auto sm:h-12" />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/75 lg:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <CTAButton href="#request" className="hidden sm:inline-flex">
            Request the Space
          </CTAButton>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true" className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3 sm:px-8">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base text-foreground/80 hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <CTAButton href="#request" className="w-full">Request the Space</CTAButton>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `linear-gradient(rgba(245,240,225,0.55), rgba(245,240,225,0.92)), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
        {/* Eyebrow + tagline — full layout width */}
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Santa Ynez, California
        </p>
        <img
          src={taglineImg}
          alt="A safe place to gather in the Santa Ynez Valley"
          className="w-full"
        />
      </div>
      {/* Body copy + baby photo side by side */}
      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="max-w-xl space-y-4 text-lg text-foreground/80">
            <p>
              3RD SPACE is a welcoming community place in Santa Ynez for local programs, workshops, meetings, wellness offerings, private gatherings, and community-led events.
            </p>
            <p>
              We support accessible use of the space through low-cost and sliding scale options whenever possible.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <CTAButton href="#calendar" variant="ghost">View Calendar</CTAButton>
            <CTAButton href="#request">Request the Space</CTAButton>
          </div>
          <div className="mt-6 text-sm sm:text-base">
            <ContactBlock />
          </div>
        </div>
        <div className="hidden md:block">
          <img
            src={heroPhoto}
            alt="3RD SPACE"
            className="w-52 rounded-2xl object-cover shadow-sm lg:w-64"
          />
        </div>
      </div>
    </section>
  );
}

function MottoSection() {
  return (
    <section className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div className="hidden md:block">
          <img
            src={buildingPhoto}
            alt="3RD SPACE building"
            className="mx-auto w-full max-w-sm rounded-3xl object-cover shadow-sm"
          />
        </div>
        <div className="flex items-end justify-end">
          <img
            src={mottoImg}
            alt='"Let me get that for you" — JT'
            className="w-full max-w-lg"
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-3">
        <div>
          <img src={logoWhite} alt="3RD SPACE" className="w-32" />
          <p className="mt-3 max-w-xs text-background/75">
            A safe place to gather in the Santa Ynez Valley.
          </p>
        </div>
        <div className="text-background/80">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Contact</p>
          <div className="mt-3 space-y-1">
            <p>
              <a className="underline underline-offset-4 hover:text-background" href={`mailto:${site.email}`}>{site.email}</a>
            </p>
            <p>
              <a className="underline underline-offset-4 hover:text-background" href={site.phoneHref}>{site.phone}</a>
            </p>
            <p className="mt-3">{site.address.line1}</p>
            <p>{site.address.line2}</p>
          </div>
        </div>
        <div className="text-background/80">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Visit</p>
          <ul className="mt-3 space-y-2">
            <li><a className="hover:text-background" href="#community-agreements">Community Agreements</a></li>
            <li><a className="hover:text-background" href="#guidelines">Space Use Guidelines</a></li>
            <li><a className="hover:text-background" href="#calendar">Calendar</a></li>
            <li><a className="hover:text-background" href="#request">Request Space</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-background/15">
        <div className="mx-auto max-w-6xl px-5 py-5 text-sm text-background/60 sm:px-8">
          © {new Date().getFullYear()} 3RD SPACE. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

const useTypes = [
  "Community programs and public conversations",
  "Workshops, classes, and creative sessions",
  "Wellness offerings and small-group gatherings",
  "Private events and approved celebrations",
  "Local meetings, nonprofit uses, and community organizing",
  "Partner-led programming and recurring events",
  "Other uses reviewed case by case",
];

const requestFields = [
  "Name",
  "Email",
  "Phone",
  "Organization or group, if applicable",
  "Type of use",
  "Public event or private gathering",
  "Preferred date",
  "Start time and end time",
  "Estimated setup time",
  "Estimated cleanup time",
  "Expected attendance",
  "Event description",
  "One-time request or recurring request",
  "Low-cost or sliding scale request",
  "Food or catering needs",
  "Pet approval request",
  "Outside furniture, decorations, supplies, or equipment",
  "Amplified sound, music, tents, canopies, heaters, or special equipment",
  "Accessibility, privacy, parking, or setup needs",
];

const guidelineItems = [
  { title: "No Alcohol", content: <p>Alcohol is not permitted at 3RD SPACE.</p> },
  { title: "No Illegal Drugs", content: <p>Illegal drugs are not permitted anywhere on the property.</p> },
  { title: "No Firearms or Weapons", content: <p>Firearms and weapons are not permitted at 3RD SPACE.</p> },
  {
    title: "No Hazardous Materials",
    content: (
      <p>
        Hazardous materials are not permitted. This includes flammable materials, toxic substances, chemicals, fuel, explosives, dangerous equipment, or anything that could create a safety risk.
      </p>
    ),
  },
  {
    title: "Pets",
    content: (
      <>
        <p>Pets require approval for every event.</p>
        <p>Approved pets must remain under the owner's control at all times. Owners are responsible for cleanup, behavior, and any damage caused by the pet.</p>
        <p>Service animals are permitted in accordance with applicable law.</p>
      </>
    ),
  },
  { title: "Youth Events", content: <p>Events involving minors must have appropriate adult supervision at all times.</p> },
  {
    title: "Food and Catering",
    content: (
      <>
        <p>Outside food and catering are allowed with advance approval.</p>
        <p>Cooking is not permitted inside the space. Outdoor cooking may be allowed with advance approval.</p>
        <p>Catering, cooking equipment, warming equipment, food service, or related setup needs may require additional review.</p>
      </>
    ),
  },
  {
    title: "Smoking and Open Flames",
    content: (
      <p>
        Smoking, vaping, candles, incense, open flames, heaters, cooking flames, and fire-related equipment must be approved in advance or may be prohibited depending on the event.
      </p>
    ),
  },
  {
    title: "Decorations",
    content: (
      <>
        <p>Decorations must be approved in advance.</p>
        <p>Please do not use nails, screws, glitter, confetti, paint, smoke machines, adhesives that damage surfaces, or anything that marks walls, floors, furniture, or fixtures.</p>
      </>
    ),
  },
  {
    title: "Setup and Cleanup",
    content: (
      <>
        <p>Setup and cleanup time must be included in the requested rental window unless another arrangement has been approved.</p>
        <p>Hosts are responsible for leaving the space clean and ready for the next group.</p>
        <p>Trash, personal items, decorations, food, supplies, and outside equipment must be removed at the end of the rental unless another arrangement has been approved.</p>
      </>
    ),
  },
  {
    title: "Lost, Stolen, Missing, Broken, or Damaged Property",
    content: (
      <>
        <p>Hosts are responsible for any lost, stolen, missing, broken, or damaged items connected to their use of the space.</p>
        <p>This may include furniture, fixtures, equipment, keys, access devices, or other property belonging to 3RD SPACE.</p>
        <p>If something is damaged, broken, or missing during your use of the space, please notify us right away.</p>
        <p>Repair, replacement, cleaning, or recovery costs may be charged to the host.</p>
      </>
    ),
  },
  {
    title: "Outside Equipment",
    content: (
      <>
        <p>Outside chairs, tables, decorations, supplies, furniture, and equipment must be approved in advance.</p>
        <p>All outside items must be removed at the end of the rental unless another arrangement has been approved.</p>
      </>
    ),
  },
  {
    title: "Equipment Rental Referrals",
    content: (
      <>
        <p>Equipment rental referrals are available upon request.</p>
        <p>If you need additional chairs, tables, audio equipment, tents, lighting, linens, or other event support, please call us.</p>
        <p>Phone: <a className="underline" href={site.phoneHref}>{site.phone}</a></p>
      </>
    ),
  },
  {
    title: "Keys and Access",
    content: (
      <>
        <p>Access details will be provided after approval.</p>
        <p>Hosts are responsible for opening, closing, and securing the space according to the instructions provided.</p>
        <p>Lost keys, access devices, or lock-related costs may be charged to the host.</p>
      </>
    ),
  },
  {
    title: "Photography and Media",
    content: (
      <>
        <p>Public events may be photographed or recorded for 3RD SPACE communications.</p>
        <p>Photos from public events may be used on the 3RD SPACE website and social channels.</p>
        <p>Please let us know in advance if your event has privacy needs or if any guests should not be photographed.</p>
      </>
    ),
  },
];

const localRulesItems = [
  {
    title: "Noise",
    content: (
      <>
        <p>Hosts and guests must keep noise at a respectful level.</p>
        <p>Music, amplified sound, and group noise must not disturb neighboring properties or violate applicable county noise rules.</p>
      </>
    ),
  },
  {
    title: "Parking",
    content: (
      <>
        <p>Guests must park legally and respectfully.</p>
        <p>Please do not block driveways, fire lanes, neighboring businesses, private property, sidewalks, or access points.</p>
      </>
    ),
  },
  {
    title: "Permits and Approvals",
    content: (
      <>
        <p>Some uses may require additional review, permits, or agency approval.</p>
        <p>This may apply to larger gatherings, public events, tents, canopies, amplified sound, food service, temporary equipment, or activities that create added safety or operational needs.</p>
        <p>Please contact us before making plans that involve amplified sound, special equipment, food service, or a larger public gathering.</p>
      </>
    ),
  },
  {
    title: "Fire and Safety Access",
    content: (
      <p>Exits, walkways, driveways, emergency access points, and safety equipment must remain clear at all times.</p>
    ),
  },
];

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
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <Header />
      <main>
        <Hero />

        <Section id="about" eyebrow="About" title="A community place with purpose">
          <p>
            3RD SPACE was created to give the Santa Ynez Valley a place to gather with care, host meaningful programming, and build local connection.
          </p>
          <p>
            The space is available for community programs, creative workshops, wellness offerings, private gatherings, local meetings, and other approved uses.
          </p>
          <p>Our goal is to keep the space welcoming, useful, accessible, and well cared for.</p>
        </Section>

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
            <CTAButton href="#request">Request the Space</CTAButton>
          </div>
        </Section>

        <Section id="calendar" eyebrow="Calendar" title="What's happening at 3RD SPACE">
          <p>Use the calendar to see upcoming public events and general space availability.</p>
          <p>
            Public events may include program details, host information, date, time, and registration information when available.
          </p>
          <p>
            Private bookings may appear as unavailable time blocks. Pending requests may not appear on the public calendar until approved.
          </p>
          <p>Before submitting a request, please check the calendar for your preferred date and time.</p>
          <div className="pt-2">
            <EmbedFrame
              src={site.GOOGLE_CALENDAR_EMBED_URL}
              fallbackLink={site.GOOGLE_CALENDAR_PUBLIC_LINK}
              fallbackLabel="Open calendar in a new tab"
              title="3RD SPACE Google Calendar"
              minHeight={620}
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            {site.GOOGLE_CALENDAR_PUBLIC_LINK.startsWith("REPLACE_") ? null : (
              <CTAButton href={site.GOOGLE_CALENDAR_PUBLIC_LINK} variant="ghost">View Calendar</CTAButton>
            )}
            <CTAButton href="#request">Request a Date</CTAButton>
          </div>
        </Section>

        <Section id="request" eyebrow="Request the Space" title="Tell us what you would like to host">
          <p>
            3RD SPACE welcomes thoughtful requests from local organizers, educators, artists, wellness practitioners, nonprofits, neighbors, and community groups.
          </p>
          <p>
            Some uses may qualify for low-cost or sliding scale access based on the type of gathering, audience, timing, and need.
          </p>
          <p>All space requests are reviewed before approval. Payment, when applicable, is handled offline after approval.</p>
          <div className="rounded-2xl border border-foreground/15 bg-card p-5">
            <p className="text-[15px] text-foreground/80">
              Submitting a request does not confirm the booking. Your date and time are confirmed only after approval from 3RD SPACE.
            </p>
          </div>
          <div className="pt-2">
            <EmbedFrame
              src={site.TALLY_FORM_EMBED_URL}
              fallbackLink={site.TALLY_FORM_DIRECT_LINK}
              fallbackLabel="Open request form in a new tab"
              title="3RD SPACE Request Form"
              minHeight={780}
            />
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Request form guidance
            </p>
            <p className="mt-2 text-[15px] text-foreground/80">
              The Tally form will include these fields:
            </p>
            <ul className="mt-4 grid list-disc gap-1.5 pl-5 text-[15px] text-foreground/80 sm:grid-cols-2">
              {requestFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="mt-5 text-[15px] text-foreground/80">
              Required agreement: <em>I have read and agree to the 3RD SPACE Community Agreements and Space Use Guidelines. I understand that I am responsible for my guests, setup, cleanup, outside equipment, and any lost, stolen, missing, broken, or damaged property connected to my use of the space.</em>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-display text-lg font-bold">Want a walkthrough first?</p>
            <p className="mt-2 text-[15px] text-foreground/80">
              You can schedule a short call or in-person walkthrough with a host. This is an optional step and not the main booking path.
            </p>
            <div className="mt-4">
              <EmbedFrame
                src={site.CAL_COM_EMBED_URL}
                fallbackLink={site.CAL_COM_DIRECT_LINK}
                fallbackLabel="Schedule a walkthrough in a new tab"
                title="Schedule a walkthrough"
                minHeight={520}
              />
            </div>
          </div>
        </Section>

        <Section id="details" eyebrow="Space Details" title="What is included">
          <p>Free Wi-Fi is available for approved uses of the space.</p>
          <p>
            The space includes 24 chairs. If your gathering requires additional seating, you may bring your own chairs with advance approval.
          </p>
          <p>
            Equipment rental referrals are available upon request. If you need additional chairs, tables, audio equipment, tents, lighting, linens, or other event support, please call us and we can help point you in the right direction.
          </p>
          <p>
            Phone:{" "}
            <a className="font-medium underline underline-offset-4" href={site.phoneHref}>
              {site.phone}
            </a>
          </p>
        </Section>

        <Section id="pricing" eyebrow="Pricing" title="Accessible use and rental pricing">
          <p>3RD SPACE is committed to keeping the space accessible for local programming and community use.</p>
          <p>
            Pricing may vary based on the type of event, length of use, attendance size, staffing needs, cleaning needs, and whether the request qualifies for low-cost or sliding scale access.
          </p>
          <p>For current pricing and availability, please contact us.</p>
          <ContactBlock />
        </Section>

        <Section id="occupancy" eyebrow="Maximum Occupancy" title="Capacity and safety">
          <p>Maximum occupancy must be followed at all times.</p>
          <p className="text-xl font-semibold text-foreground">Indoor maximum occupancy: 150.</p>
          <p>
            Exits, walkways, driveways, emergency access points, and safety equipment must remain clear at all times.
          </p>
        </Section>

        <Section id="accessibility" eyebrow="Accessibility" title="Building access">
          <p>The building is accessible.</p>
          <p>
            If your event has specific accessibility needs, please include them in your space request so we can review setup needs in advance.
          </p>
        </Section>

        <Section id="guidelines" eyebrow="Space Use Guidelines" title="Help us care for the space">
          <p>
            To keep 3RD SPACE safe, welcoming, accessible, and available for community use, all hosts and guests are expected to follow these guidelines.
          </p>
          <Accordion items={guidelineItems} />
        </Section>

        <Section id="cancellation" eyebrow="Cancellation Policy" title="Changes and cancellations">
          <p>If you need to cancel or change your approved booking, please contact 3RD SPACE as soon as possible.</p>
          <p>
            Cancellation terms may vary depending on the type of event, date, duration, setup needs, and any costs already committed for the booking.
          </p>
          <p>If payment or a deposit is required for your event, any refund or credit terms will be confirmed before approval.</p>
          <p>Repeated cancellations or last-minute changes may affect future booking approval.</p>
          <ContactBlock />
        </Section>

        <Section id="local-rules" eyebrow="Local Rules" title="Respecting Santa Ynez and our neighbors">
          <p>
            3RD SPACE is located in Santa Ynez. All events must respect local rules, county requirements, nearby businesses, neighboring properties, and the surrounding community.
          </p>
          <Accordion items={localRulesItems} />
        </Section>

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

        <Section id="support" eyebrow="Support" title="Help keep the space accessible">
          <p>
            Support helps keep 3RD SPACE available for local programs, community use, sliding scale access, artists, organizers, and care of the physical space.
          </p>
          <p>
            If you would like to donate, volunteer, sponsor a program, offer in-kind support, or discuss a partnership, please contact us.
          </p>
          <ContactBlock />
        </Section>

        <Section id="contact" eyebrow="Contact and Visit" title="Get in touch">
          <p>
            For availability, pricing, space requests, equipment rental referrals, programming questions, donations, or support opportunities, please contact us.
          </p>
          <ContactBlock />
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-display text-lg font-bold">Address</p>
            <p className="mt-2 text-foreground/80">{site.address.line1}</p>
            <p className="text-foreground/80">{site.address.line2}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-display text-lg font-bold">Visit notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/80">
              <li>The building is accessible.</li>
              <li>Parking details will be confirmed directly with approved hosts.</li>
              <li>Specific restroom and entrance details can be discussed before your event if needed.</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <CTAButton href={`mailto:${site.email}`} variant="ghost">Email Us</CTAButton>
            <CTAButton href={site.phoneHref} variant="ghost">Call Us</CTAButton>
            <CTAButton href="#calendar" variant="ghost">View Calendar</CTAButton>
            <CTAButton href="#request">Request the Space</CTAButton>
          </div>
        </Section>
      </main>
      <MottoSection />
      <Footer />
    </div>
  );
}

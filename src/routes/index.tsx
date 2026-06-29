import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { site, navLinks } from "@/config/site";
import { Accordion } from "@/components/site/Accordion";
import { GoogleCalendar } from "@/components/site/GoogleCalendar";
import { fetchCalendarEvents } from "@/lib/calendar";
import logoBlack from "@/img/logo-black.png";
import logoWhite from "@/img/logo-white.png";
import taglineImg from "@/img/tagline.png";
import mottoImg from "@/img/motto.png";
import heroBg from "@/img/hero-bg.png";
import heroPhoto from "@/img/IMG_6065.jpeg";
import buildingPhoto from "@/img/IMG_5999.jpeg";

export const Route = createFileRoute("/")({
  loader: () => fetchCalendarEvents(),
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
      <motion.div
        className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
      </motion.div>
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
      {/* Background photo + gradient overlay */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(245,240,225,0.35)] to-[rgba(245,240,225,0.82)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pt-14 sm:px-8 sm:pt-20">
        <motion.p
          className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Santa Ynez, California
        </motion.p>
        <motion.img
          src={taglineImg}
          alt="A safe place to gather in the Santa Ynez Valley"
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        />
      </div>

      {/* Baby photo — full width on mobile, tucked right on md+ */}
      <motion.div
        className="relative mx-auto max-w-5xl px-5 pt-8 sm:px-8 md:hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <img
          src={heroPhoto}
          alt="3RD SPACE"
          className="w-full rounded-2xl object-cover shadow-sm"
        />
      </motion.div>

      {/* Body copy + baby photo side by side on md+ */}
      <div className="relative mx-auto grid max-w-5xl gap-8 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 md:grid-cols-[1fr_auto] md:items-start md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="max-w-[650px] space-y-4 text-lg text-foreground/80">
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
            <CTAButton href="#contact" variant="ghost">Get in touch</CTAButton>
          </div>
        </motion.div>
        <motion.div
          className="hidden md:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          <img
            src={heroPhoto}
            alt="3RD SPACE"
            className="w-44 rounded-2xl object-cover shadow-sm lg:w-52"
          />
        </motion.div>
      </div>
    </section>
  );
}

function MottoSection() {
  return (
    <section className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        {/* Building photo — visible on mobile above motto, hidden on md+ (shown in grid) */}
        <div className="mb-8 md:hidden">
          <img
            src={buildingPhoto}
            alt="3RD SPACE building"
            className="w-full rounded-3xl object-cover shadow-sm"
          />
        </div>
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
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

const allGuidelineItems = [
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
        <p>If you need additional chairs, tables, audio equipment, tents, lighting, TVs/screens, or other event support, please call us.</p>
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
  // Local rules
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
  // Cancellation
  {
    title: "Cancellation Policy",
    content: (
      <>
        <p>If you need to cancel or change your approved booking, please contact 3RD SPACE as soon as possible.</p>
        <p>Cancellation terms may vary depending on the type of event, date, duration, setup needs, and any costs already committed for the booking.</p>
        <p>If payment or a deposit is required for your event, any refund or credit terms will be confirmed before approval.</p>
        <p>Repeated cancellations or last-minute changes may affect future booking approval.</p>
      </>
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

const FORM_ACTION =
  "https://docs.google.com/forms/u/0/d/e/1FAIpQLSefT85boIigRXI2l63bwRfGUtLUifdWNeRNdooMhCxyBRhnAA/formResponse";

const USE_TYPE_OPTIONS = [
  { label: "Community gathering", value: "Community gathering" },
  { label: "Workshop or class", value: "Workshop or class" },
  { label: "Private event", value: "Private event" },
  { label: "Meeting", value: "Meeting" },
  { label: "Creative event", value: "Creative event" },
  { label: "Wellness event", value: "Wellness event" },
  { label: "Other", value: "__other_option__" },
];

const TIME_OPTIONS = ["None", "15 minutes", "30 minutes", "45 minutes", "1 hour", "More than 1 hour", "Not sure yet"];

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-foreground/90">
      {children}
      {required && <span className="ml-1 text-foreground/40">*</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-y"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
    />
  );
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-4 w-4 accent-foreground"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function CollapsibleForm() {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
      >
        <span>Submit a request</span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-xl transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-5 sm:p-8">
          <SpaceRequestForm />
        </div>
      )}
    </div>
  );
}

function SpaceRequestForm() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const [useTypes, setUseTypes] = useState<string[]>([]);
  const [otherUseType, setOtherUseType] = useState("");
  const [publicPrivate, setPublicPrivate] = useState("");
  const [oneTimeRecurring, setOneTimeRecurring] = useState("");
  const [lowCost, setLowCost] = useState("");
  const [setupTime, setSetupTime] = useState("");
  const [cleanupTime, setCleanupTime] = useState("");
  const [petApproval, setPetApproval] = useState("");
  const [agreed, setAgreed] = useState(false);

  function toggleUseType(val: string) {
    setUseTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    if (!form.checkValidity()) return;
    setTimeout(() => setSubmitted(true), 600);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background text-xl">✓</div>
        <p className="font-display text-xl font-bold text-foreground">Request received</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
          Thank you. Your request has been received. A member of the 3RD SPACE team will review it and follow up. Your booking is not confirmed until approved.
        </p>
      </div>
    );
  }

  const hasOther = useTypes.includes("__other_option__");

  return (
    <>
      <iframe ref={iframeRef} name="gform-iframe" title="form-target" aria-hidden="true" className="hidden" />
      <form
        action={FORM_ACTION}
        method="POST"
        target="gform-iframe"
        onSubmit={handleSubmit}
        className="space-y-8"
        noValidate={false}
      >
        {/* Contact */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</legend>
          <div>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <TextInput id="name" name="entry.1834506416" required placeholder="Your full name" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="email" required>Email</FieldLabel>
              <TextInput id="email" name="entry.208837996" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <FieldLabel htmlFor="phone" required>Phone</FieldLabel>
              <TextInput id="phone" name="entry.1824841687" type="tel" required placeholder="(xxx) xxx-xxxx" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="org">Organization or group</FieldLabel>
            <TextInput id="org" name="entry.1913922686" placeholder="Optional" />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Type of use */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Type of use <span className="ml-1 text-foreground/40">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {USE_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
                <input
                  type="checkbox"
                  name="entry.1236254343"
                  value={opt.value}
                  checked={useTypes.includes(opt.value)}
                  onChange={() => toggleUseType(opt.value)}
                  className="h-4 w-4 accent-foreground"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {hasOther && (
            <div>
              <FieldLabel htmlFor="other-use">Please describe</FieldLabel>
              <TextInput
                id="other-use"
                name="entry.1236254343.other_option_response"
                value={otherUseType}
                onChange={(e) => setOtherUseType(e.target.value)}
                placeholder="Describe your use"
              />
            </div>
          )}
          <div>
            <FieldLabel htmlFor="pub-priv" required>Public event or private gathering</FieldLabel>
            <RadioGroup
              name="entry.1141240791"
              options={["Public event", "Private gathering", "Not sure yet"]}
              value={publicPrivate}
              onChange={setPublicPrivate}
            />
            <input type="hidden" name="entry.1141240791" value={publicPrivate} required={!publicPrivate} />
          </div>
          <div>
            <FieldLabel htmlFor="one-time" required>One-time or recurring request</FieldLabel>
            <RadioGroup
              name="entry.759512571"
              options={["One-time request", "Recurring request", "Not sure yet"]}
              value={oneTimeRecurring}
              onChange={setOneTimeRecurring}
            />
            <input type="hidden" name="entry.759512571" value={oneTimeRecurring} required={!oneTimeRecurring} />
          </div>
          <div>
            <FieldLabel required>Low-cost or sliding scale request</FieldLabel>
            <RadioGroup
              name="entry.1839826188"
              options={["Yes", "No", "Not sure yet"]}
              value={lowCost}
              onChange={setLowCost}
            />
            <input type="hidden" name="entry.1839826188" value={lowCost} required={!lowCost} />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Date and timing */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date and timing</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pref-date" required>Preferred date</FieldLabel>
              <TextInput id="pref-date" name="entry.1129731521" type="date" required />
            </div>
            <div>
              <FieldLabel htmlFor="alt-date">Alternate date</FieldLabel>
              <TextInput id="alt-date" name="entry.1354983027" type="date" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="times" required>Start time and end time</FieldLabel>
            <TextInput id="times" name="entry.955619989" required placeholder="e.g. 10:00 AM – 2:00 PM" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="setup-time">Setup time needed</FieldLabel>
              <Select id="setup-time" name="entry.2038942892" value={setupTime} onChange={(e) => setSetupTime(e.target.value)}>
                <option value="">Select</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="cleanup-time">Cleanup time needed</FieldLabel>
              <Select id="cleanup-time" name="entry.916028151" value={cleanupTime} onChange={(e) => setCleanupTime(e.target.value)}>
                <option value="">Select</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Attendance and description */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attendance and description</legend>
          <div>
            <FieldLabel htmlFor="attendance" required>Expected attendance</FieldLabel>
            <TextInput id="attendance" name="entry.1932668577" type="number" min={1} max={150} required placeholder="Number of guests (max 150)" />
          </div>
          <div>
            <FieldLabel htmlFor="description" required>Event description</FieldLabel>
            <Textarea id="description" name="entry.768207257" required placeholder="Tell us about your gathering, program, or event." rows={4} />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Additional details */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Additional details</legend>
          <div>
            <FieldLabel htmlFor="food">Food or catering needs</FieldLabel>
            <Textarea id="food" name="entry.1671357986" placeholder="Optional. Describe any food, catering, or cooking equipment needs." />
          </div>
          <div>
            <FieldLabel required>Pet approval request</FieldLabel>
            <RadioGroup
              name="entry.1709484728"
              options={["No", "Yes", "Not sure yet"]}
              value={petApproval}
              onChange={setPetApproval}
            />
            <input type="hidden" name="entry.1709484728" value={petApproval} required={!petApproval} />
          </div>
          <div>
            <FieldLabel htmlFor="furniture">Outside furniture, decorations, supplies, or equipment</FieldLabel>
            <Textarea id="furniture" name="entry.1277108405" placeholder="Optional. List any items you plan to bring." />
          </div>
          <div>
            <FieldLabel htmlFor="sound">Amplified sound, music, tents, canopies, heaters, or special equipment</FieldLabel>
            <Textarea id="sound" name="entry.59522849" placeholder="Optional. Describe any amplified sound or special equipment." />
          </div>
          <div>
            <FieldLabel htmlFor="access">Accessibility, privacy, parking, or setup needs</FieldLabel>
            <Textarea id="access" name="entry.589645055" placeholder="Optional. Let us know about any specific needs." />
          </div>
          <div>
            <FieldLabel htmlFor="anything-else">Anything else</FieldLabel>
            <Textarea id="anything-else" name="entry.82933762" placeholder="Optional. Anything else we should know." />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Agreement */}
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              name="entry.1491791041"
              value="I have read and agree to the 3RD SPACE Community Agreements and Space Use Guidelines. I understand that I am responsible for my guests, setup, cleanup, outside equipment, and any lost, stolen, missing, broken, or damaged property connected to my use of the space."
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
            />
            <span className="text-[14px] leading-relaxed text-foreground/80">
              I have read and agree to the 3RD SPACE Community Agreements and Space Use Guidelines. I understand that I am responsible for my guests, setup, cleanup, outside equipment, and any lost, stolen, missing, broken, or damaged property connected to my use of the space. <span className="text-foreground/40">*</span>
            </span>
          </label>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-muted/20 p-4 text-[14px] text-foreground/60">
          Submitting this form does not confirm your booking. Your date and time are confirmed only after approval from 3RD SPACE.
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3.5 text-base font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        >
          Submit Request
        </button>
      </form>
    </>
  );
}

function Page() {
  const events = Route.useLoaderData();
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
            Private bookings may appear as unavailable time blocks. Pending requests may not appear until approved.
          </p>
          <p>Check the calendar for your preferred date before submitting a request.</p>
          <div className="pt-2">
            <GoogleCalendar events={events} publicLink={site.GOOGLE_CALENDAR_PUBLIC_LINK} />
          </div>
          <div className="pt-2">
            <CTAButton href="#request">Request a Date</CTAButton>
          </div>
        </Section>

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
              <CTAButton href="#contact" variant="ghost">Get in touch</CTAButton>
            </div>
          </div>
        </Section>

        <Section id="details" eyebrow="Space Details" title="What's included and what it costs">
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
            <CTAButton href="#request">Request the Space</CTAButton>
          </div>
        </Section>

        <Section id="guidelines" eyebrow="Guidelines and Policies" title="Help us care for the space">
          <p>
            To keep 3RD SPACE safe, welcoming, accessible, and available for community use, all hosts and guests are expected to follow these guidelines. This includes local rules and our cancellation policy.
          </p>
          <Accordion items={allGuidelineItems} />
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
            If you would like to donate, volunteer, sponsor a program, offer in-kind support, or discuss a partnership, please get in touch.
          </p>
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

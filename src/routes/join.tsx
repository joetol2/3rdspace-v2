import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { Section } from "@/components/site/Section";
import { submitToMailingList } from "@/lib/mailingList";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join 3RD SPACE | 3RD SPACE" },
      {
        name: "description",
        content: "Tell 3RD SPACE how you'd like to be involved: attending events, hosting programming, volunteering, donating, or staying informed.",
      },
    ],
    links: [{ rel: "canonical", href: "/join" }],
  }),
  component: Page,
});

const INTEREST_OPTIONS = [
  "Attend events",
  "Host a class or workshop",
  "Host a community gathering",
  "Volunteer",
  "Donate or sponsor",
  "Partner with 3RD SPACE",
  "Stay informed",
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-foreground/90">
      {children}
      {required && <span className="ml-1 text-foreground/70">*</span>}
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

function YesNoField({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold text-foreground/90">{legend}</legend>
      <div className="mt-2 flex gap-5">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-[15px] text-foreground/80">
            <input
              type="radio"
              name={legend}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 accent-foreground"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Page() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interestAreas, setInterestAreas] = useState<string[]>([]);
  const [hostingInterest, setHostingInterest] = useState("");
  const [eventIdeas, setEventIdeas] = useState("");
  const [volunteerInterest, setVolunteerInterest] = useState("");
  const [supportInterest, setSupportInterest] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorKind, setErrorKind] = useState<"invalid" | "server" | null>(null);

  function toggleInterest(option: string) {
    setInterestAreas((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!isValidEmail(normalizedEmail) || !trimmedName) {
      setStatus("error");
      setErrorKind("invalid");
      return;
    }

    setStatus("submitting");
    setErrorKind(null);
    try {
      await submitToMailingList({
        formType: "full_join",
        email: normalizedEmail,
        name: trimmedName,
        phone: phone.trim(),
        interestAreas,
        hostingInterest,
        eventIdeas: eventIdeas.trim(),
        volunteerInterest,
        supportInterest,
        notes: notes.trim(),
        source: "3RD SPACE full join form",
        userAgent: navigator.userAgent,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorKind("server");
    }
  }

  if (status === "success") {
    return (
      <Section id="join" title="Join 3RD SPACE" level="h1">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background text-xl">
            ✓
          </div>
          <p className="font-display text-xl font-bold text-foreground">Thank you. We received your information.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section id="join" title="Join 3RD SPACE" level="h1">
      <p>Tell us a little more about how you would like to be connected to 3RD SPACE.</p>
      <p>
        This form helps us understand who wants to attend events, host programming, volunteer, donate, or support the space in another way.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-8 pt-2">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="join-email" required>
              Email
            </FieldLabel>
            <TextInput
              id="join-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <FieldLabel htmlFor="join-name" required>
              Name
            </FieldLabel>
            <TextInput
              id="join-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="join-phone">Phone</FieldLabel>
          <TextInput
            id="join-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(xxx) xxx-xxxx"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-semibold text-foreground/90">How would you like to be involved?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {INTEREST_OPTIONS.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
                <input
                  type="checkbox"
                  checked={interestAreas.includes(option)}
                  onChange={() => toggleInterest(option)}
                  className="h-4 w-4 accent-foreground"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <YesNoField legend="Are you interested in hosting something?" value={hostingInterest} onChange={setHostingInterest} />

        <div>
          <FieldLabel htmlFor="join-event-ideas">What kind of event, program, or gathering are you interested in?</FieldLabel>
          <Textarea
            id="join-event-ideas"
            value={eventIdeas}
            onChange={(e) => setEventIdeas(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <YesNoField legend="Are you interested in volunteering?" value={volunteerInterest} onChange={setVolunteerInterest} />

        <YesNoField legend="Are you interested in donating or supporting the space?" value={supportInterest} onChange={setSupportInterest} />

        <div>
          <FieldLabel htmlFor="join-notes">Anything else you want us to know?</FieldLabel>
          <Textarea
            id="join-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {status === "error" && errorKind === "invalid" && (
          <p className="text-sm text-destructive">Please enter a valid email address and name.</p>
        )}
        {status === "error" && errorKind === "server" && (
          <p className="text-sm text-destructive">
            Something went wrong. Please try again or email us at{" "}
            <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3.5 text-base font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:w-auto"
        >
          {status === "submitting" ? "Submitting..." : "Submit"}
        </button>
      </form>
    </Section>
  );
}

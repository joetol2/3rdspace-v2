import { useState } from "react";
import { site } from "@/config/site";
import { submitToMailingList } from "@/lib/mailingList";

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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
    />
  );
}

function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  required,
  children,
}: {
  legend: string;
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold text-foreground/90">
        {legend}
        {required && <span className="ml-1 text-foreground/70">*</span>}
      </legend>
      {children}
      <div className="mt-2 flex flex-col gap-2">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              required={required}
              className="h-4 w-4 accent-foreground"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RequestFormPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="px-5 py-4 text-base font-medium text-foreground sm:text-lg">
        Submit a request
      </div>
      <div className="border-t border-border p-5 sm:p-8">
        <SpaceRequestForm />
      </div>
    </div>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

function SpaceRequestForm() {
  const [status, setStatus] = useState<Status>("idle");

  const [useType, setUseType] = useState("");
  const [otherUseType, setOtherUseType] = useState("");
  const [publicPrivate, setPublicPrivate] = useState("");
  const [oneTimeRecurring, setOneTimeRecurring] = useState("");
  const [lowCost, setLowCost] = useState("");
  const [requestedArea, setRequestedArea] = useState("");
  const [calendarVisibility, setCalendarVisibility] = useState("");
  const [prefDate, setPrefDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [setupTime, setSetupTime] = useState("");
  const [cleanupTime, setCleanupTime] = useState("");
  const [petApproval, setPetApproval] = useState("");
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    if (!form.checkValidity()) return;

    const formData = new FormData(form);

    setStatus("submitting");
    try {
      await submitToMailingList({
        formType: "space_request",
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim().toLowerCase(),
        phone: String(formData.get("phone") || "").trim(),
        organization: String(formData.get("organization") || "").trim(),
        useType: useType === "__other_option__" ? otherUseType.trim() : useType,
        publicPrivate,
        oneTimeRecurring,
        lowCost,
        requestedArea,
        calendarVisibility,
        preferredDate: prefDate,
        startTime,
        endTime,
        setupTime,
        cleanupTime,
        expectedAttendance: String(formData.get("attendance") || "").trim(),
        eventDescription: String(formData.get("description") || "").trim(),
        foodNeeds: String(formData.get("food") || "").trim(),
        petApproval,
        furniture: String(formData.get("furniture") || "").trim(),
        soundEquipment: String(formData.get("sound") || "").trim(),
        accessibilityNeeds: String(formData.get("access") || "").trim(),
        agreedToGuidelines: agreed,
        source: "3RD SPACE request space form",
        userAgent: navigator.userAgent,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background text-xl">✓</div>
        <p className="font-display text-xl font-bold text-foreground">Request received</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
          Thank you. Your request has been received. A member of the 3RD SPACE team will review it and follow up. Your booking is not confirmed until approved.
        </p>
        <p className="mt-4 text-[13px] leading-relaxed text-foreground/70">
          If you don't hear back within a few business days, please call or email us directly to confirm we received your request.
        </p>
      </div>
    );
  }

  const hasOther = useType === "__other_option__";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
        {/* Contact */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contact</legend>
          <div>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <TextInput id="name" name="name" required placeholder="Your full name" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="email" required>Email</FieldLabel>
              <TextInput id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div>
              <FieldLabel htmlFor="phone" required>Phone</FieldLabel>
              <TextInput id="phone" name="phone" type="tel" required placeholder="(xxx) xxx-xxxx" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="org">Organization or group</FieldLabel>
            <TextInput id="org" name="organization" placeholder="Optional" />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Type of use */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Type of use <span className="ml-1 text-foreground/70">*</span></legend>
          <div className="flex flex-col gap-2">
            {USE_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
                <input
                  type="radio"
                  name="useType"
                  value={opt.value}
                  checked={useType === opt.value}
                  onChange={() => setUseType(opt.value)}
                  required
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
                name="otherUseType"
                value={otherUseType}
                onChange={(e) => setOtherUseType(e.target.value)}
                placeholder="Describe your use"
              />
            </div>
          )}
          <RadioGroup
            legend="Public event or private gathering"
            name="publicPrivate"
            options={["Public event", "Private gathering", "Not sure yet"]}
            value={publicPrivate}
            onChange={setPublicPrivate}
            required
          />
          <RadioGroup
            legend="One-time or recurring request"
            name="oneTimeRecurring"
            options={["One-time request", "Recurring request", "Not sure yet"]}
            value={oneTimeRecurring}
            onChange={setOneTimeRecurring}
            required
          />
          <RadioGroup
            legend="Low-cost or sliding scale request"
            name="lowCost"
            options={["Yes", "No", "Not sure yet"]}
            value={lowCost}
            onChange={setLowCost}
            required
          />
          <RadioGroup
            legend="Requested area"
            name="requestedArea"
            options={["Indoor space", "Outdoor / parking lot", "Both", "Not sure yet"]}
            value={requestedArea}
            onChange={setRequestedArea}
            required
          />
        </fieldset>

        <div className="border-t border-border" />

        {/* Calendar visibility */}
        <RadioGroup
          legend="How should this booking appear on the public calendar?"
          name="calendarVisibility"
          options={["Show the event name", "Show as Booked event", "Show as Unavailable", "Not sure yet"]}
          value={calendarVisibility}
          onChange={setCalendarVisibility}
          required
        >
          <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
            All approved bookings may appear on the calendar so others know the space is unavailable. You can choose whether your event name appears publicly or whether the time is shown as a general booked event.
          </p>
        </RadioGroup>

        <div className="border-t border-border" />

        {/* Date and timing */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date and timing</legend>
          <div>
            <FieldLabel htmlFor="pref-date" required>Preferred date</FieldLabel>
            <TextInput
              id="pref-date"
              type="date"
              required
              value={prefDate}
              onChange={(e) => setPrefDate(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="start-time" required>Start time</FieldLabel>
              <TextInput
                id="start-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="end-time" required>End time</FieldLabel>
              <TextInput
                id="end-time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="setup-time">Setup time needed</FieldLabel>
              <Select id="setup-time" name="setupTime" value={setupTime} onChange={(e) => setSetupTime(e.target.value)}>
                <option value="">Select</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="cleanup-time">Cleanup time needed</FieldLabel>
              <Select id="cleanup-time" name="cleanupTime" value={cleanupTime} onChange={(e) => setCleanupTime(e.target.value)}>
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
            <TextInput id="attendance" name="attendance" type="number" min={1} required placeholder="Number of guests" />
          </div>
          <div>
            <FieldLabel htmlFor="description" required>Event description</FieldLabel>
            <Textarea id="description" name="description" required placeholder="Tell us about your gathering, program, or event." rows={4} />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Additional details */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Additional details</legend>
          <div>
            <FieldLabel htmlFor="food">Food or catering needs</FieldLabel>
            <Textarea id="food" name="food" placeholder="Optional. Describe any food, catering, or cooking equipment needs." />
          </div>
          <RadioGroup
            legend="Pet approval request"
            name="petApproval"
            options={["No", "Yes", "Not sure yet"]}
            value={petApproval}
            onChange={setPetApproval}
            required
          />
          <div>
            <FieldLabel htmlFor="furniture">Furniture</FieldLabel>
            <Textarea id="furniture" name="furniture" placeholder="Optional. List any items you plan to bring." />
          </div>
          <div>
            <FieldLabel htmlFor="sound">Amplified sound, music, tents, canopies, heaters, or special equipment</FieldLabel>
            <Textarea id="sound" name="sound" placeholder="Optional. Describe any amplified sound or special equipment." />
          </div>
          <div>
            <FieldLabel htmlFor="access">Accessibility, privacy, parking, or setup needs</FieldLabel>
            <Textarea id="access" name="access" placeholder="Optional. Let us know about any specific needs." />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Agreement */}
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              name="agreed"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
            />
            <span className="text-[14px] leading-relaxed text-foreground/80">
              I have read and agree to the 3RD SPACE Guidelines and Space Use Policies. I understand that I am responsible for my guests, setup, cleanup, outside equipment, and any lost, stolen, missing, broken, or damaged property connected to my use of the space. <span className="text-foreground/70">*</span>
            </span>
          </label>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-muted/20 p-4 text-[14px] text-foreground/80">
          Submitting this form does not confirm your booking. Your date and time are confirmed only after approval from 3RD SPACE.
        </div>

        {status === "error" && (
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
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </>
  );
}

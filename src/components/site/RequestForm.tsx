import { useEffect, useState } from "react";
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

// A mistyped address does not bounce back to the person who typed it, it
// bounces to whoever sent the mail, so a requester who writes
// "@gmial.com" simply never hears anything and assumes they were ignored.
// Nothing here blocks a submission; it offers a correction the person can
// take with one tap, because plenty of real addresses look like typos.
const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.con": "gmail.com", "gamil.com": "gmail.com", "googlemail.co": "gmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com", "homail.com": "hotmail.com",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com",
  "iclould.com": "icloud.com", "icloud.co": "icloud.com", "icoud.com": "icloud.com",
  "aol.co": "aol.com", "comcast.ne": "comcast.net", "sbcglobal.ne": "sbcglobal.net",
};

function suggestEmailFix(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "";
  const domain = email.slice(at + 1).toLowerCase().trim();
  const fixed = EMAIL_DOMAIN_TYPOS[domain];
  return fixed ? email.slice(0, at + 1) + fixed : "";
}

// ---------------------------------------------------------------------------
// Stranded submissions
//
// The request is written to localStorage just before it is sent and removed
// the moment it lands. Anything still sitting there on a later visit is a
// submission that never completed, usually because the tab was closed or
// the device slept while the network was down. Without this the request is
// simply gone, and the person believes they sent it.
// ---------------------------------------------------------------------------
const STRANDED_KEY = "3rdspace.strandedRequest";
const STRANDED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type SpaceRequestDraft = Parameters<typeof submitToMailingList>[0] & { formType: "space_request" };

function saveStrandedRequest(payload: SpaceRequestDraft) {
  try {
    localStorage.setItem(STRANDED_KEY, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    // Private browsing, or storage full. Losing the safety net is not a
    // reason to stop the submission that is about to happen anyway.
  }
}

function clearStrandedRequest() {
  try {
    localStorage.removeItem(STRANDED_KEY);
  } catch {
    /* see above */
  }
}

function readStrandedRequest(): SpaceRequestDraft | null {
  try {
    const raw = localStorage.getItem(STRANDED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; payload?: SpaceRequestDraft };
    if (!parsed?.payload?.name || !parsed.payload.email) return null;
    // A month-old draft is for a date that has probably passed. Offering it
    // back would be worse than forgetting it.
    if (!parsed.savedAt || Date.now() - parsed.savedAt > STRANDED_MAX_AGE_MS) {
      clearStrandedRequest();
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

// Last resort when the network will not cooperate: hand the person their
// own request as an email they can send from an app that already knows how
// to queue and retry.
function mailtoFallback(payload: SpaceRequestDraft): string {
  const body = [
    "I tried to submit this through the website but it would not send.",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not given"}`,
    `Organization: ${payload.organization || "Not given"}`,
    `Event name: ${payload.eventName || "Not given"}`,
    `Type of use: ${payload.useType || "Not given"}`,
    `Date: ${payload.preferredDate}${payload.endDate ? ` through ${payload.endDate}` : ""}`,
    `Time: ${payload.startTime} to ${payload.endTime}`,
    `Setup: ${payload.setupTime || "Not given"} / Cleanup: ${payload.cleanupTime || "Not given"}`,
    `Expected attendance: ${payload.expectedAttendance || "Not given"}`,
    "",
    `Description: ${payload.eventDescription || "Not given"}`,
  ].join("\n");

  return `mailto:${site.email}?subject=${encodeURIComponent(
    `Space request: ${payload.name}`
  )}&body=${encodeURIComponent(body)}`;
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
  const [recurrenceDetails, setRecurrenceDetails] = useState("");
  const [lowCost, setLowCost] = useState("");
  const [requestedArea, setRequestedArea] = useState("");
  const [calendarVisibility, setCalendarVisibility] = useState("");
  const [prefDate, setPrefDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [email, setEmail] = useState("");
  const [setupTime, setSetupTime] = useState("");
  const [cleanupTime, setCleanupTime] = useState("");
  const [petApproval, setPetApproval] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [failedPayload, setFailedPayload] = useState<SpaceRequestDraft | null>(null);
  const [strandedDraft, setStrandedDraft] = useState<SpaceRequestDraft | null>(null);
  const [resending, setResending] = useState(false);

  // Caught here rather than later because these two mistakes are silent
  // otherwise: the row saves, the notification email sends, and the failure
  // only surfaces when a staff member clicks Approve and Google Calendar
  // rejects an event that ends before it starts. Better to say so now,
  // while the person is still looking at the form.
  //
  // Times come from <input type="time"> as zero-padded "HH:MM", so a plain
  // string compare orders them correctly.
  // On a request that spans days, the end time belongs to the LAST day, so
  // an end earlier than the start is perfectly ordinary (Friday 6pm to
  // Sunday 11am) and only the single-day case can be out of order.
  const isMultiDay = Boolean(endDate && prefDate && endDate > prefDate);
  const timesOutOfOrder = Boolean(!isMultiDay && startTime && endTime && endTime <= startTime);
  const todayIso = (() => {
    const d = new Date();
    // Built from local parts, not toISOString(), which would shift the date
    // across the UTC boundary for anyone west of Greenwich.
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const dateInPast = Boolean(prefDate && prefDate < todayIso);
  // A recurring request with no pattern is unusable: staff would have to go
  // back and ask. Cheaper to ask once, here.
  const isRecurring = oneTimeRecurring === "Recurring request";
  const missingRecurrence = isRecurring && !recurrenceDetails.trim();
  // An end date before the start date is a straight mistake. The 30 day
  // ceiling is not a policy, it is a typo catch: "2026" typed into the year
  // of a 2027 date should not quietly become a booking request that swallows
  // the calendar for a year.
  const endDateBeforeStart = Boolean(endDate && prefDate && endDate < prefDate);
  const spanTooLong = (() => {
    if (!endDate || !prefDate || endDate <= prefDate) return false;
    const days = (Date.parse(endDate) - Date.parse(prefDate)) / 86400000;
    return days > 30;
  })();
  const emailSuggestion = suggestEmailFix(email);
  const hasBlockingError =
    timesOutOfOrder || dateInPast || missingRecurrence || endDateBeforeStart || spanTooLong;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const form = e.currentTarget;
    if (!form.checkValidity()) return;
    // The date input's own min attribute can be bypassed, so re-check here.
    if (hasBlockingError) return;

    const formData = new FormData(form);

    // Built before the try so the catch below still has it to hand back to
    // the person when the send fails.
    const payload = {
      formType: "space_request" as const,
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      phone: String(formData.get("phone") || "").trim(),
      organization: String(formData.get("organization") || "").trim(),
      useType: useType === "__other_option__" ? otherUseType.trim() : useType,
      publicPrivate,
      oneTimeRecurring,
      recurrenceDetails: isRecurring ? recurrenceDetails.trim() : "",
      lowCost,
      requestedArea,
      calendarVisibility,
      preferredDate: prefDate,
      endDate: isMultiDay ? endDate : "",
      startTime,
      endTime,
      setupTime,
      cleanupTime,
      eventName: String(formData.get("eventName") || "").trim(),
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
      honeypot: String(formData.get("website") || "").trim(),
    };

    setStatus("submitting");
    try {
      // Kept only for the duration of the send. If the tab is closed or the
      // browser crashes mid-submission, this is the one record that the
      // request was ever made, and the banner at the top of the form offers
      // it back on the next visit.
      saveStrandedRequest(payload);
      await submitToMailingList(payload);
      clearStrandedRequest();
      setStatus("success");
    } catch {
      // submitToMailingList has already retried. Reaching here means the
      // network stayed down, so the honest thing is to say the request did
      // not send rather than show a receipt for something nobody received.
      setFailedPayload(payload as SpaceRequestDraft);
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status === "success" || status === "error") {
      window.scrollTo(0, 0);
    }
  }, [status]);

  // A submission that died with the tab open leaves its draft behind. Offer
  // it back instead of letting it evaporate.
  useEffect(() => {
    const stranded = readStrandedRequest();
    if (stranded) setStrandedDraft(stranded);
  }, []);

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

  // Shown instead of the form when every attempt failed. Deliberately not
  // the success screen: telling someone their request was received when it
  // was not is how a request disappears without anyone noticing.
  if (status === "error" && failedPayload) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8">
        <p className="font-display text-xl font-bold text-foreground">That didn't send</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
          We tried a few times and couldn't reach our server. Your request has
          <strong> not</strong> been received, so please don't wait to hear back. Nothing you typed
          has been lost.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={async () => {
              setResending(true);
              try {
                await submitToMailingList(failedPayload);
                clearStrandedRequest();
                setStatus("success");
              } catch {
                setResending(false);
              }
            }}
            disabled={resending}
            className="rounded-lg bg-foreground px-5 py-2.5 text-[15px] font-semibold text-background disabled:opacity-60"
          >
            {resending ? "Trying again..." : "Try sending again"}
          </button>
          <a
            href={mailtoFallback(failedPayload)}
            className="rounded-lg border border-border px-5 py-2.5 text-center text-[15px] font-semibold text-foreground"
          >
            Email it to us instead
          </a>
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-foreground/70">
          The second button opens your email app with everything already filled in, so you only have
          to press send. You can also call us on{" "}
          <a href={site.phoneHref} className="underline">{site.phone}</a>.
        </p>
      </div>
    );
  }

  const hasOther = useType === "__other_option__";

  return (
    <>
      {/* A request from an earlier visit that never made it. Offered back
          rather than silently dropped, because the person who filled it in
          has every reason to think it was sent. */}
      {strandedDraft && status === "idle" && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <p className="text-[15px] font-semibold text-foreground">
            A request you started didn't finish sending
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-foreground/80">
            It was for {strandedDraft.preferredDate || "an unspecified date"}
            {strandedDraft.eventName ? ` (${strandedDraft.eventName})` : ""}. We still have it saved
            on this device. Would you like to send it now?
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                setResending(true);
                try {
                  await submitToMailingList(strandedDraft);
                  clearStrandedRequest();
                  setStrandedDraft(null);
                  setStatus("success");
                } catch {
                  setResending(false);
                  setFailedPayload(strandedDraft);
                  setStatus("error");
                }
              }}
              disabled={resending}
              className="rounded-lg bg-foreground px-4 py-2 text-[14px] font-semibold text-background disabled:opacity-60"
            >
              {resending ? "Sending..." : "Send it now"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearStrandedRequest();
                setStrandedDraft(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-[14px] font-semibold text-foreground"
            >
              Discard it
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
        {/* Not a real field. It sits off-screen and out of the tab order, so
            nobody filling in this form will ever see it, while an automated
            form filler walking the DOM will happily complete it. The Apps
            Script throws away anything that arrives with it set. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-px w-px opacity-0"
        />
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
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailSuggestion && (
                <p className="mt-1.5 text-sm text-foreground/80">
                  Did you mean{" "}
                  <button
                    type="button"
                    onClick={() => setEmail(emailSuggestion)}
                    className="font-semibold underline underline-offset-2"
                  >
                    {emailSuggestion}
                  </button>
                  ? Everything we send you goes to this address.
                </p>
              )}
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
          {isRecurring && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <FieldLabel htmlFor="recurrence" required>
                How often, and until when?
              </FieldLabel>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                For example: every Tuesday through the end of the year, or the first Saturday of each
                month for six months.
              </p>
              <Textarea
                id="recurrence"
                maxLength={1000}
                name="recurrenceDetails"
                value={recurrenceDetails}
                onChange={(e) => setRecurrenceDetails(e.target.value)}
                placeholder="Tell us the pattern and roughly how long you'd like it to run."
                rows={2}
                aria-invalid={missingRecurrence || undefined}
              />
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/70">
                The date above is your <strong>first</strong> session. We'll confirm that one, then
                get in touch to set up the rest.
              </p>
            </div>
          )}
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
              min={todayIso}
              value={prefDate}
              onChange={(e) => setPrefDate(e.target.value)}
              aria-invalid={dateInPast || undefined}
              aria-describedby={dateInPast ? "pref-date-error" : undefined}
            />
            {dateInPast && (
              <p id="pref-date-error" className="mt-1.5 text-sm text-destructive">
                That date has already passed. Please choose today or a later date.
              </p>
            )}
          </div>
          {/* Optional, and blank for the overwhelming majority of requests.
              Before this existed a festival or a three day retreat had no way
              to say so, and people either submitted one request per day or
              wrote it in the description where nothing acted on it. */}
          <div>
            <FieldLabel htmlFor="end-date">Last day, if this runs over more than one day</FieldLabel>
            <TextInput
              id="end-date"
              type="date"
              min={prefDate || todayIso}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-invalid={endDateBeforeStart || spanTooLong || undefined}
              aria-describedby={endDateBeforeStart || spanTooLong ? "end-date-error" : undefined}
            />
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Leave this empty for a single day. If you fill it in, the start time below is on your
              first day and the end time is on your last.
            </p>
            {endDateBeforeStart && (
              <p id="end-date-error" className="mt-1.5 text-sm text-destructive">
                The last day can't be before the first day.
              </p>
            )}
            {spanTooLong && (
              <p id="end-date-error" className="mt-1.5 text-sm text-destructive">
                That's more than 30 days. If you really need the space that long, please email or
                call us instead so we can talk it through.
              </p>
            )}
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
                aria-invalid={timesOutOfOrder || undefined}
                aria-describedby={timesOutOfOrder ? "end-time-error" : undefined}
              />
            </div>
          </div>
          {timesOutOfOrder && (
            <p id="end-time-error" className="-mt-2 text-sm text-destructive">
              The end time needs to be after the start time. If your event runs past midnight, put the
              details in the event description and we'll sort it out with you.
            </p>
          )}
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
            <FieldLabel htmlFor="eventName">Name of the event</FieldLabel>
            <TextInput id="eventName" name="eventName" placeholder="Optional. What should we call this event?" />
          </div>
          <div>
            <FieldLabel htmlFor="attendance" required>Expected attendance</FieldLabel>
            <TextInput id="attendance" name="attendance" type="number" min={1} required placeholder="Number of guests" />
          </div>
          <div>
            <FieldLabel htmlFor="description" required>Event description</FieldLabel>
            <Textarea id="description"
                maxLength={1000} name="description" required placeholder="Tell us about your gathering, program, or event." rows={4} />
          </div>
        </fieldset>

        <div className="border-t border-border" />

        {/* Additional details */}
        <fieldset className="space-y-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Additional details</legend>
          <div>
            <FieldLabel htmlFor="food">Food or catering needs</FieldLabel>
            <Textarea id="food"
                maxLength={1000} name="food" placeholder="Optional. Describe any food, catering, or cooking equipment needs." />
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
            <Textarea id="furniture"
                maxLength={1000} name="furniture" placeholder="Optional. List any items you plan to bring." />
          </div>
          <div>
            <FieldLabel htmlFor="sound">Amplified sound, music, tents, canopies, heaters, or special equipment</FieldLabel>
            <Textarea id="sound"
                maxLength={1000} name="sound" placeholder="Optional. Describe any amplified sound or special equipment." />
          </div>
          <div>
            <FieldLabel htmlFor="access">Accessibility, privacy, parking, or setup needs</FieldLabel>
            <Textarea id="access"
                maxLength={1000} name="access" placeholder="Optional. Let us know about any specific needs." />
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
          disabled={status === "submitting" || hasBlockingError}
          className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3.5 text-base font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:w-auto"
        >
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </>
  );
}

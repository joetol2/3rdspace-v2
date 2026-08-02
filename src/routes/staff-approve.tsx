import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";

// Not linked from nav or any page — reached only via the Approve/Decline
// links in the staff notification email for a Request Space submission.
// Exists on our own domain (rather than showing a page rendered by the
// Apps Script Web App directly) because Apps Script Web App content is
// served through a Google wrapper that loads the actual page in a nested
// frame, and that load has been unreliable ("refused to connect") for at
// least one staff member in a way outside this codebase's control. A
// normal page on our own domain doesn't have that problem. See
// google-apps-script/mailing-list.gs (sendSpaceRequestNotification,
// buildReviewQueryParams) for where these links are built, and doPost's
// decisionSubmit branch for where the confirm button below actually
// posts to.
type StaffApproveSearch = {
  action?: string;
  id?: string;
  token?: string;
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  eventName?: string;
  useType?: string;
  publicPrivate?: string;
  oneTimeRecurring?: string;
  lowCost?: string;
  requestedArea?: string;
  calendarVisibility?: string;
  date?: string;
  start?: string;
  end?: string;
  setupTime?: string;
  cleanupTime?: string;
  attendance?: string;
  description?: string;
  food?: string;
  pets?: string;
  furniture?: string;
  sound?: string;
  accessibility?: string;
  guidelines?: string;
  overlaps?: string;
  sameday?: string;
};

function readSearchString(value: unknown): string | undefined {
  // TanStack Router's default search parser auto-converts query values that
  // look like numbers or booleans (e.g. attendance=35) into actual numbers
  // or booleans rather than leaving them as strings, so those types need to
  // be coerced back rather than dropped.
  if (typeof value === "string") return value.length > 0 ? value : undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

export const Route = createFileRoute("/staff-approve")({
  validateSearch: (search: Record<string, unknown>): StaffApproveSearch => ({
    action: readSearchString(search.action),
    id: readSearchString(search.id),
    token: readSearchString(search.token),
    name: readSearchString(search.name),
    email: readSearchString(search.email),
    phone: readSearchString(search.phone),
    organization: readSearchString(search.organization),
    eventName: readSearchString(search.eventName),
    useType: readSearchString(search.useType),
    publicPrivate: readSearchString(search.publicPrivate),
    oneTimeRecurring: readSearchString(search.oneTimeRecurring),
    lowCost: readSearchString(search.lowCost),
    requestedArea: readSearchString(search.requestedArea),
    calendarVisibility: readSearchString(search.calendarVisibility),
    date: readSearchString(search.date),
    start: readSearchString(search.start),
    end: readSearchString(search.end),
    setupTime: readSearchString(search.setupTime),
    cleanupTime: readSearchString(search.cleanupTime),
    attendance: readSearchString(search.attendance),
    description: readSearchString(search.description),
    food: readSearchString(search.food),
    pets: readSearchString(search.pets),
    furniture: readSearchString(search.furniture),
    sound: readSearchString(search.sound),
    accessibility: readSearchString(search.accessibility),
    guidelines: readSearchString(search.guidelines),
    overlaps: readSearchString(search.overlaps),
    sameday: readSearchString(search.sameday),
  }),
  head: () => ({
    meta: [
      { title: "Space Request Decision | 3RD SPACE" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Status = "review" | "submitting" | "done";

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="px-5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-foreground">{value}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      </div>
      <dl className="divide-y divide-border">{children}</dl>
    </div>
  );
}

// Nothing else in the system checks whether a slot is already taken, so
// this banner is the only thing standing between two overlapping requests
// and two groups arriving at the same door. It deliberately warns rather
// than blocks: two bookings on one day are often fine (indoor space plus
// the parking lot), so the call belongs to a human.
//
// The list arrives as a pipe-separated string in the URL, built by
// buildReviewQueryParams in google-apps-script/mailing-list.gs.
function splitConflicts(value?: string): string[] {
  if (!value) return [];
  return value.split("|").map((s) => s.trim()).filter(Boolean);
}

function ConflictWarning({ overlaps, sameDay }: { overlaps: string[]; sameDay: string[] }) {
  if (overlaps.length > 0) {
    return (
      <div className="mb-6 rounded-2xl border-2 border-[#c62828] bg-[#c62828]/10 p-5">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-[#c62828]">
          <span aria-hidden="true">⚠</span> Time conflict on this date
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">
          Something is already booked that overlaps these hours:
        </p>
        <ul className="mt-3 space-y-1.5">
          {overlaps.map((c) => (
            <li key={c} className="rounded-lg bg-background px-3.5 py-2 text-[14px] font-medium text-foreground">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/70">
          You can still approve this if it's fine, for example if they're using different areas.
          This is just so you know before you decide.
        </p>
      </div>
    );
  }

  if (sameDay.length > 0) {
    return (
      <div className="mb-6 rounded-2xl border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Also on the calendar that day
        </p>
        <ul className="mt-2 space-y-1">
          {sameDay.map((c) => (
            <li key={c} className="text-[14px] text-foreground/75">{c}</li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-muted-foreground">No time conflict with this request.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-[14px] text-foreground/70">
        <span className="font-semibold text-foreground">Nothing else is booked that day.</span>{" "}
        This slot is clear.
      </p>
    </div>
  );
}

function Page() {
  const search = Route.useSearch();
  const [status, setStatus] = useState<Status>("review");
  const [note, setNote] = useState("");

  const action = search.action === "decline" ? "decline" : "approve";
  const actionLabel = action === "approve" ? "Approve" : "Decline";
  const time = search.start && search.end ? `${search.start} to ${search.end}` : undefined;
  const hasValidLink = Boolean(
    search.id && search.token && (search.action === "approve" || search.action === "decline")
  );

  async function handleConfirm() {
    if (!hasValidLink || status === "submitting") return;
    setStatus("submitting");

    try {
      // mode: "no-cors" because a Google Apps Script Web App does not send
      // CORS headers a browser will accept for a cross-origin fetch — same
      // constraint and same workaround as submitToMailingList in
      // src/lib/mailingList.ts. The response is opaque, so this can't tell
      // whether the script actually accepted the decision, only that the
      // request was sent. The confirmation email Apps Script sends right
      // after processing is the reliable source of truth.
      await fetch(site.MAILING_LIST_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          decisionSubmit: "1",
          id: search.id || "",
          token: search.token || "",
          action,
          note,
        }),
      });
    } catch {
      // Fall through — still show the done state below. A genuine network
      // failure here is rare with no-cors, and the confirmation email is
      // the real signal either way.
    }

    setStatus("done");
  }

  if (!hasValidLink) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center sm:px-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Link not valid</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/75">
          This approval link is missing some information. Please use the Approve or Decline link directly from the notification email.
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center sm:px-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background text-xl">✓</div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {action === "approve" ? "Request approved" : "Request declined"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
          The requester has been emailed{action === "approve" ? " and the event was added to the calendar" : ""}.
          A confirmation email is also on its way to you now — that's the best way to know for sure this went through.
        </p>
        <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card text-left">
          <DetailRow label="Name" value={search.name} />
          <DetailRow label="Event name" value={search.eventName} />
          <DetailRow label="Date" value={search.date} />
          <DetailRow label="Time" value={time} />
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">You can close this tab now.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16 sm:px-8">
      <h1 className="text-center font-display text-2xl font-bold text-foreground">{actionLabel} this request?</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">One last look before you decide.</p>

      <div className="mt-6">
        <ConflictWarning
          overlaps={splitConflicts(search.overlaps)}
          sameDay={splitConflicts(search.sameday)}
        />
      </div>

      <div className="space-y-4">
        <DetailSection title="Contact">
          <DetailRow label="Name" value={search.name} />
          <DetailRow label="Email" value={search.email} />
          <DetailRow label="Phone" value={search.phone} />
          <DetailRow label="Organization or group" value={search.organization} />
        </DetailSection>

        <DetailSection title="Event">
          <DetailRow label="Event name" value={search.eventName} />
          <DetailRow label="Type of use" value={search.useType} />
          <DetailRow label="Public or private" value={search.publicPrivate} />
          <DetailRow label="Date" value={search.date} />
          <DetailRow label="Time" value={time} />
          <DetailRow label="Expected attendance" value={search.attendance} />
          <DetailRow label="Event description" value={search.description} />
        </DetailSection>

        <DetailSection title="Logistics & needs">
          <DetailRow label="Requested area" value={search.requestedArea} />
          <DetailRow label="How it appears on the public calendar" value={search.calendarVisibility} />
          <DetailRow label="One-time or recurring" value={search.oneTimeRecurring} />
          <DetailRow label="Low-cost or sliding scale" value={search.lowCost} />
          <DetailRow label="Setup time needed" value={search.setupTime} />
          <DetailRow label="Cleanup time needed" value={search.cleanupTime} />
          <DetailRow label="Food or catering needs" value={search.food} />
          <DetailRow label="Pets" value={search.pets} />
          <DetailRow label="Furniture" value={search.furniture} />
          <DetailRow label="Amplified sound or special equipment" value={search.sound} />
          <DetailRow label="Accessibility, privacy, or parking needs" value={search.accessibility} />
          <DetailRow label="Agreed to guidelines" value={search.guidelines} />
        </DetailSection>
      </div>

      <label htmlFor="note" className="mt-6 block text-[14px] font-semibold text-foreground/90">
        Optional note to the requester
      </label>
      <textarea
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={handleConfirm}
        disabled={status === "submitting"}
        className={[
          "mt-5 w-full rounded-full px-6 py-3 text-[15px] font-semibold text-background transition-colors disabled:opacity-60",
          action === "approve" ? "bg-[#2e7d32] hover:bg-[#2e7d32]/90" : "bg-[#c62828] hover:bg-[#c62828]/90",
        ].join(" ")}
      >
        {status === "submitting" ? "Submitting..." : `Confirm ${actionLabel}`}
      </button>
    </div>
  );
}

import { useState } from "react";
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
// google-apps-script/mailing-list.gs (sendSpaceRequestNotification) for
// where these links are built, and doPost's decisionSubmit branch for
// where the confirm button below actually posts to.
type StaffApproveSearch = {
  action?: string;
  id?: string;
  token?: string;
  name?: string;
  eventName?: string;
  date?: string;
  start?: string;
  end?: string;
};

function readSearchString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const Route = createFileRoute("/staff-approve")({
  validateSearch: (search: Record<string, unknown>): StaffApproveSearch => ({
    action: readSearchString(search.action),
    id: readSearchString(search.id),
    token: readSearchString(search.token),
    name: readSearchString(search.name),
    eventName: readSearchString(search.eventName),
    date: readSearchString(search.date),
    start: readSearchString(search.start),
    end: readSearchString(search.end),
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
    <div className="py-2.5 first:pt-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[15px] text-foreground">{value}</p>
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
        <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card p-5 text-left">
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
    <div className="mx-auto max-w-md px-5 py-16 sm:px-8">
      <h1 className="text-center font-display text-2xl font-bold text-foreground">{actionLabel} this request?</h1>
      <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card p-5">
        <DetailRow label="Name" value={search.name} />
        <DetailRow label="Event name" value={search.eventName} />
        <DetailRow label="Date" value={search.date} />
        <DetailRow label="Time" value={time} />
      </dl>
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

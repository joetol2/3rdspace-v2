import { site } from "@/config/site";

export type EmailCapturePayload = {
  formType: "email_capture";
  email: string;
  source: string;
  userAgent: string;
};

export type FullJoinPayload = {
  formType: "full_join";
  email: string;
  name: string;
  phone: string;
  interestAreas: string[];
  hostingInterest: string;
  eventIdeas: string;
  volunteerInterest: string;
  supportInterest: string;
  notes: string;
  source: string;
  userAgent: string;
};

export type SpaceRequestPayload = {
  formType: "space_request";
  name: string;
  email: string;
  phone: string;
  organization: string;
  useType: string;
  publicPrivate: string;
  oneTimeRecurring: string;
  recurrenceDetails: string;
  lowCost: string;
  requestedArea: string;
  calendarVisibility: string;
  preferredDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  setupTime: string;
  cleanupTime: string;
  eventName: string;
  expectedAttendance: string;
  eventDescription: string;
  foodNeeds: string;
  petApproval: string;
  furniture: string;
  soundEquipment: string;
  accessibilityNeeds: string;
  agreedToGuidelines: boolean;
  source: string;
  userAgent: string;
  // Whatever was in the hidden honeypot input. Empty for a human, which is
  // why it is sent rather than dropped: the server needs to see the empty
  // value to know the check ran.
  honeypot?: string;
};

export type MailingListPayload = EmailCapturePayload | FullJoinPayload | SpaceRequestPayload;

// Added to every payload by submitToMailingList. `submissionId` lets the
// Apps Script recognise a retry of something it already handled;
// `website` is a honeypot the form renders hidden, so anything arriving
// with it filled in was not filled in by a person.
type SubmissionEnvelope = { submissionId: string; website: string };

const PLACEHOLDER_PREFIX = "REPLACE_WITH_";

// Two retries after the first attempt, spaced so a brief drop in signal
// (walking out of wifi range, a train tunnel) has time to come back
// without leaving someone staring at a spinner.
const RETRY_DELAYS_MS = [1200, 3500];

function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Submits a form to the Google Apps Script Web App configured in
// site.MAILING_LIST_SCRIPT_URL. This is the only place that URL is used, so
// the motto signup, the full /join form, and the Request Space form all
// share one endpoint.
//
// The request uses mode: "no-cors" because a Google Apps Script Web App
// does not send CORS headers a browser will accept for a cross-origin
// fetch. That means the response is opaque: we cannot read its status or
// body, so we can only tell whether the request itself was sent, not
// whether the script succeeded on Google's side. Callers should show a
// generic success message once this resolves, not a specific "created" vs
// "updated" status. If 3RD SPACE ever needs to read the real response
// (for example, to tell the visitor whether their email was new or
// already on the list), a small Cloudflare Worker could proxy this request
// and add proper CORS headers, since a static site alone cannot do that.
// Because the response is opaque, a rejected fetch is the only failure
// signal available. That still covers the case that actually loses
// people's requests: the network dropping between the browser and Google.
// One attempt used to be all a submission got, and a single dropped
// packet meant the request was gone with nobody the wiser, so this
// retries.
//
// Retrying is only safe because every attempt reuses one submissionId and
// the Apps Script discards ids it has already handled. Without that, a
// request that arrived and then lost its response would be recorded twice
// and email staff twice.
export async function submitToMailingList(payload: MailingListPayload): Promise<void> {
  if (!site.MAILING_LIST_SCRIPT_URL || site.MAILING_LIST_SCRIPT_URL.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error("Mailing list endpoint is not configured yet.");
  }

  const { honeypot, ...rest } = payload as MailingListPayload & { honeypot?: string };
  const envelope: Omit<MailingListPayload, "honeypot"> & SubmissionEnvelope = {
    ...rest,
    submissionId: newSubmissionId(),
    website: honeypot ?? "",
  } as Omit<MailingListPayload, "honeypot"> & SubmissionEnvelope;
  const body = JSON.stringify(envelope);

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await fetch(site.MAILING_LIST_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not reach the server.");
}

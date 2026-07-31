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

export type MailingListPayload = EmailCapturePayload | FullJoinPayload;

const PLACEHOLDER_PREFIX = "REPLACE_WITH_";

// Submits a mailing list form to the Google Apps Script Web App configured
// in site.MAILING_LIST_SCRIPT_URL. This is the only place that URL is used,
// so both the motto signup and the full /join form share one endpoint.
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
export async function submitToMailingList(payload: MailingListPayload): Promise<void> {
  if (!site.MAILING_LIST_SCRIPT_URL || site.MAILING_LIST_SCRIPT_URL.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error("Mailing list endpoint is not configured yet.");
  }

  await fetch(site.MAILING_LIST_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

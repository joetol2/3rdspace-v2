import { createServerFn } from "@tanstack/react-start";
import type { CalEvent } from "@/lib/calendar";

// Fetches events from the 3RD SPACE Google Calendar using a service
// account, instead of Google's public ICS feed. This is required because
// approved space request events are created with Visibility.PRIVATE (see
// google-apps-script/mailing-list.gs) so contact details never leak
// through the public embed or ICS feed — but that also means the public
// feed can't see the title or description for those events at all. A
// service account that the calendar is explicitly shared with can still
// read everything, and this file is the only place that credential is
// used: createServerFn strips this whole module out of the client bundle,
// so the private key never reaches the browser.
//
// Setup (one-time, see README "Calendar page setup" for full steps):
//   1. Create a Google Cloud service account, enable the Calendar API.
//   2. Share the 3RD SPACE calendar with the service account's email,
//      "See all event details".
//   3. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY as
//      environment variables (Cloudflare Worker secrets in production,
//      .env.local for local dev).

const CALENDAR_ID = "3rdspacesyv@gmail.com";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Service account private keys are usually pasted into env vars with
// literal "\n" escape sequences instead of real newlines (that's how
// they're stored in the downloaded JSON key file once flattened to a
// single line). Handle both forms.
function normalizePrivateKey(key: string): string {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: CALENDAR_READONLY_SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(normalizePrivateKey(privateKeyPem));
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type GCalDateTime = { date?: string; dateTime?: string };
type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: GCalDateTime;
  end?: GCalDateTime;
};
type GCalEventsResponse = {
  items?: GCalEvent[];
  nextPageToken?: string;
};

function toIso(dt: GCalDateTime | undefined): { iso: string; allDay: boolean } | null {
  if (!dt) return null;
  if (dt.dateTime) {
    return { iso: new Date(dt.dateTime).toISOString(), allDay: false };
  }
  if (dt.date) {
    const [y, m, d] = dt.date.split("-").map(Number);
    return { iso: new Date(y, m - 1, d).toISOString(), allDay: true };
  }
  return null;
}

async function fetchCalendarEventsAuthenticated(): Promise<CalEvent[]> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!clientEmail || !privateKey) {
    console.error(
      "[calendar] GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY are not configured."
    );
    return [];
  }

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 13, 0).toISOString();

    const events: CalEvent[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      const url = new URL(`${CALENDAR_API_BASE}/${encodeURIComponent(CALENDAR_ID)}/events`);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error(`[calendar] events.list failed: ${res.status} ${await res.text()}`);
        break;
      }

      const data = (await res.json()) as GCalEventsResponse;

      for (const item of data.items ?? []) {
        if (item.status === "cancelled") continue;
        const start = toIso(item.start);
        if (!start) continue;
        const end = toIso(item.end) ?? start;

        events.push({
          id: item.id,
          title: item.summary || "3RD SPACE event",
          start: start.iso,
          end: end.iso,
          allDay: start.allDay,
          description: item.description || undefined,
          location: item.location || undefined,
        });
      }

      pageToken = data.nextPageToken;
      pageCount += 1;
    } while (pageToken && pageCount < 5);

    return events.sort((a, b) => a.start.localeCompare(b.start));
  } catch (err) {
    console.error("[calendar] authenticated fetch threw:", err);
    return [];
  }
}

export const fetchCalendarEventsServerFn = createServerFn({ method: "GET" }).handler(
  fetchCalendarEventsAuthenticated
);

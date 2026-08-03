// 3RD SPACE forms Apps Script
// Last updated: August 3, 2026, 5:20 AM UTC
//
// This script powers the motto section email signup, the full /join page,
// and the Request Space form. It writes submissions into the "Contact
// List" or "Space Requests" tabs of the Google Sheet below. Contact List
// uses email address as the unique identifier so the same person updates
// one row instead of creating duplicates; Space Requests appends a new
// row for every submission, since each request is a distinct event.
//
// Space Requests also gets Approve / Decline buttons in the staff
// notification email. Clicking one opens a confirmation page (served by
// doGet below) so an email security scanner auto-opening the link can't
// silently approve or decline a request on its own; confirming there
// POSTs back to this same script (doPost, the decisionSubmit branch),
// which emails the requester, adds an approved event to the 3RD SPACE
// Google Calendar, and colors the sheet row green or red.
//
// Setup steps live in the README under "Forms setup (Google Apps
// Script)". Paste this whole file into script.google.com, deploy it as a
// Web App, and put the resulting URL into MAILING_LIST_SCRIPT_URL in
// src/config/site.ts.

const SPREADSHEET_ID = "1MSLQSOMPgigM0VYQYeuonjvxlyt0PdAsWQrCwQ4FpTc";
const SHEET_NAME = "Contact List";
const SPACE_REQUEST_SHEET_NAME = "Space Requests";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit#gid=0";

// The 3RD SPACE Google Calendar that approved requests get added to. This
// is the same calendar embedded on the site (src in
// GOOGLE_CALENDAR_EMBED_URL in src/config/site.ts).
const CALENDAR_ID = "3rdspacesyv@gmail.com";

// Approve/Decline links in the staff notification email point here
// (src/routes/staff-approve.tsx) instead of directly at this script's own
// exec URL. Apps Script Web App pages are served through a Google wrapper
// that loads the actual content in a nested frame, and that nested load
// has been unreliable for at least one staff member ("refused to
// connect") in a way this script has no control over — it's Google's own
// serving infrastructure, not our code. Landing on our own domain first
// sidesteps that entirely: it's a normal page load, and it calls this
// script's doPost in the background (mode: "no-cors", same pattern
// src/lib/mailingList.ts already uses) to actually record the decision.
const SITE_URL = "https://3rdspacesyv.com";

// The site (3rdspacesyv.com) is a static GitHub Pages build — /calendar's
// event data is baked in at build time, not fetched live per visit (see
// scripts/prerender.mjs in the repo for why: Google's calendar feed
// doesn't allow direct browser fetches). triggerSiteRebuild() below asks
// GitHub Actions to rebuild and redeploy right after an approval, so a new
// event shows up in a minute or two instead of waiting for the twice-daily
// scheduled rebuild.
const GITHUB_REPO_OWNER = "joetol2";
const GITHUB_REPO_NAME = "3rdspace-v2";
const GITHUB_WORKFLOW_FILE = "static.yml";

// Used by the manual rebuild button at /staff-approve/gevalt/. See
// handleManualRebuild() near the bottom of this file for what these do and
// why the token is deliberately not treated as a secret.
const REBUILD_TOKEN = "gevalt-rebuild-7yn83y";
const REBUILD_COOLDOWN_KEY = "manual_rebuild_recent";
const REBUILD_COOLDOWN_SECONDS = 120;

// The site posts with mode: "no-cors" and cannot read the response, so it
// cannot tell a delivered submission from a dropped one. It now retries on
// network failure instead of giving up, which means the same submission can
// legitimately arrive here more than once. Every submission carries a
// client-generated submissionId; the first one to arrive claims it, and any
// repeat inside this window is acknowledged and thrown away rather than
// creating a second row and a second email. Also covers a double-tapped
// submit button.
const SUBMISSION_DEDUPE_PREFIX = "sub_";
const SUBMISSION_DEDUPE_SECONDS = 21600; // 6 hours

// The request form is public and unauthenticated, so anything that can be
// submitted once can be submitted ten thousand times. The binding
// constraint is not the spreadsheet, it is MailApp: a consumer Gmail
// account gets 100 recipients per day, and NOTIFY_EMAILS has two entries,
// so roughly 45 submissions in a day exhausts the quota and then genuine
// approval and decline emails stop being delivered with no visible error.
//
// The rule these limits follow: never drop a real person's request, throttle
// the email instead. Only the per-address limit refuses to write, because
// one address submitting that fast is not a person filling in a form.
const RATE_LIMIT_EMAIL_PER_HOUR = 8;
const RATE_LIMIT_GLOBAL_PER_HOUR = 40;
const RATE_LIMIT_ALERT_KEY = "volume_alert_sent";
const RATE_LIMIT_WINDOW_SECONDS = 3900; // an hour plus slack, so buckets overlap

// Everyone on this list gets an email every time someone submits any form,
// whether it's a brand new contact, an update to an existing one, or a
// space request.
const NOTIFY_EMAILS = ["3rdspacesyv@gmail.com", "laurabnewman@gmail.com"];

const HEADERS = [
  "Timestamp",
  "Last Updated",
  "Email",
  "Name",
  "Phone",
  "Interest Areas",
  "Hosting Interest",
  "Event or Program Ideas",
  "Volunteer Interest",
  "Donation or Support Interest",
  "Notes",
  "Source",
  "Status",
  "User Agent",
];

const SPACE_REQUEST_HEADERS = [
  "Timestamp",
  "Name",
  "Email",
  "Phone",
  "Organization",
  "Type of Use",
  "Public or Private",
  "One-time or Recurring",
  "Low-cost or Sliding Scale",
  "Requested Area",
  "Calendar Visibility",
  "Preferred Date",
  "Start Time",
  "End Time",
  "Setup Time Needed",
  "Cleanup Time Needed",
  "Expected Attendance",
  "Event Description",
  "Food or Catering Needs",
  "Pet Approval Request",
  "Furniture",
  "Amplified Sound or Special Equipment",
  "Accessibility, Privacy, or Parking Needs",
  "Agreed to Guidelines",
  "Source",
  "User Agent",
  "Status",
  "Request ID",
  "Action Token",
  // Added after the workflow columns above (rather than up near "Type of
  // Use" where it reads more naturally) so appending it doesn't shift
  // every column after it and misalign already-submitted rows, whose
  // cell values stay put when ensureHeaders adds a new header.
  "Event Name",
  // Appended at the end for the same reason as "Event Name": adding a
  // header mid-list would shift every column after it and misalign rows
  // that are already in the sheet.
  "Recurrence Details",
  // Same reason again. Blank on every row submitted before multi-day
  // requests existed, and blank on any single-day request since, which all
  // the date handling below reads as "same day as Preferred Date".
  "End Date",
  // The calendar event this row created, so the row and the booking are
  // linked. Without it nothing can cancel a booking, notice that its event
  // has been deleted, or tell a retry apart from a second approval.
  "Calendar Event ID",
];

const APPROVED_ROW_COLOR = "#d9ead3";
const DECLINED_ROW_COLOR = "#f4cccc";
const CANCELLED_ROW_COLOR = "#e6e6e6";

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;
  const id = params.id;
  const token = params.token;

  if ((action === "approve" || action === "decline") && id && token) {
    return renderReviewPage(id, token, action);
  }

  return HtmlService.createHtmlOutput(
    simplePage("3RD SPACE", "This page is used for space request approvals and does not show anything on its own.")
  );
}

function doPost(e) {
  const params = (e && e.parameter) || {};

  if (params.decisionSubmit === "1") {
    return handleDecisionSubmit(params);
  }

  if (params.rebuildSite === "1") {
    return handleManualRebuild(params);
  }

  let submissionId = "";
  checkScriptTimeZone();

  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");

    const formType = String(payload.formType || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    submissionId = String(payload.submissionId || "").trim();

    // Hidden field, positioned off-screen and skipped by the keyboard, so a
    // person never sees it and a form-filling bot cannot resist it. Answered
    // with a cheerful ok so whatever filled it in has no signal to adapt to.
    if (String(payload.website || "").trim()) {
      console.log("Honeypot triggered, submission discarded.");
      return jsonResponse({ ok: true, status: "created" });
    }

    if (!email) {
      return jsonResponse({
        ok: false,
        error: "missing_email",
      });
    }

    if (!isValidEmail(email)) {
      return jsonResponse({
        ok: false,
        error: "invalid_email",
      });
    }

    // A retry of something already handled. Reported as ok because from the
    // sender's point of view it did work: their submission is recorded.
    if (!reserveSubmission(submissionId)) {
      console.log("Duplicate submission ignored: " + submissionId);
      return jsonResponse({ ok: true, status: "duplicate_ignored" });
    }

    const rate = checkSubmissionRate(email);
    if (!rate.accept) {
      console.log("Rate limited (" + rate.reason + ", " + rate.count + ") for " + email);
      return jsonResponse({ ok: false, error: "rate_limited" });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (formType === "space_request") {
      handleSpaceRequest(spreadsheet, payload, email, rate.notify);
      if (!rate.notify) sendVolumeAlertOnce(rate.count);
      return jsonResponse({
        ok: true,
        status: "created",
      });
    }

    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);

    ensureHeaders(sheet, HEADERS);

    const now = new Date();
    const existingRow = findRowByEmail(sheet, email);
    const status = existingRow ? "updated" : "created";

    if (existingRow) {
      updateExistingRow(sheet, existingRow, payload, formType, email, now);
    } else {
      appendNewRow(sheet, payload, formType, email, now);
    }

    if (rate.notify) {
      sendNotificationEmail(payload, formType, email, status);
    } else {
      sendVolumeAlertOnce(rate.count);
    }

    return jsonResponse({
      ok: true,
      status: status,
    });
  } catch (error) {
    // Hand the id back so the client's retry gets a real second attempt
    // rather than being waved through as a duplicate of a failure.
    releaseSubmission(submissionId);
    return jsonResponse({
      ok: false,
      error: "server_error",
      message: String(error && error.message ? error.message : error),
    });
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

// Writes the header row when it is missing or when columns have only been
// APPENDED (the normal case: a new field added to the end of the constant).
//
// It refuses to touch a sheet whose existing headers have been reordered,
// renamed, or had a column inserted among them. The old version rewrote
// row 1 unconditionally, which was actively harmful: after someone tidied
// the spreadsheet, it would repair the header row so the sheet LOOKED
// correct while every value underneath stayed in its old column. The
// corruption hid itself. Failing loudly is the only safe option, because
// the alternative is silently writing decisions to the wrong fields.
function ensureHeaders(sheet, headers) {
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaders = sheet.getRange(1, 1, 1, width).getValues()[0];

  const isBlank = currentHeaders.every(function (h) {
    return String(h || "").trim() === "";
  });
  if (isBlank) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  // Every header we already expect must still sit at the same index.
  for (let i = 0; i < headers.length; i++) {
    const found = String(currentHeaders[i] || "").trim();
    if (found === "") continue; // not written yet; appending is fine
    if (found !== headers[i]) {
      throw new Error(
        "Sheet column layout has changed. Expected \"" + headers[i] + "\" in column " +
        (i + 1) + " but found \"" + found + "\". Columns are read by position, so " +
        "reordering, renaming, or inserting one will write data to the wrong " +
        "fields. Restore the original column order before using the form again."
      );
    }
  }

  // Safe: only appending newly added headers onto the end.
  if (String(currentHeaders[headers.length - 1] || "").trim() !== headers[headers.length - 1]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function findRowByEmail(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }
  const emailValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (let i = 0; i < emailValues.length; i++) {
    const existingEmail = String(emailValues[i][0] || "").trim().toLowerCase();

    if (existingEmail === email) {
      return i + 2;
    }
  }
  return null;
}

function appendNewRow(sheet, payload, formType, email, now) {
  const row = buildRow(payload, formType, email, now, true);
  sheet.appendRow(row);
}

function updateExistingRow(sheet, rowNumber, payload, formType, email, now) {
  const currentValues = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
  const newValues = buildRow(payload, formType, email, now, false, currentValues);
  sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([newValues]);
}

function buildRow(payload, formType, email, now, isNewRow, currentValues) {
  const existing = currentValues || [];
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const interestAreas = Array.isArray(payload.interestAreas)
    ? payload.interestAreas.join(", ")
    : String(payload.interestAreas || "").trim();
  const hostingInterest = String(payload.hostingInterest || "").trim();
  const eventIdeas = String(payload.eventIdeas || "").trim();
  const volunteerInterest = String(payload.volunteerInterest || "").trim();
  const supportInterest = String(payload.supportInterest || "").trim();
  const notes = String(payload.notes || "").trim();
  const source = String(payload.source || "3RD SPACE website").trim();
  const userAgent = String(payload.userAgent || "").trim();
  const isFullJoin = formType === "full_join";

  return [
    isNewRow ? now : existing[0],
    now,
    email,
    isFullJoin && name ? name : existing[3] || "",
    isFullJoin && phone ? phone : existing[4] || "",
    isFullJoin && interestAreas ? interestAreas : existing[5] || "",
    isFullJoin && hostingInterest ? hostingInterest : existing[6] || "",
    isFullJoin && eventIdeas ? eventIdeas : existing[7] || "",
    isFullJoin && volunteerInterest ? volunteerInterest : existing[8] || "",
    isFullJoin && supportInterest ? supportInterest : existing[9] || "",
    isFullJoin && notes ? notes : existing[10] || "",
    source,
    formType || existing[12] || "email_capture",
    userAgent || existing[13] || "",
  ];
}

function sendNotificationEmail(payload, formType, email, status) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      replyTo: email,
      subject: buildNotificationSubject(payload, formType, status),
      body: buildNotificationBody(payload, formType, email, status),
    });
  } catch (error) {
    // The Contact List row is already saved at this point, so a failed
    // notification should not fail the whole request. Check Executions
    // in script.google.com if these emails stop showing up.
    console.error(
      "Failed to send notification email: " +
        (error && error.message ? error.message : error)
    );
  }
}

function buildNotificationSubject(payload, formType, status) {
  if (formType === "full_join") {
    const name = String(payload.name || "").trim();
    return "New Join 3RD SPACE form: " + (name || payload.email || "");
  }
  return (status === "created" ? "New" : "Updated") + " 3RD SPACE mailing list signup";
}

function buildNotificationBody(payload, formType, email, status) {
  const statusLine =
    status === "created"
      ? "This is a new contact."
      : "This updates an existing contact already in the Contact List.";
  const submitted = Utilities.formatDate(
    new Date(),
    "America/Los_Angeles",
    "MMM d, yyyy h:mm a"
  );
  const lines = [];

  if (formType === "full_join") {
    lines.push("Someone submitted the full Join 3RD SPACE form.");
    lines.push("");
    lines.push(statusLine);
    lines.push("");
    lines.push("Name: " + (payload.name || ""));
    lines.push("Email: " + email);
    lines.push("Phone: " + (payload.phone || "Not given"));
    lines.push("How they want to be involved: " + formatInterestAreas(payload.interestAreas));
    lines.push("Interested in hosting something: " + (payload.hostingInterest || "Not answered"));
    lines.push("Event, program, or gathering ideas: " + (payload.eventIdeas || "None given"));
    lines.push("Interested in volunteering: " + (payload.volunteerInterest || "Not answered"));
    lines.push("Interested in donating or supporting the space: " + (payload.supportInterest || "Not answered"));
    lines.push("Anything else they want us to know: " + (payload.notes || "None given"));
  } else {
    lines.push("Someone joined the 3RD SPACE mailing list from the homepage.");
    lines.push("");
    lines.push(statusLine);
    lines.push("");
    lines.push("Email: " + email);
  }

  lines.push("");
  lines.push("Source: " + (payload.source || ""));
  lines.push("Submitted: " + submitted);
  lines.push("");
  lines.push("View the Contact List sheet: " + SPREADSHEET_URL);

  return lines.join("\n");
}

function formatInterestAreas(interestAreas) {
  if (Array.isArray(interestAreas) && interestAreas.length) {
    return interestAreas.join(", ");
  }
  if (typeof interestAreas === "string" && interestAreas.trim()) {
    return interestAreas.trim();
  }
  return "None selected";
}

// Manual debug helper. Select "sendTestNotification" from the function
// dropdown in the Apps Script editor and click Run. It exercises the exact
// same email-sending code the real forms use, and any error (permission
// not granted, quota, etc) will show immediately in the editor's execution
// log below, which is faster and more reliable than the Executions page.
function sendTestNotification() {
  sendNotificationEmail(
    { email: "test@example.com", source: "Manual test from Apps Script editor" },
    "email_capture",
    "test@example.com",
    "created"
  );
  console.log("sendTestNotification finished without throwing.");
}

// Every date in this file is built with new Date(y, m, d, h, mi), which
// uses the SCRIPT's timezone, and then formatted for America/Los_Angeles.
// Those agree only because the project timezone was set correctly once, and
// nothing has ever checked. If it is wrong, every time in the system shifts
// by the offset: emails, calendar events, conflict checks, all wrong and
// all consistent with each other, so nothing looks broken.
const EXPECTED_TIME_ZONE = "America/Los_Angeles";
const TZ_ALERT_KEY = "tz_mismatch_alerted";

function checkScriptTimeZone() {
  try {
    const actual = Session.getScriptTimeZone();
    if (actual === EXPECTED_TIME_ZONE) return true;

    console.error(
      "TIMEZONE MISMATCH: project is set to " + actual + " but every date in " +
      "this script assumes " + EXPECTED_TIME_ZONE + ". Times will be wrong."
    );
    // Alerted at most once a day. A wrong timezone does not stop anything
    // working, so this must not become a message per submission.
    const cache = CacheService.getScriptCache();
    if (!cache.get(TZ_ALERT_KEY)) {
      cache.put(TZ_ALERT_KEY, "1", 21600);
      MailApp.sendEmail({
        to: NOTIFY_EMAILS.join(","),
        subject: "[3RD SPACE] Times may be wrong: script timezone is set to " + actual,
        body:
          "The Apps Script project timezone is " + actual + ", but the booking " +
          "system is written to assume " + EXPECTED_TIME_ZONE + ".\n\n" +
          "While these disagree, every time the system handles is shifted: the " +
          "times in notification emails, the times written onto the Google " +
          "Calendar, and the checks for double bookings. Nothing will look " +
          "broken, because everything will be wrong by the same amount.\n\n" +
          "To fix it: open the Apps Script editor, click the gear icon " +
          "(Project Settings), and set the time zone to " + EXPECTED_TIME_ZONE + ".\n\n" +
          "Any bookings approved while it was wrong should be checked by hand.",
      });
    }
    return false;
  } catch (error) {
    console.error("Timezone check failed: " + (error && error.message ? error.message : error));
    return true; // never let this check itself be the thing that breaks
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Submission de-duplication
//
// reserveSubmission returns true the first time it sees an id and false
// every time after. The lock matters because two retries of the same
// submission can be in flight at once: without it both can read an empty
// cache, both decide they are first, and the duplicate this is meant to
// prevent happens anyway. If the lock cannot be taken we let the request
// through, because a duplicate row is a far smaller problem than a dropped
// request.
// ---------------------------------------------------------------------------
function reserveSubmission(submissionId) {
  const id = String(submissionId || "").trim();
  if (!id) return true; // nothing to dedupe on, let it through

  const key = SUBMISSION_DEDUPE_PREFIX + id.slice(0, 200);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
  } catch (error) {
    console.error("Dedupe lock unavailable, proceeding: " + (error && error.message ? error.message : error));
    return true;
  }

  try {
    if (cache.get(key)) return false;
    cache.put(key, "1", SUBMISSION_DEDUPE_SECONDS);
    return true;
  } finally {
    lock.releaseLock();
  }
}

// Called when handling threw after the id was reserved. Without this a
// submission that failed on a transient Google error would be remembered as
// already handled, and the client's retry, the one thing that could still
// save it, would be discarded as a duplicate.
function releaseSubmission(submissionId) {
  const id = String(submissionId || "").trim();
  if (!id) return;
  try {
    CacheService.getScriptCache().remove(SUBMISSION_DEDUPE_PREFIX + id.slice(0, 200));
  } catch (error) {
    console.error("Could not release submission id: " + (error && error.message ? error.message : error));
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
function bumpCounter(key, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const current = parseInt(cache.get(key) || "0", 10) || 0;
  const next = current + 1;
  cache.put(key, String(next), ttlSeconds);
  return next;
}

// Two counters, both bucketed by clock hour. Reads and writes are not
// atomic, so under a genuine flood the count can drift low. That is
// acceptable: this is a blast shield, not an accountant.
function checkSubmissionRate(email) {
  try {
    const bucket = Math.floor(new Date().getTime() / 3600000);
    const perEmail = bumpCounter("rl_e_" + String(email || "").slice(0, 100) + "_" + bucket, RATE_LIMIT_WINDOW_SECONDS);
    const overall = bumpCounter("rl_g_" + bucket, RATE_LIMIT_WINDOW_SECONDS);

    if (perEmail > RATE_LIMIT_EMAIL_PER_HOUR) {
      return { accept: false, notify: false, reason: "per_email", count: perEmail };
    }
    if (overall > RATE_LIMIT_GLOBAL_PER_HOUR) {
      // Still written to the sheet, so nothing is lost and the daily digest
      // will surface it. Only the per-submission email is suppressed.
      return { accept: true, notify: false, reason: "global_volume", count: overall };
    }
    return { accept: true, notify: true, reason: "", count: overall };
  } catch (error) {
    // A broken rate limiter must never be the reason a real request fails.
    console.error("Rate limit check failed, allowing: " + (error && error.message ? error.message : error));
    return { accept: true, notify: true, reason: "", count: 0 };
  }
}

// One alert per hour, no matter how many submissions arrive, so a flood
// cannot itself become the flood.
function sendVolumeAlertOnce(count) {
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get(RATE_LIMIT_ALERT_KEY)) return;
    cache.put(RATE_LIMIT_ALERT_KEY, "1", RATE_LIMIT_WINDOW_SECONDS);

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      subject: "[3RD SPACE] Unusual form volume, per-submission emails paused",
      body:
        "More than " + RATE_LIMIT_GLOBAL_PER_HOUR + " form submissions arrived in the last hour " +
        "(" + count + " so far).\n\n" +
        "Everything is still being saved to the spreadsheet, nothing is being lost. What has " +
        "stopped, for the rest of this hour, is the individual email for each one. That is " +
        "deliberate: the account can only send about 100 emails a day, and if a flood used them " +
        "all up then genuine approval and decline emails would silently stop going out.\n\n" +
        "Have a look at the Space Requests tab. If it is real people, approve them from the sheet " +
        "as usual and the daily summary will pick up anything still waiting. If it is junk, delete " +
        "the rows and nothing else needs doing.\n\n" +
        SPREADSHEET_URL,
    });
  } catch (error) {
    console.error("Could not send volume alert: " + (error && error.message ? error.message : error));
  }
}

// ---------------------------------------------------------------------------
// Setup and cleanup padding
//
// The form has always collected these and shown them to staff, but nothing
// ever acted on them. A 10am event with an hour of setup means the space is
// really occupied from 9am, and a booking that ended at 9:30am read as "no
// conflict" while in practice the two groups would be in the room together.
// ---------------------------------------------------------------------------
function parseDurationMinutes(value) {
  const text = String(value === null || value === undefined ? "" : value).trim().toLowerCase();
  if (!text || text === "none" || text === "not sure yet") return 0;

  // "More than 1 hour" has no upper bound, so assume two. Over-reserving
  // produces a warning a human can wave away; under-reserving produces a
  // clash nobody saw coming.
  if (text.indexOf("more than") === 0) return 120;

  const hours = text.match(/^(\d+(?:\.\d+)?)\s*hour/);
  if (hours) return Math.round(parseFloat(hours[1]) * 60);

  const minutes = text.match(/^(\d+)\s*min/);
  if (minutes) return parseInt(minutes[1], 10);

  return 0;
}

// The window the space is actually unavailable, which is what conflict
// detection should be comparing against. Returns the original window
// unchanged when there is no padding and when either date is unusable.
function paddedWindow(start, end, setupTime, cleanupTime) {
  const setup = parseDurationMinutes(setupTime);
  const cleanup = parseDurationMinutes(cleanupTime);
  const usable = start instanceof Date && end instanceof Date && !isNaN(start) && !isNaN(end);

  return {
    start: usable && setup ? new Date(start.getTime() - setup * 60000) : start,
    end: usable && cleanup ? new Date(end.getTime() + cleanup * 60000) : end,
    setupMinutes: setup,
    cleanupMinutes: cleanup,
    padded: !!(usable && (setup || cleanup)),
  };
}

// A request runs from Preferred Date to End Date. End Date is blank on
// every single-day request and on every row that predates the column, so it
// falls back to Preferred Date and multi-day handling costs nothing for the
// common case.
function requestEndDateValue(endDate, preferredDate) {
  const text = String(endDate === null || endDate === undefined ? "" : endDate).trim();
  if (endDate instanceof Date && !isNaN(endDate)) return endDate;
  return text ? endDate : preferredDate;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// --- Request Space form ---
//
// The Request Space form (on /request) posts straight to this same doPost
// endpoint (formType "space_request"), just like the mailing list forms.
// Every submission is appended as a new row in the "Space Requests" tab,
// since each request is a distinct event rather than an update to a
// contact. Each row gets a Request ID and a secret Action Token, used to
// build the Approve / Decline links in the staff notification email
// below, so those links can't be guessed or reused once a decision is
// made.

function spaceRequestColIndex(headerName) {
  return SPACE_REQUEST_HEADERS.indexOf(headerName);
}

function handleSpaceRequest(spreadsheet, payload, email, shouldNotify) {
  const sheet = getOrCreateSheet(spreadsheet, SPACE_REQUEST_SHEET_NAME);
  ensureHeaders(sheet, SPACE_REQUEST_HEADERS);

  const requestId = Utilities.getUuid();
  const actionToken = Utilities.getUuid();
  const row = buildSpaceRequestRow(payload, email, new Date(), requestId, actionToken);
  sheet.appendRow(row);

  // The row is written either way. Only the email is suppressed under
  // volume, and the daily digest still lists anything left Pending.
  if (shouldNotify !== false) {
    sendSpaceRequestNotification(payload, email, requestId, actionToken);
  }
}

function buildSpaceRequestRow(payload, email, now, requestId, actionToken) {
  return [
    now,
    String(payload.name || "").trim(),
    email,
    String(payload.phone || "").trim(),
    String(payload.organization || "").trim(),
    String(payload.useType || "").trim(),
    String(payload.publicPrivate || "").trim(),
    String(payload.oneTimeRecurring || "").trim(),
    String(payload.lowCost || "").trim(),
    String(payload.requestedArea || "").trim(),
    String(payload.calendarVisibility || "").trim(),
    String(payload.preferredDate || "").trim(),
    String(payload.startTime || "").trim(),
    String(payload.endTime || "").trim(),
    String(payload.setupTime || "").trim(),
    String(payload.cleanupTime || "").trim(),
    String(payload.expectedAttendance || "").trim(),
    String(payload.eventDescription || "").trim(),
    String(payload.foodNeeds || "").trim(),
    String(payload.petApproval || "").trim(),
    String(payload.furniture || "").trim(),
    String(payload.soundEquipment || "").trim(),
    String(payload.accessibilityNeeds || "").trim(),
    payload.agreedToGuidelines ? "Yes" : "No",
    String(payload.source || "").trim(),
    String(payload.userAgent || "").trim(),
    "Pending",
    requestId,
    actionToken,
    String(payload.eventName || "").trim(),
    String(payload.recurrenceDetails || "").trim(),
    String(payload.endDate || "").trim(),
    // No calendar event until someone approves it. Written explicitly so the
    // row is always exactly as wide as the header list, rather than relying
    // on appendRow to pad, which would quietly go wrong for whoever adds the
    // next column after this one.
    "",
  ];
}

// One place that knows how a request's real occupied window is worked out,
// so submission, approval, and the pending-conflict scan cannot drift apart
// on it. Spans Preferred Date to End Date, then pads by setup and cleanup.
function requestWindow(preferredDate, endDate, startTime, endTime, setupTime, cleanupTime) {
  const start = combineDateAndTime(preferredDate, startTime);
  const end = combineDateAndTime(requestEndDateValue(endDate, preferredDate), endTime);
  return paddedWindow(start, end, setupTime, cleanupTime);
}

// Everything from the submission, encoded into the Approve/Decline link's
// query string so the staff-approve page (src/routes/staff-approve.tsx)
// can show it all as a last-look review before confirming, with no round
// trip back to this script. Keep these param names in sync with
// StaffApproveSearch in that file if you change them here.
function buildReviewQueryParams(payload, email, conflicts) {
  const startDateObj = combineDateAndTime(payload.preferredDate, payload.startTime);
  const endDateObj = combineDateAndTime(
    requestEndDateValue(payload.endDate, payload.preferredDate), payload.endTime
  );
  const win = requestWindow(
    payload.preferredDate, payload.endDate, payload.startTime, payload.endTime,
    payload.setupTime, payload.cleanupTime
  );
  conflicts = conflicts || { overlaps: [], sameDay: [] };

  const fields = [
    ["name", payload.name],
    ["email", email],
    ["phone", payload.phone],
    ["organization", payload.organization],
    ["eventName", payload.eventName],
    ["useType", payload.useType],
    ["publicPrivate", payload.publicPrivate],
    ["oneTimeRecurring", payload.oneTimeRecurring],
    ["recurrence", payload.recurrenceDetails],
    ["lowCost", payload.lowCost],
    ["requestedArea", payload.requestedArea],
    ["calendarVisibility", payload.calendarVisibility],
    ["date", formatDateCell(startDateObj)],
    // Blank on a single-day request, which is what the review page keys off
    // to decide whether to show a date range at all.
    ["endDate", formatDateCell(startDateObj) === formatDateCell(endDateObj) ? "" : formatDateCell(endDateObj)],
    ["start", formatTimeCell(startDateObj)],
    ["end", formatTimeCell(endDateObj)],
    ["setupTime", payload.setupTime],
    ["cleanupTime", payload.cleanupTime],
    // The window the space is actually held, so the review page can say
    // out loud what approving this will put on the calendar.
    ["heldStart", win.padded ? formatTimeCell(win.start) : ""],
    ["heldEnd", win.padded ? formatTimeCell(win.end) : ""],
    ["attendance", payload.expectedAttendance],
    ["description", payload.eventDescription],
    ["food", payload.foodNeeds],
    ["pets", payload.petApproval],
    ["furniture", payload.furniture],
    ["sound", payload.soundEquipment],
    ["accessibility", payload.accessibilityNeeds],
    ["guidelines", payload.agreedToGuidelines ? "Yes" : "No"],
    // What else is already on the calendar that day, so the review page can
    // warn before a decision instead of after. This is a snapshot from
    // submission time; handleDecisionSubmit re-checks at the moment of
    // approval, which is the authoritative one.
    ["overlaps", summarizeConflictList(conflicts.overlaps, 4)],
    ["sameday", summarizeConflictList(conflicts.sameDay, 4)],
  ];

  // A per-field cap alone does not bound the total: seven capped fields
  // still add up. Assemble, measure, and tighten until the whole string
  // fits, so the ceiling holds no matter how many fields exist or how
  // verbose the requester was.
  const FREE_TEXT = {
    organization: 1, eventName: 1, recurrence: 1, description: 1,
    food: 1, furniture: 1, sound: 1, accessibility: 1,
  };
  const CAPS = [300, 200, 120, 70, 40];

  for (let attempt = 0; attempt < CAPS.length; attempt++) {
    const cap = CAPS[attempt];
    const built = fields
      .map(function (field) {
        const raw = field[1];
        const value = FREE_TEXT[field[0]] ? truncateForUrl(raw, cap) : String(raw === null || raw === undefined ? "" : raw);
        return "&" + field[0] + "=" + encodeURIComponent(value);
      })
      .join("");
    if (built.length <= REVIEW_QUERY_MAX || attempt === CAPS.length - 1) {
      return built;
    }
  }
}

// Everything about a request travels in the Approve/Decline URL, and the
// free-text fields are whatever the requester typed. One enthusiastic
// paragraph pushed a measured link to 2,628 characters and a thorough
// requester to 9,081, past the point where some email clients truncate a
// link. A truncated link doesn't degrade, it dies: staff click it and get
// "Link not valid" with no clue why, for a request that is otherwise fine.
//
// So each field is capped here. The review page is a summary for deciding,
// not the record of what was said: the sheet and the notification email
// both keep the full untruncated text. The marker matters, otherwise a
// sentence just stops mid-word and reads like a bug.
// Budget for the query string alone, leaving comfortable room under the
// ~2048 characters where the least forgiving email clients start mangling
// links, once the base URL, id and token are added.
const REVIEW_QUERY_MAX = 1500;

function truncateForUrl(value, cap) {
  const text = String(value === null || value === undefined ? "" : value);
  if (text.length <= cap) return text;
  // Cut back to a word boundary so it doesn't end mid-word.
  return text.slice(0, cap).replace(/\s+\S*$/, "") + "... (full text in the email)";
}

function sendSpaceRequestNotification(payload, email, requestId, actionToken) {
  try {
    // Padded by setup and cleanup, and spanning End Date when there is one,
    // so the check covers the hours the space is really unavailable rather
    // than only the hours the event is running.
    const win = requestWindow(
      payload.preferredDate, payload.endDate, payload.startTime, payload.endTime,
      payload.setupTime, payload.cleanupTime
    );
    const reqStart = win.start;
    const reqEnd = win.end;
    const conflicts = findCalendarConflicts(reqStart, reqEnd);
    // Other undecided requests for the same window count as conflicts too,
    // otherwise the first of two competing requests always reads as clear.
    conflicts.overlaps = conflicts.overlaps.concat(
      findPendingConflicts(reqStart, reqEnd, requestId)
    );
    const reviewParams = buildReviewQueryParams(payload, email, conflicts);
    const approveUrl =
      SITE_URL + "/staff-approve/?action=approve&id=" + encodeURIComponent(requestId) + "&token=" + encodeURIComponent(actionToken) + reviewParams;
    const declineUrl =
      SITE_URL + "/staff-approve/?action=decline&id=" + encodeURIComponent(requestId) + "&token=" + encodeURIComponent(actionToken) + reviewParams;
    const conflictBlock = buildConflictTextBlock(conflicts);
    const plainBody = conflictBlock + buildSpaceRequestBody(payload, email);
    // Flagging it in the subject means a busy day is visible in the inbox
    // list, before the email is even opened.
    const subject =
      (conflicts.overlaps.length ? "[TIME CONFLICT] " : "") +
      "New Request Space submission: " + (payload.name || email);

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      replyTo: email,
      subject: subject,
      body: plainBody + "\n\nApprove: " + approveUrl + "\nDecline: " + declineUrl,
      htmlBody: buildSpaceRequestHtmlBody(plainBody, approveUrl, declineUrl, conflicts),
    });
  } catch (error) {
    // The Space Requests row is already saved at this point, so a failed
    // notification should not fail the whole request.
    console.error(
      "Failed to send space request notification email: " +
        (error && error.message ? error.message : error)
    );
  }
}

function buildSpaceRequestBody(payload, email) {
  const submitted = Utilities.formatDate(
    new Date(),
    "America/Los_Angeles",
    "MMM d, yyyy h:mm a"
  );

  const lines = [
    "Someone submitted a Request Space form.",
    "",
    "Name: " + (payload.name || ""),
    "Email: " + email,
    "Phone: " + (payload.phone || "Not given"),
    "Organization or group: " + (payload.organization || "Not given"),
    "",
    "Type of use: " + (payload.useType || "Not answered"),
    "Public event or private gathering: " + (payload.publicPrivate || "Not answered"),
    "One-time or recurring: " + (payload.oneTimeRecurring || "Not answered"),
    (payload.recurrenceDetails
      ? "Requested pattern: " + payload.recurrenceDetails +
        "\n  NOTE: approving books the FIRST date only. Set the repeat up in\n  Google Calendar afterwards if you agree to the series."
      : ""),
    "Low-cost or sliding scale: " + (payload.lowCost || "Not answered"),
    "Requested area: " + (payload.requestedArea || "Not answered"),
    "Calendar visibility: " + (payload.calendarVisibility || "Not answered"),
    "",
    "Preferred date: " + (payload.preferredDate || "Not given"),
    (payload.endDate && payload.endDate !== payload.preferredDate
      ? "Runs through: " + payload.endDate +
        "\n  NOTE: this is a MULTI-DAY request. Approving books the whole span\n  as one calendar event, from the start time on the first day to the\n  end time on the last."
      : ""),
    "Start time: " + (payload.startTime || "Not given"),
    "End time: " + (payload.endTime || "Not given"),
    "Setup time needed: " + (payload.setupTime || "Not given"),
    "Cleanup time needed: " + (payload.cleanupTime || "Not given"),
    (function () {
      const w = requestWindow(
        payload.preferredDate, payload.endDate, payload.startTime, payload.endTime,
        payload.setupTime, payload.cleanupTime
      );
      if (!w.padded) return "";
      return "Space held (including setup and cleanup): " +
        formatTimeCell(w.start) + " to " + formatTimeCell(w.end) +
        "\n  This wider window is what gets booked on the calendar, and what\n  the conflict check above compares against.";
    })(),
    "",
    "Name of the event: " + (payload.eventName || "Not given"),
    "Expected attendance: " + (payload.expectedAttendance || "Not given"),
    "Event description: " + (payload.eventDescription || "Not given"),
    "",
    "Food or catering needs: " + (payload.foodNeeds || "None given"),
    "Pet approval request: " + (payload.petApproval || "Not answered"),
    "Furniture: " + (payload.furniture || "None given"),
    "Amplified sound or special equipment: " + (payload.soundEquipment || "None given"),
    "Accessibility, privacy, or parking needs: " + (payload.accessibilityNeeds || "None given"),
    "",
    "Agreed to guidelines: " + (payload.agreedToGuidelines ? "Yes" : "No"),
    "Source: " + (payload.source || ""),
    "Submitted: " + submitted,
    "",
    "View all requests: " + SPREADSHEET_URL,
  ];

  return lines.join("\n");
}

// Plain-text conflict summary, prepended to the notification body so it is
// the first thing read rather than buried under the request details.
function buildConflictTextBlock(conflicts) {
  if (!conflicts || (!conflicts.overlaps.length && !conflicts.sameDay.length)) {
    return "";
  }
  const lines = [];
  if (conflicts.overlaps.length) {
    lines.push("*** TIME CONFLICT ***");
    lines.push("This request overlaps something already on the calendar:");
    conflicts.overlaps.forEach(function (c) { lines.push("  - " + c); });
    lines.push("");
    lines.push("You can still approve it if that's fine (different areas, for");
    lines.push("example). Just letting you know before you decide.");
  } else {
    lines.push("Already on the calendar that day (no time conflict):");
    conflicts.sameDay.forEach(function (c) { lines.push("  - " + c); });
  }
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("");
  return lines.join("\n");
}

function buildSpaceRequestHtmlBody(plainBody, approveUrl, declineUrl, conflicts) {
  let banner = "";
  if (conflicts && conflicts.overlaps.length) {
    banner =
      '<div style="background:#fdecea;border-left:4px solid #c62828;padding:12px 16px;margin-bottom:16px;border-radius:4px;">' +
      '<strong style="color:#c62828;">Time conflict on this date</strong><br>' +
      escapeHtml(conflicts.overlaps.join("  |  ")) +
      "</div>";
  }
  const htmlLines = escapeHtml(plainBody).split("\n").join("<br>");
  return (
    '<div style="font-family:sans-serif;font-size:14px;color:#222;line-height:1.5;">' +
    banner +
    "<div>" + htmlLines + "</div>" +
    '<div style="margin-top:20px;">' +
    '<a href="' + approveUrl + '" style="display:inline-block;margin-right:12px;padding:10px 20px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Approve</a>' +
    '<a href="' + declineUrl + '" style="display:inline-block;padding:10px 20px;background:#c62828;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Decline</a>' +
    "</div>" +
    "</div>"
  );
}

// Manual debug helper, mirrors sendTestNotification above. Select
// "sendTestSpaceRequestNotification" from the function dropdown and Run to
// send a sample notification without writing a test row into the sheet.
// The Approve/Decline buttons in this test email are not functional,
// since there is no real row behind the fake request ID.
function sendTestSpaceRequestNotification() {
  sendSpaceRequestNotification(
    {
      name: "Test Testerson",
      phone: "555-555-5555",
      organization: "Test Org",
      eventName: "Full Moon Circle",
      useType: "Community gathering",
      publicPrivate: "Public event",
      oneTimeRecurring: "One-time request",
      lowCost: "No",
      requestedArea: "Indoor space",
      calendarVisibility: "Show the event name",
      preferredDate: "2026-08-01",
      startTime: "10:00",
      endTime: "12:00",
      setupTime: "30 minutes",
      cleanupTime: "30 minutes",
      expectedAttendance: "20",
      eventDescription: "A test event description.",
      foodNeeds: "",
      petApproval: "No",
      furniture: "",
      soundEquipment: "",
      accessibilityNeeds: "",
      agreedToGuidelines: true,
      source: "Manual test from Apps Script editor",
    },
    "test@example.com",
    "test-request-id",
    "test-token"
  );
  console.log("sendTestSpaceRequestNotification finished without throwing.");
}

// --- Approve / Decline flow ---

function findSpaceRequestById(id) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SPACE_REQUEST_SHEET_NAME);
  if (!sheet) {
    return null;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const idCol = spaceRequestColIndex("Request ID") + 1;
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      const rowNumber = i + 2;
      const values = sheet.getRange(rowNumber, 1, 1, SPACE_REQUEST_HEADERS.length).getValues()[0];
      return { sheet: sheet, rowNumber: rowNumber, values: values };
    }
  }
  return null;
}

function renderReviewPage(id, token, action) {
  const found = findSpaceRequestById(id);
  if (!found) {
    return HtmlService.createHtmlOutput(
      simplePage("Request not found", "This request could not be found. It may have been removed from the sheet.")
    );
  }

  const row = found.values;
  const currentToken = row[spaceRequestColIndex("Action Token")];
  const currentStatus = row[spaceRequestColIndex("Status")];

  if (String(currentToken) !== String(token)) {
    return HtmlService.createHtmlOutput(simplePage("Link not valid", "This approval link is not valid."));
  }

  if (currentStatus && currentStatus !== "Pending") {
    return HtmlService.createHtmlOutput(
      simplePage("Already " + currentStatus, "This request has already been " + String(currentStatus).toLowerCase() + ".")
    );
  }

  const name = row[spaceRequestColIndex("Name")];
  const startDate = formatDateCell(row[spaceRequestColIndex("Preferred Date")]);
  const lastDate = formatDateCell(
    requestEndDateValue(row[spaceRequestColIndex("End Date")], row[spaceRequestColIndex("Preferred Date")])
  );
  const date = lastDate && lastDate !== startDate ? startDate + " through " + lastDate : startDate;
  const start = formatTimeCell(row[spaceRequestColIndex("Start Time")]);
  const end = formatTimeCell(row[spaceRequestColIndex("End Time")]);
  const heldWin = requestWindow(
    row[spaceRequestColIndex("Preferred Date")], row[spaceRequestColIndex("End Date")],
    row[spaceRequestColIndex("Start Time")], row[spaceRequestColIndex("End Time")],
    row[spaceRequestColIndex("Setup Time Needed")], row[spaceRequestColIndex("Cleanup Time Needed")]
  );
  const heldLine = heldWin.padded
    ? formatTimeCell(heldWin.start) + " to " + formatTimeCell(heldWin.end)
    : "";
  const useType = row[spaceRequestColIndex("Type of Use")];
  const eventName = row[spaceRequestColIndex("Event Name")];
  const actionLabel = action === "approve" ? "Approve" : "Decline";
  const buttonColor = action === "approve" ? "#2e7d32" : "#c62828";
  const scriptUrl = ScriptApp.getService().getUrl();

  const html =
    '<div style="max-width:480px;margin:48px auto;padding:32px;font-family:sans-serif;border:1px solid #ddd;border-radius:12px;">' +
    "<h2 style=\"margin-top:0;\">" + escapeHtml(actionLabel) + " this request?</h2>" +
    "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>" +
    (eventName ? "<p><strong>Event name:</strong> " + escapeHtml(eventName) + "</p>" : "") +
    "<p><strong>Date:</strong> " + escapeHtml(date) + "</p>" +
    "<p><strong>Time:</strong> " + escapeHtml(start) + " to " + escapeHtml(end) + "</p>" +
    (heldLine
      ? "<p><strong>Space held:</strong> " + escapeHtml(heldLine) +
        ' <span style="color:#666;">(includes setup and cleanup, and this is what goes on the calendar)</span></p>'
      : "") +
    "<p><strong>Type of use:</strong> " + escapeHtml(useType) + "</p>" +
    '<form method="POST" action="' + scriptUrl + '">' +
    '<input type="hidden" name="decisionSubmit" value="1">' +
    '<input type="hidden" name="id" value="' + escapeHtml(id) + '">' +
    '<input type="hidden" name="token" value="' + escapeHtml(token) + '">' +
    '<input type="hidden" name="action" value="' + escapeHtml(action) + '">' +
    '<label style="display:block;margin-top:16px;font-weight:600;">Optional note to the requester</label>' +
    '<textarea name="note" rows="4" style="width:100%;margin-top:6px;padding:8px;box-sizing:border-box;font-family:sans-serif;"></textarea>' +
    '<button type="submit" style="margin-top:16px;padding:10px 20px;background:' +
    buttonColor +
    ';color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;">Confirm ' +
    escapeHtml(actionLabel) +
    "</button>" +
    "</form>" +
    "</div>";

  return HtmlService.createHtmlOutput(html);
}

function handleDecisionSubmit(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return HtmlService.createHtmlOutput(
      simplePage("Please try again", "The system is busy processing another request. Please click the link again in a moment.")
    );
  }

  try {
    const id = params.id;
    const token = params.token;
    const action = params.action;
    const note = String(params.note || "").trim();

    const found = findSpaceRequestById(id);
    if (!found) {
      return HtmlService.createHtmlOutput(simplePage("Request not found", "This request could not be found."));
    }

    const statusCol = spaceRequestColIndex("Status") + 1;
    const currentToken = found.values[spaceRequestColIndex("Action Token")];
    const currentStatus = found.values[spaceRequestColIndex("Status")];

    if (String(currentToken) !== String(token)) {
      return HtmlService.createHtmlOutput(simplePage("Link not valid", "This approval link is not valid."));
    }

    // Cancelling acts on a booking that has already been approved, so it is
    // the one action allowed on a row that is not Pending.
    if (action === "cancel") {
      if (currentStatus !== "Approved") {
        return HtmlService.createHtmlOutput(
          simplePage("Nothing to cancel", "This request is " +
            String(currentStatus || "Pending").toLowerCase() + ", so there is no booking to cancel.")
        );
      }
      const eventIdCol = spaceRequestColIndex("Calendar Event ID") + 1;
      const outcome = deleteCalendarEventById(found.values[spaceRequestColIndex("Calendar Event ID")]);
      found.sheet.getRange(found.rowNumber, statusCol).setValue("Cancelled");
      found.sheet.getRange(found.rowNumber, eventIdCol).setValue("");
      found.sheet.getRange(found.rowNumber, 1, 1, SPACE_REQUEST_HEADERS.length).setBackground(CANCELLED_ROW_COLOR);
      sendDecisionEmail(found.values, "cancel", note);
      sendStaffDecisionConfirmation("cancel", found.values, null, outcome);
      triggerSiteRebuild();
      return HtmlService.createHtmlOutput(
        renderDecisionResultPage(
          "Booking cancelled",
          outcome === "already_gone"
            ? "The requester has been emailed. The calendar event had already been removed."
            : "The requester has been emailed and the event was removed from the calendar.",
          found.values
        )
      );
    }

    if (currentStatus && currentStatus !== "Pending") {
      return HtmlService.createHtmlOutput(
        simplePage("Already " + currentStatus, "This request has already been " + String(currentStatus).toLowerCase() + ".")
      );
    }

    if (action === "approve") {
      // Re-checked here, not reused from the notification email: that
      // snapshot is from submission time and another request may have been
      // approved into the same slot since. Must run BEFORE the event is
      // created, or this request's own event shows up as its own conflict.
      const get = function (name) { return found.values[spaceRequestColIndex(name)]; };
      const liveWin = requestWindow(
        get("Preferred Date"), get("End Date"), get("Start Time"), get("End Time"),
        get("Setup Time Needed"), get("Cleanup Time Needed")
      );
      const liveStart = liveWin.start;
      const liveEnd = liveWin.end;
      const liveConflicts = findCalendarConflicts(liveStart, liveEnd);
      liveConflicts.overlaps = liveConflicts.overlaps.concat(
        findPendingConflicts(liveStart, liveEnd, get("Request ID"))
      );

      // The only step here that talks to a service and is not already
      // wrapped. Left bare, a calendar failure showed "Something went wrong"
      // with no clue whether anything had happened, and the natural response
      // (click again) was the one path that could produce a second event.
      const eventIdCol = spaceRequestColIndex("Calendar Event ID") + 1;
      const existingEventId = String(found.values[spaceRequestColIndex("Calendar Event ID")] || "").trim();
      let calendarEvent = null;

      if (existingEventId && calendarEventStillExists(existingEventId) === "present") {
        // A previous attempt created the event and then failed before it
        // could finish. Reuse it rather than booking the room twice.
        console.log("Reusing event from an earlier interrupted approval: " + existingEventId);
      } else {
        try {
          calendarEvent = createCalendarEventForRequest(found.values);
        } catch (calendarError) {
          console.error("Calendar event creation failed: " +
            (calendarError && calendarError.message ? calendarError.message : calendarError));
          return HtmlService.createHtmlOutput(
            simplePage(
              "Could not add this to the calendar",
              "Nothing has been changed: the request is still waiting, the requester has " +
              "not been emailed, and no event was created. Please click Approve again in a " +
              "moment. If it keeps failing, check that the 3RD SPACE calendar is reachable."
            )
          );
        }
        // Written before the status, so an interruption after this point
        // leaves a row that knows which event it already made.
        try {
          found.sheet.getRange(found.rowNumber, eventIdCol).setValue(calendarEvent.getId());
        } catch (idError) {
          console.error("Event created but its ID could not be saved: " +
            (idError && idError.message ? idError.message : idError));
        }
      }

      found.sheet.getRange(found.rowNumber, statusCol).setValue("Approved");
      found.sheet.getRange(found.rowNumber, 1, 1, SPACE_REQUEST_HEADERS.length).setBackground(APPROVED_ROW_COLOR);
      sendDecisionEmail(found.values, "approve", note);
      sendStaffDecisionConfirmation("approve", found.values, liveConflicts);
      triggerSiteRebuild();
      return HtmlService.createHtmlOutput(
        renderDecisionResultPage(
          "Request approved",
          "The requester has been emailed and the event was added to the calendar.",
          found.values
        )
      );
    }

    if (action === "decline") {
      found.sheet.getRange(found.rowNumber, statusCol).setValue("Declined");
      found.sheet.getRange(found.rowNumber, 1, 1, SPACE_REQUEST_HEADERS.length).setBackground(DECLINED_ROW_COLOR);
      sendDecisionEmail(found.values, "decline", note);
      sendStaffDecisionConfirmation("decline", found.values, null);
      return HtmlService.createHtmlOutput(
        renderDecisionResultPage("Request declined", "The requester has been emailed.", found.values)
      );
    }

    return HtmlService.createHtmlOutput(simplePage("Unknown action", "Nothing was changed."));
  } catch (error) {
    console.error("Failed to process decision: " + (error && error.message ? error.message : error));
    return HtmlService.createHtmlOutput(simplePage("Something went wrong", "Please try again or contact the site admin."));
  } finally {
    lock.releaseLock();
  }
}

// Shown after a staff member confirms Approve or Decline. Includes the
// request's details so it's clear at a glance what was just acted on, and
// a close button since this page opens in its own browser tab from an
// email link with nothing else to navigate back to.
function renderDecisionResultPage(title, message, rowValues) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };

  const name = get("Name");
  const eventName = get("Event Name");
  const date = formatDateCell(get("Preferred Date"));
  const start = formatTimeCell(get("Start Time"));
  const end = formatTimeCell(get("End Time"));

  return (
    '<div style="max-width:480px;margin:48px auto;padding:32px;font-family:sans-serif;border:1px solid #ddd;border-radius:12px;text-align:center;">' +
    "<h2 style=\"margin-top:0;\">" + escapeHtml(title) + "</h2>" +
    '<p style="color:#555;">' + escapeHtml(message) + "</p>" +
    '<div style="margin-top:20px;padding:16px;background:#f7f7f7;border-radius:8px;text-align:left;">' +
    "<p><strong>Name:</strong> " + escapeHtml(name) + "</p>" +
    (eventName ? "<p><strong>Event name:</strong> " + escapeHtml(eventName) + "</p>" : "") +
    "<p><strong>Date:</strong> " + escapeHtml(date) + "</p>" +
    "<p style=\"margin-bottom:0;\"><strong>Time:</strong> " + escapeHtml(start) + " to " + escapeHtml(end) + "</p>" +
    "</div>" +
    '<p style="margin-top:20px;"><a href="' + SPREADSHEET_URL + '">View the Space Requests sheet</a></p>' +
    '<button type="button" onclick="window.close()" style="margin-top:12px;padding:10px 24px;background:#222;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;">Close this tab</button>' +
    "</div>"
  );
}

// Manual one-time helper. The Calendar permission the Web App needs
// (CalendarApp) isn't always prompted for just by deploying, since
// deploys don't run as an interactive user. Select
// "authorizeCalendarAccess" from the function dropdown and click Run once;
// approve the permission prompt that appears. That grants the calendar
// scope to this account going forward, so the already-deployed Web App
// (same script project, same "Execute as: Me" identity) can use it too,
// no redeploy needed.
function authorizeCalendarAccess() {
  const name = CalendarApp.getCalendarById(CALENDAR_ID).getName();
  console.log("Calendar access authorized. Calendar name: " + name);
}

// Asks GitHub Actions to rebuild and redeploy the site right now, via the
// same workflow_dispatch trigger as the "Run workflow" button in GitHub's
// UI. Needs a GitHub Personal Access Token stored as a Script Property
// named GITHUB_ACTIONS_TOKEN (Apps Script editor > Project Settings, gear
// icon in the left sidebar > Script Properties). See the README's
// "Auto-rebuild on approval" setup steps for how to generate one. If the
// property isn't set, this just logs a note and does nothing — a missing
// token should never fail the approval itself.
function triggerSiteRebuild() {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_ACTIONS_TOKEN");
  if (!token) {
    console.log("GITHUB_ACTIONS_TOKEN script property not set; skipping site rebuild trigger.");
    return;
  }

  const url =
    "https://api.github.com/repos/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME +
    "/actions/workflows/" + GITHUB_WORKFLOW_FILE + "/dispatches";

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
      payload: JSON.stringify({ ref: "main" }),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      console.error("Failed to trigger site rebuild: " + status + " " + response.getContentText());
    } else {
      console.log("Site rebuild triggered.");
    }
  } catch (error) {
    console.error(
      "Failed to trigger site rebuild: " + (error && error.message ? error.message : error)
    );
  }
}

// Lets the "Gevalt" page (public/staff-approve/gevalt/index.html) ask for a
// rebuild after someone edits the Google Calendar by hand. Approving a
// request calls triggerSiteRebuild() automatically, but a hand-edited
// calendar event doesn't, so without this the site's baked-in calendar data
// waits for the next scheduled build (up to ~12 hours).
//
// On protecting this endpoint: it is reachable by anyone who finds the URL.
// REBUILD_TOKEN is embedded in that page's HTML, so it is NOT a secret and
// won't stop anyone determined; it only filters out stray or accidental
// POSTs. The cooldown below is the control that actually bounds abuse, since
// it caps this at one dispatch per REBUILD_COOLDOWN_SECONDS no matter who
// calls it or how often. Worst case is a redundant rebuild that republishes
// identical content; no data is exposed or changed by this endpoint.
function handleManualRebuild(params) {
  if (String(params.token || "") !== REBUILD_TOKEN) {
    return jsonResponse({ ok: false, error: "not_authorized" });
  }

  const cache = CacheService.getScriptCache();
  if (cache.get(REBUILD_COOLDOWN_KEY)) {
    // A build is almost certainly still running from the last press. Report
    // ok so the page stays reassuring; the pending build covers this request.
    return jsonResponse({ ok: true, status: "already_running" });
  }
  cache.put(REBUILD_COOLDOWN_KEY, "1", REBUILD_COOLDOWN_SECONDS);

  triggerSiteRebuild();
  return jsonResponse({ ok: true, status: "triggered" });
}

// Manual test helper, mirrors authorizeCalendarAccess above. Select
// "testSiteRebuildTrigger" from the function dropdown and Run once after
// setting the GITHUB_ACTIONS_TOKEN script property — approve the
// permission prompt that appears (Apps Script needs to ask for
// "Connect to an external service" the first time UrlFetchApp is used).
// Check the Actions tab on GitHub afterward to confirm a new run started.
function testSiteRebuildTrigger() {
  triggerSiteRebuild();
  console.log("testSiteRebuildTrigger finished. Check the GitHub Actions tab for a new run.");
}

// --- Double-booking detection ---
//
// Nothing else in this system checks whether a requested slot is already
// taken, so without this a staff member can approve two overlapping
// requests and only find out when two groups arrive at the same door.
//
// This never blocks an approval. Two bookings on one day are often
// legitimate (indoor space plus the parking lot, say), so a hard block
// would eventually stop a booking someone actually wanted. It warns and
// lets a human decide.
//
// Returns { overlaps: [...], sameDay: [...] } of short display strings.
// "overlaps" are events that actually collide with the requested window
// and are the real danger; "sameDay" is everything else that day, which
// is context worth seeing (a setup window butting up against another
// event, for instance).
function findCalendarConflicts(start, end) {
  const empty = { overlaps: [], sameDay: [] };
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
    return empty;
  }

  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return empty;

    // Read from the first day of the window to the day after the last. It
    // used to read only the start day, which was fine while every request
    // was a single daytime booking, but silently missed everything on days
    // two onward of a multi-day request, and missed the far side of a
    // window that setup or cleanup padding pushed across midnight.
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
    const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, 0);
    const events = calendar.getEvents(dayStart, dayEnd);

    // Over a single day "10:00 AM to 12:00 PM" is unambiguous. Over several,
    // it is not, so the day gets named too.
    const multiDay = dayEnd.getTime() - dayStart.getTime() > 36 * 3600000;

    const overlaps = [];
    const sameDay = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evStart = ev.getStartTime();
      const evEnd = ev.getEndTime();
      const label =
        (multiDay ? Utilities.formatDate(evStart, "America/Los_Angeles", "MMM d") + ", " : "") +
        Utilities.formatDate(evStart, "America/Los_Angeles", "h:mm a") +
        " to " +
        Utilities.formatDate(evEnd, "America/Los_Angeles", "h:mm a") +
        " · " +
        (ev.getTitle() || "Untitled");

      // Touching end-to-start is adjacent, not a collision, so the
      // comparisons are strict on both sides.
      if (evEnd > start && evStart < end) {
        overlaps.push(label);
      } else {
        sameDay.push(label);
      }
    }
    return { overlaps: overlaps, sameDay: sameDay };
  } catch (error) {
    // A calendar read failing must never stop a request being recorded or
    // a decision being made. No warning is worse than a broken form.
    console.error("Conflict check failed: " + (error && error.message ? error.message : error));
    return empty;
  }
}

// The calendar only knows about APPROVED bookings. Two people can request
// the same Saturday evening, and until one is approved neither has a
// calendar event, so findCalendarConflicts reports the day as clear for
// both. Staff would approve the first, then get warned on the second only
// after the fact, when a warning beforehand costs nothing.
//
// This scans the sheet for other Pending rows that overlap the same window
// and returns them as display strings. Excludes the request being reviewed,
// by Request ID, so it never flags itself.
function findPendingConflicts(start, end, excludeRequestId) {
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
    return [];
  }
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPACE_REQUEST_SHEET_NAME);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    // Clamped to the sheet's real width. Reading past the last column
    // throws, so a sheet that has not yet grown the newest column must not
    // take this down with it. Missing cells come back undefined, which
    // every reader below already treats as blank.
    const values = sheet
      .getRange(2, 1, lastRow - 1, Math.min(SPACE_REQUEST_HEADERS.length, sheet.getLastColumn()))
      .getValues();
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (String(row[spaceRequestColIndex("Status")] || "").trim() !== "Pending") continue;
      if (excludeRequestId && String(row[spaceRequestColIndex("Request ID")]) === String(excludeRequestId)) continue;

      // The other request gets padded by its own setup and cleanup too. Two
      // requests can have hours that never touch and still collide, because
      // one is striking its set while the other is building theirs.
      const other = requestWindow(
        row[spaceRequestColIndex("Preferred Date")],
        row[spaceRequestColIndex("End Date")],
        row[spaceRequestColIndex("Start Time")],
        row[spaceRequestColIndex("End Time")],
        row[spaceRequestColIndex("Setup Time Needed")],
        row[spaceRequestColIndex("Cleanup Time Needed")]
      );
      const rStart = other.start;
      const rEnd = other.end;
      if (!(rStart instanceof Date) || !(rEnd instanceof Date) || isNaN(rStart) || isNaN(rEnd)) continue;
      if (rEnd > start && rStart < end) {
        const spansDays = rStart.getDate() !== rEnd.getDate() ||
          rStart.getMonth() !== rEnd.getMonth() ||
          rStart.getFullYear() !== rEnd.getFullYear();
        out.push(
          formatTimeCell(rStart) +
          " to " + (spansDays ? formatDateCell(rEnd) + " " : "") + formatTimeCell(rEnd) +
          " · " + (row[spaceRequestColIndex("Name")] || "another request") + " (not yet decided)" +
          (other.padded ? " (includes setup and cleanup)" : "")
        );
      }
    }
    return out;
  } catch (error) {
    console.error("Pending conflict check failed: " + (error && error.message ? error.message : error));
    return [];
  }
}

// Keeps the Approve/Decline URL from growing without bound when a day is
// busy. Four is plenty to make the point that the day is contested.
function summarizeConflictList(list, max) {
  const capped = list.slice(0, max);
  if (list.length > max) {
    capped.push("and " + (list.length - max) + " more");
  }
  return capped.join(" | ");
}

// The calendar event's title respects what the requester chose for "How
// should this booking appear on the public calendar?" (Calendar
// Visibility). Only when they explicitly opted into "Show the event name"
// do we also add a description — they've already agreed their event name
// is public, so it's reasonable to show a few more event-related fields
// alongside it. The requester's name, email, and phone are never included
// regardless of that choice; those stay in the staff notification email
// and the Google Sheet only. Every other visibility choice keeps the
// event to just a title, same as before. The event itself always stays on
// the calendar's normal (public) visibility either way — no special
// sharing or credentials needed for the site's /calendar page to read it.
function createCalendarEventForRequest(rowValues) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const win = requestWindow(
    get("Preferred Date"), get("End Date"), get("Start Time"), get("End Time"),
    get("Setup Time Needed"), get("Cleanup Time Needed")
  );
  const visibility = get("Calendar Visibility");
  const title = calendarEventTitle(visibility, get("Event Name"), get("Type of Use"));

  // The event is booked over the PADDED window, not the event's own hours.
  // This is the part that makes setup and cleanup mean anything. If the
  // calendar only held 10am to 4pm, then the next request for 9am to 10am
  // would check the calendar, see nothing, and report the slot clear, while
  // in reality one group would be building their set as another arrived.
  // The space is unavailable for the whole padded window, so that is what
  // the calendar has to say.
  //
  // The cost is that the public calendar would otherwise show the wrong
  // hours to attendees, which the "Event runs" line in the description
  // exists to correct. See GoogleCalendar.tsx, which prefers it.
  // Returned so the caller can record which event this row created.
  if (visibility === "Show the event name") {
    return calendar.createEvent(title, win.start, win.end, {
      description: buildCalendarEventDescription(rowValues),
    });
  }
  return calendar.createEvent(title, win.start, win.end);
}

// Deleting a booking needs the event, and the event may already be gone
// (someone removed it by hand), which is not an error worth stopping for.
function deleteCalendarEventById(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return "no_id";
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return "no_calendar";
    const event = calendar.getEventById(id);
    if (!event) return "already_gone";
    event.deleteEvent();
    return "deleted";
  } catch (error) {
    console.error("Could not delete calendar event " + id + ": " + (error && error.message ? error.message : error));
    return "error";
  }
}

// Used by the daily digest to notice an approved booking whose calendar
// event has disappeared. Rows written before event IDs were stored have
// nothing to check, and are reported as unknown rather than missing.
function calendarEventStillExists(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return "unknown";
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) return "unknown";
    return calendar.getEventById(id) ? "present" : "missing";
  } catch (error) {
    return "unknown";
  }
}

// Only used when the requester chose "Show the event name" (see above).
// Keep these label strings in sync with parseEventDetails in
// src/lib/calendar.ts if you change them here.
function buildCalendarEventDescription(rowValues) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };

  // The event itself is booked over the padded window (see
  // createCalendarEventForRequest), so without this the public calendar
  // would tell attendees the doors open an hour before they do. This line
  // is the real, public-facing time, and GoogleCalendar.tsx shows it in
  // preference to the event's own start and end.
  const win = requestWindow(
    get("Preferred Date"), get("End Date"), get("Start Time"), get("End Time"),
    get("Setup Time Needed"), get("Cleanup Time Needed")
  );
  const eventStart = combineDateAndTime(get("Preferred Date"), get("Start Time"));
  const eventEnd = combineDateAndTime(
    requestEndDateValue(get("End Date"), get("Preferred Date")), get("End Time")
  );
  const sameDay =
    eventStart instanceof Date && eventEnd instanceof Date && !isNaN(eventStart) && !isNaN(eventEnd) &&
    eventStart.toDateString() === eventEnd.toDateString();
  const runsLine =
    formatDateCell(eventStart) + ", " + formatTimeCell(eventStart) + " to " +
    (sameDay ? "" : formatDateCell(eventEnd) + ", ") + formatTimeCell(eventEnd);

  const lines = [
    // For a human reading the entry in Google Calendar, where the event's
    // own times are the padded ones and would otherwise be the only times
    // on show. The public website does not display this line.
    "Event runs: " + runsLine,
    // For the website. It has the padded start and end already (they are
    // the calendar event's own times) and subtracts these to get back to
    // the public hours, so it never has to parse a formatted date. Staff
    // seeing the booking blocked wider than the event is the point; the
    // public seeing it just causes people to turn up an hour early.
    "Setup minutes: " + win.setupMinutes,
    "Cleanup minutes: " + win.cleanupMinutes,
  ];

  lines.push("");
  lines.push.apply(lines, [
    "Organization or group: " + (get("Organization") || "Not given"),
    "",
    "Type of use: " + get("Type of Use"),
    "Public or private: " + get("Public or Private"),
    "",
    "Event description: " + (get("Event Description") || "None given"),
    "",
    "Food or catering needs: " + (get("Food or Catering Needs") || "None given"),
    "Pet approval request: " + (get("Pet Approval Request") || "Not answered"),
    "Accessibility, privacy, or parking needs: " + (get("Accessibility, Privacy, or Parking Needs") || "None given"),
  ]);

  return lines.join("\n");
}

// Matches the exact options on the "How should this booking appear on the
// public calendar?" question in RequestForm.tsx (calendarVisibility):
// "Show the event name" / "Show as Booked event" / "Show as Unavailable" /
// "Not sure yet". Unrecognized or blank values (including "Not sure yet")
// fall back to the neutral "Booked" — a requester only gets their event
// name shown publicly if they explicitly opted into it.
function calendarEventTitle(visibility, eventName, useType) {
  if (visibility === "Show the event name") {
    return eventName || useType || "3RD SPACE event";
  }
  if (visibility === "Show as Unavailable") {
    return "Unavailable";
  }
  return "Booked";
}

// Combines a preferred-date value and a time value into a single Date in
// the Apps Script project's time zone. Make sure Project Settings > Time
// zone is set to America/Los_Angeles so this lines up with the site's
// calendar embed (ctz param in GOOGLE_CALENDAR_EMBED_URL).
//
// The sheet cells for "Preferred Date" / "Start Time" / "End Time" were
// written as plain "YYYY-MM-DD" / "HH:MM" strings, but Sheets
// auto-detects strings that look like dates or times and silently
// converts the cell to a real Date value (same as typing them in by
// hand). So values read back with getValues() can arrive as either a
// string or a Date object, depending on whether Sheets did that
// conversion. Both are handled here.
function combineDateAndTime(dateValue, timeValue) {
  const dateParts = extractDateParts(dateValue);
  const timeParts = extractTimeParts(timeValue);
  return new Date(dateParts.year, dateParts.month, dateParts.day, timeParts.hour, timeParts.minute);
}

function extractDateParts(value) {
  if (value instanceof Date) {
    return { year: value.getFullYear(), month: value.getMonth(), day: value.getDate() };
  }
  const parts = String(value || "").split("-");
  return {
    year: Number(parts[0]),
    month: Number(parts[1]) - 1,
    day: Number(parts[2]),
  };
}

function extractTimeParts(value) {
  if (value instanceof Date) {
    return { hour: value.getHours(), minute: value.getMinutes() };
  }
  const parts = String(value || "").split(":");
  return {
    hour: Number(parts[0]) || 0,
    minute: Number(parts[1]) || 0,
  };
}

// Sheet cells for "Preferred Date" / "Start Time" / "End Time" may come
// back as a Date object (see combineDateAndTime above) instead of the
// original string, so anywhere these are shown to a person (emails, the
// review page) needs to format a Date back into readable text rather
// than showing its raw toString().
function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "America/Los_Angeles", "MMM d, yyyy");
  }
  return String(value || "");
}

function formatTimeCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "America/Los_Angeles", "h:mm a");
  }
  return String(value || "");
}

function sendDecisionEmail(rowValues, action, note) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };
  const email = get("Email");
  const name = get("Name");
  const isApprove = action === "approve";

  const isCancel = action === "cancel";
  const subject = isCancel
    ? "Your 3RD SPACE booking has been cancelled"
    : isApprove
      ? "Your 3RD SPACE space request is approved"
      : "Update on your 3RD SPACE space request";

  const lines = [];
  lines.push("Hi " + (name || "there") + ",");
  lines.push("");

  if (isCancel) {
    lines.push(
      "Your booking at 3RD SPACE for " + formatDateCell(get("Preferred Date")) +
      " has been cancelled and the space has been released."
    );
    lines.push("");
    lines.push("If this is a surprise, please reply to this email and we will sort it out.");
  } else if (isApprove) {
    lines.push("Good news. Your request to use 3RD SPACE has been approved.");
    lines.push("");
    if (get("Event Name")) {
      lines.push("Event name: " + get("Event Name"));
    }
    const endDate = formatDateCell(requestEndDateValue(get("End Date"), get("Preferred Date")));
    const startDate = formatDateCell(get("Preferred Date"));
    if (endDate && endDate !== startDate) {
      lines.push("Dates: " + startDate + " through " + endDate);
    } else {
      lines.push("Date: " + startDate);
    }
    lines.push("Time: " + formatTimeCell(get("Start Time")) + " to " + formatTimeCell(get("End Time")));
    lines.push("Type of use: " + get("Type of Use"));
    // They asked for setup or cleanup time, so tell them it was actually
    // held. Otherwise the only place that promise exists is a sheet cell
    // nobody outside the building can see.
    const heldWin = requestWindow(
      get("Preferred Date"), get("End Date"), get("Start Time"), get("End Time"),
      get("Setup Time Needed"), get("Cleanup Time Needed")
    );
    if (heldWin.padded) {
      lines.push(
        "The space is yours from " + formatTimeCell(heldWin.start) + " to " +
        formatTimeCell(heldWin.end) + ", which includes the setup and cleanup time you asked for."
      );
    }
    // Approving creates exactly one calendar event. Saying "approved" with
    // no qualifier to someone who asked for a weekly class would have them
    // believing every future date is held, which it is not.
    if (get("Recurrence Details")) {
      lines.push("");
      lines.push("You asked about repeating this:");
      lines.push("  " + get("Recurrence Details"));
      lines.push("");
      lines.push("The date above is confirmed. The rest of the series isn't booked");
      lines.push("yet, we'll be in touch to sort those dates out with you.");
    }
  } else {
    lines.push(
      "Thank you for your interest in 3RD SPACE. We are not able to approve your request for " +
        formatDateCell(get("Preferred Date")) +
        " at this time."
    );
  }

  if (note) {
    lines.push("");
    lines.push(note);
  }

  lines.push("");
  lines.push("If you have any questions, just reply to this email.");
  lines.push("");
  lines.push("3RD SPACE");

  try {
    MailApp.sendEmail({
      to: email,
      replyTo: NOTIFY_EMAILS[0],
      subject: subject,
      body: lines.join("\n"),
    });
  } catch (error) {
    console.error(
      "Failed to send decision email to requester: " +
        (error && error.message ? error.message : error)
    );
  }
}

// The confirmation page shown right after clicking Confirm Approve/Decline
// sometimes fails to render (a known issue with how some browsers, Safari
// in particular, handle the iframe Apps Script Web Apps load their content
// into — outside what this script can control). This email is the
// reliable backup: whoever approved or declined gets a plain, ordinary
// email confirming it worked, regardless of whether that page displayed
// correctly. Sent after the sheet/calendar/requester-email steps have
// already completed successfully, so receiving it means the decision
// really did go through.
// Enough detail for the review page to show what is about to be cancelled,
// and no more: this URL ends up in an inbox, so it carries no phone number
// or email address.
function buildCancelUrl(rowValues) {
  const get = function (name) { return rowValues[spaceRequestColIndex(name)]; };
  const startDate = formatDateCell(get("Preferred Date"));
  const lastDate = formatDateCell(requestEndDateValue(get("End Date"), get("Preferred Date")));
  const q = [
    "action=cancel",
    "id=" + encodeURIComponent(get("Request ID")),
    "token=" + encodeURIComponent(get("Action Token")),
    "name=" + encodeURIComponent(truncateForUrl(get("Name"), 60)),
    "eventName=" + encodeURIComponent(truncateForUrl(get("Event Name"), 60)),
    "date=" + encodeURIComponent(startDate),
    "endDate=" + encodeURIComponent(lastDate && lastDate !== startDate ? lastDate : ""),
    "start=" + encodeURIComponent(formatTimeCell(get("Start Time"))),
    "end=" + encodeURIComponent(formatTimeCell(get("End Time"))),
  ].join("&");
  return SITE_URL + "/staff-approve/?" + q;
}

function sendStaffDecisionConfirmation(action, rowValues, liveConflicts, cancelOutcome) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };
  const isApprove = action === "approve";
  const isCancel = action === "cancel";
  const hadOverlap = !!(liveConflicts && liveConflicts.overlaps && liveConflicts.overlaps.length);

  const lines = [];
  // If this was approved into an already-occupied slot, that goes at the
  // very top. It is the one thing in this email that might need action,
  // and it survives even if the browser page was never seen.
  if (hadOverlap) {
    lines.push("*** HEADS UP: DOUBLE BOOKING ***");
    lines.push("This was approved onto a time that already had something on it:");
    liveConflicts.overlaps.forEach(function (c) { lines.push("  - " + c); });
    lines.push("");
    lines.push("If that wasn't intended, open Google Calendar and move or delete");
    lines.push("one of them, then email whoever is affected.");
    lines.push("");
    lines.push("----------------------------------------");
    lines.push("");
  }
  lines.push(
    (isCancel ? "This booking has been cancelled."
      : isApprove ? "This request has been approved."
      : "This request has been declined.") +
    " This is just a confirmation email, no action needed."
  );
  lines.push("");
  lines.push("Name: " + get("Name"));
  if (get("Event Name")) {
    lines.push("Event name: " + get("Event Name"));
  }
  lines.push("Date: " + formatDateCell(get("Preferred Date")));
  lines.push("Time: " + formatTimeCell(get("Start Time")) + " to " + formatTimeCell(get("End Time")));
  lines.push("");
  if (isCancel) {
    lines.push(
      cancelOutcome === "already_gone"
        ? "The requester has been emailed. The calendar event had already been removed by hand, so there was nothing left to delete."
        : cancelOutcome === "deleted"
          ? "The requester has been emailed and the event was removed from the calendar."
          : "The requester has been emailed, but the calendar event could NOT be removed automatically. Please open Google Calendar and delete it by hand."
    );
  } else if (isApprove) {
    lines.push("The requester has been emailed and the event was added to the calendar.");
  } else {
    lines.push("The requester has been emailed.");
  }

  // Every approval carries its own undo. Cancelling used to mean deleting
  // the calendar event by hand AND editing the sheet by hand, and doing only
  // one of those leaves the two disagreeing with nothing to notice it: a
  // deleted event with an Approved row, or a freed row whose event goes on
  // blocking the slot and warning about a booking that is not happening.
  if (isApprove) {
    lines.push("");
    lines.push("If this booking is cancelled later, use this link and everything is undone");
    lines.push("in one go: the event comes off the calendar, the sheet is updated, and the");
    lines.push("requester is told.");
    lines.push("");
    lines.push("Cancel this booking: " + buildCancelUrl(rowValues));
  }

  lines.push("");
  lines.push("If the confirmation page in your browser looked broken or blank just now, that is fine to ignore. This email means it worked.");
  lines.push("");
  lines.push("View the Space Requests sheet: " + SPREADSHEET_URL);

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      subject:
        (hadOverlap ? "[DOUBLE BOOKED] " : "") +
        (isCancel ? "Confirmed: cancelled: " : isApprove ? "Confirmed: approved: " : "Confirmed: declined: ") +
        get("Name"),
      body: lines.join("\n"),
    });
  } catch (error) {
    console.error(
      "Failed to send staff decision confirmation email: " +
        (error && error.message ? error.message : error)
    );
  }
}

// --- Pending request digest ---
//
// Every email this script sends is wrapped in try/catch that logs and
// carries on, because a failed email must never lose a saved request. The
// cost of that choice is silence: if the notification email never arrives,
// the row sits in the sheet and nobody is told.
//
// This is the backstop. Run it on a daily time-based trigger (Apps Script
// editor > Triggers > Add Trigger > sendPendingDigest > Time-driven > Day
// timer). It emails a summary of everything still Pending, so a request
// can be overlooked for a day but not indefinitely. Sends nothing at all
// when the queue is empty, so it stays quiet on ordinary days.
function sendPendingDigest() {
  try {
    checkScriptTimeZone();

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPACE_REQUEST_SHEET_NAME);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // Clamped to the sheet's real width. Reading past the last column
    // throws, so a sheet that has not yet grown the newest column must not
    // take this down with it. Missing cells come back undefined, which
    // every reader below already treats as blank.
    const values = sheet
      .getRange(2, 1, lastRow - 1, Math.min(SPACE_REQUEST_HEADERS.length, sheet.getLastColumn()))
      .getValues();
    const statusIdx = spaceRequestColIndex("Status");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const waiting = [];   // still answerable
    const missed = [];    // the date has been and gone and nobody ever replied
    const orphaned = [];  // approved, but the calendar event is not there

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const status = String(row[statusIdx] || "").trim();
      const read = function (name) { return row[spaceRequestColIndex(name)]; };

      if (status === "Pending") {
        const submitted = read("Timestamp");
        const item = {
          name: read("Name"),
          date: formatDateCell(read("Preferred Date")),
          start: formatTimeCell(read("Start Time")),
          end: formatTimeCell(read("End Time")),
          age: submitted instanceof Date ? Math.floor((now - submitted) / 86400000) : "",
        };
        // A request whose date has passed is not "waiting", it is a person
        // who asked and never heard back. Counting it in the same number as
        // a request that came in yesterday hides that completely.
        const when = combineDateAndTime(
          requestEndDateValue(read("End Date"), read("Preferred Date")), read("End Time")
        );
        if (when instanceof Date && !isNaN(when) && when < todayStart) missed.push(item);
        else waiting.push(item);
        continue;
      }

      if (status === "Approved") {
        // Only future bookings are worth reconciling: a past event may have
        // been tidied off the calendar quite legitimately.
        const when = combineDateAndTime(
          requestEndDateValue(read("End Date"), read("Preferred Date")), read("End Time")
        );
        if (!(when instanceof Date) || isNaN(when) || when < now) continue;
        if (calendarEventStillExists(read("Calendar Event ID")) === "missing") {
          orphaned.push({
            name: read("Name"),
            date: formatDateCell(read("Preferred Date")),
            start: formatTimeCell(read("Start Time")),
            end: formatTimeCell(read("End Time")),
          });
        }
      }
    }

    if (!waiting.length && !missed.length && !orphaned.length) return;

    const describe = function (p) {
      return "- " + (p.name || "(no name)") + " · " + p.date + " " + p.start + " to " + p.end +
        (p.age === undefined || p.age === "" ? "" : "  (waiting " + p.age + " day" + (p.age === 1 ? "" : "s") + ")");
    };

    const lines = [];

    if (missed.length) {
      lines.push("*** THE DATE HAS PASSED ON " + missed.length + " REQUEST" + (missed.length === 1 ? "" : "S") + " ***");
      lines.push("Nobody ever replied to these, and the day they asked for has gone.");
      lines.push("Worth an apology, and worth marking them Declined so they stop appearing here.");
      lines.push("");
      missed.forEach(function (p) { lines.push(describe(p)); });
      lines.push("");
      lines.push("----------------------------------------");
      lines.push("");
    }

    if (orphaned.length) {
      lines.push("*** " + orphaned.length + " APPROVED BOOKING" + (orphaned.length === 1 ? " HAS" : "S HAVE") + " NO CALENDAR EVENT ***");
      lines.push("These are marked Approved in the sheet, and the requester was told so,");
      lines.push("but the event is not on the calendar. Either it was deleted by hand, or");
      lines.push("the booking was cancelled without using the cancel link.");
      lines.push("Nothing is protecting these slots from being double booked.");
      lines.push("");
      orphaned.forEach(function (p) { lines.push(describe(p)); });
      lines.push("");
      lines.push("----------------------------------------");
      lines.push("");
    }

    if (waiting.length) {
      lines.push(
        waiting.length === 1
          ? "There is 1 space request still waiting for a decision."
          : "There are " + waiting.length + " space requests still waiting for a decision."
      );
      lines.push("");
      waiting.forEach(function (p) { lines.push(describe(p)); });
      lines.push("");
      lines.push("The Approve / Decline buttons are in the original request email.");
      lines.push("If you can't find it, the full list is in the sheet:");
    } else {
      lines.push("Nothing else is waiting for a decision.");
      lines.push("");
      lines.push("The sheet:");
    }
    lines.push(SPREADSHEET_URL);

    // The subject leads with whatever most needs attention, because it is
    // the only part read at a glance.
    const subject =
      missed.length ? "3RD SPACE: " + missed.length + " request" + (missed.length === 1 ? "" : "s") + " missed their date"
      : orphaned.length ? "3RD SPACE: " + orphaned.length + " approved booking" + (orphaned.length === 1 ? " is" : "s are") + " missing from the calendar"
      : "3RD SPACE: " + waiting.length + " request" + (waiting.length === 1 ? "" : "s") + " waiting for a decision";

    MailApp.sendEmail({ to: NOTIFY_EMAILS.join(","), subject: subject, body: lines.join("\n") });
  } catch (error) {
    console.error("Failed to send pending digest: " + (error && error.message ? error.message : error));
  }
}


function simplePage(title, message) {
  return (
    '<div style="max-width:480px;margin:64px auto;padding:32px;font-family:sans-serif;border:1px solid #ddd;border-radius:12px;text-align:center;">' +
    "<h2 style=\"margin-top:0;\">" + escapeHtml(title) + "</h2>" +
    '<p style="color:#555;">' + escapeHtml(message) + "</p>" +
    "</div>"
  );
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

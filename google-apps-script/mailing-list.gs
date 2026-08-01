// 3RD SPACE forms Apps Script
// Last updated: August 1, 2026, 7:58 PM UTC
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
];

const APPROVED_ROW_COLOR = "#d9ead3";
const DECLINED_ROW_COLOR = "#f4cccc";

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

  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");

    const formType = String(payload.formType || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();

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

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (formType === "space_request") {
      handleSpaceRequest(spreadsheet, payload, email);
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

    sendNotificationEmail(payload, formType, email, status);

    return jsonResponse({
      ok: true,
      status: status,
    });
  } catch (error) {
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

function ensureHeaders(sheet, headers) {
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every(function (header, index) {
    return currentHeaders[index] === header;
  });
  if (!hasHeaders) {
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function handleSpaceRequest(spreadsheet, payload, email) {
  const sheet = getOrCreateSheet(spreadsheet, SPACE_REQUEST_SHEET_NAME);
  ensureHeaders(sheet, SPACE_REQUEST_HEADERS);

  const requestId = Utilities.getUuid();
  const actionToken = Utilities.getUuid();
  const row = buildSpaceRequestRow(payload, email, new Date(), requestId, actionToken);
  sheet.appendRow(row);

  sendSpaceRequestNotification(payload, email, requestId, actionToken);
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
  ];
}

// Everything from the submission, encoded into the Approve/Decline link's
// query string so the staff-approve page (src/routes/staff-approve.tsx)
// can show it all as a last-look review before confirming, with no round
// trip back to this script. Keep these param names in sync with
// StaffApproveSearch in that file if you change them here.
function buildReviewQueryParams(payload, email) {
  const startDateObj = combineDateAndTime(payload.preferredDate, payload.startTime);
  const endDateObj = combineDateAndTime(payload.preferredDate, payload.endTime);

  const fields = [
    ["name", payload.name],
    ["email", email],
    ["phone", payload.phone],
    ["organization", payload.organization],
    ["eventName", payload.eventName],
    ["useType", payload.useType],
    ["publicPrivate", payload.publicPrivate],
    ["oneTimeRecurring", payload.oneTimeRecurring],
    ["lowCost", payload.lowCost],
    ["requestedArea", payload.requestedArea],
    ["calendarVisibility", payload.calendarVisibility],
    ["date", formatDateCell(startDateObj)],
    ["start", formatTimeCell(startDateObj)],
    ["end", formatTimeCell(endDateObj)],
    ["setupTime", payload.setupTime],
    ["cleanupTime", payload.cleanupTime],
    ["attendance", payload.expectedAttendance],
    ["description", payload.eventDescription],
    ["food", payload.foodNeeds],
    ["pets", payload.petApproval],
    ["furniture", payload.furniture],
    ["sound", payload.soundEquipment],
    ["accessibility", payload.accessibilityNeeds],
    ["guidelines", payload.agreedToGuidelines ? "Yes" : "No"],
  ];

  return fields
    .map(function (field) {
      return "&" + field[0] + "=" + encodeURIComponent(field[1] || "");
    })
    .join("");
}

function sendSpaceRequestNotification(payload, email, requestId, actionToken) {
  try {
    const reviewParams = buildReviewQueryParams(payload, email);
    const approveUrl =
      SITE_URL + "/staff-approve/?action=approve&id=" + encodeURIComponent(requestId) + "&token=" + encodeURIComponent(actionToken) + reviewParams;
    const declineUrl =
      SITE_URL + "/staff-approve/?action=decline&id=" + encodeURIComponent(requestId) + "&token=" + encodeURIComponent(actionToken) + reviewParams;
    const plainBody = buildSpaceRequestBody(payload, email);

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      replyTo: email,
      subject: "New Request Space submission: " + (payload.name || email),
      body: plainBody + "\n\nApprove: " + approveUrl + "\nDecline: " + declineUrl,
      htmlBody: buildSpaceRequestHtmlBody(plainBody, approveUrl, declineUrl),
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
    "Low-cost or sliding scale: " + (payload.lowCost || "Not answered"),
    "Requested area: " + (payload.requestedArea || "Not answered"),
    "Calendar visibility: " + (payload.calendarVisibility || "Not answered"),
    "",
    "Preferred date: " + (payload.preferredDate || "Not given"),
    "Start time: " + (payload.startTime || "Not given"),
    "End time: " + (payload.endTime || "Not given"),
    "Setup time needed: " + (payload.setupTime || "Not given"),
    "Cleanup time needed: " + (payload.cleanupTime || "Not given"),
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

function buildSpaceRequestHtmlBody(plainBody, approveUrl, declineUrl) {
  const htmlLines = escapeHtml(plainBody).split("\n").join("<br>");
  return (
    '<div style="font-family:sans-serif;font-size:14px;color:#222;line-height:1.5;">' +
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
  const date = formatDateCell(row[spaceRequestColIndex("Preferred Date")]);
  const start = formatTimeCell(row[spaceRequestColIndex("Start Time")]);
  const end = formatTimeCell(row[spaceRequestColIndex("End Time")]);
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

    if (currentStatus && currentStatus !== "Pending") {
      return HtmlService.createHtmlOutput(
        simplePage("Already " + currentStatus, "This request has already been " + String(currentStatus).toLowerCase() + ".")
      );
    }

    if (action === "approve") {
      createCalendarEventForRequest(found.values);
      found.sheet.getRange(found.rowNumber, statusCol).setValue("Approved");
      found.sheet.getRange(found.rowNumber, 1, 1, SPACE_REQUEST_HEADERS.length).setBackground(APPROVED_ROW_COLOR);
      sendDecisionEmail(found.values, "approve", note);
      sendStaffDecisionConfirmation("approve", found.values);
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
      sendStaffDecisionConfirmation("decline", found.values);
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
  const start = combineDateAndTime(get("Preferred Date"), get("Start Time"));
  const end = combineDateAndTime(get("Preferred Date"), get("End Time"));
  const visibility = get("Calendar Visibility");
  const title = calendarEventTitle(visibility, get("Event Name"), get("Type of Use"));

  if (visibility === "Show the event name") {
    calendar.createEvent(title, start, end, { description: buildCalendarEventDescription(rowValues) });
  } else {
    calendar.createEvent(title, start, end);
  }
}

// Only used when the requester chose "Show the event name" (see above).
// Keep these label strings in sync with parseEventDetails in
// src/lib/calendar.ts if you change them here.
function buildCalendarEventDescription(rowValues) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };

  const lines = [
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
  ];

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

  const subject = isApprove
    ? "Your 3RD SPACE space request is approved"
    : "Update on your 3RD SPACE space request";

  const lines = [];
  lines.push("Hi " + (name || "there") + ",");
  lines.push("");

  if (isApprove) {
    lines.push("Good news. Your request to use 3RD SPACE has been approved.");
    lines.push("");
    if (get("Event Name")) {
      lines.push("Event name: " + get("Event Name"));
    }
    lines.push("Date: " + formatDateCell(get("Preferred Date")));
    lines.push("Time: " + formatTimeCell(get("Start Time")) + " to " + formatTimeCell(get("End Time")));
    lines.push("Type of use: " + get("Type of Use"));
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
function sendStaffDecisionConfirmation(action, rowValues) {
  const get = function (name) {
    return rowValues[spaceRequestColIndex(name)];
  };
  const isApprove = action === "approve";

  const lines = [];
  lines.push((isApprove ? "This request has been approved." : "This request has been declined.") + " This is just a confirmation email — no action needed.");
  lines.push("");
  lines.push("Name: " + get("Name"));
  if (get("Event Name")) {
    lines.push("Event name: " + get("Event Name"));
  }
  lines.push("Date: " + formatDateCell(get("Preferred Date")));
  lines.push("Time: " + formatTimeCell(get("Start Time")) + " to " + formatTimeCell(get("End Time")));
  lines.push("");
  if (isApprove) {
    lines.push("The requester has been emailed and the event was added to the calendar.");
  } else {
    lines.push("The requester has been emailed.");
  }
  lines.push("");
  lines.push("If the confirmation page in your browser looked broken or blank just now, that's fine to ignore — this email means it worked.");
  lines.push("");
  lines.push("View the Space Requests sheet: " + SPREADSHEET_URL);

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      subject: (isApprove ? "Confirmed: approved — " : "Confirmed: declined — ") + get("Name"),
      body: lines.join("\n"),
    });
  } catch (error) {
    console.error(
      "Failed to send staff decision confirmation email: " +
        (error && error.message ? error.message : error)
    );
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

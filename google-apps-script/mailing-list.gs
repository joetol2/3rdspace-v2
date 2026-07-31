// 3RD SPACE mailing list Apps Script
//
// This script powers both the motto section email signup and the full
// /join page on the website. It writes submissions into the "Contact List"
// tab of the Google Sheet below, using email address as the unique
// identifier so the same person updates one row instead of creating
// duplicates.
//
// Setup steps live in the README under "Mailing list setup (Google Apps
// Script)". Paste this whole file into script.google.com, deploy it as a
// Web App, and put the resulting URL into MAILING_LIST_SCRIPT_URL in
// src/config/site.ts.

const SPREADSHEET_ID = "1MSLQSOMPgigM0VYQYeuonjvxlyt0PdAsWQrCwQ4FpTc";
const SHEET_NAME = "Contact List";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit#gid=0";

// Tab that the Request Space Google Form writes its responses into, in the
// same spreadsheet as the Contact List. Notifications for that form are
// handled separately below, since the form posts straight to Google's own
// servers and never goes through doPost.
const REQUEST_FORM_SHEET_NAME = "Form Responses 1";

// Everyone on this list gets an email every time someone submits either
// form, whether it's a brand new contact or an update to an existing one.
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

function doPost(e) {
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
    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);

    ensureHeaders(sheet);

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

function ensureHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every(function (header, index) {
    return currentHeaders[index] === header;
  });
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
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

// --- Request Space form notifications ---
//
// The Request Space form (on /request) is a real Google Form, not our
// doPost endpoint, so we can't hook into its submit handler directly. This
// section instead uses an installable "on form submit" trigger on the
// spreadsheet, which fires whenever a new response row is added to the
// "Form Responses 1" tab, and emails NOTIFY_EMAILS with every answer.
//
// One-time setup: run createSpaceRequestTrigger once from this editor
// (see the README). After that it fires automatically; no redeploy needed,
// since installable triggers always run the latest saved code, unlike the
// Web App deployment doPost uses.

function onSpaceRequestSubmit(e) {
  if (!e || !e.range || e.range.getSheetName() !== REQUEST_FORM_SHEET_NAME) {
    return;
  }

  const namedValues = e.namedValues || {};
  const lines = ["A new Request Space form was submitted.", ""];

  Object.keys(namedValues).forEach(function (question) {
    const answer = (namedValues[question] || []).join(", ").trim();
    lines.push(question + ": " + (answer || "Not answered"));
  });

  lines.push("");
  lines.push("View all requests: " + SPREADSHEET_URL);

  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(","),
    subject: "New Request Space submission - 3RD SPACE",
    body: lines.join("\n"),
  });
}

// Run this once from the editor's Run button to register the trigger.
// Safe to re-run: it removes any existing onSpaceRequestSubmit trigger
// before creating a fresh one, so it never registers duplicates.
function createSpaceRequestTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "onSpaceRequestSubmit") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("onSpaceRequestSubmit")
    .forSpreadsheet(SPREADSHEET_ID)
    .onFormSubmit()
    .create();

  console.log("Trigger created. Check Triggers (clock icon) to confirm.");
}

// Manual debug helper, mirrors sendTestNotification above. Select
// "sendTestSpaceRequestNotification" from the function dropdown and Run to
// send a sample notification without waiting for a real form submission.
function sendTestSpaceRequestNotification() {
  onSpaceRequestSubmit({
    range: {
      getSheetName: function () {
        return REQUEST_FORM_SHEET_NAME;
      },
    },
    namedValues: {
      "Timestamp": ["7/31/2026 3:40:00"],
      "Name": ["Test Testerson"],
      "Email Address": ["test@example.com"],
    },
  });
  console.log("sendTestSpaceRequestNotification finished without throwing.");
}

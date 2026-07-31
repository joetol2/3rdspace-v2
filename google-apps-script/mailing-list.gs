// 3RD SPACE forms Apps Script
//
// This script powers the motto section email signup, the full /join page,
// and the Request Space form. It writes submissions into the "Contact
// List" or "Space Requests" tabs of the Google Sheet below. Contact List
// uses email address as the unique identifier so the same person updates
// one row instead of creating duplicates; Space Requests appends a new
// row for every submission, since each request is a distinct event.
//
// Setup steps live in the README under "Mailing list setup (Google Apps
// Script)". Paste this whole file into script.google.com, deploy it as a
// Web App, and put the resulting URL into MAILING_LIST_SCRIPT_URL in
// src/config/site.ts.

const SPREADSHEET_ID = "1MSLQSOMPgigM0VYQYeuonjvxlyt0PdAsWQrCwQ4FpTc";
const SHEET_NAME = "Contact List";
const SPACE_REQUEST_SHEET_NAME = "Space Requests";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit#gid=0";

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
// The Request Space form (on /request) now posts straight to this same
// doPost endpoint (formType "space_request"), just like the mailing list
// forms. Every submission is appended as a new row in the "Space Requests"
// tab, since each request is a distinct event rather than an update to an
// existing contact.

function handleSpaceRequest(spreadsheet, payload, email) {
  const sheet = getOrCreateSheet(spreadsheet, SPACE_REQUEST_SHEET_NAME);
  ensureHeaders(sheet, SPACE_REQUEST_HEADERS);
  sheet.appendRow(buildSpaceRequestRow(payload, email, new Date()));
  sendSpaceRequestNotification(payload, email);
}

function buildSpaceRequestRow(payload, email, now) {
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
  ];
}

function sendSpaceRequestNotification(payload, email) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(","),
      replyTo: email,
      subject: "New Request Space submission: " + (payload.name || email),
      body: buildSpaceRequestBody(payload, email),
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

// Manual debug helper, mirrors sendTestNotification above. Select
// "sendTestSpaceRequestNotification" from the function dropdown and Run to
// send a sample notification without writing a test row into the sheet.
function sendTestSpaceRequestNotification() {
  sendSpaceRequestNotification(
    {
      name: "Test Testerson",
      phone: "555-555-5555",
      organization: "Test Org",
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
    "test@example.com"
  );
  console.log("sendTestSpaceRequestNotification finished without throwing.");
}

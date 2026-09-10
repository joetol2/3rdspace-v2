// The Approve / Decline flow, switched off.
//
// The space manager does not use the buttons: she reads the request email,
// replies to the requester herself, and types the booking into Google
// Calendar. DECISION_FLOW_ENABLED turns the machinery off without deleting
// it, and these tests run the REAL script both ways, by flipping that one
// constant in the source before evaluating it.
//
// Testing both states is the whole point of using a flag rather than
// commenting the code out: commented-out code cannot be tested at all, so
// nothing would notice it rotting until somebody tried to switch it back on.
//
//   node tests/decision-flow.test.cjs
//
const fs = require("fs");
const path = require("path");

const SCRIPT = path.join(__dirname, "..", "google-apps-script", "mailing-list.gs");
const SRC = fs.readFileSync(SCRIPT, "utf8");

const OFF_LINE = "const DECISION_FLOW_ENABLED = false;";
const ON_LINE = "const DECISION_FLOW_ENABLED = true;";

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

// If this ever stops matching, every test below would silently run against
// whichever state the file happens to be in, and the "flow on" half would be
// testing the flow off. Fail loudly instead.
if (SRC.indexOf(OFF_LINE) === -1) {
  console.log("  FAIL could not find \"" + OFF_LINE + "\" in the script.");
  console.log("\n0 passed, 1 failed");
  process.exit(1);
}

const SPACE_HEADERS = [
  "Timestamp", "Name", "Email", "Phone", "Organization", "Type of Use",
  "Public or Private", "One-time or Recurring", "Low-cost or Sliding Scale",
  "Requested Area", "Calendar Visibility", "Preferred Date", "Start Time",
  "End Time", "Setup Time Needed", "Cleanup Time Needed", "Expected Attendance",
  "Event Description", "Food or Catering Needs", "Pet Approval Request",
  "Furniture", "Amplified Sound or Special Equipment",
  "Accessibility, Privacy, or Parking Needs", "Agreed to Guidelines", "Source",
  "User Agent", "Status", "Request ID", "Action Token", "Event Name",
  "Recurrence Details", "End Date", "Calendar Event ID",
];
const col = (name) => SPACE_HEADERS.indexOf(name);

function makeWorld(opts) {
  opts = opts || {};
  const world = {
    rows: (opts.rows || []).map((r) => r.slice()),
    appended: [],
    mail: [],
    logs: [],
    cellWrites: [],
    backgrounds: [],
    calendarEvents: opts.calendarEvents || [],
    createdEvents: [],
    fetches: [],
  };
  world.headerRow = SPACE_HEADERS.slice();

  const range = (r, c, nr, nc) => ({
    getValues: () => {
      if (r === 1) return [world.headerRow.slice(c - 1, c - 1 + nc)];
      return world.rows.slice(r - 2, r - 2 + nr).map((row) => {
        const out = row.slice(c - 1, c - 1 + nc);
        while (out.length < nc) out.push("");
        return out;
      });
    },
    setValues: () => {},
    setValue: (v) => {
      world.cellWrites.push({ row: r, col: c, value: v });
      const row = world.rows[r - 2];
      if (row) { while (row.length < c) row.push(""); row[c - 1] = v; }
    },
    setBackground: (v) => { world.backgrounds.push({ row: r, value: v }); },
    setFontWeight: () => ({ setBackground: () => {} }),
  });

  world.sheet = {
    getLastRow: () => world.rows.length + 1,
    getLastColumn: () => world.headerRow.length,
    getRange: range,
    appendRow: (r) => { world.appended.push(r); world.rows.push(r.slice()); },
    setFrozenRows: () => {},
  };

  world.scope = {
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => world.sheet,
        insertSheet: () => world.sheet,
      }),
      getUi: () => ({ alert: (m) => world.logs.push("ALERT " + m) }),
    },
    People: {},
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
    },
    MailApp: { sendEmail: (m) => world.mail.push(m) },
    Logger: { log: (m) => world.logs.push(String(m)) },
    Session: { getScriptTimeZone: () => "America/Los_Angeles" },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    // A GitHub token is present, so triggerSiteRebuild actually reaches the
    // fetch rather than logging "not set" and returning. Without one, a test
    // asserting "no rebuild fired" would pass for the wrong reason.
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k === "GITHUB_ACTIONS_TOKEN" ? "test-token" : null),
        setProperty: () => {},
      }),
    },
    Utilities: {
      getUuid: () => "uuid-" + (world.rows.length + 1),
      formatDate: (d) => (d instanceof Date ? d.toISOString().slice(0, 16) : String(d)),
      sleep: () => {},
    },
    UrlFetchApp: {
      fetch: (url) => {
        world.fetches.push(url);
        return { getResponseCode: () => 204, getContentText: () => "" };
      },
    },
    CalendarApp: {
      getCalendarById: () => ({
        getEvents: () => world.calendarEvents,
        createEvent: (title, start, end, o) => {
          const ev = { title: title, start: start, end: end, options: o, id: "ev-" + (world.createdEvents.length + 1) };
          world.createdEvents.push(ev);
          return { getId: () => ev.id };
        },
        getEventById: () => null,
      }),
    },
    HtmlService: { createHtmlOutput: (h) => String(h) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }) },
    console: { log: () => {}, error: () => {} },
  };
  return world;
}

// Evaluate the real script with the flag forced either way.
function run(world, enabled, fnBody) {
  const src = enabled ? SRC.replace(OFF_LINE, ON_LINE) : SRC;
  const names = Object.keys(world.scope);
  const fn = new Function(...names, src + "\n; return (" + fnBody + ");");
  return fn(...names.map((n) => world.scope[n]));
}

const PAYLOAD = {
  name: "Jane Requester", phone: "555-0100", organization: "Choir",
  eventName: "Rehearsal", useType: "Community gathering",
  publicPrivate: "Public event", oneTimeRecurring: "One-time request",
  lowCost: "No", requestedArea: "Indoor space",
  calendarVisibility: "Show the event name",
  preferredDate: "2026-11-14", startTime: "18:00", endTime: "20:00",
  setupTime: "30 minutes", cleanupTime: "30 minutes",
  expectedAttendance: "20", eventDescription: "Weekly rehearsal",
  agreedToGuidelines: true, source: "test",
};
const EMAIL = "jane@example.com";

const bodies = (m) => String(m.body || "") + "\n" + String(m.htmlBody || "");
const requestEmail = (world) =>
  world.mail.filter((m) => /New Request Space submission/.test(m.subject))[0];

// ==========================================================================
console.log("\n=== switched off: the request email loses its buttons ===");
{
  const w = makeWorld();
  run(w, false, "handleSpaceRequest")(
    w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
  );

  const mail = requestEmail(w);
  check("the request email is still sent", !!mail, JSON.stringify(w.mail.map((m) => m.subject)));
  check("  it still goes to the manager",
    mail && /laurabnewman/.test(mail.to), mail && mail.to);
  check("  replying to it reaches the requester",
    mail && mail.replyTo === EMAIL, mail && mail.replyTo);

  const text = bodies(mail);
  check("  NO approve or decline link anywhere in it",
    text.indexOf("/staff-approve/") === -1,
    (text.match(/\/staff-approve\/[^\s"']*/g) || []).join(" "));
  check("  no Approve button in the HTML",
    !/>Approve</.test(String(mail.htmlBody)));
  check("  no Decline button in the HTML",
    !/>Decline</.test(String(mail.htmlBody)));
  check("  and no empty href left behind where a button was",
    !/href=""/.test(String(mail.htmlBody)));

  check("  it says to reply to answer", /REPLY TO THIS EMAIL/.test(text));
  check("  it says the calendar is what makes it public",
    /Google Calendar/.test(text) && /calendar is what makes it public/.test(text));
  check("  it reminds about setup and cleanup time",
    /setup and cleanup/i.test(text));
  check("  the instructions are in the HTML version too, not just plain text",
    /REPLY TO THIS EMAIL/.test(String(mail.htmlBody)));
}

console.log("\n=== switched off: the requester still gets a receipt ===");
{
  const w = makeWorld();
  run(w, false, "handleSpaceRequest")(
    w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
  );
  const receipt = w.mail.filter((m) => m.to === EMAIL)[0];
  check("the receipt was sent", !!receipt, JSON.stringify(w.mail.map((m) => m.to)));
  check("  it still says this is not a booking yet",
    receipt && /not a booking yet/i.test(receipt.body));
  check("  and still promises a human reply",
    receipt && /email you back/i.test(receipt.body));
}

console.log("\n=== switched off: the row says Received, not Pending ===");
{
  const w = makeWorld();
  run(w, false, "handleSpaceRequest")(
    w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
  );
  const row = w.appended[0];
  check("a row was written", !!row);
  check("  Status is \"Received\"", row && row[col("Status")] === "Received",
    row && String(row[col("Status")]));
  check("  the row is exactly as wide as the header list",
    row && row.length === SPACE_HEADERS.length,
    row && row.length + " vs " + SPACE_HEADERS.length);

  // Without these, a row created during the switched-off period could never
  // be decided if the flow were ever switched back on.
  check("  a Request ID is still written", row && !!String(row[col("Request ID")]).trim());
  check("  an Action Token is still written", row && !!String(row[col("Action Token")]).trim());
  check("  Calendar Event ID is empty", row && String(row[col("Calendar Event ID")]) === "");
}

console.log("\n=== switched off: the conflict warning still works ===");
{
  // Something already on the calendar over the same evening.
  const clash = {
    getStartTime: () => new Date(2026, 10, 14, 18, 30),
    getEndTime: () => new Date(2026, 10, 14, 21, 0),
    getTitle: () => "Booked",
  };
  const w = makeWorld({ calendarEvents: [clash] });
  run(w, false, "handleSpaceRequest")(
    w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
  );
  const mail = requestEmail(w);
  check("the clash is flagged in the subject",
    mail && /^\[TIME CONFLICT\]/.test(mail.subject), mail && mail.subject);
  check("  and spelled out in the body",
    mail && /TIME CONFLICT/.test(mail.body) && /Booked/.test(mail.body));
  check("  the red banner is still in the HTML",
    mail && /Time conflict on this date/.test(String(mail.htmlBody)));
  check("  but still no buttons alongside it",
    mail && bodies(mail).indexOf("/staff-approve/") === -1);
}

console.log("\n=== switched off: a competing request is still noticed ===");
{
  // The sheet carries an older row for the same slot. Rows written before
  // the switch say "Pending"; rows written after say "Received". Both are
  // undecided as far as the sheet knows, and both must be found.
  const older = (status, name) => {
    const r = new Array(SPACE_HEADERS.length).fill("");
    r[col("Name")] = name;
    r[col("Preferred Date")] = "2026-11-14";
    r[col("Start Time")] = "18:00";
    r[col("End Time")] = "20:00";
    r[col("Status")] = status;
    r[col("Request ID")] = "other-" + name;
    return r;
  };

  for (const status of ["Pending", "Received"]) {
    const w = makeWorld({ rows: [older(status, "Someone Else")] });
    run(w, false, "handleSpaceRequest")(
      w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
    );
    const mail = requestEmail(w);
    check("a row marked \"" + status + "\" for the same slot is reported",
      mail && /Someone Else/.test(mail.body), mail && mail.subject);
    check("  and it does not claim to know whether it was decided",
      mail && /also asked for this slot/.test(mail.body) &&
        !/not yet decided/.test(mail.body));
  }
}

console.log("\n=== switched off: the decision endpoints do nothing ===");
{
  const existing = new Array(SPACE_HEADERS.length).fill("");
  existing[col("Name")] = "Jane Requester";
  existing[col("Email")] = EMAIL;
  existing[col("Preferred Date")] = "2026-11-14";
  existing[col("Start Time")] = "18:00";
  existing[col("End Time")] = "20:00";
  existing[col("Status")] = "Received";
  existing[col("Request ID")] = "req-1";
  existing[col("Action Token")] = "tok-1";

  // A link from an old email, with a genuinely valid id and token.
  const w = makeWorld({ rows: [existing] });
  const page = run(w, false, "doGet")({
    parameter: { action: "approve", id: "req-1", token: "tok-1" },
  });
  check("an old approve link explains itself", /Approvals are handled by email now/.test(page));
  check("  and says nothing was changed", /Nothing has been changed/.test(page));
  check("  no email went out", w.mail.length === 0, JSON.stringify(w.mail.map((m) => m.subject)));

  // The confirm button on the review page, POSTing back with a valid token.
  const w2 = makeWorld({ rows: [existing] });
  const result = run(w2, false, "handleDecisionSubmit")({
    decisionSubmit: "1", id: "req-1", token: "tok-1", action: "approve", note: "",
  });
  check("confirming a decision is refused politely",
    /Approvals are handled by email now/.test(result));
  check("  the Status cell was NOT touched", w2.cellWrites.length === 0,
    JSON.stringify(w2.cellWrites));
  check("  the row was NOT coloured", w2.backgrounds.length === 0);
  check("  no calendar event was created", w2.createdEvents.length === 0);
  check("  the requester was NOT emailed", w2.mail.length === 0,
    JSON.stringify(w2.mail.map((m) => m.to)));
  check("  and no site rebuild was fired", w2.fetches.length === 0);

  // Decline and cancel go through the same endpoint.
  for (const action of ["decline", "cancel"]) {
    const w3 = makeWorld({ rows: [existing] });
    const r = run(w3, false, "handleDecisionSubmit")({
      decisionSubmit: "1", id: "req-1", token: "tok-1", action: action, note: "",
    });
    check(action + " is refused the same way", /Approvals are handled by email now/.test(r));
    check("  changing nothing", w3.cellWrites.length === 0 && w3.mail.length === 0);
  }
}

console.log("\n=== switched off: the daily reminder stays quiet ===");
{
  // Status "Pending" on purpose, not "Received". Every row already in the
  // live sheet says Pending, and the digest only ever looked for that word.
  // Testing this with a "Received" row passes whether the guard is there or
  // not, because the digest would ignore it either way — which is exactly
  // how the first version of this test fooled itself.
  const pendingRow = (name) => {
    const r = new Array(SPACE_HEADERS.length).fill("");
    r[col("Name")] = name;
    r[col("Preferred Date")] = "2026-11-14";
    r[col("Start Time")] = "18:00";
    r[col("End Time")] = "20:00";
    r[col("Status")] = "Pending";
    r[col("Request ID")] = "req-" + name;
    r[col("Action Token")] = "tok-" + name;
    return r;
  };

  const w = makeWorld({ rows: [pendingRow("Long Forgotten")] });
  run(w, false, "sendPendingDigest")();
  check("nothing is emailed, even with a row the digest would have reported",
    w.mail.length === 0, JSON.stringify(w.mail.map((m) => m.subject)));

  // Proves the row above is one the digest genuinely wants to talk about, so
  // the silence overhead is the guard doing its job and not an empty inbox.
  const control = makeWorld({ rows: [pendingRow("Long Forgotten")] });
  run(control, true, "sendPendingDigest")();
  check("  and that same row DOES produce an email when the flow is on",
    control.mail.length === 1, JSON.stringify(control.mail.map((m) => m.subject)));

  // It has to remain a real, callable function: a daily trigger may still be
  // pointing at this name, and a missing function makes that trigger fail
  // every morning and email an error about it.
  check("  the function still exists and does not throw",
    typeof run(w, false, "sendPendingDigest") === "function");

  // Requests handled by hand during the switched-off period are finished
  // business. Switching the flow back on must not dredge up months of them
  // as a backlog that needs deciding.
  const afterReenable = makeWorld({ rows: [
    (function () { const r = pendingRow("Handled By Hand"); r[col("Status")] = "Received"; return r; })(),
  ] });
  run(afterReenable, true, "sendPendingDigest")();
  check("  a \"Received\" row is not resurrected when the flow returns",
    afterReenable.mail.length === 0,
    JSON.stringify(afterReenable.mail.map((m) => m.subject)));
}

// ==========================================================================
console.log("\n=== switched back on: everything returns ===");
{
  const w = makeWorld();
  run(w, true, "handleSpaceRequest")(
    w.scope.SpreadsheetApp.openById(), PAYLOAD, EMAIL, true
  );
  const mail = requestEmail(w);
  const text = bodies(mail);
  check("the Approve link is back", /\/staff-approve\/\?action=approve/.test(text));
  check("the Decline link is back", /\/staff-approve\/\?action=decline/.test(text));
  check("  the HTML buttons are back", /(>Approve<)/.test(String(mail.htmlBody)) &&
    /(>Decline<)/.test(String(mail.htmlBody)));
  check("  and the manual instructions are gone",
    !/REPLY TO THIS EMAIL/.test(text));

  const row = w.appended[0];
  check("rows go back to saying Pending", row && row[col("Status")] === "Pending",
    row && String(row[col("Status")]));
}

console.log("\n=== switched back on: decisions work again ===");
{
  const existing = new Array(SPACE_HEADERS.length).fill("");
  existing[col("Name")] = "Jane Requester";
  existing[col("Email")] = EMAIL;
  existing[col("Preferred Date")] = "2026-11-14";
  existing[col("Start Time")] = "18:00";
  existing[col("End Time")] = "20:00";
  existing[col("Calendar Visibility")] = "Show the event name";
  existing[col("Event Name")] = "Rehearsal";
  existing[col("Status")] = "Pending";
  existing[col("Request ID")] = "req-1";
  existing[col("Action Token")] = "tok-1";

  const w = makeWorld({ rows: [existing] });
  run(w, true, "handleDecisionSubmit")({
    decisionSubmit: "1", id: "req-1", token: "tok-1", action: "approve", note: "",
  });
  check("the calendar event is created again", w.createdEvents.length === 1,
    String(w.createdEvents.length));
  check("  the row is marked Approved",
    w.cellWrites.some((c) => c.value === "Approved"),
    JSON.stringify(w.cellWrites.map((c) => c.value)));
  check("  the requester is emailed",
    w.mail.some((m) => m.to === EMAIL), JSON.stringify(w.mail.map((m) => m.to)));
  check("  and the site rebuild fires", w.fetches.length === 1, String(w.fetches.length));

  const digest = makeWorld({ rows: [existing] });
  run(digest, true, "sendPendingDigest")();
  check("the daily reminder speaks again", digest.mail.length === 1,
    JSON.stringify(digest.mail.map((m) => m.subject)));
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

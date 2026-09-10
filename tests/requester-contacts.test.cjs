// Space requesters land on the Contact List tab.
//
// They were being captured on the Space Requests tab and nowhere else, so the
// one group of people who had definitely walked through the door was invisible
// to the mailing list.
//
// The Contact List is edited by hand as well as by the website, and it holds
// real people's addresses, so most of what is checked here is about NOT doing
// damage: not overwriting a correction somebody typed, and not putting anyone
// on a mailing list they did not ask to be on.
//
//   node tests/requester-contacts.test.cjs
//
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "google-apps-script", "mailing-list.gs"), "utf8");

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

const HEADERS = ["Timestamp", "Last Updated", "Email", "Name", "Phone", "Interest Areas",
  "Hosting Interest", "Event or Program Ideas", "Volunteer Interest",
  "Donation or Support Interest", "Notes", "Source", "Status", "User Agent"];
const col = (h) => HEADERS.indexOf(h);

// The real live tab: fourteen known columns, then eight stray labels left over
// from the old Google Form, then Subscribed at 23. Tested against this shape
// rather than a tidy 14 because the stray columns are what a previous change
// collided with.
const STRAY = [
  "One-time request or recurring request",
  "Low-cost or sliding scale request",
  "Food or catering needs",
  "Pet approval request",
  "Outside furniture, decorations, supplies, or equipment",
  "Amplified sound, music, tents, canopies, heaters, or special equipment",
  "Accessibility, privacy, parking, or setup needs",
  "Required agreement: I have read and agree to the 3RD SPACE Community Agreements and Space Use Guidelines.",
];

function makeWorld(opts) {
  opts = opts || {};
  const world = {
    contactRows: (opts.contactRows || []).map((r) => r.slice()),
    requestRows: [],
    mail: [],
    logs: [],
    cellWrites: [],
  };
  world.contactHeader = HEADERS.concat(STRAY).concat(opts.hasSubscribed === false ? [] : ["Subscribed"]);
  const requestHeader = ["Timestamp", "Name", "Email", "Phone", "Organization"];

  function makeSheet(headerRow, rows, isContacts) {
    return {
      getLastRow: () => rows.length + 1,
      getLastColumn: () => headerRow.length,
      getRange: (r, c, nr, nc) => ({
        getValues: () => {
          if (r === 1) {
            const out = headerRow.slice(c - 1, c - 1 + nc);
            while (out.length < nc) out.push("");
            return [out];
          }
          return rows.slice(r - 2, r - 2 + nr).map((row) => {
            const out = row.slice(c - 1, c - 1 + nc);
            while (out.length < nc) out.push("");
            return out;
          });
        },
        setValues: (v) => {
          if (r === 1) { for (let i = 0; i < v[0].length; i++) headerRow[c - 1 + i] = v[0][i]; return; }
          const row = rows[r - 2];
          for (let i = 0; i < v[0].length; i++) {
            while (row.length < c + i) row.push("");
            row[c - 1 + i] = v[0][i];
          }
        },
        setValue: (v) => {
          if (isContacts) world.cellWrites.push({ row: r, col: c, value: v });
          if (r === 1) {
            while (headerRow.length < c) headerRow.push("");
            headerRow[c - 1] = v;
            return;
          }
          const row = rows[r - 2];
          if (row) { while (row.length < c) row.push(""); row[c - 1] = v; }
        },
        setBackground: () => {},
        setFontWeight: () => ({ setBackground: () => {} }),
      }),
      appendRow: (r) => { rows.push(r.slice()); },
      setFrozenRows: () => {},
    };
  }

  const contacts = makeSheet(world.contactHeader, world.contactRows, true);
  const requests = makeSheet(requestHeader, world.requestRows, false);
  world.contacts = contacts;

  world.scope = {
    SpreadsheetApp: {
      openById: () => world.spreadsheet,
      getUi: () => ({ alert: () => {} }),
    },
    People: {},
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (m) => world.mail.push(m) },
    Logger: { log: (m) => world.logs.push(String(m)) },
    Session: { getScriptTimeZone: () => "America/Los_Angeles" },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    Utilities: { getUuid: () => "uuid", formatDate: (d) => String(d), sleep() {} },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 204, getContentText: () => "" }) },
    CalendarApp: { getCalendarById: () => ({ getEvents: () => [], getEventById: () => null }) },
    HtmlService: { createHtmlOutput: (h) => String(h) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }) },
    console: { log: (m) => world.logs.push(String(m)), error: (m) => world.logs.push("ERR " + m) },
  };
  world.spreadsheet = {
    getSheetByName: (n) => (n === "Contact List" ? contacts : requests),
    insertSheet: (n) => (n === "Contact List" ? contacts : requests),
  };
  return world;
}

function run(world, fnBody) {
  const names = Object.keys(world.scope);
  const fn = new Function(...names, SRC + "\n; return (" + fnBody + ");");
  return fn(...names.map((n) => world.scope[n]));
}

const PAYLOAD = {
  name: "Jane Requester",
  phone: "555-0100",
  organization: "Valley Choir",
  source: "3RD SPACE website",
  userAgent: "test-agent",
  preferredDate: "2026-11-14", startTime: "18:00", endTime: "20:00",
  agreedToGuidelines: true,
};
const EMAIL = "jane@example.com";

const subCol = (w) => w.contactHeader.indexOf("Subscribed");
const subValue = (w, rowIdx) => {
  const r = w.contactRows[rowIdx];
  const i = subCol(w);
  return i === -1 ? "(no column)" : String(r[i] === undefined ? "" : r[i]);
};

const contactRow = (email, over) => {
  const r = new Array(HEADERS.length + STRAY.length + 1).fill("");
  r[col("Email")] = email;
  for (const k in over || {}) r[col(k)] = over[k];
  return r;
};

// ==========================================================================
console.log("\n=== a new requester who ticked the box ===");
{
  const w = makeWorld();
  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);

  check("a Contact List row was created", w.contactRows.length === 1,
    String(w.contactRows.length));
  const r = w.contactRows[0];
  check("  email", r[col("Email")] === EMAIL, String(r[col("Email")]));
  check("  name", r[col("Name")] === "Jane Requester", String(r[col("Name")]));
  check("  phone", r[col("Phone")] === "555-0100", String(r[col("Phone")]));
  check("  Hosting Interest is Yes", r[col("Hosting Interest")] === "Yes",
    String(r[col("Hosting Interest")]));
  check("  organization went into Notes", r[col("Notes")] === "Valley Choir",
    String(r[col("Notes")]));
  check("  Status records where they came from", r[col("Status")] === "space_request",
    String(r[col("Status")]));
  check("  Timestamp is set", r[col("Timestamp")] instanceof Date);
  check("  Last Updated is set", r[col("Last Updated")] instanceof Date);
  check("  Subscribed is Yes", subValue(w, 0) === "Yes", subValue(w, 0));

  check("  and the space request itself was still written",
    w.requestRows.length === 1, String(w.requestRows.length));
}

console.log("\n=== a new requester who did NOT tick the box ===");
{
  const w = makeWorld();
  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: false }), EMAIL, false);

  check("they are still recorded as a contact", w.contactRows.length === 1);
  // The important one. isSubscribedValue treats blank as SUBSCRIBED, so
  // leaving the cell alone would put them on the mailing list.
  check("  Subscribed says No, not blank", subValue(w, 0) === "No", subValue(w, 0));

  const isSubscribedValue = run(w, "isSubscribedValue");
  check("  and the sync agrees they are not subscribed",
    isSubscribedValue(subValue(w, 0)) === false, subValue(w, 0));
  check("  where a blank cell would have counted as subscribed",
    isSubscribedValue("") === true);
}

console.log("\n=== the box missing entirely counts as no ===");
{
  // An older cached copy of the form, or a replayed submission, sends no
  // joinMailingList field at all. Consent has to be opt IN.
  const w = makeWorld();
  run(w, "handleSpaceRequest")(w.spreadsheet, PAYLOAD, EMAIL, false);
  check("Subscribed says No", subValue(w, 0) === "No", subValue(w, 0));

  // A truthy-looking string must not sneak through either.
  const w2 = makeWorld();
  run(w2, "handleSpaceRequest")(w2.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: "false" }), EMAIL, false);
  check("  and a string is not treated as a tick", subValue(w2, 0) === "No", subValue(w2, 0));
}

console.log("\n=== somebody already on the list ===");
{
  const w = makeWorld({ contactRows: [
    contactRow(EMAIL, { Name: "J. Requester-Smith", Notes: "hand-typed note" }),
  ] });
  w.contactRows[0][subCol(w)] = "No";   // they unsubscribed at some point

  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);

  check("no duplicate row was created", w.contactRows.length === 1,
    String(w.contactRows.length));
  const r = w.contactRows[0];
  check("  the hand-typed name survives", r[col("Name")] === "J. Requester-Smith",
    String(r[col("Name")]));
  check("  the hand-typed note survives", r[col("Notes")] === "hand-typed note",
    String(r[col("Notes")]));
  check("  the blank phone was filled in", r[col("Phone")] === "555-0100",
    String(r[col("Phone")]));
  check("  Hosting Interest was filled in", r[col("Hosting Interest")] === "Yes");
  check("  Last Updated moved", r[col("Last Updated")] instanceof Date);

  // The one that matters most. They took themselves off the list; booking a
  // room is not a change of mind about the newsletter.
  check("  UNSUBSCRIBED STAYS UNSUBSCRIBED, even though they ticked the box",
    subValue(w, 0) === "No", subValue(w, 0));
}

console.log("\n=== an existing row with nothing to add ===");
{
  const w = makeWorld({ contactRows: [
    contactRow(EMAIL, { Name: "Jane Requester", Phone: "555-0100",
      "Hosting Interest": "Yes", Notes: "Valley Choir" }),
  ] });
  const before = w.contactRows[0].slice();
  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);

  check("the row is left completely alone",
    JSON.stringify(w.contactRows[0]) === JSON.stringify(before),
    JSON.stringify(w.contactRows[0]));
  check("  including Last Updated, which did not move",
    w.contactRows[0][col("Last Updated")] === before[col("Last Updated")]);
}

console.log("\n=== matching is by email, case and space insensitive ===");
{
  const w = makeWorld({ contactRows: [contactRow("JANE@EXAMPLE.COM", { Name: "Jane" })] });
  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: false }), EMAIL, false);
  check("an address differing only in case is the same person",
    w.contactRows.length === 1, String(w.contactRows.length));
}

console.log("\n=== the stray columns are not disturbed ===");
{
  const w = makeWorld({ contactRows: [contactRow(EMAIL, { Name: "Jane" })] });
  // Something sitting in one of the stray columns, as on the live sheet.
  const strayIdx = HEADERS.length + 2;
  w.contactRows[0][strayIdx] = "do not touch";

  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);
  check("a value in a stray column survives",
    w.contactRows[0][strayIdx] === "do not touch", String(w.contactRows[0][strayIdx]));
  check("  and Subscribed still lands past them, at 23",
    subCol(w) === 22, String(subCol(w) + 1));
}

console.log("\n=== the Subscribed column is created if it is missing ===");
{
  const w = makeWorld({ hasSubscribed: false });
  run(w, "handleSpaceRequest")(w.spreadsheet,
    Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);
  check("the column was added", w.contactHeader.indexOf("Subscribed") !== -1,
    JSON.stringify(w.contactHeader.slice(-3)));
  check("  after the stray columns, not on top of one",
    w.contactHeader.indexOf("Subscribed") >= HEADERS.length + STRAY.length,
    String(w.contactHeader.indexOf("Subscribed")));
  check("  and the value landed in it", subValue(w, 0) === "Yes", subValue(w, 0));
}

console.log("\n=== a broken Contact List never costs a booking ===");
{
  const w = makeWorld();
  // The tab throws on every read, the way a reordered sheet does.
  w.spreadsheet.getSheetByName = (n) => {
    if (n === "Contact List") throw new Error("Sheet column layout has changed");
    return w.scope.SpreadsheetApp.openById().getSheetByName === undefined ? null : null;
  };
  const requests = { rows: [] };
  w.spreadsheet.getSheetByName = (n) => {
    if (n === "Contact List") throw new Error("Sheet column layout has changed");
    return {
      getLastRow: () => requests.rows.length + 1,
      getLastColumn: () => 5,
      getRange: () => ({ getValues: () => [[]], setValues: () => {}, setValue: () => {} }),
      appendRow: (r) => requests.rows.push(r),
      setFrozenRows: () => {},
    };
  };

  let threw = null;
  try {
    run(w, "handleSpaceRequest")(w.spreadsheet,
      Object.assign({}, PAYLOAD, { joinMailingList: true }), EMAIL, false);
  } catch (e) { threw = e; }

  check("the request still went through", threw === null, String(threw));
  check("  the space request row was still written", requests.rows.length === 1,
    String(requests.rows.length));
  check("  and the failure was logged rather than swallowed",
    w.logs.some((l) => /Could not add the requester to the Contact List/.test(l)),
    w.logs.join(" | ").slice(0, 160));
}

console.log("\n=== the requester then reaches Google Contacts ===");
{
  // End to end: the whole point is that a subscribed requester shows up in
  // what the sync reads, and an unsubscribed one does not.
  for (const [ticked, expected] of [[true, 1], [false, 0]]) {
    const w = makeWorld();
    run(w, "handleSpaceRequest")(w.spreadsheet,
      Object.assign({}, PAYLOAD, { joinMailingList: ticked }), EMAIL, false);
    const scan = run(w, "readSubscribedContacts")();
    check("ticked=" + ticked + ": the sync sees " + expected,
      scan.contacts.length === expected, JSON.stringify(scan.contacts));
    if (expected) {
      check("  with their name attached", scan.contacts[0].name === "Jane Requester",
        scan.contacts[0].name);
    }
  }
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

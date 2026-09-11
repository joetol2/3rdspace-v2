// How wide a booking is, and therefore what it collides with.
//
// Written after a real false alarm. A recurring request for Wednesday
// evenings "until 21 October" was read as ONE continuous twenty-one day
// booking, so a separate request for 3 October came back marked
// *** TIME CONFLICT ***. The two had nothing to do with each other.
//
// That matters more than an ordinary bug. Since the approve/decline flow was
// switched off, this warning is the only double-booking check in the system,
// and a warning that cries wolf is one that stops being read.
//
//   node tests/conflicts.test.cjs
//
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "google-apps-script", "mailing-list.gs"), "utf8");

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

const H = ["Timestamp", "Name", "Email", "Phone", "Organization", "Type of Use",
  "Public or Private", "One-time or Recurring", "Low-cost or Sliding Scale",
  "Requested Area", "Calendar Visibility", "Preferred Date", "Start Time", "End Time",
  "Setup Time Needed", "Cleanup Time Needed", "Expected Attendance", "Event Description",
  "Food or Catering Needs", "Pet Approval Request", "Furniture",
  "Amplified Sound or Special Equipment", "Accessibility, Privacy, or Parking Needs",
  "Agreed to Guidelines", "Source", "User Agent", "Status", "Request ID", "Action Token",
  "Event Name", "Recurrence Details", "End Date", "Calendar Event ID"];
const c = (n) => H.indexOf(n);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function world(rows) {
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => H.length,
    getRange: (r, cc, nr, nc) => ({
      getValues: () => r === 1
        ? [H.slice(cc - 1, cc - 1 + nc)]
        : rows.slice(r - 2, r - 2 + nr).map((x) => {
            const o = x.slice(cc - 1, cc - 1 + nc);
            while (o.length < nc) o.push("");
            return o;
          }),
      setValues() {}, setValue() {}, setBackground() {},
    }),
    appendRow() {}, setFrozenRows() {},
  };
  const scope = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    People: {}, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail() {} }, Logger: { log() {} },
    Session: { getScriptTimeZone: () => "America/Los_Angeles" },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    Utilities: {
      getUuid: () => "u",
      formatDate: (d, tz, f) => {
        let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
        const mm = String(d.getMinutes()).padStart(2, "0");
        if (f === "MMM d, yyyy") return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        if (f === "MMM d") return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
        if (f === "h:mm a") return `${h}:${mm} ${ap}`;
        return d.toISOString();
      },
      sleep() {},
    },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 204, getContentText: () => "" }) },
    CalendarApp: { getCalendarById: () => ({ getEvents: () => [], getEventById: () => null }) },
    HtmlService: { createHtmlOutput: (h) => String(h) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }) },
    console: { log() {}, error() {} },
  };
  const names = Object.keys(scope);
  return (body) => new Function(...names, SRC + "\n; return (" + body + ");")(...names.map((n) => scope[n]));
}

function row(o) {
  const r = new Array(H.length).fill("");
  r[c("Status")] = "Received";
  for (const k in o) r[c(k)] = o[k];
  return r;
}

const days = (w) => Math.round((w.end.getTime() - w.start.getTime()) / 86400000);

// ==========================================================================
console.log("\n=== the real one: a recurring series end date is not a booking ===");
{
  // Christopher asked for Wednesday evenings with the series ending 21 Oct.
  const chris = row({
    Name: "Christopher Rydman", "One-time or Recurring": "Recurring request",
    "Preferred Date": "2026-09-30", "Start Time": "19:30", "End Time": "21:30",
    "Setup Time Needed": "30 minutes", "Cleanup Time Needed": "15 minutes",
    "End Date": "2026-10-21", "Request ID": "chris",
  });
  const call = world([chris]);

  const his = call("requestWindow")("2026-09-30", "2026-10-21", "19:30", "21:30",
    "30 minutes", "15 minutes", "Recurring request");
  check("his window is one evening, not three weeks", days(his) === 0, days(his) + " days");

  // Ilene's separate request, three days later, in the afternoon.
  const hers = call("requestWindow")("2026-10-03", "", "13:00", "16:00",
    "30 minutes", "30 minutes", "Recurring request");
  const hits = call("findPendingConflicts")(hers.start, hers.end, "ilene");
  check("  and 3 October no longer collides with it", hits.length === 0, JSON.stringify(hits));
}

console.log("\n=== but a real clash on the first date is still caught ===");
{
  const chris = row({
    Name: "Christopher Rydman", "One-time or Recurring": "Recurring request",
    "Preferred Date": "2026-09-30", "Start Time": "19:30", "End Time": "21:30",
    "Setup Time Needed": "30 minutes", "Cleanup Time Needed": "15 minutes",
    "End Date": "2026-10-21", "Request ID": "chris",
  });
  const call = world([chris]);
  // Somebody else wants that same Wednesday evening.
  const w = call("requestWindow")("2026-09-30", "", "20:00", "22:00", "", "", "One-time request");
  const hits = call("findPendingConflicts")(w.start, w.end, "other");
  check("the same evening is reported", hits.length === 1, JSON.stringify(hits));
  check("  and named", hits.length === 1 && /Christopher Rydman/.test(hits[0]),
    JSON.stringify(hits));
}

console.log("\n=== a one-off festival still spans its whole run ===");
{
  // The case End Date exists for. Must not be collateral damage.
  const call = world([]);
  const w = call("requestWindow")("2026-10-02", "2026-10-04", "18:00", "23:00",
    "", "", "One-time request");
  check("Friday to Sunday is still two days wide", days(w) === 2, days(w) + " days");

  const fest = row({
    Name: "Harvest Festival", "One-time or Recurring": "One-time request",
    "Preferred Date": "2026-10-02", "Start Time": "18:00", "End Time": "23:00",
    "End Date": "2026-10-04", "Request ID": "fest",
  });
  const call2 = world([fest]);
  // Saturday afternoon, in the middle of the festival: a genuine clash.
  const sat = call2("requestWindow")("2026-10-03", "", "13:00", "16:00", "", "", "One-time request");
  const hits = call2("findPendingConflicts")(sat.start, sat.end, "other");
  check("  and something inside it is still flagged", hits.length === 1, JSON.stringify(hits));
}

console.log("\n=== a recurring booking that genuinely runs past midnight ===");
{
  // 8pm to 1am needs the next day to express its end time. That is one
  // occurrence, not a series, so the one-day allowance must keep it intact.
  const call = world([]);
  const w = call("requestWindow")("2026-10-02", "2026-10-03", "20:00", "01:00",
    "", "", "Recurring request");
  check("it still ends after midnight", w.end.getDate() === 3 && w.end.getHours() === 1,
    w.end.toString().slice(0, 24));
  check("  and is five hours long",
    Math.round((w.end - w.start) / 3600000) === 5,
    Math.round((w.end - w.start) / 3600000) + "h");
}

console.log("\n=== nothing changes for requests without an end date ===");
{
  const call = world([]);
  const a = call("requestWindow")("2026-10-03", "", "13:00", "16:00", "30 minutes", "30 minutes", "Recurring request");
  const b = call("requestWindow")("2026-10-03", "", "13:00", "16:00", "30 minutes", "30 minutes", "One-time request");
  check("recurring and one-time agree", a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime(), a.start + " / " + b.start);
  check("  and the padding is still applied", a.start.getHours() === 12 && a.start.getMinutes() === 30,
    a.start.toString().slice(0, 24));
}

console.log("\n=== the flag is read loosely, because the sheet is hand-edited ===");
{
  const call = world([]);
  for (const label of ["Recurring request", "recurring", "RECURRING REQUEST", "Recurring"]) {
    const w = call("requestWindow")("2026-09-30", "2026-10-21", "19:30", "21:30", "", "", label);
    check(`"${label}" collapses to one day`, days(w) === 0, days(w) + " days");
  }
  // Anything else means one-off, including blank, which is what old rows have.
  for (const label of ["One-time request", "", "Not sure yet"]) {
    const w = call("requestWindow")("2026-09-30", "2026-10-21", "19:30", "21:30", "", "", label);
    check(`"${label}" keeps the full span`, days(w) === 21, days(w) + " days");
  }
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

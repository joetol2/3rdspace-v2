// The community survey, server side.
//
// Two things matter more than the rest here.
//
// The survey writes to a DIFFERENT spreadsheet from everything else, so the
// test proves it opens that one and not the main one. Pointing it at the wrong
// book would not throw; it would quietly fill the Contact List spreadsheet with
// survey rows and nobody would notice until Laura opened the sheet she was
// promised and found it empty.
//
// And an email address is optional on this form, which nothing else here
// allows. doPost rejects an emailless submission before it reaches any handler,
// so the survey has to be routed before that check. An anonymous answer is a
// real answer.
//
//   node tests/survey-gs.test.cjs
//
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(
  path.join(__dirname, "..", "google-apps-script", "mailing-list.gs"), "utf8");
const FIXTURE = JSON.parse(fs.readFileSync(
  path.join(__dirname, "fixtures", "survey-columns.json"), "utf8"));

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

// A fake Google, recording which spreadsheet was opened and what was written.
function makeWorld(opts) {
  opts = opts || {};
  const world = { opened: [], appended: [], headers: null, logs: [], mail: [], contacts: [] };

  const sheetFor = (name) => ({
    getName: () => name,
    getLastRow: () => 1,
    getLastColumn: () => (world.headers ? world.headers.length : 0),
    getRange: (r, c, nr, nc) => ({
      getValues: () => [world.headers ? world.headers.slice(0, nc) : []],
      setValues: (v) => { world.headers = v[0]; },
      setValue() {}, setBackground() {}, setFontWeight() {},
    }),
    appendRow: (row) => world.appended.push(row),
    setFrozenRows() {}, getDataRange: () => ({ getValues: () => [] }),
  });

  world.scope = {
    SpreadsheetApp: {
      openById: (id) => {
        world.opened.push(id);
        if (opts.failOpen && id === opts.failOpen) throw new Error("no access");
        return {
          getId: () => id,
          getSheetByName: (n) => sheetFor(n),
          insertSheet: (n) => sheetFor(n),
        };
      },
    },
    People: {},
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (m) => world.mail.push(m) },
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => "America/Los_Angeles" },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }),
    },
    Utilities: {
      getUuid: () => "uuid-" + Math.random().toString(36).slice(2),
      formatDate: (d) => d.toISOString(),
      sleep() {},
    },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 204, getContentText: () => "" }) },
    CalendarApp: { getCalendarById: () => ({ getEvents: () => [], getEventById: () => null }) },
    HtmlService: { createHtmlOutput: (h) => String(h) },
    ContentService: {
      createTextOutput: (t) => ({ setMimeType: () => t }),
      MimeType: { JSON: "application/json" },
    },
    console: {
      log: (m) => world.logs.push(String(m)),
      error: (m) => world.logs.push("ERROR " + String(m)),
    },
  };
  return world;
}

function run(world, body) {
  const names = Object.keys(world.scope);
  return new Function(...names, SRC + "\n; return (" + body + ");")(
    ...names.map((n) => world.scope[n]));
}

const w0 = makeWorld();
const SURVEY_HEADERS = run(w0, "SURVEY_HEADERS");
const SURVEY_FIELDS = run(w0, "SURVEY_FIELDS");
const SURVEY_SPREADSHEET_ID = run(w0, "SURVEY_SPREADSHEET_ID");
const MAIN_SPREADSHEET_ID = run(w0, "SPREADSHEET_ID");

// ==========================================================================
console.log("\n=== the script and the website agree on the columns ===");
{
  check("the header list matches the fixture",
    JSON.stringify(SURVEY_HEADERS) === JSON.stringify(FIXTURE.columns),
    JSON.stringify(SURVEY_HEADERS));
  check("  and the payload keys match it too",
    JSON.stringify(SURVEY_FIELDS) === JSON.stringify(FIXTURE.questionIds),
    JSON.stringify(SURVEY_FIELDS));
  // Timestamp at the front, Source and User Agent at the back, one column per
  // question in between. If that stops being true the row builder below is
  // writing answers into the wrong columns.
  check("  there is one column per question, plus three",
    SURVEY_HEADERS.length === SURVEY_FIELDS.length + 3,
    SURVEY_HEADERS.length + " vs " + SURVEY_FIELDS.length);
  check("  nothing is listed twice",
    new Set(SURVEY_HEADERS).size === SURVEY_HEADERS.length);
  check("  and no column name is blank",
    SURVEY_HEADERS.every((h) => String(h).trim().length > 0));
}

// ==========================================================================
console.log("\n=== it writes to the survey spreadsheet, not the main one ===");
{
  check("the two spreadsheets are genuinely different",
    SURVEY_SPREADSHEET_ID !== MAIN_SPREADSHEET_ID,
    SURVEY_SPREADSHEET_ID);

  const w = makeWorld();
  run(w, "handleSurveyResponse")({ programmingWanted: "More music" }, "");
  check("a response opens the survey spreadsheet",
    w.opened.includes(SURVEY_SPREADSHEET_ID), w.opened.join(", "));
  check("  and does NOT touch the main one",
    !w.opened.includes(MAIN_SPREADSHEET_ID), w.opened.join(", "));
  check("  a row was written", w.appended.length === 1, String(w.appended.length));
  check("  into a sheet called Survey Responses",
    run(w, "SURVEY_SHEET_NAME") === "Survey Responses");
}

console.log("\n=== no access to that spreadsheet says so in plain words ===");
{
  // The single most likely thing to be wrong on the day this goes live.
  const w = makeWorld({ failOpen: SURVEY_SPREADSHEET_ID });
  let threw = false;
  try { run(w, "handleSurveyResponse")({ programmingWanted: "x" }, ""); }
  catch (e) { threw = true; }
  check("it fails rather than pretending to have saved", threw);
  check("  and the log names the spreadsheet",
    w.logs.some((l) => l.includes(SURVEY_SPREADSHEET_ID)), w.logs.join(" | "));
  check("  and says what to check",
    w.logs.some((l) => /EDIT access/i.test(l)), w.logs.join(" | "));
}

// ==========================================================================
console.log("\n=== a row lines up with its headers ===");
{
  const w = makeWorld();
  const buildSurveyRow = run(w, "buildSurveyRow");
  const row = buildSurveyRow({
    programmingWanted: "Pottery",
    topics: ["Art", "Music", "Other: welding"],
    mixedAge: "Yes",
    kidsInterest: "No",
    joinMailingList: true,
    source: "3RD SPACE community survey",
    userAgent: "test-agent",
  }, "someone@example.com", new Date("2026-10-11T12:00:00Z"));

  const col = (name) => row[SURVEY_HEADERS.indexOf(name)];
  check("the row is exactly as wide as the header list",
    row.length === SURVEY_HEADERS.length,
    row.length + " vs " + SURVEY_HEADERS.length);
  check("  Timestamp is first and is a date",
    row[0] instanceof Date, String(row[0]));
  check("  a text answer lands in its own column",
    col("Programming wanted") === "Pottery", String(col("Programming wanted")));
  check("  a multi-select is joined so the cell reads normally",
    col("Topics") === "Art, Music, Other: welding", String(col("Topics")));
  check("  a yes/no answer comes through as its word",
    col("Mixed age group") === "Yes", String(col("Mixed age group")));
  check("  the opt-in is written as Yes rather than true",
    col("Joined mailing list") === "Yes", String(col("Joined mailing list")));
  check("  Source and User Agent are at the end",
    col("Source") === "3RD SPACE community survey" && col("User Agent") === "test-agent");

  // The email in the sheet is the normalised one doPost lowercased, not
  // whatever the payload happened to carry, so the sheet and the Contact List
  // cannot disagree about who answered.
  const shouty = buildSurveyRow({ email: "NOT@used.com" }, "real@example.com", new Date());
  check("  the email is the normalised one, not the payload's",
    shouty[SURVEY_HEADERS.indexOf("Email")] === "real@example.com",
    String(shouty[SURVEY_HEADERS.indexOf("Email")]));
}

console.log("\n=== an unanswered question is blank, not the word undefined ===");
{
  const w = makeWorld();
  const row = run(w, "buildSurveyRow")({}, "", new Date());
  const body = row.slice(1, row.length);
  check("nothing reads 'undefined'", !body.some((c) => String(c) === "undefined"),
    JSON.stringify(body.filter((c) => String(c) === "undefined")));
  check("  nothing reads 'null'", !body.some((c) => String(c) === "null"));
  check("  and nothing became a zero", !body.some((c) => c === 0));
  check("  the row is still full width", row.length === SURVEY_HEADERS.length);
}

// ==========================================================================
console.log("\n=== answering anonymously works ===");
{
  const w = makeWorld();
  run(w, "handleSurveyResponse")({ programmingWanted: "Anonymous answer" }, "");
  check("the answer is saved", w.appended.length === 1);
  check("  the email cell is empty",
    w.appended[0][SURVEY_HEADERS.indexOf("Email")] === "",
    JSON.stringify(w.appended[0][SURVEY_HEADERS.indexOf("Email")]));
  check("  and nobody was added to any contact list",
    !w.opened.includes(MAIN_SPREADSHEET_ID), w.opened.join(", "));
}

console.log("\n=== the mailing list box is obeyed, in both directions ===");
{
  // A survey is not a signup. Leaving an email so we can answer a question
  // about programming is not asking to be on a list.
  const no = makeWorld();
  run(no, "handleSurveyResponse")({ joinMailingList: false }, "quiet@example.com");
  check("unticked, with an email given, adds nobody",
    !no.opened.includes(MAIN_SPREADSHEET_ID), no.opened.join(", "));

  const missing = makeWorld();
  run(missing, "handleSurveyResponse")({}, "quiet@example.com");
  check("  the box absent entirely adds nobody",
    !missing.opened.includes(MAIN_SPREADSHEET_ID), missing.opened.join(", "));

  const yes = makeWorld();
  run(yes, "handleSurveyResponse")({ joinMailingList: true }, "keen@example.com");
  check("ticked, with an email, does reach the Contact List",
    yes.opened.includes(MAIN_SPREADSHEET_ID), yes.opened.join(", "));

  const anon = makeWorld();
  run(anon, "handleSurveyResponse")({ joinMailingList: true }, "");
  check("  ticked with NO email adds nobody, since there is nobody to add",
    !anon.opened.includes(MAIN_SPREADSHEET_ID), anon.opened.join(", "));
}

console.log("\n=== a broken Contact List never costs an answer ===");
{
  const w = makeWorld({ failOpen: MAIN_SPREADSHEET_ID });
  let threw = false;
  try { run(w, "handleSurveyResponse")({ joinMailingList: true, topics: ["Art"] }, "a@b.com"); }
  catch (e) { threw = true; }
  check("it does not throw", !threw);
  check("  and the survey answer is still saved", w.appended.length === 1);
  check("  with the failure logged rather than swallowed",
    w.logs.some((l) => /ERROR/.test(l)), w.logs.join(" | "));
}

// ==========================================================================
console.log("\n=== doPost lets an answer through without an email ===");
{
  const post = (payload) => {
    const w = makeWorld();
    const res = run(w, "doPost")({
      parameter: {},
      postData: { contents: JSON.stringify(payload) },
    });
    return { w, res: typeof res === "string" ? JSON.parse(res) : res };
  };

  const anon = post({
    formType: "survey_response", submissionId: "s1",
    programmingWanted: "No email on this one", website: "",
  });
  check("an emailless survey is accepted", anon.res && anon.res.ok === true,
    JSON.stringify(anon.res));
  check("  and reaches the survey spreadsheet",
    anon.w.opened.includes(SURVEY_SPREADSHEET_ID), anon.w.opened.join(", "));

  // The rest of the forms still require one. This is the asymmetry the
  // routing exists for, so it is worth proving it did not leak.
  const other = post({ formType: "email_capture", submissionId: "s2", website: "" });
  check("every other form still demands an email",
    other.res && other.res.ok === false && other.res.error === "missing_email",
    JSON.stringify(other.res));

  const bad = post({
    formType: "survey_response", submissionId: "s3",
    email: "not-an-address", website: "",
  });
  check("an email that IS given still has to be real",
    bad.res && bad.res.ok === false && bad.res.error === "invalid_email",
    JSON.stringify(bad.res));

  const bot = post({
    formType: "survey_response", submissionId: "s4",
    website: "http://spam.example", programmingWanted: "junk",
  });
  check("the honeypot still applies", bot.w.appended.length === 0,
    JSON.stringify(bot.w.appended));
  check("  and the bot is told nothing useful", bot.res && bot.res.ok === true);
}

console.log("\n=== the editor's own test helper works ===");
{
  // Whoever pastes this into Google will run it to prove the sheet is
  // reachable, so it has to not throw with an empty payload.
  const w = makeWorld();
  let threw = "";
  try { run(w, "sendTestSurveyResponse")(); } catch (e) { threw = e.message; }
  check("sendTestSurveyResponse runs", threw === "", threw);
  check("  and writes one obviously fake row", w.appended.length === 1);
  check("  that says to delete it",
    /please delete/i.test(String(w.appended[0][1])), String(w.appended[0][1]));
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

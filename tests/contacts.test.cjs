// Contact List -> Google Contacts sync.
//
// Runs the real functions straight out of google-apps-script/mailing-list.gs
// against mocked Google globals. There is no Apps Script runtime here: the
// file is evaluated with SpreadsheetApp, People, MailApp and friends supplied
// as fakes, which is enough to exercise every branch that matters and runs in
// under a second. CommonJS (.cjs) because the repo is type: module and this
// needs require and __dirname.
//
//   node tests/contacts.test.cjs
//
const fs = require("fs");
const path = require("path");

// The real script, loaded from the repo rather than a copy, so these tests
// cannot quietly drift away from what actually ships.
const SCRIPT = path.join(__dirname, "..", "google-apps-script", "mailing-list.gs");
const SRC = fs.readFileSync(SCRIPT, "utf8");

let pass = 0, fail = 0;
const check = (n, c, x) => c ? (pass++, console.log("  PASS " + n))
                             : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

// --- a fake People API + Sheet -------------------------------------------
function makeWorld(opts) {
  opts = opts || {};
  const world = {
    rows: opts.rows || [],
    groups: opts.groups || [],
    groupMembers: opts.groupMembers || {},
    connections: opts.connections || [],
    created: [],
    modifies: [],
    mail: [],
    logs: [],
    nextId: 1000,
    batchCalls: [],
    singleCreates: 0,
    cellWrites: [],
    props: opts.props || {},
  };

  // What the live sheet's row 1 actually says, which on the first run after
  // deploying is the OLD 14-column layout.
  const headers = opts.sheetHeaders || opts.headers;
  world.headerWrites = [];

  world.SpreadsheetApp = {
    openById: () => ({
      getSheetByName: () => world.sheet,
      insertSheet: () => world.sheet,
    }),
    getUi: () => ({ alert: (m) => world.logs.push("ALERT " + m) }),
  };
  // Row 1 of the live sheet, which may be wider than HEADERS.
  world.headerRow = (opts.sheetHeaders || opts.headers).slice();
  world.sheet = {
    getLastRow: () => world.rows.length + 1,
    getLastColumn: () => Math.max(world.headerRow.length,
      world.rows.reduce((m, r) => Math.max(m, r.length), 0)),
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) {
          const out = world.headerRow.slice(c - 1, c - 1 + nc);
          while (out.length < nc) out.push("");
          return [out];
        }
        return world.rows.slice(r - 2, r - 2 + nr).map((row) => {
          const out = row.slice(c - 1, c - 1 + nc);
          while (out.length < nc) out.push("");
          return out;
        });
      },
      setValues: (v) => { if (r === 1) world.headerWrites.push(v[0]); },
      // Single-cell write, which is how the header and the Yes are written.
      setValue: (v) => {
        world.cellWrites.push({ row: r, col: c, value: v });
        if (r === 1) {
          while (world.headerRow.length < c) world.headerRow.push("");
          world.headerRow[c - 1] = v;
        } else {
          const row = world.rows[r - 2];
          if (row) { while (row.length < c) row.push(""); row[c - 1] = v; }
        }
      },
      setFontWeight: () => ({ setBackground: () => {} }),
    }),
    setFrozenRows: () => {},
  };

  world.People = {
    ContactGroups: {
      list: () => ({ contactGroups: world.groups }),
      create: (body) => {
        const rn = "contactGroups/new" + world.nextId++;
        world.groups.push({ name: body.contactGroup.name, resourceName: rn });
        world.groupMembers[rn] = [];
        return { resourceName: rn };
      },
      get: (rn) => ({ memberResourceNames: world.groupMembers[rn] || [] }),
      Members: {
        modify: (body, rn) => {
          world.modifies.push({ rn, body });
          const cur = world.groupMembers[rn] || [];
          const removed = body.resourceNamesToRemove || [];
          const kept = cur.filter((x) => removed.indexOf(x) === -1);
          world.groupMembers[rn] = kept.concat(body.resourceNamesToAdd || []);
          return {};
        },
      },
    },
    People: {
      Connections: { list: () => ({ connections: world.connections }) },
      createContact: (body) => {
        world.singleCreates++;
        const rn = "people/c" + world.nextId++;
        const person = Object.assign({ resourceName: rn }, body);
        world.connections.push(person);
        world.created.push(person);
        return { resourceName: rn };
      },
      batchCreateContacts: (body) => {
        world.batchCalls.push((body.contacts || []).length);
        if (opts.batchThrows) throw new Error("batchCreateContacts unavailable");
        let people = (body.contacts || []).map((c) => {
          const rn = "people/c" + world.nextId++;
          const person = Object.assign({ resourceName: rn }, c.contactPerson);
          world.connections.push(person);
          world.created.push(person);
          return { person: person };
        });
        // Real APIs are under no obligation to answer in the order asked.
        if (opts.batchShuffles) people = people.slice().reverse();
        if (opts.batchDropsOne) people = people.slice(1);
        return { createdPeople: people };
      },
    },
  };

  world.LockService = {
    getScriptLock: () => ({
      waitLock: () => { if (opts.lockBusy) throw new Error("busy"); },
      releaseLock: () => {},
    }),
  };
  world.MailApp = { sendEmail: (m) => world.mail.push(m) };
  world.Logger = { log: (m) => world.logs.push(String(m)) };
  return world;
}

function run(world, fnBody) {
  const scope = {
    SpreadsheetApp: world.SpreadsheetApp,
    People: world.People,
    LockService: world.LockService,
    MailApp: world.MailApp,
    Logger: world.Logger,
    Session: { getScriptTimeZone: () => "America/Los_Angeles" },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in world.props ? world.props[k] : null),
      setProperty: (k, v) => { world.props[k] = String(v); },
    }) },
    Utilities: { getUuid: () => "uuid", formatDate: () => "date", sleep: () => {} },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => "" }) },
    CalendarApp: {}, HtmlService: { createHtmlOutput: (h) => h },
    ContentService: { createTextOutput: () => ({ setMimeType: () => ({}) }) },
    console: console,
  };
  const names = Object.keys(scope);
  const fn = new Function(...names, SRC + "\n; return (" + fnBody + ");");
  return fn(...names.map((n) => scope[n]));
}

const HEADERS = ["Timestamp","Last Updated","Email","Name","Phone","Interest Areas",
  "Hosting Interest","Event or Program Ideas","Volunteer Interest",
  "Donation or Support Interest","Notes","Source","Status","User Agent"];
// Row 1 as the code will leave it once the column has been created.
const WITH_SUB = HEADERS.concat(["Subscribed"]);

const row = (email, name, subscribed) => {
  const r = new Array(15).fill("");
  r[2] = email; r[3] = name || ""; r[14] = subscribed === undefined ? "Yes" : subscribed;
  return r;
};

// ==========================================================================
console.log("\n=== the Subscribed column is added without breaking old rows ===");
{
  const w = makeWorld({ headers: WITH_SUB });
  const H = run(w, "HEADERS");
  // Subscribed must stay OUT of the positional contract. Putting it in was
  // the bug: the live sheet already had something in that position.
  check("HEADERS is untouched at 14 columns", H.length === 14, String(H.length));
  check("  Subscribed is not one of them", H.indexOf("Subscribed") === -1);
  check("  Status is still where it was", H.indexOf("Status") === 12);
  check("  and User Agent is still last", H[13] === "User Agent", H[13]);

  const sub = (v) => run(w, "isSubscribedValue")(v);
  check("blank counts as subscribed (rows written before the column existed)", sub("") === true);
  check("  so does Yes", sub("Yes") === true);
  for (const no of ["No", "no", "NO", " no ", "false", "0", "unsubscribed", "opted out"]) {
    check(`  "${no}" counts as unsubscribed`, sub(no) === false);
  }
  check("  an unrelated note does not accidentally unsubscribe", sub("added at market") === true);
}

// The first run after this ships meets a sheet that still has 14 columns and
// hundreds of real rows. Getting this wrong throws on every form submission.
console.log("\n=== the live 14-column sheet meets the new 15-column code ===");
{
  const OLD = HEADERS.slice(0, 14);
  const oldRow = (email) => { const r = new Array(14).fill(""); r[2] = email; return r; };
  const w = makeWorld({
    headers: WITH_SUB, sheetHeaders: OLD,
    rows: [oldRow("old1@x.com"), oldRow("old2@x.com")],
  });

  let threw = null;
  try { run(w, "readSubscribedContacts")(); } catch (e) { threw = e; }
  check("it does not throw on the old layout", threw === null, String(threw));
  const hdr = w.cellWrites.find((c) => c.row === 1);
  check("  the Subscribed column is created just past the last one used",
    !!hdr && hdr.value === "Subscribed" && hdr.col === 15, JSON.stringify(hdr));
  check("  and the 14 real headers are left exactly alone",
    JSON.stringify(w.headerRow.slice(0, 14)) === JSON.stringify(OLD),
    JSON.stringify(w.headerRow.slice(0, 14)));

  // The whole point: nobody already on the list gets dropped by the upgrade.
  const got = run(w, "readSubscribedContacts")().contacts;
  check("everyone already on the list is still subscribed", got.length === 2,
    JSON.stringify(got.map((g) => g.email)));
}

// The real Contact List sheet turned out to be WIDER than HEADERS, with real
// data already sitting in column 15. Adding "Subscribed" as a 15th positional
// header made ensureHeaders refuse, correctly, and the sync could not run.
console.log("\n=== the live sheet is wider than the code knew about ===");
{
  const EXTRA = ["One-time request or recurring request", "Notes from Laura"];
  const LIVE = HEADERS.concat(EXTRA);
  const liveRow = (email, extra) => {
    const r = new Array(16).fill("");
    r[2] = email; r[3] = "Person";
    r[14] = extra; r[15] = "hand-typed note";
    return r;
  };
  const w = makeWorld({ headers: LIVE, sheetHeaders: LIVE,
    rows: [liveRow("w1@x.com", "One-time"), liveRow("w2@x.com", "Recurring")] });

  let threw = null;
  let got = null;
  try { got = run(w, "readSubscribedContacts")().contacts; } catch (e) { threw = e; }
  check("it no longer refuses to run", threw === null, String(threw));

  const hdr = w.cellWrites.find((c) => c.row === 1);
  check("  Subscribed is created past the real last column, not at 15",
    !!hdr && hdr.col === 17 && hdr.value === "Subscribed", JSON.stringify(hdr));
  check("  the column that was at 15 is untouched",
    w.headerRow[14] === EXTRA[0], String(w.headerRow[14]));
  check("  and so is the one at 16", w.headerRow[15] === EXTRA[1], String(w.headerRow[15]));
  check("  nothing was written over anyone's row data",
    w.cellWrites.filter((c) => c.row > 1).length === 0,
    JSON.stringify(w.cellWrites.filter((c) => c.row > 1)));
  check("  and everybody counts as subscribed, since the column is new",
    got.length === 2, JSON.stringify(got && got.map((g) => g.email)));

  // Second run must find the column it made, not make another.
  w.cellWrites.length = 0;
  run(w, "readSubscribedContacts")();
  check("  a second run reuses that column rather than adding one",
    w.cellWrites.filter((c) => c.row === 1).length === 0,
    JSON.stringify(w.cellWrites));
}

// A signup on that same wide sheet must set Yes in the right cell.
console.log("\n=== a signup on the wide sheet ===");
{
  const LIVE = HEADERS.concat(["One-time request or recurring request"]);
  const r = new Array(15).fill(""); r[2] = "w1@x.com"; r[14] = "One-time";
  const w = makeWorld({ headers: LIVE, sheetHeaders: LIVE, rows: [r] });
  run(w, "markSubscribed")(w.sheet, 2);
  const write = w.cellWrites.find((c) => c.row === 2);
  check("Yes lands in the Subscribed column, at 16", !!write && write.col === 16,
    JSON.stringify(write));
  check("  and the old column 15 value survives", w.rows[0][14] === "One-time",
    String(w.rows[0][14]));
}

// The real Contact List tab, taken from an export of the live workbook on
// 26 Aug 2026. Columns 15-22 are stray header labels copied from the old
// Google Form's response sheet; they carry no data in any row, but they are
// what the first attempt collided with.
console.log("\n=== the actual live Contact List layout ===");
{
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
  const LIVE = HEADERS.concat(STRAY);
  check("that is 22 columns, as exported", LIVE.length === 22, String(LIVE.length));

  // Most rows were typed in by hand: an email and a name, nothing else.
  const handTyped = (email, name) => {
    const r = new Array(14).fill(""); r[2] = email; r[3] = name; return r;
  };
  const w = makeWorld({ headers: LIVE, sheetHeaders: LIVE,
    rows: [handTyped("a@x.com", "Ann"), handTyped("b@x.com", "Bob")] });

  let threw = null, got = null;
  try { got = run(w, "readSubscribedContacts")().contacts; } catch (e) { threw = e; }
  check("the sync runs", threw === null, String(threw));

  const hdr = w.cellWrites.find((c) => c.row === 1);
  check("  Subscribed is created at column 23, clear of the stray labels",
    !!hdr && hdr.col === 23 && hdr.value === "Subscribed", JSON.stringify(hdr));
  check("  all eight stray headers are left exactly as they were",
    JSON.stringify(w.headerRow.slice(14, 22)) === JSON.stringify(STRAY));
  check("  hand-typed rows with no Subscribed value still count as subscribed",
    got.length === 2, JSON.stringify(got && got.map((g) => g.email)));

  // And if the stray columns are tidied away first, it simply lands at 15.
  const tidy = makeWorld({ headers: HEADERS, sheetHeaders: HEADERS,
    rows: [handTyped("a@x.com", "Ann")] });
  run(tidy, "readSubscribedContacts")();
  const th = tidy.cellWrites.find((c) => c.row === 1);
  check("  on a tidied sheet it lands at 15 instead", !!th && th.col === 15,
    JSON.stringify(th));
}

console.log("\n=== a genuinely reordered sheet still fails loudly ===");
{
  const SCRAMBLED = HEADERS.slice();
  SCRAMBLED[3] = "Phone"; SCRAMBLED[4] = "Name";      // two columns swapped
  const w = makeWorld({ headers: WITH_SUB, sheetHeaders: SCRAMBLED, rows: [] });
  let threw = null;
  try { run(w, "readSubscribedContacts")(); } catch (e) { threw = e; }
  check("it refuses rather than reading the wrong columns", threw !== null);
  check("  and says what moved", threw && /column layout has changed/i.test(String(threw)),
    String(threw));
}

console.log("\n=== a signup writes Subscribed ===");
{
  const w = makeWorld({ headers: WITH_SUB });
  const built = run(w, "buildRow")({ name: "Ada" }, "full_join", "ada@x.com", new Date(), true, []);
  check("the new row is the full width of the headers", built.length === HEADERS.length,
    built.length + " vs " + HEADERS.length);
  check("  and writes nothing past column 14", built.length === 14, String(built.length));

  // The Yes is written to the Subscribed cell by name, separately.
  const w2 = makeWorld({ headers: WITH_SUB, rows: [row("ada@x.com", "Ada", "")] });
  run(w2, "markSubscribed")(w2.sheet, 2);
  const write = w2.cellWrites.find((c) => c.row === 2);
  check("  markSubscribed writes Yes into the Subscribed column",
    !!write && write.value === "Yes" && write.col === 15, JSON.stringify(write));
}

console.log("\n=== reading the sheet ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [
    row("a@x.com", "Ann"),
    row("b@x.com", "Bob", ""),          // blank = subscribed
    row("c@x.com", "Cal", "No"),        // opted out
    row("A@X.com", "Dup"),              // same as the first, different case
    row("not-an-email", "Bad"),
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], // empty row
  ]});
  const got = run(w, "readSubscribedContacts")().contacts;
  const emails = got.map((g) => g.email);
  check("subscribed rows are returned", emails.indexOf("a@x.com") !== -1 && emails.indexOf("b@x.com") !== -1);
  check("  blank Subscribed is treated as subscribed", emails.indexOf("b@x.com") !== -1);
  check("  an opted-out row is left out", emails.indexOf("c@x.com") === -1);
  check("  a duplicate email is only counted once", emails.length === 2, JSON.stringify(emails));
  check("  invalid addresses are skipped", emails.indexOf("not-an-email") === -1);
  check("  blank rows do not become empty contacts", emails.indexOf("") === -1);
}

// A hand-edited list that grows collects typos, and a silently skipped row is
// somebody sitting there believing they are on the mailing list.
console.log("\n=== a mistyped address is reported, not quietly dropped ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [
    row("good@x.com", "Good"),
    row("jane@@gmail..com", "Jane"),
    row("just a name", "Nope"),
  ]});
  const scan = run(w, "readSubscribedContacts")();
  check("the good one is kept", scan.contacts.length === 1);
  check("  both bad ones are reported", scan.invalid.length === 2,
    JSON.stringify(scan.invalid));
  check("  with the row number, so it can be found in the sheet",
    scan.invalid[0].row === 3 && scan.invalid[1].row === 4,
    JSON.stringify(scan.invalid.map((v) => v.row)));
  check("  and the value as typed", scan.invalid[0].value === "jane@@gmail..com");

  const res = run(w, "syncMailingListToContacts")();
  check("the sync reports them in its summary", res.invalid === 2, JSON.stringify(res));
  check("  and emails about them", w.mail.length === 1 &&
    /needs a look/.test(w.mail[0].subject), JSON.stringify(w.mail.map((m) => m.subject)));
  check("  naming the rows", /row 3: jane@@gmail\.\.com/.test(w.mail[0].body));

  // A daily trigger must not become a daily email.
  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("  but does not say it again tomorrow", w.mail.length === 0);

  // Fix one, and the changed set is worth mentioning again.
  w.rows[1][2] = "jane@gmail.com";
  w.mail.length = 0;
  const after = run(w, "syncMailingListToContacts")();
  check("  fixing one picks them up", after.subscribers === 2, JSON.stringify(after));
  check("  and it mentions the one still outstanding", w.mail.length === 1 &&
    /just a name/.test(w.mail[0].body));
}

console.log("\n=== growing towards Gmail's daily ceiling ===");
{
  const mk = (n) => {
    const rows = [];
    for (let i = 0; i < n; i++) rows.push(row("g" + i + "@x.com", "G" + i));
    return rows;
  };
  const w = makeWorld({ headers: WITH_SUB, rows: mk(50) });
  run(w, "syncMailingListToContacts")();
  check("nothing is said at 50 people", w.mail.length === 0,
    JSON.stringify(w.mail.map((m) => m.subject)));

  w.rows = mk(410);
  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("a warning arrives on crossing 400", w.mail.length === 1 &&
    /needs a look/.test(w.mail[0].subject));
  check("  saying there is still room, and nothing to do today",
    /still room/.test(w.mail[0].body) && /Nothing needs doing today/.test(w.mail[0].body));

  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("  and is not repeated every day", w.mail.length === 0);

  w.rows = mk(505);
  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("crossing 500 escalates", w.mail.length === 1 &&
    /past what Gmail will send/.test(w.mail[0].body), JSON.stringify(w.mail[0] && w.mail[0].body));
  check("  and explains the actual failure: a send that stops part way",
    /stop part way through/.test(w.mail[0].body));

  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("  once", w.mail.length === 0);

  // Everyone still syncs regardless; the warning is advice, not a block.
  const res = run(w, "syncMailingListToContacts")();
  check("  and all 505 are still on the label", res.subscribers === 505, JSON.stringify(res));
}

console.log("\n=== first run: label does not exist yet ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [row("a@x.com", "Ann"), row("b@x.com", "Bob")] });
  const res = run(w, "syncMailingListToContacts")();
  check("the label was created", w.groups.length === 1 && w.groups[0].name === "3RD SPACE Mailing List");
  check("both people were created as contacts", w.created.length === 2, String(w.created.length));
  check("  each carries the source tag, so we know they are ours",
    w.created.every((c) => (c.userDefined || []).some(
      (u) => u.key === "3rdspace-source" && u.value === "mailing-list-sheet")));
  check("  names were split into given/family", w.created[0].names[0].givenName === "Ann");
  check("both were added to the label", res.added === 2, JSON.stringify(res));
  check("  and nothing was removed", res.removed === 0);
}

console.log("\n=== running it again changes nothing ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [row("a@x.com", "Ann"), row("b@x.com", "Bob")] });
  run(w, "syncMailingListToContacts")();
  const before = JSON.stringify(w.groupMembers);
  const modsBefore = w.modifies.length;
  const res = run(w, "syncMailingListToContacts")();
  check("no duplicate contacts created", w.created.length === 2, String(w.created.length));
  check("  nobody added twice", res.added === 0 && res.removed === 0, JSON.stringify(res));
  check("  the label is untouched", JSON.stringify(w.groupMembers) === before);
  check("  and it did not even call modify", w.modifies.length === modsBefore);
}

console.log("\n=== unsubscribing removes someone from the label ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [
    row("a@x.com", "Ann"), row("b@x.com", "Bob"), row("c@x.com", "Cal"), row("d@x.com", "Dee"),
  ]});
  run(w, "syncMailingListToContacts")();
  const gid = w.groups[0].resourceName;
  check("four on the label to start", w.groupMembers[gid].length === 4);

  w.rows[1][14] = "No";                       // Bob opts out
  const res = run(w, "syncMailingListToContacts")();
  check("one person removed", res.removed === 1, JSON.stringify(res));
  check("  the label is down to three", w.groupMembers[gid].length === 3);
  const bob = w.created.find((c) => c.emailAddresses[0].value === "b@x.com");
  check("  and it was Bob", w.groupMembers[gid].indexOf(bob.resourceName) === -1);
}

console.log("\n=== a contact the manager added by hand is left alone ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [row("a@x.com", "Ann")] });
  run(w, "syncMailingListToContacts")();
  const gid = w.groups[0].resourceName;

  // She adds a friend directly in Google Contacts, not via the sheet.
  const manual = { resourceName: "people/manual1", emailAddresses: [{ value: "friend@x.com" }] };
  w.connections.push(manual);
  w.groupMembers[gid].push("people/manual1");

  const res = run(w, "syncMailingListToContacts")();
  check("the hand-added contact is NOT removed", res.removed === 0, JSON.stringify(res));
  check("  they are still on the label",
    w.groupMembers[gid].indexOf("people/manual1") !== -1);
}

console.log("\n=== an existing contact is reused, not duplicated ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [row("known@x.com", "Known")] });
  w.connections.push({ resourceName: "people/already", emailAddresses: [{ value: "KNOWN@x.com" }] });
  const res = run(w, "syncMailingListToContacts")();
  check("no new contact was created for an address we already had",
    w.created.length === 0, String(w.created.length));
  check("  the existing one was added to the label", res.added === 1);
  check("  matched case-insensitively",
    w.groupMembers[w.groups[0].resourceName].indexOf("people/already") !== -1);
}

console.log("\n=== the guard against a wrecked sheet ===");
{
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push(row("p" + i + "@x.com", "P" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows });
  run(w, "syncMailingListToContacts")();
  const gid = w.groups[0].resourceName;
  check("twenty on the label", w.groupMembers[gid].length === 20);

  const membersBefore = w.groupMembers[gid].slice();
  w.rows = [row("p0@x.com", "P0")];          // sheet all but cleared
  const res = run(w, "syncMailingListToContacts")();
  check("the sync refuses to run", res.skipped === true && res.reason === "removal_guard",
    JSON.stringify(res));
  check("  the label is untouched",
    JSON.stringify(w.groupMembers[gid]) === JSON.stringify(membersBefore));
  check("  and somebody is told", w.mail.length === 1 &&
    /stopped itself/i.test(w.mail[0].subject), JSON.stringify(w.mail.map(m => m.subject)));
  check("  the email says nothing was changed", /Nothing has been changed/.test(w.mail[0].body));
}

console.log("\n=== an ordinary removal is still allowed through ===");
{
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push(row("p" + i + "@x.com", "P" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows });
  run(w, "syncMailingListToContacts")();
  w.rows[3][14] = "No";
  w.rows[7][14] = "No";
  const res = run(w, "syncMailingListToContacts")();
  check("two people can leave without tripping the guard",
    res.removed === 2 && !res.skipped, JSON.stringify(res));
  check("  and no alarm was raised", w.mail.length === 0);
}

console.log("\n=== two syncs at once ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [row("a@x.com", "Ann")], lockBusy: true });
  const res = run(w, "syncMailingListToContacts")();
  check("the second one steps aside", res.skipped === true && res.reason === "locked",
    JSON.stringify(res));
  check("  without touching anything", w.created.length === 0 && w.modifies.length === 0);
}

console.log("\n=== an empty sheet does not empty the label by surprise ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [] });
  const res = run(w, "syncMailingListToContacts")();
  check("it completes without error", !!res && res.subscribers === 0, JSON.stringify(res));
  check("  creating the label but adding nobody", res.added === 0 && res.removed === 0);
}

// The worst case, and a different code path: readSubscribedContacts returns
// early on a sheet with no data rows at all, rather than filtering to nothing.
console.log("\n=== a sheet wiped to zero rows, against a full label ===");
{
  const rows = [];
  for (let i = 0; i < 30; i++) rows.push(row("p" + i + "@x.com", "P" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows });
  run(w, "syncMailingListToContacts")();
  const gid = w.groups[0].resourceName;
  const before = w.groupMembers[gid].slice();
  check("thirty on the label", before.length === 30);

  w.rows = [];                                  // every row gone
  const res = run(w, "syncMailingListToContacts")();
  check("the sync refuses rather than emptying the mailing list",
    res.skipped === true && res.reason === "removal_guard", JSON.stringify(res));
  check("  all thirty are still there",
    JSON.stringify(w.groupMembers[gid]) === JSON.stringify(before));
  check("  and it said so", w.mail.length === 1 && /stopped itself/i.test(w.mail[0].subject));
}

console.log("\n=== the first run, with a few hundred people already on the list ===");
{
  const rows = [];
  for (let i = 0; i < 450; i++) rows.push(row("p" + i + "@x.com", "P" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows });
  const res = run(w, "syncMailingListToContacts")();
  check("everybody was created", w.created.length === 450, String(w.created.length));
  check("  in batches, not one call each", w.batchCalls.length === 3,
    JSON.stringify(w.batchCalls));
  check("  200 at a time", JSON.stringify(w.batchCalls) === "[200,200,50]",
    JSON.stringify(w.batchCalls));
  check("  with no one-at-a-time calls needed", w.singleCreates === 0, String(w.singleCreates));
  check("  and all 450 landed on the label", res.added === 450, JSON.stringify(res));
}

console.log("\n=== the batch API answering out of order ===");
{
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(row("q" + i + "@x.com", "Q" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows, batchShuffles: true });
  const res = run(w, "syncMailingListToContacts")();
  check("everyone is still matched to the right contact", res.added === 5, JSON.stringify(res));
  check("  nobody was created twice", w.created.length === 5, String(w.created.length));
  // The real proof: each address on the label must be one we asked for.
  const gid = w.groups[0].resourceName;
  const emailsOnLabel = w.groupMembers[gid].map((rn) => {
    const p = w.connections.find((c) => c.resourceName === rn);
    return p.emailAddresses[0].value;
  }).sort();
  check("  and the addresses on the label are exactly the sheet's",
    JSON.stringify(emailsOnLabel) === JSON.stringify(rows.map((r) => r[2]).sort()),
    JSON.stringify(emailsOnLabel));
}

console.log("\n=== the batch API quietly dropping one ===");
{
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(row("r" + i + "@x.com", "R" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows, batchDropsOne: true });
  const res = run(w, "syncMailingListToContacts")();
  check("the missing one is created singly instead", w.singleCreates === 1, String(w.singleCreates));
  check("  so all five still reach the label", res.added === 5, JSON.stringify(res));
}

console.log("\n=== the batch endpoint failing outright ===");
{
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(row("s" + i + "@x.com", "S" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows, batchThrows: true });
  const res = run(w, "syncMailingListToContacts")();
  check("it falls back to one at a time", w.singleCreates === 5, String(w.singleCreates));
  check("  and nobody is lost", res.added === 5, JSON.stringify(res));
  check("  the fallback was noted in the log",
    w.logs.some((l) => /falling back one at a time/.test(l)));
}

// The space manager asked to come off the reminder and sync emails but is
// still the approver. That leaves one email nobody may ever be removed from,
// because the Approve and Decline links exist nowhere else.
console.log("\n=== who gets told what ===");
{
  const w = makeWorld({ headers: WITH_SUB, rows: [] });
  const NOTIFY = run(w, "NOTIFY_EMAILS");
  const ADMIN = run(w, "ADMIN_EMAILS");
  const LAURA = "laurabnewman@gmail.com";
  const OFFICE = "3rdspacesyv@gmail.com";

  check("the approver is on NOTIFY_EMAILS", NOTIFY.indexOf(LAURA) !== -1);
  check("  and so is the office", NOTIFY.indexOf(OFFICE) !== -1);
  check("the approver is NOT on ADMIN_EMAILS", ADMIN.indexOf(LAURA) === -1,
    JSON.stringify(ADMIN));
  check("  but the office still is", ADMIN.indexOf(OFFICE) !== -1);

  // Read the shipped source: the two emails that ARE her job must address
  // both people. This is the invariant that quietly breaks the workflow.
  const bodyOf = (name) => {
    const start = SRC.indexOf("function " + name + "(");
    if (start === -1) return "";
    const next = SRC.indexOf("\nfunction ", start + 1);
    return SRC.slice(start, next === -1 ? SRC.length : next);
  };
  for (const fn of ["sendSpaceRequestNotification", "sendStaffDecisionConfirmation"]) {
    const body = bodyOf(fn);
    check("  " + fn + " still writes to both", /to: NOTIFY_EMAILS\.join/.test(body),
      body ? "uses ADMIN_EMAILS" : "function not found");
  }
  // And the ones she asked to be off must not.
  for (const fn of ["sendPendingDigest", "reportListHealth", "alertFormBroken",
                    "sendVolumeAlertOnce", "checkScriptTimeZone", "sendNotificationEmail"]) {
    const body = bodyOf(fn);
    check("  " + fn + " is admin only", !/to: NOTIFY_EMAILS\.join/.test(body) &&
      /ADMIN_EMAILS\.join/.test(body), body ? "still writes to NOTIFY_EMAILS" : "not found");
  }
}

console.log("\n=== the sync's own emails reach the office, not the approver ===");
{
  // Trip the removal guard, which is the loudest thing the sync sends.
  const rows = [];
  for (let i = 0; i < 30; i++) rows.push(row("p" + i + "@x.com", "P" + i));
  const w = makeWorld({ headers: WITH_SUB, rows: rows });
  run(w, "syncMailingListToContacts")();
  w.rows = [];
  w.mail.length = 0;
  run(w, "syncMailingListToContacts")();
  check("the guard email went out", w.mail.length === 1);
  check("  addressed to the office", /3rdspacesyv@gmail\.com/.test(w.mail[0].to));
  check("  and not to the approver", !/laurabnewman/.test(w.mail[0].to), w.mail[0].to);
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

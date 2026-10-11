// The survey questions, browser side.
//
// Half of a pair: tests/survey-gs.test.cjs holds the Apps Script to the same
// tests/fixtures/survey-columns.json. The script cannot import TypeScript, so
// the fixture is the only thing stopping a question being added to the page
// and never reaching the sheet.
//
//   bun tests/survey-questions.test.ts
//
import {
  SECTIONS, QUESTIONS, SURVEY_COLUMNS, KIDS_GATE, isVisible, answerToCell,
} from "../src/lib/survey";
import fixture from "./fixtures/survey-columns.json";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, x?: string) =>
  c ? (pass++, console.log("  PASS " + n))
    : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

console.log("\n=== the website and the script agree on the columns ===");
{
  check("the column list matches the fixture",
    JSON.stringify(SURVEY_COLUMNS) === JSON.stringify(fixture.columns),
    JSON.stringify(SURVEY_COLUMNS));
  check("  and so do the question ids",
    JSON.stringify(QUESTIONS.map((q) => q.id)) === JSON.stringify(fixture.questionIds));
  check("  no id is used twice",
    new Set(QUESTIONS.map((q) => q.id)).size === QUESTIONS.length);
  check("  no column name is used twice",
    new Set(QUESTIONS.map((q) => q.column)).size === QUESTIONS.length);
  check("  every column name is short enough to read in a spreadsheet",
    QUESTIONS.every((q) => q.column.length <= 30),
    QUESTIONS.filter((q) => q.column.length > 30).map((q) => q.column).join(", "));
}

console.log("\n=== the two paper questionnaires were merged, not stapled ===");
{
  // Nine questions appeared on both of Laura's pages. Asking them twice is the
  // thing this merge exists to avoid, so it is worth asserting rather than
  // trusting.
  const labels = QUESTIONS.map((q) => q.label.toLowerCase());
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
  check("no question is asked twice", dupes.length === 0, dupes.join(" | "));

  for (const [name, re] of [
    ["day of the week", /which days work best/i],
    ["how often", /how often/i],
    ["program length", /manageable program length/i],
    ["price per session", /good price per session/i],
    ["mixed age group", /mixed age group/i],
  ] as const) {
    check(`  "${name}" appears exactly once`,
      QUESTIONS.filter((q) => re.test(q.label)).length === 1);
  }
}

console.log("\n=== the fixes we agreed, still fixed ===");
{
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

  // The paper asked "what would keep you from NOT joining a program", with
  // barriers as the options. The double negative asks the opposite of what
  // was meant, and the answers would have been unusable.
  check("the barriers question is no longer a double negative",
    /what would keep you from joining/i.test(byId.barriers.label) &&
    !/not joining/i.test(byId.barriers.label),
    byId.barriers.label);

  // 0-5 / 5-10 / 10+ put a group of exactly five in two answers at once.
  const size = byId.groupSize;
  check("group sizes no longer overlap",
    size.kind === "single" && JSON.stringify(size.options) ===
      JSON.stringify(["Up to 5", "6 to 10", "11 or more"]),
    JSON.stringify(size.kind === "single" ? size.options : null));

  // 2-4 / 4-6 / 6-8 put a four-year-old in two bands.
  const ages = byId.kidsAges;
  const bounds = ages.kind === "multi"
    ? ages.options.map((o) => o.match(/\d+/g)!.map(Number)) : [];
  const overlapping = bounds.filter((b, i) => i > 0 && b[0] <= bounds[i - 1][1]);
  check("  kids' age bands no longer overlap", overlapping.length === 0,
    JSON.stringify(overlapping));
  check("  and leave no gap between them",
    bounds.every((b, i) => i === 0 || b[0] === bounds[i - 1][1] + 1),
    JSON.stringify(bounds));

  // The paper's "Morning Midday Evening Weekday Weekend" was two questions
  // in one list.
  const tod = byId.timeOfDay;
  check("time of day asks only about time of day",
    tod.kind === "multi" && !tod.options.some((o) => /week/i.test(o)),
    JSON.stringify(tod.kind === "multi" ? tod.options : null));
  check("  with weekday or weekend asked separately",
    Boolean(byId.weekPart), "no weekPart question");

  // "going the program with your kids" on page two.
  check("'doing a program with your children', not 'going'",
    /doing a program/i.test(byId.programWithKids.label),
    byId.programWithKids.label);

  // Three questions on page two had no options at all.
  for (const id of ["groupSize", "barriers", "natureImportance"]) {
    const q = byId[id];
    check(`  "${q.column}" has answers to choose from`,
      (q.kind === "single" || q.kind === "multi") && q.options.length > 0);
  }
}

console.log("\n=== every question is on the page for everybody ===");
{
  // The kids section used to hide itself until somebody answered Yes. It does
  // not any more: nothing on this survey is conditional, and an empty answer
  // is a perfectly good answer.
  check("no question is hidden behind another",
    !QUESTIONS.some((q) => q.showWhen),
    QUESTIONS.filter((q) => q.showWhen).map((q) => q.id).join(", "));
  check("  so every question is visible with nothing answered",
    QUESTIONS.every((q) => isVisible(q, {})), String(QUESTIONS.length));
  check("  and visible however the kids question is answered",
    QUESTIONS.every((q) => isVisible(q, { [KIDS_GATE]: "No" })) &&
    QUESTIONS.every((q) => isVisible(q, { [KIDS_GATE]: "Yes" })));

  // The question itself stays. It is worth knowing whether an answer came
  // from somebody with kids in mind, and removing it would delete a column
  // from the middle of a sheet that already has rows in it.
  check("the kids question is still asked",
    QUESTIONS.some((q) => q.id === KIDS_GATE), KIDS_GATE);

  // The mechanism is kept even though nothing uses it, so it still has to
  // work if a question is ever gated again.
  const fake = { id: "x", kind: "yesno", label: "x", column: "X",
    showWhen: { question: KIDS_GATE, is: "Yes" } } as const;
  check("  and showWhen still works if it is ever used again",
    !isVisible(fake, {}) && !isVisible(fake, { [KIDS_GATE]: "No" }) &&
    isVisible(fake, { [KIDS_GATE]: "Yes" }));
}

console.log("\n=== it says kids, not children ===");
{
  const everything = QUESTIONS.map((q) => q.label + " " + q.column)
    .concat(SECTIONS.map((x) => x.title + " " + (x.intro || ""))).join(" ");
  check("nothing says children", !/child/i.test(everything),
    (everything.match(/[^.]*child[^.]*/i) || [""])[0]);
  check("  and the kids questions are still there",
    /kids/i.test(everything));
}

console.log("\n=== nothing is required, and the contact details are last ===");
{
  check("no question is marked required", !QUESTIONS.some((q) => q.required));
  const last = SECTIONS[SECTIONS.length - 1];
  check("the final section is about them, not the survey", last.id === "about");
  check("  and says the answers still count without it",
    /still count/i.test(last.intro || ""), last.intro || "");
  const optin = QUESTIONS.find((q) => q.kind === "optin");
  check("there is exactly one mailing list box",
    QUESTIONS.filter((q) => q.kind === "optin").length === 1);
  check("  and it is the last question of all",
    QUESTIONS[QUESTIONS.length - 1].id === optin!.id);
}

console.log("\n=== an answer becomes a cell the same way on both sides ===");
{
  check("a list is joined the way somebody would say it",
    answerToCell(["Art", "Music"]) === "Art, Music");
  check("  nothing answered is blank", answerToCell(undefined) === "");
  check("  not the word undefined", answerToCell(undefined) !== "undefined");
  check("  null is blank too", answerToCell(null) === "");
  check("  a tick is Yes", answerToCell(true) === "Yes");
  check("  and an untick is No, not blank", answerToCell(false) === "No");
  check("  whitespace is trimmed", answerToCell("  hello  ") === "hello");
  check("  an empty list is blank, not a stray comma", answerToCell([]) === "");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

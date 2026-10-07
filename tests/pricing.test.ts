// The pricing rules, browser side.
//
// Runs tests/fixtures/pricing-cases.json against src/lib/pricing.ts. The same
// file is run against the Apps Script port by tests/pricing-gs.test.cjs, which
// is the only thing keeping the number shown to the requester and the number
// stored by the server from drifting apart.
//
// A wrong estimate is not a cosmetic bug. It is a figure somebody reads off
// the screen, writes into a budget, and expects to be charged.
//
//   bun tests/pricing.test.ts
//
import {
  priceRequest, durationMinutes, categoryFromUseType, describeEstimate,
  pricingInputsFromAnswers,
  RATES, OUTDOOR_ADD_ON, OUTDOOR_ONLY_RATE, CLEANING_CHARGE,
  type PricingInput, type RequestAnswers,
} from "../src/lib/pricing";
import cases from "./fixtures/pricing-cases.json";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, x?: string) =>
  c ? (pass++, console.log("  PASS " + n))
    : (fail++, console.log("  FAIL " + n + (x ? " -> " + x : "")));

console.log("\n=== the cases from the brief ===");
for (const c of cases.cases) {
  const got = priceRequest(c.input as PricingInput);
  const e = c.expect as Record<string, unknown>;

  if (got.status !== e.status) {
    check(c.name, false, `expected ${e.status}, got ${got.status}`);
    continue;
  }
  if (got.status !== "estimate") {
    check(c.name + " -> " + got.status, true);
    continue;
  }

  const problems: string[] = [];
  if (got.amount !== e.amount) problems.push(`amount ${got.amount} not ${e.amount}`);
  if (got.unit !== e.unit) problems.push(`unit "${got.unit}" not "${e.unit}"`);
  if (got.lines.length !== e.lines) problems.push(`${got.lines.length} line(s) not ${e.lines}`);
  if ((got.monthlyTotal ?? null) !== ((e.monthlyTotal as number) ?? null)) {
    problems.push(`monthly ${got.monthlyTotal} not ${e.monthlyTotal}`);
  }
  // The breakdown has to add up to the total it sits under. A $230 month
  // shown over an $80 line and a $150 line is the whole point of showing it.
  const sum = got.lines.reduce((t, l) => t + l.amount, 0);
  if (sum !== got.amount) problems.push(`lines total ${sum}, headline ${got.amount}`);

  check(c.name + " -> $" + got.amount + " " + got.unit, problems.length === 0,
    problems.join("; "));
}

console.log("\n=== the form's own answers map onto those inputs ===");
for (const c of cases.answerCases) {
  const got = pricingInputsFromAnswers(c.answers as Partial<RequestAnswers>);
  const want = c.expectInput as Record<string, unknown>;
  const wrong = Object.keys(want).filter(
    (k) => (got as Record<string, unknown>)[k] !== want[k]
  );
  const status = priceRequest(got).status;
  if (status !== c.expectStatus) wrong.push(`status ${status} not ${c.expectStatus}`);
  check(c.name, wrong.length === 0,
    wrong.map((k) => `${k}=${JSON.stringify((got as Record<string, unknown>)[k])}`).join(", "));
}

console.log("\n=== the published table is internally consistent ===");
{
  // Every "both" cell in the confirmed table is its indoor cell plus the same
  // $150. The estimate shows those as two lines, so if a rate were ever
  // edited without the other, the breakdown would stop adding up to the
  // total and people would be quoted a number its own explanation contradicts.
  for (const key of ["meetingOneTime", "meetingRecurring", "eventHalfDay", "eventFullDay"] as const) {
    const r = RATES[key];
    check(`${key}: both is indoor + ${OUTDOOR_ADD_ON}`,
      r.both === r.indoor + OUTDOOR_ADD_ON, `${r.both} vs ${r.indoor} + ${OUTDOOR_ADD_ON}`);
    check(`  ${key}: outdoor-only is the standalone rate`,
      r.outdoor === OUTDOOR_ONLY_RATE, String(r.outdoor));
  }
  check("the cleaning charge is not a rate anybody is quoted",
    CLEANING_CHARGE === 75 &&
    !Object.values(RATES).some((r) => r.indoor === 0 || r.both === 0 || r.outdoor === 0));
}

console.log("\n=== duration ignores setup and cleanup ===");
{
  // There is no argument for them to arrive through. That is the mechanism,
  // not a convention somebody has to remember.
  check("2pm to 6pm is four hours", durationMinutes("14:00", "18:00") === 240,
    String(durationMinutes("14:00", "18:00")));
  check("  one minute past four hours", durationMinutes("14:00", "18:01") === 241);
  check("  exactly two hours", durationMinutes("09:30", "11:30") === 120);
  check("an end before the start has no duration", durationMinutes("18:00", "14:00") === null);
  check("  nor does an equal one", durationMinutes("14:00", "14:00") === null);
  check("  nor does a missing one", durationMinutes("14:00", "") === null);
  check("  nor does nonsense", durationMinutes("25:00", "26:00") === null);
  check("durationMinutes takes two arguments and no others",
    durationMinutes.length === 2, String(durationMinutes.length));
}

console.log("\n=== the category comes from what the form already asks ===");
{
  check("Meeting is a meeting", categoryFromUseType("Meeting") === "meeting");
  check("Workshop or class is an event", categoryFromUseType("Workshop or class") === "event");
  check("Creative event is an event", categoryFromUseType("Creative event") === "event");
  check("Wellness event is an event", categoryFromUseType("Wellness event") === "event");
  // Private is not a category. A private event is an event, and the
  // public/private question has no bearing on the rate.
  check("Private event is an event", categoryFromUseType("Private event") === "event");
  // The two that genuinely do not say. A community gathering is as likely to
  // be a committee with an agenda as a party, and those are $40 and $75.
  check("Community gathering asks", categoryFromUseType("Community gathering") === "ask");
  check("  a free-text Other asks", categoryFromUseType("Birthday for my aunt") === "ask");
  check("  and nothing chosen yet asks", categoryFromUseType("") === "ask");
}

console.log("\n=== a request needing a person is never stored as a zero ===");
{
  const custom = priceRequest({
    category: "event", recurring: true, multiDay: false,
    area: "indoor", durationMinutes: 180, meetingsPerMonth: null,
  });
  const text = describeEstimate(custom);
  check("it says to contact us", /Contact us for pricing/.test(text), text);
  check("  and carries no amount at all", !/\$/.test(text), text);
  check("  and is not a zero", !/\b0\b/.test(text), text);

  const incomplete = describeEstimate(priceRequest({
    category: "", recurring: null, multiDay: false,
    area: "", durationMinutes: null, meetingsPerMonth: null,
  }));
  check("an unfinished form is not a zero either", !/\$|\b0\b/.test(incomplete), incomplete);
}

console.log("\n=== a thinner recurring plan is not cheaper ===");
{
  // Explicitly not prorated. Somebody will ask why two meetings cost the same
  // as four; the answer is that $80 is the monthly minimum for the plan.
  const amounts = [1, 2, 3, 4].map((n) => {
    const r = priceRequest({
      category: "meeting", recurring: true, multiDay: false,
      area: "indoor", durationMinutes: 120, meetingsPerMonth: n,
    });
    return r.status === "estimate" ? r.amount : -1;
  });
  check("one through four indoor meetings are all $80",
    amounts.every((a) => a === 80), amounts.join(", "));

  // Outdoor-only is the opposite: genuinely per meeting, so it does scale.
  const outdoor = [1, 2, 3, 4].map((n) => {
    const r = priceRequest({
      category: "meeting", recurring: true, multiDay: false,
      area: "outdoor", durationMinutes: 120, meetingsPerMonth: n,
    });
    return r.status === "estimate" ? r.monthlyTotal : -1;
  });
  check("  outdoor-only scales, 150 at a time", outdoor.join(",") === "150,300,450,600",
    outdoor.join(","));
}

console.log("\n=== nothing priced is ever free ===");
{
  // A sweep rather than a spot check: no combination of answers may produce a
  // zero, a negative, or a fractional dollar.
  const bad: string[] = [];
  for (const category of ["meeting", "event"] as const) {
    for (const recurring of [true, false]) {
      for (const area of ["indoor", "outdoor", "both"] as const) {
        for (const minutes of [1, 60, 120, 121, 240, 241, 480, 481]) {
          for (const n of [null, 1, 4, 5]) {
            const r = priceRequest({
              category, recurring, multiDay: false, area,
              durationMinutes: minutes, meetingsPerMonth: n,
            });
            if (r.status !== "estimate") continue;
            if (!(r.amount > 0) || !Number.isInteger(r.amount)) {
              bad.push(`${category}/${recurring}/${area}/${minutes}m/${n} -> ${r.amount}`);
            }
          }
        }
      }
    }
  }
  check("every estimate is a whole number of dollars above zero",
    bad.length === 0, bad.slice(0, 3).join(" | "));
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

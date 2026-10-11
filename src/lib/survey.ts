/**
 * The community survey, as one list of questions.
 *
 * This is the only place the questions live. The page renders from it, the
 * submitted payload is keyed by it, and the spreadsheet's column order comes
 * from it, so a question cannot be added to the page without also reaching
 * the sheet.
 *
 * The Apps Script has its own copy of the column list, because it cannot
 * import TypeScript. tests/fixtures/survey-columns.json pins both: the TS
 * side and the script side are each asserted against it, so a question added
 * on one side and not the other fails on the side that was missed.
 *
 * Built from Laura's two paper questionnaires, "QUESTIONNAIRE" and
 * "QUESTIONNAIRE - nature programming for kids". Nine questions appeared on
 * both and are asked once here. Everything changed from the paper wording is
 * listed in the commit message and was approved first.
 */

export type Choice = { value: string; label?: string };

type Base = {
  /** Stable key. Used in the payload and never shown. Do not rename. */
  id: string;
  /** The question, as the person reads it. */
  label: string;
  /** Short spreadsheet column name. Keep under about 30 characters. */
  column: string;
  help?: string;
  /** Almost everything here is optional: a half-answered survey is still data. */
  required?: boolean;
  /** Shown only when another question has this answer. */
  showWhen?: { question: string; is: string };
};

export type Question =
  | (Base & { kind: "textarea" | "text" | "email"; placeholder?: string })
  | (Base & { kind: "single" | "multi"; options: string[]; other?: boolean })
  | (Base & { kind: "yesno" })
  | (Base & { kind: "optin" });

export type Section = {
  id: string;
  title: string;
  intro?: string;
  questions: Question[];
};

/** The question that opens the kids section. Everything in it hangs off this. */
export const KIDS_GATE = "kidsInterest";

export const SECTIONS: Section[] = [
  {
    id: "programming",
    title: "What you would like to see",
    questions: [
      {
        id: "programmingWanted",
        kind: "textarea",
        label: "What kind of programming would you like to see at 3RD SPACE?",
        column: "Programming wanted",
        placeholder: "Anything at all. Rough ideas are useful.",
      },
      {
        id: "topics",
        kind: "multi",
        label: "Which of these topics interest you?",
        column: "Topics",
        help: "Pick as many as you like.",
        options: [
          "Civic or political",
          "Youth culture",
          "Art",
          "Music",
          "Games",
          "Dance",
          "Food and drink",
          "Crafts",
        ],
        other: true,
      },
      {
        id: "groupsMissing",
        kind: "textarea",
        label:
          "What community groups do you think are missing in the Santa Ynez Valley?",
        column: "Groups missing",
      },
      {
        id: "groupsToJoin",
        kind: "multi",
        label: "Which of these groups might you want to join?",
        column: "Groups to join",
        options: ["Women's groups", "Men's group", "Intergenerational groups"],
        other: true,
      },
      {
        id: "mixedAge",
        kind: "yesno",
        label: "Would you consider a mixed age group?",
        column: "Mixed age group",
      },
    ],
  },

  {
    id: "when",
    title: "When it would suit you",
    questions: [
      {
        id: "timeOfDay",
        kind: "multi",
        label: "What time of day suits you best?",
        column: "Time of day",
        help: "Pick as many as you like.",
        options: ["Morning", "Midday", "Evening"],
      },
      {
        id: "weekPart",
        kind: "single",
        label: "Weekdays or weekends?",
        column: "Weekday or weekend",
        options: ["Weekdays", "Weekends", "Either"],
      },
      {
        id: "days",
        kind: "multi",
        label: "Which days work best?",
        column: "Days",
        options: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      {
        id: "groupSize",
        kind: "single",
        label: "What size group interests you?",
        column: "Group size",
        options: ["Up to 5", "6 to 10", "11 or more"],
      },
      {
        id: "frequency",
        kind: "single",
        label: "How often would you like programming?",
        column: "Frequency",
        options: ["Once a week", "Twice a month", "Once a month"],
      },
      {
        id: "sessionLength",
        kind: "single",
        label: "What is a manageable program length?",
        column: "Session length",
        options: ["1 hour", "1.5 hours", "2 hours"],
      },
      {
        id: "pricePoint",
        kind: "single",
        label: "What is a good price per session?",
        column: "Price per session",
        help: "What you would pay to attend. Nothing here is a commitment.",
        options: ["$20", "$40", "$60", "$80"],
      },
      {
        id: "barriers",
        kind: "multi",
        label: "What would keep you from joining a program?",
        column: "Barriers",
        options: ["Transportation", "Schedule", "Cost"],
        other: true,
      },
    ],
  },

  {
    id: "kids",
    title: "Programming for children",
    intro:
      "One question, and the rest of this section only appears if it applies to you.",
    questions: [
      {
        id: KIDS_GATE,
        kind: "yesno",
        label: "Would you be interested in programming for children?",
        column: "Kids programming interest",
      },
      {
        id: "kidsAges",
        kind: "multi",
        label: "Which ages?",
        column: "Kids ages",
        options: ["2 to 4", "5 to 6", "7 to 8", "9 to 11", "12 to 15 (teens)"],
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
      {
        id: "natureInterest",
        kind: "yesno",
        label:
          "Would you be interested in nature programming or nature related crafts for children?",
        column: "Nature programming interest",
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
      {
        id: "natureActivities",
        kind: "multi",
        label: "Which of these sound like fun?",
        column: "Nature activities",
        options: [
          "Yucca rope making",
          "Pine needle basketry",
          "Natural weaving",
          "Wreath making from foraged materials",
          "Wood carving (teens)",
          "Wild plant identification (teens)",
        ],
        other: true,
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
      {
        id: "kidsTimeOfDay",
        kind: "multi",
        label: "What time of day works for children's programs?",
        column: "Kids time of day",
        options: ["3:30pm", "4pm", "5pm", "6pm"],
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
      {
        id: "programWithKids",
        kind: "yesno",
        label: "Would you be interested in doing a program with your children?",
        column: "Program with kids",
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
      {
        id: "natureImportance",
        kind: "single",
        label: "How important is nature programming to you?",
        column: "Nature importance",
        options: ["Not important", "Somewhat important", "Very important", "Essential"],
        showWhen: { question: KIDS_GATE, is: "Yes" },
      },
    ],
  },

  {
    id: "anything",
    title: "Anything else",
    questions: [
      {
        id: "anythingElse",
        kind: "textarea",
        label: "Anything else to help us serve the Santa Ynez Valley?",
        column: "Anything else",
      },
    ],
  },

  {
    id: "about",
    title: "About you",
    intro:
      "All optional. Leave it blank and your answers still count, we just will not be able to come back to you.",
    questions: [
      {
        id: "name",
        kind: "text",
        label: "Your name",
        column: "Name",
        placeholder: "Optional",
      },
      {
        id: "email",
        kind: "email",
        label: "Your email",
        column: "Email",
        placeholder: "Optional",
        help: "Only so we can follow up about programming you said you wanted.",
      },
      {
        id: "joinMailingList",
        kind: "optin",
        label:
          "Keep me posted about 3RD SPACE. Occasional email about what is happening at the space. You can ask to come off the list at any time.",
        column: "Joined mailing list",
      },
    ],
  },
];

/** Every question, in order, flattened out of the sections. */
export const QUESTIONS: Question[] = SECTIONS.flatMap((s) => s.questions);

/**
 * The spreadsheet's columns, in order.
 *
 * One per question, plus the three the sheet needs rather than the person:
 * when it arrived, where it came from, and what browser sent it. An "Other"
 * answer is folded into its own question's cell rather than taking a column
 * of its own, so this stays one to one with the questions above.
 */
export const SURVEY_COLUMNS: string[] = [
  "Timestamp",
  ...QUESTIONS.map((q) => q.column),
  "Source",
  "User Agent",
];

/** Blank for a question nobody answered. Never the string "undefined". */
export function answerToCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

/** Is this question on screen, given what has been answered so far? */
export function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  if (!q.showWhen) return true;
  return answers[q.showWhen.question] === q.showWhen.is;
}

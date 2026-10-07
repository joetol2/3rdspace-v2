/**
 * What a booking costs, as a minimum.
 *
 * This is the only place the rates live. The request form reads it to show a
 * live estimate, /details/ reads it to print the table, and the Apps Script
 * has a port of the same rules (computePricing in mailing-list.gs) so the
 * number that gets stored is worked out on the server rather than taken from
 * whatever the browser posted.
 *
 * Those two implementations are in different languages and cannot import each
 * other, so they are kept honest by tests/fixtures/pricing-cases.json: one
 * table of cases, run against both. A rule changed on one side and not the
 * other fails on the side that was not changed.
 *
 * Everything here is a MINIMUM. 3RD SPACE confirms the real price after
 * reading the request, and nothing in this file is a quote.
 */

/** Meetings are discussions or working sessions. Everything else is an event. */
export type PricingCategory = "meeting" | "event";

/** Which part of the property. "unsure" is the form's "Not sure yet". */
export type AreaChoice = "indoor" | "outdoor" | "both" | "unsure" | "";

export const OUTDOOR_LABEL = "Outdoor / parking lot";

/** A meeting is up to this long. Past it, the request needs a person. */
export const MEETING_MAX_MINUTES = 120;
/** Up to here is a half-day event; past it, a full day. */
export const EVENT_HALF_DAY_MAX_MINUTES = 240;
/** Past here, an event needs individual pricing. */
export const EVENT_FULL_DAY_MAX_MINUTES = 480;
/** The recurring plan covers up to this many meetings in a calendar month. */
export const RECURRING_MEETINGS_INCLUDED = 4;

/**
 * Adding the outdoor area to an indoor booking. The published table is the
 * source of truth below; this is what the difference comes to in every row of
 * it, and it is what the estimate shows as its own line so people can see
 * where the number comes from. A test asserts the two still agree.
 */
export const OUTDOOR_ADD_ON = 150;

/** What an outdoor-only booking costs, whatever shape it is. */
export const OUTDOOR_ONLY_RATE = 150;

/**
 * The published table, exactly as confirmed. Rows are the kind of booking,
 * columns are the area. Transcribed rather than computed on purpose: these
 * are the numbers on the page people are quoted, so a change to them should
 * be a change to this block and nothing else.
 */
export const RATES = {
  meetingOneTime: { indoor: 40, both: 190, outdoor: 150 },
  meetingRecurring: { indoor: 80, both: 230, outdoor: 150 },
  eventHalfDay: { indoor: 75, both: 225, outdoor: 150 },
  eventFullDay: { indoor: 150, both: 300, outdoor: 150 },
} as const;

export type RateKey = keyof typeof RATES;

/** How each row of the table is billed. */
export const RATE_UNITS: Record<RateKey, string> = {
  meetingOneTime: "per meeting",
  meetingRecurring: "per calendar month",
  eventHalfDay: "per event",
  eventFullDay: "per event",
};

/** Row labels, shared by the estimate and the table on /details/. */
export const RATE_LABELS: Record<RateKey, string> = {
  meetingOneTime: "One-time meeting, up to 2 hours",
  meetingRecurring: "Recurring meetings, up to 2 hours each and up to four per calendar month",
  eventHalfDay: "One-time event, up to 4 hours",
  eventFullDay: "One-time event, more than 4 hours and up to 8 hours",
};

/** The charge that is never in the total, and is never automatic. */
export const CLEANING_CHARGE = 75;
export const CLEANING_NOTICE =
  "A $75 cleaning charge applies if the space is left dirty. This charge is not included in the estimate.";

export const ESTIMATE_EXPLANATION =
  "This is a minimum estimate based on your selections. 3RD SPACE will confirm the final price after reviewing your request. Submitting this form does not confirm your booking.";

export const REDUCED_FEE_NOTICE =
  "Reduced fee requested. The estimate above reflects standard pricing. 3RD SPACE will review your request and confirm whether a reduced fee is available.";

export const CUSTOM_PRICING_TEXT = "Contact us for pricing";

/** Customer-facing definitions, used by the form and by /details/. */
export const CATEGORY_DEFINITIONS: Record<PricingCategory, string> = {
  meeting: "A discussion or working session lasting up to 2 hours.",
  event:
    "A gathering such as a celebration or an organized program, including a class or workshop.",
};

// ---------------------------------------------------------------------------
// Working out the category from what the form already asks
// ---------------------------------------------------------------------------

/**
 * The form has asked "type of use" since long before pricing existed, and
 * most of its answers already say which category a request is. Reusing them
 * means almost nobody is asked a new question.
 *
 * "Community gathering" and "Other" are the two that genuinely do not say. A
 * community gathering is as likely to be a committee working through an
 * agenda for ninety minutes as it is a party, and those are $40 and $75. So
 * those two ask, rather than guess and be wrong half the time.
 *
 * Public or private has nothing to do with it. A private event is an event.
 */
export function categoryFromUseType(useType: string): PricingCategory | "ask" {
  const t = (useType || "").trim().toLowerCase();
  if (!t) return "ask";
  if (t === "meeting") return "meeting";
  if (
    t === "workshop or class" ||
    t === "private event" ||
    t === "creative event" ||
    t === "wellness event"
  ) {
    return "event";
  }
  return "ask";
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/**
 * Minutes between two "HH:MM" strings from <input type="time">.
 *
 * Setup and cleanup are deliberately not passed in. They are collected, they
 * decide how long the space is held, and they have never been part of what a
 * booking costs. A four-hour event with an hour of setup is a four-hour
 * event.
 */
export function durationMinutes(startTime: string, endTime: string): number | null {
  const toMinutes = (v: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((v || "").trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };
  const a = toMinutes(startTime);
  const b = toMinutes(endTime);
  if (a === null || b === null) return null;
  if (b <= a) return null;
  return b - a;
}

// ---------------------------------------------------------------------------
// The estimate
// ---------------------------------------------------------------------------

export type PricingInput = {
  /** "" when the request has not said yet. */
  category: PricingCategory | "";
  /**
   * true recurring, false one-time, "unsure" for the form's "Not sure yet",
   * null for not answered at all.
   *
   * Those last two are different answers and the brief treats them
   * differently: an unanswered question is a nudge to finish the form, while
   * "Not sure yet" is a decision the requester has made and is entitled to
   * make, so it gets a real quotable outcome instead of a scolding. Collapsing
   * them into one value is what this field originally did, and the fixture
   * caught it.
   */
  recurring: boolean | "unsure" | null;
  /** A booking that spans more than one day. */
  multiDay: boolean;
  area: AreaChoice;
  /** Null when the times are missing or out of order. */
  durationMinutes: number | null;
  /**
   * Meetings in a calendar month, for a recurring meeting. Null means the
   * requester said it varies or does not know yet.
   */
  meetingsPerMonth: number | null;
};

export type EstimateLine = { label: string; amount: number };

export type PricingResult =
  /** Not enough has been filled in yet. Say what is missing, do not show $0. */
  | { status: "incomplete"; missing: string[] }
  /** Real, submittable, and priced by a person. */
  | { status: "custom"; reason: string }
  | {
      status: "estimate";
      amount: number;
      unit: string;
      lines: EstimateLine[];
      /** Outdoor-only recurring meetings, where the rate is per meeting. */
      monthlyTotal?: number;
      rateKey: RateKey;
    };

/**
 * One function, used by the form, by the submitted payload, and (as a port)
 * by the server. Everything it needs is in its argument, so it can be run
 * against a stored request as easily as against a form being typed into.
 */
export function priceRequest(input: PricingInput): PricingResult {
  const missing: string[] = [];
  if (!input.category) missing.push("whether this is a meeting or an event");
  if (input.recurring === null && !input.multiDay) missing.push("one-time or recurring");
  // Note the asymmetry with "unsure" below: unanswered is incomplete, and
  // "Not sure yet" falls through to a quote.
  if (!input.area) missing.push("the area you need");
  if (input.durationMinutes === null && !input.multiDay) missing.push("a start and end time");
  if (missing.length) return { status: "incomplete", missing };

  // Individual pricing, in the order the reasons are worth reporting. These
  // never block submission: a request that needs a person is still a request.
  if (input.multiDay) {
    return { status: "custom", reason: "This booking runs over more than one day." };
  }
  if (input.area === "unsure") {
    return { status: "custom", reason: "The area has not been settled yet." };
  }
  if (input.recurring === "unsure" || input.recurring === null) {
    return { status: "custom", reason: "Whether this repeats has not been settled yet." };
  }
  if (input.recurring && input.category === "event") {
    return { status: "custom", reason: "This is a repeating event." };
  }

  const area = input.area as "indoor" | "outdoor" | "both";
  const minutes = input.durationMinutes as number;

  if (input.category === "meeting") {
    if (minutes > MEETING_MAX_MINUTES) {
      return {
        status: "custom",
        reason: "A meeting runs up to 2 hours, and this one is longer.",
      };
    }
    if (!input.recurring) {
      return estimateFor("meetingOneTime", area);
    }

    // Recurring meetings.
    //
    // A count we do not have cannot be checked against the four the plan
    // covers, and the plan is the whole basis of the monthly rate, so an
    // unknown count is a person's job rather than a guess. This is also why
    // the field is not capped at four: a bigger series has to stay
    // submittable so it can be quoted.
    if (input.meetingsPerMonth === null) {
      return {
        status: "custom",
        reason: "The number of meetings each month is not settled yet.",
      };
    }
    if (input.meetingsPerMonth > RECURRING_MEETINGS_INCLUDED) {
      return {
        status: "custom",
        reason:
          "The recurring plan covers up to four meetings in a calendar month, and this is more.",
      };
    }
    if (area === "outdoor") {
      // Billed per meeting, not monthly. There is no interior line and no
      // monthly outdoor add-on here: this is the standalone outdoor rate.
      return {
        status: "estimate",
        rateKey: "meetingRecurring",
        amount: OUTDOOR_ONLY_RATE,
        unit: "per meeting",
        lines: [{ label: OUTDOOR_LABEL + ", per meeting", amount: OUTDOOR_ONLY_RATE }],
        monthlyTotal: OUTDOOR_ONLY_RATE * input.meetingsPerMonth,
      };
    }
    // The monthly minimum does not shrink for a shorter month or a thinner
    // plan. Two meetings and four meetings are both $80.
    return estimateFor("meetingRecurring", area);
  }

  // Events.
  if (minutes > EVENT_FULL_DAY_MAX_MINUTES) {
    return {
      status: "custom",
      reason: "This event runs longer than 8 hours.",
    };
  }
  return estimateFor(
    minutes <= EVENT_HALF_DAY_MAX_MINUTES ? "eventHalfDay" : "eventFullDay",
    area
  );
}

function estimateFor(rateKey: RateKey, area: "indoor" | "outdoor" | "both"): PricingResult {
  const amount = RATES[rateKey][area];
  const unit = area === "outdoor" && rateKey === "meetingRecurring"
    ? "per meeting"
    : RATE_UNITS[rateKey];

  let lines: EstimateLine[];
  if (area === "outdoor") {
    // Standalone. No interior line item, per the published table.
    lines = [{ label: OUTDOOR_LABEL + " only", amount }];
  } else if (area === "both") {
    lines = [
      { label: indoorLineLabel(rateKey), amount: RATES[rateKey].indoor },
      { label: OUTDOOR_LABEL, amount: OUTDOOR_ADD_ON },
    ];
  } else {
    lines = [{ label: indoorLineLabel(rateKey), amount }];
  }

  return { status: "estimate", rateKey, amount, unit, lines };
}

function indoorLineLabel(rateKey: RateKey): string {
  switch (rateKey) {
    case "meetingOneTime":
      return "Indoor meeting, up to 2 hours";
    case "meetingRecurring":
      return "Indoor recurring meeting plan, monthly";
    case "eventHalfDay":
      return "Indoor event, up to 4 hours";
    case "eventFullDay":
      return "Indoor event, more than 4 hours";
  }
}

// ---------------------------------------------------------------------------
// From the form's own words to the facts the rate depends on
// ---------------------------------------------------------------------------

/** The answers, exactly as the form and the submitted payload spell them. */
export type RequestAnswers = {
  useType: string;
  /** The extra question, asked only when useType leaves the category open. */
  pricingCategory: string;
  oneTimeRecurring: string;
  requestedArea: string;
  preferredDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  meetingsPerMonth: string | number | null;
};

/**
 * Turn the form's answers into a PricingInput.
 *
 * This has a twin in the Apps Script (pricingInputsFromPayload) so the server
 * can redo the same derivation from a stored request. Keep them identical.
 */
export function pricingInputsFromAnswers(a: Partial<RequestAnswers>): PricingInput {
  const fromUseType = categoryFromUseType(a.useType || "");
  let category: PricingCategory | "" = fromUseType === "ask" ? "" : fromUseType;
  if (fromUseType === "ask") {
    const stated = (a.pricingCategory || "").trim().toLowerCase();
    if (stated === "meeting" || stated === "event") category = stated;
  }

  const recurrenceAnswer = (a.oneTimeRecurring || "").trim();
  let recurring: boolean | "unsure" | null = null;
  if (recurrenceAnswer === "Recurring request") recurring = true;
  else if (recurrenceAnswer === "One-time request") recurring = false;
  else if (recurrenceAnswer === "Not sure yet") recurring = "unsure";

  const areaAnswer = (a.requestedArea || "").trim();
  let area: AreaChoice = "";
  if (areaAnswer === "Indoor space") area = "indoor";
  else if (areaAnswer === "Outdoor / parking lot") area = "outdoor";
  else if (areaAnswer === "Both") area = "both";
  else if (areaAnswer === "Not sure yet") area = "unsure";

  const preferredDate = (a.preferredDate || "").trim();
  const endDate = (a.endDate || "").trim();
  // A later last day means a booking that runs across days: a festival, a
  // retreat. On a RECURRING request it means something completely different,
  // the date the series stops, and the space is not held in between.
  //
  // Reading one as the other is not hypothetical here. It is what once made a
  // request for Wednesday evenings "until 21 October" collide with an
  // unrelated booking on 3 October, and it would do the same to pricing: a
  // weekly meeting would be quoted as a three-week occupation of the building.
  const multiDay = Boolean(endDate && preferredDate && endDate > preferredDate && recurring !== true);

  let meetingsPerMonth: number | null = null;
  const raw = a.meetingsPerMonth;
  if (raw !== "" && raw !== null && raw !== undefined) {
    const n = Number(raw);
    if (isFinite(n) && n > 0 && Math.floor(n) === n) meetingsPerMonth = n;
  }

  return {
    category,
    recurring,
    multiDay,
    area,
    durationMinutes: durationMinutes(a.startTime || "", a.endTime || ""),
    meetingsPerMonth,
  };
}

/** "$80". Every rate is a whole number of dollars. */
export function formatUsd(amount: number): string {
  return "$" + String(amount);
}

/**
 * What goes into the stored request and the staff email: the estimate as a
 * short, readable line, with no decoration a spreadsheet cell cannot hold.
 *
 * A request that needs individual pricing says so. It must never arrive as a
 * zero, which would read as a free booking and total up as one.
 */
export function describeEstimate(result: PricingResult): string {
  if (result.status === "incomplete") return "Not enough selections to estimate";
  if (result.status === "custom") return CUSTOM_PRICING_TEXT + " (" + result.reason + ")";
  const base = formatUsd(result.amount) + " " + result.unit;
  return result.monthlyTotal
    ? base + "; " + formatUsd(result.monthlyTotal) + " for that month"
    : base;
}

import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { submitToMailingList } from "@/lib/mailingList";
import {
  SECTIONS,
  QUESTIONS,
  isVisible,
  type Question,
  type Section,
} from "@/lib/survey";

/**
 * The community survey.
 *
 * Rendered entirely from src/lib/survey.ts, so a question is added by editing
 * that list and nothing else. The payload is keyed by question id and the
 * spreadsheet columns come from the same list, which is what stops a question
 * existing on the page but not in the sheet.
 *
 * Every question is optional on purpose. Somebody who answers four of them and
 * stops has still told us something, and a required field is the most reliable
 * way to turn that person into nothing at all. The only thing the form insists
 * on is that it is not completely empty.
 */

type Answers = Record<string, string | string[] | boolean | undefined>;

const OTHER_SUFFIX = "__other";

function Legend({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <legend className="text-[15px] font-semibold text-foreground/90">
      {children}
      {required && <span className="ml-1 text-foreground/70">*</span>}
    </legend>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{children}</p>
  );
}

function TextBox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="mt-2 block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
    />
  );
}

function AreaBox(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      maxLength={1000}
      {...props}
      className="mt-2 block w-full resize-y rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10"
    />
  );
}

function QuestionField({
  q,
  answers,
  set,
}: {
  q: Question;
  answers: Answers;
  set: (id: string, value: Answers[string]) => void;
}) {
  const value = answers[q.id];

  if (q.kind === "textarea" || q.kind === "text" || q.kind === "email") {
    const id = "q-" + q.id;
    return (
      <div>
        <label htmlFor={id} className="block text-[15px] font-semibold text-foreground/90">
          {q.label}
        </label>
        {q.help && <Help>{q.help}</Help>}
        {q.kind === "textarea" ? (
          <AreaBox
            id={id}
            name={q.id}
            placeholder={q.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(q.id, e.target.value)}
          />
        ) : (
          <TextBox
            id={id}
            name={q.id}
            type={q.kind === "email" ? "email" : "text"}
            placeholder={q.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(q.id, e.target.value)}
          />
        )}
      </div>
    );
  }

  if (q.kind === "optin") {
    // Unticked by default, and separate from everything else. Answering a
    // survey is not asking for a newsletter.
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <label className="flex cursor-pointer gap-3">
          <input
            type="checkbox"
            name={q.id}
            checked={value === true}
            onChange={(e) => set(q.id, e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
          />
          <span className="text-[14px] leading-relaxed text-foreground/80">{q.label}</span>
        </label>
      </div>
    );
  }

  if (q.kind === "yesno") {
    return (
      <fieldset>
        <Legend>{q.label}</Legend>
        {q.help && <Help>{q.help}</Help>}
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {["Yes", "No", "Not sure"].map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80"
            >
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={value === opt}
                onChange={() => set(q.id, opt)}
                className="h-4 w-4 accent-foreground"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Narrowed positively rather than by elimination. The text kinds share one
  // union member whose `kind` is itself a union, and TypeScript will not drop
  // that member from an `||` chain of equality checks, so the earlier returns
  // alone leave `options` looking absent.
  if (q.kind !== "single" && q.kind !== "multi") return null;

  const chosen = Array.isArray(value) ? value : [];
  const otherText = answers[q.id + OTHER_SUFFIX];
  return (
    <fieldset>
      <Legend>{q.label}</Legend>
      {q.help && <Help>{q.help}</Help>}
      <div className="mt-2 flex flex-col gap-2">
        {q.options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80"
          >
            <input
              type={q.kind === "single" ? "radio" : "checkbox"}
              name={q.id}
              value={opt}
              checked={q.kind === "single" ? value === opt : chosen.includes(opt)}
              onChange={(e) => {
                if (q.kind === "single") {
                  set(q.id, opt);
                } else {
                  set(
                    q.id,
                    e.target.checked
                      ? [...chosen, opt]
                      : chosen.filter((c) => c !== opt)
                  );
                }
              }}
              className="h-4 w-4 accent-foreground"
            />
            {opt}
          </label>
        ))}
        {q.other && (
          <div>
            <label
              htmlFor={"q-" + q.id + "-other"}
              className="text-[15px] text-foreground/80"
            >
              Other
            </label>
            <TextBox
              id={"q-" + q.id + "-other"}
              name={q.id + OTHER_SUFFIX}
              placeholder="Tell us"
              value={typeof otherText === "string" ? otherText : ""}
              onChange={(e) => set(q.id + OTHER_SUFFIX, e.target.value)}
            />
          </div>
        )}
      </div>
    </fieldset>
  );
}

type Status = "idle" | "submitting" | "success" | "error";

export function SurveyForm() {
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<Status>("idle");

  const set = (id: string, value: Answers[string]) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  // Answers to questions that are no longer on screen must not be submitted.
  // Saying yes to children's programming, filling the section in and then
  // changing the answer to no would otherwise send both, and the sheet would
  // show ages for somebody who told us they have no children.
  const visible = QUESTIONS.filter((q) => isVisible(q, answers));
  const visibleIds = new Set(visible.map((q) => q.id));

  const hasAnything = visible.some((q) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim() !== "";
    return v === true || typeof v === "string";
  });

  useEffect(() => {
    if (status === "success") window.scrollTo(0, 0);
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting" || !hasAnything) return;

    const payload: Record<string, unknown> = {
      formType: "survey_response" as const,
      source: "3RD SPACE community survey",
      userAgent: navigator.userAgent,
      honeypot: String(answers.website || ""),
    };

    for (const q of QUESTIONS) {
      if (!visibleIds.has(q.id)) continue;
      const v = answers[q.id];
      if (q.kind === "optin") {
        payload[q.id] = v === true;
        continue;
      }
      if (q.kind === "multi" || q.kind === "single") {
        const other = answers[q.id + OTHER_SUFFIX];
        const extra =
          q.other && typeof other === "string" && other.trim()
            ? ["Other: " + other.trim()]
            : [];
        if (q.kind === "single") {
          payload[q.id] = [typeof v === "string" ? v : "", ...extra]
            .filter(Boolean)
            .join(", ");
        } else {
          // Sorted into the order the question lists them, not the order they
          // were clicked. The cell is a joined string, so click order means
          // the same three answers arrive written three different ways and
          // the column cannot be sorted or grouped. An Other answer stays
          // last, where it reads naturally.
          const picked = (Array.isArray(v) ? v : [])
            .slice()
            .sort((a, b) => q.options.indexOf(a) - q.options.indexOf(b));
          payload[q.id] = [...picked, ...extra];
        }
        continue;
      }
      payload[q.id] = typeof v === "string" ? v.trim() : "";
    }

    setStatus("submitting");
    try {
      await submitToMailingList(payload as Parameters<typeof submitToMailingList>[0]);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-xl text-background">
          ✓
        </div>
        <p className="font-display text-xl font-bold text-foreground">Thank you</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
          Your answers have been received. They go straight to the people deciding
          what happens at the space, and they genuinely shape it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Not a real field. Off-screen and out of the tab order, so nobody
          filling this in will ever see it, while an automated form filler
          walking the DOM will complete it. The Apps Script throws away
          anything that arrives with it set. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={typeof answers.website === "string" ? answers.website : ""}
        onChange={(e) => set("website", e.target.value)}
        className="absolute left-[-9999px] h-px w-px opacity-0"
      />

      {SECTIONS.map((section: Section) => {
        const shown = section.questions.filter((q) => isVisible(q, answers));
        if (!shown.length) return null;
        return (
          <fieldset key={section.id} className="space-y-6">
            <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {section.title}
            </legend>
            {section.intro && (
              <p className="text-[14.5px] leading-relaxed text-foreground/75">
                {section.intro}
              </p>
            )}
            {shown.map((q) => (
              <QuestionField key={q.id} q={q} answers={answers} set={set} />
            ))}
          </fieldset>
        );
      })}

      {status === "error" && (
        <p className="text-sm text-destructive">
          That did not send. Please try again, or email us at{" "}
          <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={status === "submitting" || !hasAnything}
          className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3.5 text-base font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:w-auto"
        >
          {status === "submitting" ? "Sending..." : "Send my answers"}
        </button>
        {!hasAnything && (
          <p className="text-[14px] text-muted-foreground">
            Answer anything above and this will light up. Every question is
            optional, so answer as few or as many as you like.
          </p>
        )}
      </div>
    </form>
  );
}

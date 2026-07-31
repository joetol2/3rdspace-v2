import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import { submitToMailingList } from "@/lib/mailingList";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKind = "invalid" | "server" | null;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function EmailSignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setStatus("error");
      setErrorKind("invalid");
      return;
    }

    setStatus("submitting");
    setErrorKind(null);
    try {
      await submitToMailingList({
        formType: "email_capture",
        email: normalized,
        source: "3RD SPACE motto signup",
        userAgent: navigator.userAgent,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorKind("server");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-5 max-w-sm text-right">
        <p className="text-[15px] font-medium text-foreground">Thank you. You're on the list.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Want to tell us more?{" "}
          <Link className="underline underline-offset-4 hover:text-accent" to="/join">
            Complete the full join form.
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 max-w-sm">
      <p className="text-sm text-foreground/80 text-right">
        Join the mailing list for 3RD SPACE events, programs, and community updates.
      </p>
      <div className="mt-3 flex gap-2">
        <label htmlFor="motto-email" className="sr-only">
          Email address
        </label>
        <input
          id="motto-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          disabled={status === "submitting"}
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {status === "submitting" ? "Joining..." : "Join"}
        </button>
      </div>
      {status === "error" && errorKind === "invalid" && (
        <p className="mt-2 text-sm text-destructive">Please enter a valid email address.</p>
      )}
      {status === "error" && errorKind === "server" && (
        <p className="mt-2 text-sm text-destructive">
          Something went wrong. Please try again or email us at{" "}
          <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      )}
    </form>
  );
}

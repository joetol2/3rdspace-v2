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
      <div className="max-w-sm">
        <p className="text-[15px] font-medium text-background">Thank you. You're on the list.</p>
        <p className="mt-1 text-sm text-background/70">
          Want to tell us more?{" "}
          <Link className="underline underline-offset-4 hover:text-background" to="/join">
            Complete the full join form.
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-sm">
      <p className="text-sm text-background/80">Join the mailing list.</p>
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
          className="min-w-0 flex-1 rounded-full border border-background/30 bg-foreground px-4 py-2 text-[15px] text-background placeholder:text-background/50 focus:border-background/60 focus:outline-none focus:ring-2 focus:ring-background/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-full bg-background px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60 disabled:opacity-60"
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

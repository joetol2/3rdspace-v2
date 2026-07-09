import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { navLinks } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import logoBlack from "@/img/logo-black.png";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="3RD SPACE home">
          <img src={logoBlack} alt="3RD SPACE" className="h-10 w-auto sm:h-12" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/75 lg:flex">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to as any} className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <CTAButton href="/request" className="hidden sm:inline-flex">
            Request the Space
          </CTAButton>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true" className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3 sm:px-8">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to as any}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <CTAButton href="/request" className="w-full">Request the Space</CTAButton>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

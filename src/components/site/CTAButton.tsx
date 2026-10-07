import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function isInternalPath(href: string) {
  return href.startsWith("/");
}

export function CTAButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const b =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base min-h-11";
  const styles =
    variant === "primary"
      ? "bg-foreground text-background hover:bg-foreground/85"
      : "border border-foreground/30 text-foreground hover:bg-foreground/5";
  const combined = `${b} ${styles} ${className}`;

  if (isInternalPath(href)) {
    const [pathname, hash] = href.split("#");
    // Cast because href is a runtime string: this button also carries tel:,
    // mailto: and values read out of data arrays, so it cannot be narrowed to
    // the router's list of routes the way navLinks is.
    //
    // That means nothing here checks the path, and a trailing slash missing
    // from a caller will not fail the build. The router normalises it at
    // render time, so the rendered href comes out canonical either way, but
    // the only thing actually watching is tests/links.test.mjs, which reads
    // the hrefs off the built pages.
    return (
      <Link to={pathname as any} hash={hash} className={combined}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={combined}>
      {children}
    </a>
  );
}

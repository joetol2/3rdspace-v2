import { Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import logoWhite from "@/img/logo-white.png";
import { MottoSection } from "@/components/site/MottoSection";

export function Footer() {
  return (
    <footer>
      <MottoSection />
      <div className="border-t border-border bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-3">
          <div>
            <img src={logoWhite} alt="3RD SPACE" className="w-32" />
            <p className="mt-3 max-w-xs text-background/75">
              A safe place to gather in the Santa Ynez Valley.
            </p>
          </div>
          <div className="text-background/80">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Contact</p>
            <div className="mt-3 space-y-1">
              <p>
                <a className="underline underline-offset-4 hover:text-background" href={`mailto:${site.email}`}>{site.email}</a>
              </p>
              <p>
                <a className="underline underline-offset-4 hover:text-background" href={site.phoneHref}>{site.phone}</a>
              </p>
              <p className="mt-3">{site.address.line1}</p>
              <p>{site.address.line2}</p>
            </div>
          </div>
          <div className="text-background/80">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Visit</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="hover:text-background" to="/details" hash="community-agreements">Community Agreements</Link></li>
              <li><Link className="hover:text-background" to="/guidelines">Space Use Guidelines</Link></li>
              <li><Link className="hover:text-background" to="/calendar">Calendar</Link></li>
              <li><Link className="hover:text-background" to="/request">Request Space</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/15">
          <div className="mx-auto max-w-6xl px-5 py-5 text-sm text-background/60 sm:px-8">
            © {new Date().getFullYear()} 3RD SPACE. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

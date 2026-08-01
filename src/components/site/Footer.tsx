import { Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import logoWhite from "@/img/logo-white.png";
import buildingPhoto from "@/img/IMG_5999.jpeg";
import { MottoSection } from "@/components/site/MottoSection";
import { EmailSignupForm } from "@/components/site/EmailSignupForm";

export function Footer() {
  return (
    <footer>
      <MottoSection />
      <div className="border-t border-border bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-4">
          <div>
            <img src={logoWhite} alt="3RD SPACE" className="w-32" />
            <p className="mt-3 max-w-xs text-background/75">
              A safe place to gather in the Santa Ynez Valley.
            </p>
          </div>
          <div className="text-background/80">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/75">Contact</p>
            <div className="mt-3 space-y-1">
              <p>
                <a className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" href={`mailto:${site.email}`}>{site.email}</a>
              </p>
              <p>
                <a className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" href={site.phoneHref}>{site.phone}</a>
              </p>
              <p className="mt-3">{site.address.line1}</p>
              <p>{site.address.line2}</p>
            </div>
          </div>
          <div className="text-background/80">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/75">Visit</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/details" hash="our-guidelines">Our Guidelines</Link></li>
              <li><Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/guidelines">Space Use Guidelines</Link></li>
              <li><Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/calendar">Calendar</Link></li>
              <li><Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/request">Request Space</Link></li>
              <li><Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/support">Support</Link></li>
            </ul>
          </div>
          <div className="flex">
            <img
              src={buildingPhoto}
              alt="3RD SPACE building"
              className="h-full w-auto rounded-2xl object-cover"
            />
          </div>
          <div className="flex justify-end sm:col-span-2 md:col-span-2 md:col-start-3">
            <EmailSignupForm />
          </div>
        </div>
        <div className="border-t border-background/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-background/75 sm:px-8">
            <p>© {new Date().getFullYear()} 3RD SPACE. All rights reserved.</p>
            <div className="flex gap-4">
              <Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/accessibility">Accessibility</Link>
              <Link className="rounded-sm hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60" to="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

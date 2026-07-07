import { site } from "@/config/site";

export function ContactBlock() {
  return (
    <div className="space-y-1 text-foreground/80">
      <p>
        Email:{" "}
        <a className="font-medium text-foreground underline underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
          {site.email}
        </a>
      </p>
      <p>
        Phone:{" "}
        <a className="font-medium text-foreground underline underline-offset-4 hover:text-accent" href={site.phoneHref}>
          {site.phone}
        </a>
      </p>
    </div>
  );
}

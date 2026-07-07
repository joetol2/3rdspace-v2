import type { ReactNode } from "react";

export function InfoCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold leading-snug text-foreground">{title}</h3>
      {children ? (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

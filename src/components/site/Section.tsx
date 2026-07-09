import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
  level = "h2",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
  level?: "h1" | "h2";
}) {
  const Heading = level;
  return (
    <section id={id} className={`scroll-mt-24 border-t border-border/60 ${className}`}>
      <motion.div
        className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <Heading className="font-display text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </Heading>
        <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-foreground/80 sm:text-lg">
          {children}
        </div>
      </motion.div>
    </section>
  );
}

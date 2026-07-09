import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import buildingPhoto2 from "@/img/IMG_6012.jpeg";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | 3RD SPACE" },
      {
        name: "description",
        content: "Support 3RD SPACE through donations, volunteering, sponsorship, or partnership in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: Page,
});

function Page() {
  return (
    <section id="support" className="scroll-mt-24 border-t border-border/60">
      {/* Photo on mobile */}
      <motion.div
        className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 md:hidden"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <img
          src={buildingPhoto2}
          alt="3RD SPACE interior"
          className="w-full rounded-2xl object-cover shadow-sm"
        />
      </motion.div>
      {/* Text + photo side by side on md+ */}
      <div className="mx-auto grid max-w-5xl gap-8 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 md:grid-cols-[1fr_auto] md:items-start md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Support</p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">Help keep the space accessible</h1>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-foreground/80 sm:text-lg">
            <p>
              Support helps keep 3RD SPACE available for local programs, community use, sliding scale access, artists, organizers, and care of the physical space.
            </p>
            <p>
              If you would like to donate, volunteer, sponsor a program, offer in-kind support, or discuss a partnership, please get in touch.
            </p>
          </div>
        </motion.div>
        <motion.div
          className="hidden md:block"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <img
            src={buildingPhoto2}
            alt="3RD SPACE interior"
            className="w-44 rounded-2xl object-cover shadow-sm lg:w-52"
          />
        </motion.div>
      </div>
    </section>
  );
}

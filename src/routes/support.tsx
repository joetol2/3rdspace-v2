import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { site } from "@/config/site";
import { CTAButton } from "@/components/site/CTAButton";
import buildingPhoto2 from "@/img/IMG_6012.jpeg";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | 3RD SPACE" },
      {
        name: "description",
        content: "Support 3RD SPACE through donations, volunteering, sponsorship, or the mailing list in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: Page,
});

const supportPaths = [
  {
    title: "Donate",
    description: "Help fund low-cost and sliding-scale programming and care of the space.",
    href: `mailto:${site.email}?subject=${encodeURIComponent("Donate to 3RD SPACE")}`,
  },
  {
    title: "Volunteer",
    description: "Lend your time to help host, set up, or run community programs.",
    href: `mailto:${site.email}?subject=${encodeURIComponent("Volunteer at 3RD SPACE")}`,
  },
  {
    title: "Sponsor",
    description: "Sponsor a program or discuss a partnership with 3RD SPACE.",
    href: `mailto:${site.email}?subject=${encodeURIComponent("Sponsorship inquiry")}`,
  },
  {
    title: "Join the mailing list",
    description: "Get updates on events, programs, and news from 3RD SPACE.",
    href: "/join",
  },
  {
    title: "Contact the 3RD SPACE team",
    description: "Have a question or want to talk it through? Reach the team directly.",
    href: "/request#contact",
  },
];

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
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">Help keep the space accessible</h1>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-foreground/80 sm:text-lg">
            <p>
              Support helps keep 3RD SPACE available for community use. To donate, volunteer, sponsor, or join the mailing list, please get in touch.
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

      <div className="mx-auto max-w-5xl px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {supportPaths.map((p) => (
            <div key={p.title} className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{p.description}</p>
              </div>
              <div>
                <CTAButton href={p.href} variant="ghost">{p.title}</CTAButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

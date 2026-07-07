import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CTAButton } from "@/components/site/CTAButton";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import { AboutSection } from "@/components/site/AboutSection";
import { MottoSection } from "@/components/site/MottoSection";
import taglineImg from "@/img/tagline.png";
import heroBg from "@/img/hero-bg.png";
import heroPhoto from "@/img/IMG_6065.jpeg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3RD SPACE | A Safe Place to Gather in Santa Ynez" },
      {
        name: "description",
        content:
          "3RD SPACE is a welcoming community place in Santa Ynez for local programs, workshops, meetings, wellness offerings, private gatherings, and community-led events.",
      },
      { property: "og:title", content: "3RD SPACE" },
      { property: "og:description", content: "A safe place to gather in the Santa Ynez Valley." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Page,
});

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <ParallaxBg src={heroBg} overlay="bg-gradient-to-b from-[rgba(245,240,225,0.35)] to-[rgba(245,240,225,0.82)]" />

      <div className="relative mx-auto max-w-5xl px-5 pt-14 sm:px-8 sm:pt-20">
        <motion.p
          className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Santa Ynez, California
        </motion.p>
        <motion.img
          src={taglineImg}
          alt="A safe place to gather in the Santa Ynez Valley"
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        />
      </div>

      {/* Baby photo — full width on mobile, tucked right on md+ */}
      <motion.div
        className="relative mx-auto max-w-5xl px-5 pt-8 sm:px-8 md:hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <img
          src={heroPhoto}
          alt="3RD SPACE"
          className="w-full rounded-2xl object-cover shadow-sm"
        />
      </motion.div>

      {/* Body copy + baby photo side by side on md+ */}
      <div className="relative mx-auto grid max-w-5xl gap-8 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 md:grid-cols-[1fr_auto] md:items-start md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="max-w-[650px] space-y-4 text-lg text-foreground/80">
            <p>
              3RD SPACE is a welcoming community place in Santa Ynez for local programs, workshops, meetings, wellness offerings, private gatherings, and community-led events.
            </p>
            <p>
              We support accessible use of the space through low-cost and sliding scale options whenever possible.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <CTAButton href="/calendar" variant="ghost">View Calendar</CTAButton>
            <CTAButton href="/request">Request the Space</CTAButton>
            <CTAButton href="/contact" variant="ghost">Get in touch</CTAButton>
          </div>
        </motion.div>
        <motion.div
          className="hidden md:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          <img
            src={heroPhoto}
            alt="3RD SPACE"
            className="w-44 rounded-2xl object-cover shadow-sm lg:w-52"
          />
        </motion.div>
      </div>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <AboutSection />
      <MottoSection />
    </>
  );
}

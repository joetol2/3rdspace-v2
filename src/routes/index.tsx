import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import logoWhite from "@/img/logo-white.png";
import taglineImg from "@/img/tagline.png";
import heroBg from "@/img/hero-bg.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3RD SPACE | A Safe Place to Gather in Santa Ynez" },
      {
        name: "description",
        content:
          "3RD SPACE is a welcoming and accessible home for community life in the Santa Ynez Valley. We provide low-cost and sliding-scale space for creative, cultural, civic, and community programming, with a safe place for people to gather.",
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
      <ParallaxBg src={heroBg} overlay="" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pt-14 pb-16 text-center sm:px-8 sm:pt-20 sm:pb-24">
        <h1 className="sr-only">3RD SPACE — A safe place to gather in the Santa Ynez Valley</h1>
        <motion.img
          src={logoWhite}
          alt="3RD SPACE"
          className="w-[480px] max-w-full sm:w-[576px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
        <motion.img
          src={taglineImg}
          alt="A safe place to gather"
          className="mt-6 w-full max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        />
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="border-t border-border/60 bg-background">
      <motion.div
        className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 sm:py-24"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="text-lg leading-relaxed text-foreground/80 sm:text-xl">
          3RD SPACE is a welcoming and accessible home for community life in the Santa Ynez Valley. We provide low-cost and sliding-scale space for creative, cultural, civic, and community programming, with a safe place for people to gather.
        </p>
      </motion.div>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <Intro />
    </>
  );
}

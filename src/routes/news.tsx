import { createFileRoute } from "@tanstack/react-router";
import { ParallaxBg } from "@/components/site/ParallaxBg";
import { Section } from "@/components/site/Section";
import newsBg from "@/img/inside_IMG_0819.png";
import refugeWithinTumultPhoto from "@/img/IMG_1284-1-rotated.webp";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News | 3RD SPACE" },
      {
        name: "description",
        content: "Press coverage and news about 3RD SPACE, a community space in Santa Ynez.",
      },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: Page,
});

type PressItem = {
  title: string;
  source?: string;
  date?: string;
  summary?: string;
  photo?: string;
  photoAlt?: string;
  url: string;
};

const pressItems: PressItem[] = [
  {
    title: "A Refuge Within Tumult",
    source: "Santa Barbara Independent",
    date: "July 7, 2026",
    summary:
      "After her husband and creative partner Jim Tauber died in 2025, Laura Newman carried their shared vision forward alone: a welcoming, sliding-scale gathering space on Numancia Street in Santa Ynez. Columnist Cynthia Carbone Ward visits 3RD SPACE's opening celebration and talks with Newman about grief, love, and building something that will outlast her.",
    url: "https://www.independent.com/2026/07/07/a-refuge-within-tumult/",
    photo: refugeWithinTumultPhoto,
    photoAlt: "Laura Newman speaking at the 3RD SPACE opening celebration",
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden border-t border-border/60">
      <ParallaxBg src={newsBg} overlay="bg-[rgba(20,18,16,0.55)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
          News
        </h1>
        <p className="mt-4 text-lg text-white/85 sm:text-xl">
          Press coverage and stories about 3RD SPACE.
        </p>
      </div>
    </section>
  );
}

function PressCard({ item }: { item: PressItem }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card sm:flex-row">
      <div className="aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56">
        {item.photo ? (
          <img src={item.photo} alt={item.photoAlt ?? ""} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center bg-muted text-xs uppercase tracking-widest text-muted-foreground">
            Photo coming soon
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 p-6">
        {(item.source || item.date) && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.source}
            {item.source && item.date ? " · " : ""}
            {item.date}
          </p>
        )}
        <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
        <p className="text-[15px] leading-relaxed text-foreground/80">
          {item.summary ?? "Summary coming soon."}
        </p>
        <div className="pt-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-foreground underline underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Read the article <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <Section id="press" title="In the news">
        <div className="space-y-6">
          {pressItems.map((item) => (
            <PressCard key={item.url} item={item} />
          ))}
        </div>
      </Section>
    </>
  );
}

import buildingPhoto from "@/img/IMG_5999.jpeg";
import mottoImg from "@/img/motto.png";

export function MottoSection() {
  return (
    <section className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        {/* Building photo — visible on mobile above motto, hidden on md+ (shown in grid) */}
        <div className="mb-8 md:hidden">
          <img
            src={buildingPhoto}
            alt="3RD SPACE building"
            className="w-full rounded-3xl object-cover shadow-sm"
          />
        </div>
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div className="hidden md:block">
            <img
              src={buildingPhoto}
              alt="3RD SPACE building"
              className="mx-auto w-full max-w-sm rounded-3xl object-cover shadow-sm"
            />
          </div>
          <div className="flex items-end justify-end">
            <img
              src={mottoImg}
              alt='"Let me get that for you" — JT'
              className="w-full max-w-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

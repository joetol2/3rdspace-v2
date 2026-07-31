import signPhoto from "@/img/3d_sign.jpg";
import mottoImg from "@/img/motto.png";
import { EmailSignupForm } from "@/components/site/EmailSignupForm";

export function MottoSection() {
  return (
    <section className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        {/* Sign photo — visible on mobile above motto, hidden on md+ (shown in grid) */}
        <div className="mb-8 md:hidden">
          <img
            src={signPhoto}
            alt="3RD SPACE sign above the building entrance"
            className="w-full rounded-3xl object-cover shadow-sm"
          />
        </div>
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-end">
          <div className="hidden md:block">
            <img
              src={signPhoto}
              alt="3RD SPACE sign above the building entrance"
              className="mx-auto w-full max-w-sm rounded-3xl object-cover shadow-sm"
            />
          </div>
          <div className="flex flex-col items-center">
            <img
              src={mottoImg}
              alt='"Let me get that for you" — JT'
              className="w-full max-w-lg"
            />
            <EmailSignupForm />
          </div>
        </div>
      </div>
    </section>
  );
}

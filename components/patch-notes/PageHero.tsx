"use client";

import FadeIn from "@/components/motion/FadeIn";

interface PageHeroProps {
  title: string;
  description?: string;
  mb?: number;
}

export default function PageHero({ title, description, mb = 5 }: PageHeroProps) {
  return (
    <div
      className="relative px-4 pt-10 sm:px-5"
      style={{ marginBottom: mb }}
    >
      <div className="relative z-1 flex max-w-2xl flex-col gap-3">
        <FadeIn>
          <h1 className="font-colus text-4xl font-normal tracking-[-0.02em] text-white sm:text-5xl sm:leading-[1.05]">
            {title}
          </h1>
        </FadeIn>
        {description ? (
          <FadeIn delay={0.08}>
            <p className="max-w-lg text-base leading-relaxed text-foreground/90 sm:text-lg">
              {description}
            </p>
          </FadeIn>
        ) : null}
      </div>
    </div>
  );
}

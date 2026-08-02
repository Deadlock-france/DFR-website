"use client";

import FadeIn from "@/components/motion/FadeIn";

interface PageHeroProps {
  title: string;
  description?: string;
  mb?: number;
}

export default function PageHero({ title, description, mb = 5 }: PageHeroProps) {
  return (
    <div className="relative p-4 sm:p-5" style={{ marginBottom: mb }}>
      
      <div className="relative z-1 flex flex-col gap-1.5 mt-10">
        <FadeIn>
          <h1
            className="bg-clip-text text-4xl font-extrabold tracking-[-0.02em]"
            style={{ color: "white" }}
          >
            {title}
          </h1>
        </FadeIn>
        {description ? (
          <FadeIn delay={0.08}>
            <p className="max-w-[640px] leading-[1.7] text-muted-foreground">
              {description}
            </p>
          </FadeIn>
        ) : null}
      </div>
    </div>
  );
}

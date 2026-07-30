"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import AppLink from "@/components/AppLink";
import { buttonVariants } from "@/components/shadcn/button";
import { easeOut } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const DISCORD_INVITE_URL = "https://discord.gg/deadlock";
/** Artwork officiel Steam — format paysage, idéal en fond de hero */
const HERO_IMAGE =
  "/assets/header_heroes.png";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function LandingHero() {
  const reduceMotion = useReducedMotion();

  const content = (
    <div className="relative z-1 mx-auto flex min-h-[min(72vh,640px)] w-full max-w-[1200px] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-xl">
        <h1
          className="font-colus bg-clip-text text-4xl font-normal tracking-[-0.02em] sm:text-5xl lg:text-6xl lg:leading-[1.05]"
        >
          Deadlock France
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/90 sm:text-lg">
          Patch notes en français, serveur discord et showmatchs hebdomadaires.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <AppLink
            href="/patch-notes"
            className={cn(
              buttonVariants({ size: "lg" }),
              "border-0 px-6 font-semibold text-white shadow-none transition-[filter,background-color] hover:brightness-105 bg-[#4A9B7F]",
            )}
            style={{ backgroundColor: "#4A9B7F"}}
          >
            Voir les actus
            <ArrowRight className="size-4" />
          </AppLink>

          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "border-0 px-6 font-semibold text-white shadow-none transition-[filter] hover:brightness-105",
            )}
            style={{ backgroundColor: "#5865F2" }}
          >
            <DiscordIcon className="size-4" />
            Rejoindre Discord
          </a>
        </div>
      </div>
    </div>
  );

  const section = (
    <section className="relative mb-16 w-full overflow-hidden">
      {/* background image */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-position-[center_15%] bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />
      {/* fondu noir de gauche à droite noir */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, #0d1117 0%, rgba(13, 17, 23, 0.92) 38%, rgba(13, 17, 23, 0.45) 68%, rgba(13, 17, 23, 0.15) 100%)`,
        }}
      />
      {content}
    </section>
  );

  if (reduceMotion) return section;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      {section}
    </motion.div>
  );
}

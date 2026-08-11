"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import AppLink from "@/components/AppLink";
import { buttonVariants } from "@/components/shadcn/button";
import { DiscordIcon } from "@/components/social/SocialIcons";
import { easeOut } from "@/lib/motion/presets";
import { DISCORD_INVITE_URL } from "@/lib/social/links";
import { cn } from "@/lib/utils";

/** Artwork officiel Steam — format paysage, idéal en fond de hero */
const HERO_IMAGE =
  "/assets/header_heroes.png";

export default function LandingHero() {
  const reduceMotion = useReducedMotion();

  const content = (
    <div className="relative z-1 mx-auto flex min-h-[min(72vh,640px)] w-full max-w-1500px flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
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
            Voir les dernières patch notes
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
    <section className="relative mb-12 w-full overflow-hidden sm:mb-16">
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

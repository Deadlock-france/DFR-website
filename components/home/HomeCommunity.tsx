"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { buttonVariants } from "@/components/shadcn/button";
import { DiscordIcon, XIcon } from "@/components/social/SocialIcons";
import { easeOut } from "@/lib/motion/presets";
import { DISCORD_INVITE_URL, TWITTER_URL } from "@/lib/social/links";
import { cn } from "@/lib/utils";

const COMMUNITY_IMAGE = "/assets/social-bg-image.webp";

export default function HomeCommunity() {
  const reduceMotion = useReducedMotion();

  const body = (
    <section className="mx-auto w-full max-w-1500px px-4 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{ borderColor: "#1f2937" }}
      >
        <div className="absolute inset-0">
          <Image
            src={COMMUNITY_IMAGE}
            alt="Joueurs de la communauté francophone Deadlock France"
            fill
            sizes="(max-width: 1500px) 100vw, 1500px"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(13,19,21,0.96) 0%, rgba(13,19,21,0.88) 42%, rgba(13,19,21,0.55) 70%, rgba(13,19,21,0.35) 100%)",
            }}
          />
        </div>

        <div className="relative z-1 flex min-h-70 flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:max-w-xl">
          <h2 className="font-colus text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
            Communauté francophone
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-foreground/85">
            Retrouve les joueurs FR sur Discord pour le matchmaking, les events
            et les annonces.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
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

            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "border border-[#2a3538] bg-[#111111] px-6 font-semibold text-white shadow-none transition-[filter] hover:brightness-110",
              )}
            >
              <XIcon className="size-4" />
              Suivre @DeadlockFR
            </a>
          </div>
        </div>
      </div>
    </section>
  );

  if (reduceMotion) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      {body}
    </motion.div>
  );
}

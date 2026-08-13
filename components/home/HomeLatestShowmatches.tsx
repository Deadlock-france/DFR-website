"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import AppLink from "@/components/AppLink";
import { buttonVariants } from "@/components/shadcn/button";
import ShowmatchSummaryList from "@/components/showmatch/ShowmatchSummaryList";
import { easeOut } from "@/lib/motion/presets";
import type { ShowmatchSeriesSummary } from "@/lib/showmatch/summaries";
import { cn } from "@/lib/utils";

export default function HomeLatestShowmatches({
  summaries,
}: {
  summaries: ShowmatchSeriesSummary[];
}) {
  const reduceMotion = useReducedMotion();

  if (summaries.length === 0) {
    return null;
  }

  const body = (
    <section className="mx-auto w-full max-w-1500px px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-colus text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
            Derniers showmatchs
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Les dernières séries de la communauté francophone.
          </p>
        </div>

        <AppLink
          href="/showmatch"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 border-[#2a3538] bg-transparent text-foreground hover:bg-white/5",
          )}
        >
          Tous les showmatchs
          <ArrowRight className="size-3.5" />
        </AppLink>
      </div>

      <ShowmatchSummaryList
        summaries={summaries}
        showDayHeaders={false}
        eventHeading="h3"
      />
    </section>
  );

  if (reduceMotion) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      {body}
    </motion.div>
  );
}

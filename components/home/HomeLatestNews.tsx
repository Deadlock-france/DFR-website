"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import AppLink from "@/components/AppLink";
import {
  NewsCompactCard,
  NewsLeadCard,
} from "@/components/patch-notes/NewsArticleCard";
import { buttonVariants } from "@/components/shadcn/button";
import { extractChangedReferencesFromItem } from "@/lib/deadlock/changed-subjects";
import type { DeadlockReference } from "@/lib/deadlock/types";
import { easeOut } from "@/lib/motion/presets";
import type { SteamNewsItem } from "@/lib/steam/types";
import { cn } from "@/lib/utils";

export default function HomeLatestNews({
  items,
  references,
}: {
  items: SteamNewsItem[];
  references: DeadlockReference[];
}) {
  const reduceMotion = useReducedMotion();
  const [lead, ...rest] = items;

  if (!lead) {
    return null;
  }

  const leadSubjects = extractChangedReferencesFromItem(lead, references);

  const body = (
    <section className="mx-auto w-full max-w-1500px px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl border-l-2 border-[#58a484] pl-4">
          <h2 className="font-colus text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
            Dernières patch notes
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Les annonces Valve les plus récentes, déjà en français.
          </p>
        </div>

        <AppLink
          href="/patch-notes"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 border-[#2a3538] bg-transparent text-foreground hover:bg-white/5",
          )}
        >
          Toutes les patch notes
          <ArrowRight className="size-3.5" />
        </AppLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <NewsLeadCard item={lead} subjects={leadSubjects} />

        {rest.length > 0 ? (
          <div className="flex flex-col gap-4">
            {rest.map((item) => (
              <NewsCompactCard
                key={item.gid}
                item={item}
                subjects={extractChangedReferencesFromItem(item, references)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );

  if (reduceMotion) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      {body}
    </motion.div>
  );
}

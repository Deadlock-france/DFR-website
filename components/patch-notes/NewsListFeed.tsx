"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  NewsLeadCard,
  NewsCompactCard,
} from "@/components/patch-notes/NewsArticleCard";
import { extractChangedReferencesFromItem } from "@/lib/deadlock/changed-subjects";
import type { DeadlockReference } from "@/lib/deadlock/types";
import { staggerContainer, staggerItem } from "@/lib/motion/presets";
import type { SteamNewsItem } from "@/lib/steam/types";

function NewsFeedGrid({
  items,
  references,
  titleAs = "h2",
}: {
  items: SteamNewsItem[];
  references: DeadlockReference[];
  titleAs?: "h2" | "h3";
}) {
  const [lead, ...rest] = items;

  const subjectsByGid = useMemo(() => {
    const map = new Map<string, DeadlockReference[]>();

    for (const item of items) {
      map.set(item.gid, extractChangedReferencesFromItem(item, references));
    }

    return map;
  }, [items, references]);

  if (!lead) return null;

  return (
    <div className="flex flex-col gap-4">
      <NewsLeadCard
        item={lead}
        subjects={subjectsByGid.get(lead.gid) ?? []}
        titleAs={titleAs}
      />

      {rest.length > 0 ? (
        <div className="flex flex-col gap-4">
          {rest.map((item) => (
            <NewsCompactCard
              key={item.gid}
              item={item}
              subjects={subjectsByGid.get(item.gid) ?? []}
              titleAs={titleAs}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function NewsListFeed({
  items,
  references,
}: {
  items: SteamNewsItem[];
  references: DeadlockReference[];
}) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border py-16 text-center text-muted-foreground"
        style={{ borderColor: "#1f2937" }}
      >
        Aucun patch note disponible pour le moment.
      </div>
    );
  }

  return (
    <section aria-label="Liste des patch notes" className="p-4 sm:p-5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <NewsFeedGrid items={items} references={references} titleAs="h2" />
        </motion.div>
      </motion.div>
    </section>
  );
}

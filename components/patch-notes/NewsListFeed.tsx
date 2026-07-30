"use client";

import { motion } from "motion/react";
import { NewsLeadCard, NewsCompactCard } from "@/components/patch-notes/NewsArticleCard";
import { staggerContainer, staggerItem } from "@/lib/motion/presets";
import type { SteamNewsItem } from "@/lib/steam/types";

function NewsFeedGrid({ items }: { items: SteamNewsItem[] }) {
  const [lead, ...rest] = items;

  if (!lead) return null;

  return (
    <div className="flex flex-col gap-4">
      <NewsLeadCard item={lead} />

      {rest.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rest.map((item) => (
            <NewsCompactCard key={item.gid} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function NewsListFeed({ items }: { items: SteamNewsItem[] }) {
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
    <motion.div
      className="p-4 sm:p-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem}>
        <NewsFeedGrid items={items} />
      </motion.div>
    </motion.div>
  );
}

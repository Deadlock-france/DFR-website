"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import AppLink from "@/components/AppLink";
import PatchSubjectAvatars from "@/components/patch-notes/PatchSubjectAvatars";
import { cn } from "@/lib/utils";
import type { DeadlockReference } from "@/lib/deadlock/types";
import type { SteamNewsItem } from "@/lib/steam/types";
import {
  formatPatchNotesContent,
  formatShortNewsDate,
  formatPatchNotesTitle,
} from "@/hooks/news/format";

function CardShell({
  item,
  className,
  surfaceStyle,
  children,
}: {
  item: SteamNewsItem;
  className?: string;
  surfaceStyle?: CSSProperties;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  const inner = (
    <AppLink
      href={`/patch-notes/${item.gid}`}
      className={cn(
        "group/news relative block h-full overflow-hidden rounded-2xl border text-inherit no-underline outline-none transition-[border-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:border-b-emerald-300 hover:shadow-md",
        className,
      )}
      style={
        {
          borderColor: "#1f2937",
          ...surfaceStyle,
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/news:opacity-100"
        style={{
          background:
            "linear-gradient(180deg, rgba(74, 155, 127, 0.1) 0%, transparent 100%)",
        }}
      />
      <div className="relative z-1">{children}</div>
    </AppLink>
  );

  if (reduceMotion) return inner;

  return (
    <motion.div
      className="h-full"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {inner}
    </motion.div>
  );
}

export function NewsLeadCard({
  item,
  subjects = [],
  label = "Dernière mise à jour",
}: {
  item: SteamNewsItem;
  subjects?: DeadlockReference[];
  label?: string;
}) {
  return (
    <CardShell
      item={item}
      className="p-6 sm:p-7 lg:p-8"
      surfaceStyle={{ backgroundColor: "rgba(74, 155, 127, 0.06)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-4 left-0 w-0.5 rounded-full"
        style={{ backgroundColor: "#4A9B7F" }}
      />

      <div className="flex h-full flex-col pl-3">
        <div className="flex justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{
                borderColor: "rgba(74, 155, 127, 0.28)",
                backgroundColor: "rgba(74, 155, 127, 0.12)",
                color: "#6BB89A",
              }}
            >
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "white" }}
              >
                {label}
              </span>
            </div>
          </div>
          <time
            dateTime={new Date(item.date * 1000).toISOString()}
            className="rounded-md px-2 py-1 text-xs font-medium"
            style={{ color: "white" }}
          >
            {formatShortNewsDate(item.date)}
          </time>
        </div>

        <h3 className="mt-3 line-clamp-3 text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">
          {formatPatchNotesTitle(item.title)}
        </h3>

        <div
          className="mt-4 line-clamp-5 flex-1 text-sm leading-relaxed text-muted-foreground sm:line-clamp-6"
          dangerouslySetInnerHTML={{
            __html: formatPatchNotesContent(item.contents),
          }}
          style={{ maxHeight: "8em", overflow: "hidden" }}
        />

        <div className="mt-5 flex items-center justify-between gap-3">
          <PatchSubjectAvatars subjects={subjects} />
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-[gap] duration-200 group-hover/news:gap-2"
            style={{ color: "white" }}
          >
            Lire l&apos;article
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </CardShell>
  );
}

export function NewsCompactCard({
  item,
  subjects = [],
}: {
  item: SteamNewsItem;
  subjects?: DeadlockReference[];
}) {
  return (
    <CardShell
      item={item}
      className="p-5 sm:p-6"
      surfaceStyle={{ backgroundColor: "rgba(74, 155, 127, 0.06)" }}
    >
      <div className="flex h-full flex-col">
        <time
          dateTime={new Date(item.date * 1000).toISOString()}
          className="text-xs font-medium text-muted-foreground"
        >
          {formatShortNewsDate(item.date)}
        </time>
        <h3 className="mt-2 line-clamp-2 flex-1 text-base font-semibold leading-snug tracking-[-0.01em] sm:text-[1.05rem]">
          {formatPatchNotesTitle(item.title)}
        </h3>

        <div
          className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{
            __html: formatPatchNotesContent(item.contents),
          }}
          style={{ maxHeight: "5em", overflow: "hidden" }}
        />

        <div
          className="mt-4 flex items-center justify-between gap-3 border-t pt-3"
          style={{ borderColor: "#1f2937" }}
        >
          <PatchSubjectAvatars subjects={subjects} />
          <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: "white" }}>
            Voir le détail
            <ArrowRight
              className="size-4 transition-transform group-hover/news:translate-x-0.5"
              style={{ color: "white" }}
            />
          </span>
        </div>
      </div>
    </CardShell>
  );
}

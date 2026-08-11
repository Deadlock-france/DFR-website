"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DeadlockReferencesByLanguage } from "@/lib/deadlock/client";
import {
  buildReferenceUrlsIndex,
  getReferenceUrlFromElement,
  referenceKey,
} from "@/lib/deadlock/link-content";
import type { DeadlockReference } from "@/lib/deadlock/types";

import ReferenceContextMenu, {
  type ReferenceContextMenuState,
} from "./ReferenceContextMenu";
import ReferencePreviewPopup from "./ReferencePreviewPopup";

type ActivePreview = {
  reference: DeadlockReference;
  anchor: HTMLElement;
};

const PREVIEW_DELAY_MS = 250;

export default function PatchNotesContent({
  html,
  references,
  referencesByLanguage,
}: {
  html: string;
  references: DeadlockReference[];
  referencesByLanguage: DeadlockReferencesByLanguage;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<number | null>(null);
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);
  const [contextMenu, setContextMenu] = useState<ReferenceContextMenuState | null>(
    null,
  );

  const referencesByKey = useMemo(() => {
    const map = new Map<string, DeadlockReference>();

    for (const reference of references) {
      map.set(referenceKey(reference), reference);
    }

    return map;
  }, [references]);

  const referenceUrlsByKey = useMemo(
    () => buildReferenceUrlsIndex(referencesByLanguage),
    [referencesByLanguage],
  );

  const clearPreviewTimer = () => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const closeMenus = () => {
    setContextMenu(null);
    setActivePreview(null);
  };

  useEffect(() => {
    const hidePreview = () => closeMenus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    window.addEventListener("scroll", hidePreview, true);
    window.addEventListener("resize", hidePreview);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearPreviewTimer();
      window.removeEventListener("scroll", hidePreview, true);
      window.removeEventListener("resize", hidePreview);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showPreview = (target: HTMLElement) => {
    const key = target.getAttribute("data-deadlock-ref");
    const reference = key ? referencesByKey.get(key) : undefined;

    if (!reference) {
      setActivePreview(null);
      return;
    }

    setActivePreview({ reference, anchor: target });
  };

  const schedulePreview = (target: HTMLElement) => {
    clearPreviewTimer();
    previewTimerRef.current = window.setTimeout(() => {
      showPreview(target);
    }, PREVIEW_DELAY_MS);
  };

  const openReferenceUrl = (target: HTMLElement) => {
    const url = getReferenceUrlFromElement(target, referencesByKey);

    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        ref={containerRef}
        className="patch-notes-content text-[15px] leading-7 text-foreground/95 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:mt-7 [&_h2]:mb-2.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-wide [&_h3]:text-primary [&_h3.patch-notes-section]:mt-7 [&_h3.patch-notes-section]:mb-2.5 [&_h3.patch-notes-section]:border-b [&_h3.patch-notes-section]:border-primary/25 [&_h3.patch-notes-section]:pb-1.5 [&_h3.patch-notes-section]:text-[13px] [&_h3.patch-notes-section]:font-semibold [&_h3.patch-notes-section]:uppercase [&_h3.patch-notes-section]:tracking-wider [&_h3.patch-notes-section]:text-primary [&_h3.patch-notes-section:first-child]:mt-0 [&_figure.patch-notes-figure]:mx-auto [&_figure.patch-notes-figure]:my-5 [&_figure.patch-notes-figure]:w-fit [&_figure.patch-notes-figure]:max-w-[min(100%,28rem)] [&_figure.patch-notes-figure]:rounded-lg [&_figure.patch-notes-figure]:border [&_figure.patch-notes-figure]:border-border/70 [&_figure.patch-notes-figure]:bg-muted/40 [&_figure.patch-notes-figure]:p-1.5 [&_figure.patch-notes-figure_img]:block [&_figure.patch-notes-figure_img]:h-auto [&_figure.patch-notes-figure_img]:max-h-[22rem] [&_figure.patch-notes-figure_img]:w-auto [&_figure.patch-notes-figure_img]:max-w-full [&_figure.patch-notes-figure_img]:rounded-md [&_.patch-notes-entity]:my-4 [&_.patch-notes-entity]:rounded-xl [&_.patch-notes-entity]:border [&_.patch-notes-entity]:border-border/55 [&_.patch-notes-entity]:bg-muted/25 [&_.patch-notes-entity]:px-3.5 [&_.patch-notes-entity]:py-3 [&_.patch-notes-entity-header]:mb-2.5 [&_.patch-notes-entity-header]:flex [&_.patch-notes-entity-header]:items-center [&_.patch-notes-entity-header]:gap-2.5 [&_.patch-notes-entity-icon]:size-9 [&_.patch-notes-entity-icon]:shrink-0 [&_.patch-notes-entity-icon]:rounded-md [&_.patch-notes-entity-icon]:bg-muted/50 [&_.patch-notes-entity-icon]:object-contain [&_.patch-notes-entity-title]:text-sm [&_.patch-notes-entity-title]:font-semibold [&_.patch-notes-entity-title]:tracking-wide [&_.patch-notes-entity-title]:text-foreground [&_.patch-notes-entity-title_.deadlock-ref]:font-semibold [&_.patch-notes-entity-title_.deadlock-ref]:no-underline [&_.patch-notes-entity-list]:m-0 [&_.patch-notes-entity-list]:list-none [&_.patch-notes-entity-list]:space-y-1.5 [&_.patch-notes-entity-list]:p-0 [&_.patch-notes-entity-list>li]:relative [&_.patch-notes-entity-list>li]:ml-0 [&_.patch-notes-entity-list>li]:list-none [&_.patch-notes-entity-list>li]:pl-3.5 [&_.patch-notes-entity-list>li]:text-[14px] [&_.patch-notes-entity-list>li]:leading-6 [&_.patch-notes-entity-list>li]:text-foreground/90 [&_.patch-notes-entity-list>li]:before:absolute [&_.patch-notes-entity-list>li]:before:left-0 [&_.patch-notes-entity-list>li]:before:top-[0.55em] [&_.patch-notes-entity-list>li]:before:size-1.5 [&_.patch-notes-entity-list>li]:before:rounded-full [&_.patch-notes-entity-list>li]:before:bg-primary/70 [&_ul:not(.patch-notes-entity-list)>li]:ml-5 [&_ul:not(.patch-notes-entity-list)>li]:list-disc [&_p+p]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_.deadlock-ref]:relative [&_.deadlock-ref]:z-10 [&_.deadlock-ref]:rounded-sm [&_.deadlock-ref]:text-primary [&_.deadlock-ref]:underline [&_.deadlock-ref]:decoration-primary/60 [&_.deadlock-ref]:decoration-dotted [&_.deadlock-ref]:underline-offset-4 [&_.deadlock-ref]:outline-none [&_a.deadlock-ref]:cursor-pointer [&_span.deadlock-ref]:cursor-help [&_.deadlock-ref:focus-visible]:ring-2 [&_.deadlock-ref:focus-visible]:ring-primary/50"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-deadlock-ref]",
          );

          if (!target || !containerRef.current?.contains(target)) {
            return;
          }

          const url = getReferenceUrlFromElement(target, referencesByKey);
          if (!url) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          clearPreviewTimer();
          setContextMenu(null);
          setActivePreview(null);
          openReferenceUrl(target);
        }}
        onContextMenu={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-deadlock-ref]",
          );

          if (!target || !containerRef.current?.contains(target)) {
            return;
          }

          const key = target.getAttribute("data-deadlock-ref");
          const reference = key ? referencesByKey.get(key) : undefined;
          const urls = key ? referenceUrlsByKey.get(key) : undefined;

          if (!reference || !urls || (!urls.french && !urls.english)) {
            return;
          }

          event.preventDefault();
          clearPreviewTimer();
          setActivePreview(null);
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            reference,
            urls,
          });
        }}
        onPointerOver={(event) => {
          if (contextMenu) {
            return;
          }

          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-deadlock-ref]",
          );

          if (!target || !containerRef.current?.contains(target)) {
            return;
          }

          schedulePreview(target);
        }}
        onPointerOut={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            nextTarget instanceof HTMLElement &&
            nextTarget.closest("[data-deadlock-ref]")
          ) {
            return;
          }

          clearPreviewTimer();
          setActivePreview(null);
        }}
        onFocus={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-deadlock-ref]",
          );

          if (target) {
            showPreview(target);
          }
        }}
        onBlur={() => {
          clearPreviewTimer();
          setActivePreview(null);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-deadlock-ref]",
          );

          if (!target || !containerRef.current?.contains(target)) {
            return;
          }

          const url = getReferenceUrlFromElement(target, referencesByKey);
          if (!url) {
            return;
          }

          event.preventDefault();
          openReferenceUrl(target);
        }}
      />

      {activePreview && !contextMenu ? (
        <ReferencePreviewPopup
          reference={activePreview.reference}
          anchor={activePreview.anchor}
        />
      ) : null}

      <ReferenceContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
    </>
  );
}

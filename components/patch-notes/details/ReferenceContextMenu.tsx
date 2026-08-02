"use client";

import { createPortal } from "react-dom";

import type { ReferenceLocaleUrls } from "@/lib/deadlock/link-content";
import type { DeadlockReference } from "@/lib/deadlock/types";

type ReferenceContextMenuState = {
  x: number;
  y: number;
  reference: DeadlockReference;
  urls: ReferenceLocaleUrls;
};

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ReferenceContextMenu({
  menu,
  onClose,
}: {
  menu: ReferenceContextMenuState | null;
  onClose: () => void;
}) {
  if (!menu) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = 220;
  const left = Math.min(Math.max(12, menu.x), viewportWidth - menuWidth - 12);
  const top = Math.min(Math.max(12, menu.y), viewportHeight - 120);

  const items = [
    menu.urls.french
      ? {
          label: "Ouvrir en VF (deadlock.io/fr)",
          url: menu.urls.french,
        }
      : null,
    menu.urls.english
      ? {
          label: "Ouvrir en VO (deadlock.io/en)",
          url: menu.urls.english,
        }
      : null,
  ].filter((entry): entry is { label: string; url: string } => entry !== null);

  if (items.length === 0) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fermer le menu"
        className="fixed inset-0 z-50 cursor-default bg-transparent"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        aria-label={`Actions pour ${menu.reference.name}`}
        className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border border-border bg-card p-1 text-card-foreground shadow-2xl"
        style={{ top, left }}
      >
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {menu.reference.name}
        </p>
        {items.map((entry) => (
          <button
            key={entry.label}
            type="button"
            role="menuitem"
            className="flex w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
            onClick={() => {
              openUrl(entry.url);
              onClose();
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}

export type { ReferenceContextMenuState };

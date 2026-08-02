"use client";

import { createPortal } from "react-dom";

import type { DeadlockItemSlotType, DeadlockReference } from "@/lib/deadlock/types";

const SLOT_LABELS: Record<DeadlockItemSlotType, string> = {
  weapon: "Arme",
  vitality: "Vitalité",
  spirit: "Esprit",
};

const KIND_LABELS: Record<DeadlockReference["kind"], string> = {
  hero: "Héros",
  item: "Objet",
  ability: "Capacité",
};

function PreviewMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ReferencePreviewPopup({
  reference,
  anchor,
}: {
  reference: DeadlockReference;
  anchor: HTMLElement;
}) {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const popupWidth = 280;
  const left = Math.min(
    Math.max(12, rect.left),
    viewportWidth - popupWidth - 12,
  );
  const top = rect.bottom + 10;

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-280px overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
      style={{ top, left }}
    >
      {reference.image ? (
        <div className="border-b border-border bg-muted/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reference.image}
            alt=""
            className="mx-auto h-20 w-20 object-contain"
          />
        </div>
      ) : null}

      <div className="space-y-2 p-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
            {KIND_LABELS[reference.kind]}
          </p>
          <p className="text-base font-semibold leading-tight">{reference.name}</p>
        </div>

        {reference.role ? (
          <p className="text-sm leading-snug text-muted-foreground">
            {reference.role}
          </p>
        ) : null}

        <div className="space-y-1 border-t border-border pt-2">
          {reference.cost !== undefined ? (
            <PreviewMeta label="Coût" value={`${reference.cost} âmes`} />
          ) : null}
          {reference.itemTier !== undefined ? (
            <PreviewMeta label="Palier" value={`T${reference.itemTier}`} />
          ) : null}
          {reference.itemSlotType ? (
            <PreviewMeta
              label="Catégorie"
              value={SLOT_LABELS[reference.itemSlotType]}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

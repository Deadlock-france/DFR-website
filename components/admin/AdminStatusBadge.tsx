import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  live: "bg-primary/15 text-primary",
  draft: "bg-muted text-muted-foreground",
  pending: "bg-chart-4/15 text-chart-4",
  danger: "bg-destructive/15 text-destructive",
} as const;

export default function AdminStatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

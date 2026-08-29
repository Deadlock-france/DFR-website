import { cn } from "@/lib/utils";

export const adminPanelClassName =
  "rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]";

export const adminInputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const adminLabelClassName = "flex flex-col gap-1.5 text-sm";

export function adminFilterChipClassName(active: boolean) {
  return cn(
    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
    active
      ? "border-primary/40 bg-primary/15 text-primary"
      : "border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
  );
}

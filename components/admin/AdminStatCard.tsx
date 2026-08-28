import { ArrowRight, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { adminPanelClassName } from "@/components/admin/admin-styles";
import { cn } from "@/lib/utils";

function TrendPill({ trend }: { trend: number }) {
  const up = trend >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        up
          ? "bg-primary/15 text-primary"
          : "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {up ? "+" : ""}
      {trend} %
    </span>
  );
}

export default function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  href,
  actionLabel,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Variation en % sur la période, null quand elle n’est pas calculable. */
  trend?: number | null;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" strokeWidth={1.75} />
          <p className="text-sm font-medium">{label}</p>
        </div>
        {typeof trend === "number" ? <TrendPill trend={trend} /> : null}
      </div>
      <p className="font-colus mt-3 text-4xl tracking-[-0.03em] tabular-nums text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {children}
      {href ? (
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
          {actionLabel ?? "Ouvrir"}
          <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          adminPanelClassName,
          "group flex flex-col p-5 transition-colors hover:border-primary/35",
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cn(adminPanelClassName, "flex flex-col p-5")}>{body}</div>
  );
}

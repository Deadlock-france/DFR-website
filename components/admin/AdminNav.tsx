"use client";

import {
  BarChart3,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Shield,
  Tags,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  hasPermission,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  {
    href: "/admin/statistiques",
    label: "Statistiques",
    icon: BarChart3,
    permission: "admin.stats",
  },
  {
    href: "/admin/annonces",
    label: "Annonces",
    icon: Megaphone,
    permission: "admin.announcements",
  },
  {
    href: "/admin/candidatures",
    label: "Candidatures",
    icon: Inbox,
    permission: "admin.applications",
  },
  {
    href: "/admin/admins",
    label: "Admins",
    icon: Shield,
    permission: "admin.members",
  },
  {
    href: "/admin/roles",
    label: "Rôles",
    icon: Tags,
    permission: "admin.roles",
  },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: AdminPermission;
}>;

function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav({
  pendingCount,
  permissions,
  variant,
}: {
  pendingCount: number;
  permissions: readonly string[];
  variant: "rail" | "bar";
}) {
  const pathname = usePathname();
  const rail = variant === "rail";

  return (
    <nav
      aria-label="Admin"
      className={cn(
        rail
          ? "flex flex-col gap-1"
          : "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] scrollbar-none",
      )}
    >
      {NAV.map((item) => {
        if (
          "permission" in item &&
          item.permission &&
          !hasPermission(permissions, item.permission)
        ) {
          return null;
        }

        const active = isAdminNavActive(pathname, item.href);
        const Icon = item.icon;
        const showBadge =
          item.href === "/admin/candidatures" && pendingCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              rail ? "px-2.5 py-2" : "shrink-0 px-3 py-2",
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="font-medium">{item.label}</span>
            {showBadge ? (
              <span className="ml-auto rounded-md bg-primary/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

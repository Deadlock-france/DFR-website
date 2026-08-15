import Link from "next/link";
import type { ReactNode } from "react";

import AdminLockButton from "@/components/admin/AdminLockButton";
import type { AdminIdentity } from "@/lib/admin/access";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/annonces", label: "Annonces" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/debans", label: "Débans" },
] as const;

export default function AdminShell({
  identity,
  children,
}: {
  identity: AdminIdentity;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-dvh text-foreground"
      style={{ backgroundColor: "var(--bg-default)" }}
    >
      <header className="border-b border-[#2a3538] bg-[#0c1214]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8a9b9f]">
              Deadlock France · Admin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {identity.displayLabel}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground/85 transition-colors hover:text-[#58a484]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Site
            </Link>
            <AdminLockButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

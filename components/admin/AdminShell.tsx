import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import AdminLockButton from "@/components/admin/AdminLockButton";
import AdminNav from "@/components/admin/AdminNav";
import type { AdminIdentity } from "@/lib/admin/access";

export default function AdminShell({
  identity,
  pendingCount,
  children,
}: {
  identity: AdminIdentity;
  pendingCount: number;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 0% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 58%)",
        }}
      />

      <a
        href="#admin-contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Aller au contenu
      </a>

      <div className="relative flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar/80 px-3 py-5 backdrop-blur-sm md:flex">
          <div className="px-2.5 pb-6">
            <p className="font-colus text-lg tracking-[-0.02em] text-foreground">
              Deadlock France
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Espace admin</p>
          </div>

          <AdminNav
            pendingCount={pendingCount}
            permissions={identity.permissions}
            variant="rail"
          />

          <div className="mt-auto border-t border-border px-2.5 pt-4">
            <p className="truncate text-sm font-medium text-foreground">
              {identity.displayLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Compte admin</p>
            <Link
              href="/"
              className="mt-3 flex items-center gap-2 rounded-lg py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
              Voir le site
            </Link>
            <AdminLockButton className="mt-1 w-full justify-start" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border bg-sidebar/80 px-4 py-3 backdrop-blur-sm md:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-colus text-base tracking-[-0.02em]">
                  Deadlock France
                </p>
                <p className="text-xs text-muted-foreground">
                  {identity.displayLabel}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Site
                </Link>
                <AdminLockButton />
              </div>
            </div>
            <AdminNav
              pendingCount={pendingCount}
              permissions={identity.permissions}
              variant="bar"
            />
          </header>

          <main
            id="admin-contenu"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

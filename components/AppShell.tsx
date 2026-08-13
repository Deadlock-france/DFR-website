"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import AppSidebar from "@/components/AppSidebar";
import AccountDockClient from "@/components/account/AccountDockClient";
import { AccountInvitesProvider } from "@/components/account/AccountInvitesProvider";
import AccountNotificationsHost from "@/components/account/AccountNotificationsHost";
import SubpageBackButton from "@/components/navigation/SubpageBackButton";
import { ACCOUNT_NOTIFICATIONS_ENABLED } from "@/lib/account/features";

const FOOTER_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/patch-notes", label: "Patch notes" },
  { href: "/showmatch", label: "Showmatchs" },
] as const;

function ShellBody({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Aller au contenu
      </a>
      <div
        className="flex min-h-dvh"
        style={{ backgroundColor: "var(--bg-default)" }}
      >
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col pb-(--mobile-nav-clearance) md:pb-0">
          <main id="contenu" className="mx-auto w-full flex-1">
            <Suspense fallback={null}>
              <SubpageBackButton />
            </Suspense>
            <Suspense
              fallback={
                <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
                  Chargement…
                </div>
              }
            >
              {children}
            </Suspense>
          </main>

          <footer
            className="border-t px-4 py-4 text-muted-foreground sm:px-6"
            style={{
              backgroundColor: "var(--bg-footer)",
              borderColor: "var(--divider)",
            }}
          >
            <nav aria-label="Pied de page" className="flex justify-center">
              <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-2 text-center text-xs">
              Deadlock France — communauté francophone indépendante, sans lien
              avec Valve.
            </p>
          </footer>
        </div>
      </div>

      <Suspense fallback={null}>
        <AccountDockClient />
      </Suspense>
    </>
  );
}

function SiteShell({ children }: { children: ReactNode }) {
  if (!ACCOUNT_NOTIFICATIONS_ENABLED) {
    return <ShellBody>{children}</ShellBody>;
  }

  return (
    <AccountInvitesProvider>
      <ShellBody>{children}</ShellBody>
      <AccountNotificationsHost />
    </AccountInvitesProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/acces") {
    return <>{children}</>;
  }

  return <SiteShell>{children}</SiteShell>;
}

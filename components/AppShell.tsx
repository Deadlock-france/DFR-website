import { Suspense } from "react";

import AppSidebar from "@/components/AppSidebar";
import AccountDockClient from "@/components/account/AccountDockClient";
import { AccountInvitesProvider } from "@/components/account/AccountInvitesProvider";
import AccountNotificationsHost from "@/components/account/AccountNotificationsHost";
import SubpageBackButton from "@/components/navigation/SubpageBackButton";
import { ACCOUNT_NOTIFICATIONS_ENABLED } from "@/lib/account/features";

function ShellBody({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className="flex min-h-dvh"
        style={{ backgroundColor: "var(--bg-default)" }}
      >
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col pb-(--mobile-nav-clearance) md:pb-0">
          <main className="mx-auto w-full flex-1">
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
            className="border-t py-2.5 text-center text-muted-foreground"
            style={{
              backgroundColor: "var(--bg-footer)",
              borderColor: "var(--divider)",
            }}
          >
            <p className="text-xs">Deadlock France</p>
          </footer>
        </div>
      </div>

      <Suspense fallback={null}>
        <AccountDockClient />
      </Suspense>
    </>
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
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

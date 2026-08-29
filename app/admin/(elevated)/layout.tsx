import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/access";
import { countApplicationsAdmin } from "@/lib/admin/applications";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Admin",
  description: "Espace admin Deadlock France.",
  path: "/admin",
});

async function ElevatedGate({ children }: { children: ReactNode }) {
  await connection();
  const [identity, pendingCount] = await Promise.all([
    requireAdmin(),
    countApplicationsAdmin("pending"),
  ]);
  return (
    <AdminShell identity={identity} pendingCount={pendingCount}>
      {children}
    </AdminShell>
  );
}

export default function AdminElevatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
          Chargement admin…
        </div>
      }
    >
      <ElevatedGate>{children}</ElevatedGate>
    </Suspense>
  );
}

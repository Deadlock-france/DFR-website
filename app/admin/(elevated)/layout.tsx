import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/access";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Admin",
  description: "Espace admin Deadlock France.",
  path: "/admin",
});

async function ElevatedGate({ children }: { children: ReactNode }) {
  await connection();
  const identity = await requireAdmin();
  return <AdminShell identity={identity}>{children}</AdminShell>;
}

export default function AdminElevatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
          style={{ backgroundColor: "var(--bg-default)" }}
        >
          Chargement admin…
        </div>
      }
    >
      <ElevatedGate>{children}</ElevatedGate>
    </Suspense>
  );
}

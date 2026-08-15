import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import AdminUnlockForm from "@/components/admin/AdminUnlockForm";
import { requireAdminIdentity } from "@/lib/admin/access";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Admin — déverrouillage",
  description: "Élévation admin Deadlock France.",
  path: "/admin/unlock",
});

async function UnlockGate() {
  await connection();
  // Pas de redirect auto vers /admin ici : après « Verrouiller »,
  // on reste sur l’écran secret (évite les rafales Suspense).
  const identity = await requireAdminIdentity();

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--bg-default)" }}
    >
      <AdminUnlockForm displayLabel={identity.displayLabel} />
    </div>
  );
}

export default function AdminUnlockPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted-foreground"
          style={{ backgroundColor: "var(--bg-default)" }}
        >
          Chargement…
        </main>
      }
    >
      <UnlockGate />
    </Suspense>
  );
}

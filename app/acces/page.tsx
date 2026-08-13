import type { Metadata } from "next";
import { Suspense } from "react";

import AccesPageClient from "@/components/site-access/AccesPageClient";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Accès au site",
  description: "Accès réservé à Deadlock France.",
  path: "/acces",
});

export default function AccesPage() {
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
      <AccesPageClient />
    </Suspense>
  );
}

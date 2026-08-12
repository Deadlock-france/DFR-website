import { Suspense } from "react";

import AccesPageClient from "@/components/site-access/AccesPageClient";

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

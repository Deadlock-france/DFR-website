import type { Metadata } from "next";

import ProfilPageClient from "@/components/account/ProfilPageClient";
import FadeIn from "@/components/motion/FadeIn";

export const metadata: Metadata = {
  title: "Mon profil",
  description: "Profil joueur Deadlock France",
};

/**
 * Page sans cookies()/searchParams côté RSC — avec cacheComponents, la lecture
 * dynamique dans le tree provoquait une rafale de soft-refresh GET /profil.
 * Données + flash query via client (/api/account/profil + URL).
 */
export default function ProfilPage() {
  return (
    <div className="w-full px-4 py-10 sm:px-5 lg:px-8">
      <FadeIn>
        <h1 className="font-colus text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
          Mon profil
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Identité Discord, héros préférés et historique showmatch.
        </p>
      </FadeIn>

      <ProfilPageClient />
    </div>
  );
}

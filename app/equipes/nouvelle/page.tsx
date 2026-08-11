import type { Metadata } from "next";
import { redirect } from "next/navigation";

import NouvelleEquipeForm from "@/components/account/NouvelleEquipeForm";
import FadeIn from "@/components/motion/FadeIn";
import { ACCOUNT_TEAMS_ENABLED } from "@/lib/account/features";

export const metadata: Metadata = {
  title: "Créer une équipe",
  description: "Créer une équipe Deadlock France",
};

export default function NouvelleEquipePage() {
  if (!ACCOUNT_TEAMS_ENABLED) {
    redirect("/profil");
  }

  return (
    <div className="w-full px-4 py-10 sm:px-5 lg:px-8">
      <FadeIn>
        <h1 className="font-colus text-3xl tracking-[-0.02em] text-foreground sm:text-4xl">
          Créer une équipe
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Tu seras automatiquement capitaine. Tu peux créer et rejoindre
          plusieurs équipes. Invite ensuite des joueurs depuis la page
          d&apos;équipe.
        </p>
      </FadeIn>

      <NouvelleEquipeForm />
    </div>
  );
}

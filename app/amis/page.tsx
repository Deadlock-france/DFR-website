import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import PlayerSearchInvite from "@/components/account/PlayerSearchInvite";
import FadeIn from "@/components/motion/FadeIn";
import { ACCOUNT_FRIENDS_ENABLED } from "@/lib/account/features";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Amis",
  description: "Ajouter des amis sur Deadlock France.",
  path: "/amis",
});

/** Page statique — auth gérée côté client / actions, pas de cookies() RSC. */
export default function AmisPage() {
  if (!ACCOUNT_FRIENDS_ENABLED) {
    redirect("/profil");
  }

  return (
    <div className="w-full px-4 py-10 sm:px-5 lg:px-8">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "rgba(74, 155, 127, 0.12)",
              color: "#6BB89A",
            }}
          >
            <UserPlus className="size-5" />
          </div>
          <div>
            <h1 className="font-colus text-3xl tracking-[-0.02em] text-foreground">
              Ajouter un ami
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Cherche un joueur par pseudo. La liste d&apos;amis arrive bientôt
              - pour l&apos;instant tu peux les retrouver ici et les inviter
              dans une équipe depuis ta page d&apos;équipe.
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08} className="mt-8">
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "#1f2937" }}
        >
          <PlayerSearchInvite canInvite={false} />
        </div>
      </FadeIn>
    </div>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";

import EquipePageClient from "@/components/account/EquipePageClient";
import { ACCOUNT_TEAMS_ENABLED } from "@/lib/account/features";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * params attendus dans un enfant Suspense — exigence Cache Components
 * pour les segments dynamiques [id].
 */
async function EquipeDetails({ params }: PageProps) {
  const { id } = await params;
  return <EquipePageClient teamId={id} />;
}

export default function EquipePage(props: PageProps) {
  if (!ACCOUNT_TEAMS_ENABLED) {
    redirect("/profil");
  }

  return (
    <div className="w-full px-4 py-10 sm:px-5 lg:px-8">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Chargement de l&apos;équipe…
          </p>
        }
      >
        <EquipeDetails params={props.params} />
      </Suspense>
    </div>
  );
}

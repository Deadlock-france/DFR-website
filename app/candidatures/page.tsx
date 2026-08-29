import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ApplicationForm from "@/components/candidatures/ApplicationForm";
import PageHero from "@/components/patch-notes/PageHero";
import { getCurrentUserId } from "@/lib/account/queries";
import { listMyApplications } from "@/lib/admin/applications";
import {
  applicationStatusLabel,
  applicationTypeLabel,
  type ApplicationType,
} from "@/lib/admin/application-types";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Candidatures",
  description:
    "Postule pour rejoindre le staff ou devenir partenaire Deadlock France.",
  path: "/candidatures",
});

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

async function CandidaturesBody() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <div className="flex w-full flex-col gap-6 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Connecte-toi avec Discord pour envoyer une candidature.
        </p>
        <Link
          href="/auth/login?next=/candidatures"
          className="cursor-pointer self-start bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const rows = await listMyApplications(userId);
  const blockedTypes = rows
    .filter((row) => row.status === "pending")
    .map((row) => row.type) as ApplicationType[];

  return (
    <div className="flex w-full flex-col gap-10 px-4 pb-20 pt-2 sm:px-5 lg:px-8">
      <section className="max-w-2xl">
        <h2 className="font-colus text-xl uppercase tracking-wide">
          Nouvelle candidature
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff, partenaire ou autre. Une candidature en attente max par type.
        </p>
        <div className="mt-4">
          <ApplicationForm blockedTypes={blockedTypes} />
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="font-colus text-xl uppercase tracking-wide">
          Mes candidatures
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune pour l’instant.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border border-[#2a3538] bg-[#0c1214] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{row.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {applicationTypeLabel(row.type)} ·{" "}
                    {applicationStatusLabel(row.status)} · {formatDt(row.created_at)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">
                  {row.body}
                </p>
                {row.admin_note && row.status !== "pending" ? (
                  <p className="mt-3 border-t border-[#2a3538] pt-3 text-sm text-muted-foreground">
                    Réponse staff : {row.admin_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function CandidaturesPage() {
  return (
    <div>
      <PageHero
        title="Candidatures"
        description="Rejoins le staff ou propose un partenariat avec la communauté."
      />
      <Suspense
        fallback={
          <div className="px-4 py-10 text-sm text-muted-foreground sm:px-5">
            Chargement…
          </div>
        }
      >
        <CandidaturesBody />
      </Suspense>
    </div>
  );
}

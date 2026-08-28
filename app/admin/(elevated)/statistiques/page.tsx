import {
  Clock3,
  Flame,
  Gamepad2,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSignupsChart from "@/components/admin/AdminSignupsChart";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminTopHeroes from "@/components/admin/AdminTopHeroes";
import { adminPanelClassName } from "@/components/admin/admin-styles";
import {
  SIGNUP_CHART_WEEKS,
  formatCount,
  formatDurationLabel,
  loadSiteStats,
} from "@/lib/admin/stats";
import { cn } from "@/lib/utils";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(adminPanelClassName, "h-32 animate-pulse")}
          />
        ))}
      </div>
      <div className={cn(adminPanelClassName, "h-56 animate-pulse")} />
    </div>
  );
}

async function StatsContent() {
  const stats = await loadSiteStats().catch((error: unknown) => {
    // Laisse passer les signaux de contrôle Next (prérendu, redirection…).
    unstable_rethrow(error);
    console.error("loadSiteStats failed:", error);
    return null;
  });

  if (!stats) {
    return (
      <p className={cn(adminPanelClassName, "p-5 text-sm text-destructive")}>
        Impossible de charger les statistiques pour le moment. Réessaie dans
        quelques instants.
      </p>
    );
  }

  const signupsOnChart = stats.signupsByWeek.reduce(
    (total, bucket) => total + bucket.count,
    0,
  );
  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(stats.generatedAt));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Inscrits"
          icon={Users}
          value={formatCount(stats.members.total)}
          hint={`${stats.members.last7d} sur 7 jours · ${stats.members.last30d} sur 30 jours`}
          trend={stats.members.trend}
        />
        <AdminStatCard
          label="Showmatchs"
          icon={Trophy}
          value={formatCount(stats.showmatches.total)}
          hint={`${stats.showmatches.completed} terminé${stats.showmatches.completed === 1 ? "" : "s"} · ${stats.showmatches.series} lobby${stats.showmatches.series === 1 ? "" : "s"}`}
        />
        <AdminStatCard
          label="Matchs joués"
          icon={Gamepad2}
          value={formatCount(stats.gameplay.games)}
          hint={`${formatCount(stats.gameplay.participations)} participations enregistrées`}
        />
        <AdminStatCard
          label="Joueurs référencés"
          icon={UserPlus}
          value={formatCount(stats.players.total)}
          hint={`${stats.players.claimed} profil${stats.players.claimed === 1 ? "" : "s"} réclamé${stats.players.claimed === 1 ? "" : "s"}`}
        />
      </div>

      <section className={cn(adminPanelClassName, "p-4 sm:p-5")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Inscriptions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {SIGNUP_CHART_WEEKS} dernières semaines ·{" "}
              {formatCount(signupsOnChart)} nouveau
              {signupsOnChart === 1 ? "" : "x"} compte
              {signupsOnChart === 1 ? "" : "s"}
            </p>
          </div>
          {stats.members.trend !== null ? (
            <p className="text-sm text-muted-foreground">
              30 j : {stats.members.last30d} vs {stats.members.previous30d} sur
              la période précédente
            </p>
          ) : null}
        </div>
        <AdminSignupsChart buckets={stats.signupsByWeek} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Swords className="size-4" strokeWidth={1.75} />
            <h2 className="text-sm font-medium text-foreground">
              Sur le terrain
            </h2>
          </div>
          <div className="mt-2 divide-y divide-border">
            <Metric
              label="Temps de jeu cumulé"
              value={formatDurationLabel(stats.gameplay.playtimeSeconds)}
            />
            <Metric
              label="Durée moyenne d’un match"
              value={formatDurationLabel(stats.gameplay.averageDurationSeconds)}
            />
            <Metric
              label="Éliminations"
              value={formatCount(stats.gameplay.kills)}
            />
            <Metric label="Âmes" value={formatCount(stats.gameplay.souls)} />
          </div>
        </section>

        <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" strokeWidth={1.75} />
            <h2 className="text-sm font-medium text-foreground">Communauté</h2>
          </div>
          <div className="mt-2 divide-y divide-border">
            <Metric
              label="Showmatchs à venir"
              value={formatCount(stats.showmatches.upcoming)}
            />
            <Metric label="Équipes créées" value={formatCount(stats.teams)} />
            <Metric
              label="Candidatures reçues"
              value={formatCount(stats.applications)}
            />
            <Metric
              label="Profils joueurs réclamés"
              value={`${formatCount(stats.players.claimed)} / ${formatCount(stats.players.total)}`}
            />
          </div>
        </section>

        <section className={cn(adminPanelClassName, "flex flex-col p-4 sm:p-5")}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="size-4" strokeWidth={1.75} />
            <h2 className="text-sm font-medium text-foreground">
              Héros les plus joués
            </h2>
          </div>
          <AdminTopHeroes picks={stats.topHeroes} />
        </section>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" strokeWidth={1.75} />
        Données calculées le {generatedAt}.
      </p>
    </>
  );
}

export default function AdminStatsPage() {
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Statistiques"
        description="La santé du site en un coup d’œil : inscriptions, showmatchs et activité en jeu."
      />
      <Suspense fallback={<StatsSkeleton />}>
        <StatsContent />
      </Suspense>
    </div>
  );
}

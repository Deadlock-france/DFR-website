import Link from "next/link";
import {
  ArrowRight,
  Gamepad2,
  Inbox,
  Megaphone,
  Shield,
  Tags,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { unstable_rethrow } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminPanelClassName } from "@/components/admin/admin-styles";
import { buttonVariants } from "@/components/shadcn/button";
import { requireAdmin } from "@/lib/admin/access";
import { countActiveSiteAdmins } from "@/lib/admin/admins";
import { applicationTypeLabel } from "@/lib/admin/application-types";
import { listApplicationsAdmin } from "@/lib/admin/applications";
import { listAllAnnouncementsAdmin } from "@/lib/admin/cms";
import { hasPermission } from "@/lib/admin/permissions";
import { listSiteRoles } from "@/lib/admin/roles";
import { formatCount, loadSiteStats } from "@/lib/admin/stats";
import { isAnnouncementActiveNow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={cn(adminPanelClassName, "p-4")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
        <p className="truncate text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
      </div>
      <p className="font-colus mt-2 text-3xl tracking-[-0.03em] tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const identity = await requireAdmin();
  const canApplications = hasPermission(
    identity.permissions,
    "admin.applications",
  );
  const canAnnouncements = hasPermission(
    identity.permissions,
    "admin.announcements",
  );
  const canMembers = hasPermission(identity.permissions, "admin.members");
  const canRoles = hasPermission(identity.permissions, "admin.roles");
  const canStats = hasPermission(identity.permissions, "admin.stats");

  const [announcements, pending, adminCount, roles, stats] = await Promise.all([
    canAnnouncements ? listAllAnnouncementsAdmin() : Promise.resolve([]),
    canApplications
      ? listApplicationsAdmin("pending")
      : Promise.resolve([]),
    canMembers ? countActiveSiteAdmins() : Promise.resolve(0),
    canRoles ? listSiteRoles() : Promise.resolve([]),
    canStats
      ? loadSiteStats().catch((error: unknown) => {
          // Laisse passer les signaux de contrôle Next (prérendu, redirection…).
          unstable_rethrow(error);
          console.error("Admin dashboard stats failed:", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const liveAnnouncements = announcements.filter((row) =>
    isAnnouncementActiveNow(row),
  ).length;
  const recentPending = pending.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Tableau de bord"
        description={
          canApplications
            ? pending.length > 0
              ? `${pending.length} candidature${pending.length > 1 ? "s" : ""} à traiter.`
              : "Aucune candidature en attente."
            : "Espace admin — les sections visibles dépendent de tes rôles."
        }
      />

      {stats ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-colus text-xl tracking-[-0.02em] text-foreground">
                Le site en chiffres
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.members.last7d} inscription
                {stats.members.last7d === 1 ? "" : "s"} sur les 7 derniers
                jours.
              </p>
            </div>
            <Link
              href="/admin/statistiques"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Tout voir
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              icon={Users}
              label="Inscrits"
              value={formatCount(stats.members.total)}
              hint={`+${stats.members.last30d} sur 30 jours`}
            />
            <MiniStat
              icon={Trophy}
              label="Showmatchs"
              value={formatCount(stats.showmatches.total)}
              hint={`${stats.showmatches.upcoming} à venir`}
            />
            <MiniStat
              icon={Gamepad2}
              label="Matchs joués"
              value={formatCount(stats.gameplay.games)}
              hint={`${formatCount(stats.gameplay.participations)} participations`}
            />
            <MiniStat
              icon={UserPlus}
              label="Joueurs"
              value={formatCount(stats.players.total)}
              hint={`${stats.players.claimed} profil${stats.players.claimed === 1 ? "" : "s"} réclamé${stats.players.claimed === 1 ? "" : "s"}`}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {canApplications ? (
          <section
            className={cn(
              adminPanelClassName,
              "flex flex-col p-5 lg:col-span-3",
              pending.length > 0 && "border-primary/25",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Inbox className="size-4" strokeWidth={1.75} />
                  <p className="text-sm font-medium">Candidatures</p>
                </div>
                <p className="font-colus mt-3 text-5xl tracking-[-0.03em] tabular-nums text-foreground">
                  {pending.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pending.length === 0
                    ? "File vide pour le moment"
                    : pending.length === 1
                      ? "demande en attente"
                      : "demandes en attente"}
                </p>
              </div>
              <Link
                href="/admin/candidatures?status=pending"
                className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
              >
                Examiner
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {recentPending.length > 0 ? (
              <ul className="mt-6 divide-y divide-border border-t border-border">
                {recentPending.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/candidatures/${row.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {row.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {row.applicant_label ?? "Utilisateur"} ·{" "}
                          {applicationTypeLabel(row.type)} · {formatDt(row.created_at)}
                        </span>
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                Les nouvelles demandes apparaîtront ici.
              </p>
            )}
          </section>
        ) : null}

        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-1",
            canApplications ? "lg:col-span-2" : "lg:col-span-5 sm:grid-cols-3",
          )}
        >
          {canAnnouncements ? (
            <Link
              href="/admin/annonces"
              className={cn(
                adminPanelClassName,
                "group flex flex-col p-5 transition-colors hover:border-primary/35",
              )}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Megaphone className="size-4" strokeWidth={1.75} />
                <p className="text-sm font-medium">Annonces</p>
              </div>
              <p className="font-colus mt-3 text-4xl tracking-[-0.03em] tabular-nums">
                {liveAnnouncements}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                bandeau{liveAnnouncements === 1 ? "" : "x"} visible
                {liveAnnouncements === 1 ? "" : "s"} sur le site
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {announcements.length} au total
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                Gérer
                <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : null}

          {canMembers ? (
            <Link
              href="/admin/admins"
              className={cn(
                adminPanelClassName,
                "group flex flex-col p-5 transition-colors hover:border-primary/35",
              )}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="size-4" strokeWidth={1.75} />
                <p className="text-sm font-medium">Admins</p>
              </div>
              <p className="font-colus mt-3 text-4xl tracking-[-0.03em] tabular-nums">
                {adminCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                accès dashboard{adminCount === 1 ? "" : "s"} actif
                {adminCount === 1 ? "" : "s"}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                Gérer
                <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : null}

          {canRoles ? (
            <Link
              href="/admin/roles"
              className={cn(
                adminPanelClassName,
                "group flex flex-col p-5 transition-colors hover:border-primary/35",
              )}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tags className="size-4" strokeWidth={1.75} />
                <p className="text-sm font-medium">Rôles</p>
              </div>
              <p className="font-colus mt-3 text-4xl tracking-[-0.03em] tabular-nums">
                {roles.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                rôle{roles.length === 1 ? "" : "s"} défini
                {roles.length === 1 ? "" : "s"}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                Gérer
                <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

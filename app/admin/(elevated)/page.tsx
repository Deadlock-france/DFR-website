import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Megaphone,
  Newspaper,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { adminPanelClassName } from "@/components/admin/admin-styles";
import { buttonVariants } from "@/components/shadcn/button";
import { applicationTypeLabel } from "@/lib/admin/application-types";
import { listApplicationsAdmin } from "@/lib/admin/applications";
import { listAllAnnouncementsAdmin, listAllNewsAdmin } from "@/lib/admin/cms";
import { isAnnouncementActiveNow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function AdminDashboardPage() {
  const [announcements, news, pending] = await Promise.all([
    listAllAnnouncementsAdmin(),
    listAllNewsAdmin(),
    listApplicationsAdmin("pending"),
  ]);

  const liveAnnouncements = announcements.filter((row) =>
    isAnnouncementActiveNow(row),
  ).length;
  const publishedNews = news.filter((row) => row.status === "published").length;
  const draftNews = news.length - publishedNews;
  const recentPending = pending.slice(0, 4);
  const recentNews = news.slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Tableau de bord"
        description={
          pending.length > 0
            ? `${pending.length} candidature${pending.length > 1 ? "s" : ""} à traiter.`
            : "Aucune candidature en attente."
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
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

          <Link
            href="/admin/news"
            className={cn(
              adminPanelClassName,
              "group flex flex-col p-5 transition-colors hover:border-primary/35",
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Newspaper className="size-4" strokeWidth={1.75} />
              <p className="text-sm font-medium">News</p>
            </div>
            <p className="font-colus mt-3 text-4xl tracking-[-0.03em] tabular-nums">
              {publishedNews}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              article{publishedNews === 1 ? "" : "s"} publié
              {publishedNews === 1 ? "" : "s"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {draftNews} brouillon{draftNews === 1 ? "" : "s"}
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
              Éditer
              <ArrowRight className="size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>

      <section className={cn(adminPanelClassName, "p-5")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-colus text-xl tracking-[-0.02em]">
            Derniers articles
          </h2>
          <Link
            href="/admin/news/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Nouvel article
          </Link>
        </div>

        {recentNews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun article pour l’instant.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {recentNews.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/news/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      /{row.slug}
                    </span>
                  </span>
                  <AdminStatusBadge
                    tone={row.status === "published" ? "live" : "draft"}
                  >
                    {row.status === "published" ? "Publié" : "Brouillon"}
                  </AdminStatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

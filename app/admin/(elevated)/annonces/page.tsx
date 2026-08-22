import {
  deleteAnnouncementAction,
  saveAnnouncementAction,
} from "@/lib/admin/actions";
import { listAllAnnouncementsAdmin } from "@/lib/admin/cms";
import {
  isAnnouncementActiveNow,
  type SiteAnnouncement,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import {
  adminInputClassName,
  adminLabelClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Button } from "@/components/shadcn/button";

function formatDt(iso: string | null): string {
  if (!iso) return "sans date";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AnnouncementForm({
  initial,
}: {
  initial?: SiteAnnouncement | null;
}) {
  return (
    <form
      action={saveAnnouncementAction}
      className={cn(adminPanelClassName, "flex flex-col gap-4 p-4 sm:p-5")}
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Titre</span>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={adminInputClassName}
        />
      </label>
      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Contenu</span>
        <textarea
          name="body"
          rows={3}
          defaultValue={initial?.body ?? ""}
          className={adminInputClassName}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Statut</span>
          <select
            name="status"
            defaultValue={initial?.status ?? "draft"}
            className={adminInputClassName}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Début</span>
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={toLocalInputValue(initial?.starts_at ?? null)}
            className={adminInputClassName}
          />
        </label>
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Fin</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toLocalInputValue(initial?.ends_at ?? null)}
            className={adminInputClassName}
          />
        </label>
      </div>
      <Button type="submit" className="self-start">
        {initial ? "Enregistrer" : "Créer"}
      </Button>
    </form>
  );
}

export default async function AdminAnnoncesPage() {
  const rows = await listAllAnnouncementsAdmin();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Annonces"
        description="Bandeaux visibles sur l’accueil pendant la fenêtre de dates."
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-colus text-xl tracking-[-0.02em]">
          Nouvelle annonce
        </h2>
        <AnnouncementForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-colus text-xl tracking-[-0.02em]">
          Existantes ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune annonce.</p>
        ) : (
          rows.map((row) => {
            const live = isAnnouncementActiveNow(row);
            return (
              <div key={row.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <AdminStatusBadge tone={live ? "live" : "draft"}>
                      {live
                        ? "En ligne"
                        : row.status === "published"
                          ? "Publié"
                          : "Brouillon"}
                    </AdminStatusBadge>
                    <span>
                      {formatDt(row.starts_at)} → {formatDt(row.ends_at)}
                    </span>
                  </div>
                  <form action={deleteAnnouncementAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Supprimer
                    </Button>
                  </form>
                </div>
                <AnnouncementForm initial={row} />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

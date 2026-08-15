import {
  deleteAnnouncementAction,
  saveAnnouncementAction,
} from "@/lib/admin/actions";
import { listAllAnnouncementsAdmin } from "@/lib/admin/cms";
import type { SiteAnnouncement } from "@/lib/admin/types";

function formatDt(iso: string | null): string {
  if (!iso) return "—";
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
  // datetime-local expects local wall time
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
      className="flex flex-col gap-3 border border-[#2a3538] bg-[#0c1214] px-4 py-4"
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Titre</span>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Contenu</span>
        <textarea
          name="body"
          rows={3}
          defaultValue={initial?.body ?? ""}
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Statut</span>
          <select
            name="status"
            defaultValue={initial?.status ?? "draft"}
            className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Début</span>
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={toLocalInputValue(initial?.starts_at ?? null)}
            className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Fin</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toLocalInputValue(initial?.ends_at ?? null)}
            className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
          />
        </label>
      </div>
        <button
          type="submit"
          className="cursor-pointer self-start bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
        >
        {initial ? "Enregistrer" : "Créer"}
      </button>
    </form>
  );
}

export default async function AdminAnnoncesPage() {
  const rows = await listAllAnnouncementsAdmin();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-colus text-3xl tracking-wide">Annonces</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bandeaux visibles sur l’accueil pendant la fenêtre de dates.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-colus text-lg uppercase tracking-wide">Nouvelle annonce</h2>
        <AnnouncementForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-colus text-lg uppercase tracking-wide">
          Existantes ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune annonce.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {row.status === "published" ? "Publié" : "Brouillon"} ·{" "}
                  {formatDt(row.starts_at)} → {formatDt(row.ends_at)}
                </span>
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="text-[#e07070] hover:underline"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
              <AnnouncementForm initial={row} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}

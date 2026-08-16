import { notFound } from "next/navigation";

import { reviewDebanRequestAction } from "@/lib/admin/deban-actions";
import { getDebanRequestAdmin } from "@/lib/admin/deban";
import { debanStatusLabel } from "@/lib/admin/deban-types";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function AdminDebanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const row = await getDebanRequestAdmin(id);
  if (!row) notFound();

  const errorLabel = error ? `Erreur : ${error}` : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-colus text-3xl tracking-wide">
          Déban · {row.applicant_label ?? row.discord_id}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {debanStatusLabel(row.status)} · {formatDt(row.created_at)} · Discord{" "}
          {row.discord_id}
        </p>
      </div>

      {errorLabel ? (
        <p className="border border-[#e07070]/40 bg-[#e07070]/10 px-3 py-2 text-sm text-[#e07070]">
          {errorLabel}
        </p>
      ) : null}

      <section className="border border-[#2a3538] bg-[#0c1214] px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Motif du ban
        </h2>
        <p className="mt-2 text-sm text-foreground/90">
          {row.ban_reason || "—"}
        </p>
      </section>

      <section className="border border-[#2a3538] bg-[#0c1214] px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Demande du joueur
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {row.message}
        </p>
      </section>

      {row.status === "pending" ? (
        <form action={reviewDebanRequestAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={row.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Motif de décision</span>
            <textarea
              name="admin_note"
              required
              minLength={3}
              maxLength={2000}
              rows={4}
              placeholder="Explique la décision (visible par le joueur)."
              className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="decision"
              value="accepted"
              className="cursor-pointer bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
            >
              Accepter (le bot unban ensuite)
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="cursor-pointer border border-[#e07070]/50 px-4 py-2 text-sm font-semibold text-[#e07070] transition-colors hover:bg-[#e07070]/10"
            >
              Refuser
            </button>
          </div>
        </form>
      ) : (
        <section className="border border-[#2a3538] bg-[#0c1214] px-4 py-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Décision ({debanStatusLabel(row.status)})
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {row.admin_note || "—"}
          </p>
          {row.reviewed_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDt(row.reviewed_at)}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

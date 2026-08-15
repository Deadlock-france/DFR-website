import { notFound } from "next/navigation";

import { reviewApplicationAction } from "@/lib/admin/application-actions";
import { getApplicationAdmin } from "@/lib/admin/applications";
import {
  applicationStatusLabel,
  applicationTypeLabel,
} from "@/lib/admin/application-types";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function AdminCandidatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getApplicationAdmin(id);
  if (!row) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-colus text-3xl tracking-wide">{row.subject}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {row.applicant_label ?? "—"} · {applicationTypeLabel(row.type)} ·{" "}
          {applicationStatusLabel(row.status)} · {formatDt(row.created_at)}
        </p>
      </div>

      <section className="border border-[#2a3538] bg-[#0c1214] px-4 py-4">
        <h2 className="text-sm font-medium text-muted-foreground">Message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {row.body}
        </p>
      </section>

      {row.status === "pending" ? (
        <form action={reviewApplicationAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={row.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Motif de décision</span>
            <textarea
              name="admin_note"
              required
              minLength={3}
              maxLength={2000}
              rows={4}
              placeholder="Explique la décision (visible par le candidat)."
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
              Accepter
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
            Décision ({applicationStatusLabel(row.status)})
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

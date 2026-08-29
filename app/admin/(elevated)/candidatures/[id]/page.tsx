import { notFound } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import {
  adminInputClassName,
  adminLabelClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { buttonVariants } from "@/components/shadcn/button";
import { reviewApplicationAction } from "@/lib/admin/application-actions";
import { getApplicationAdmin } from "@/lib/admin/applications";
import {
  applicationStatusLabel,
  applicationTypeLabel,
} from "@/lib/admin/application-types";
import { cn } from "@/lib/utils";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function statusTone(status: string) {
  if (status === "pending") return "pending" as const;
  if (status === "accepted") return "live" as const;
  return "danger" as const;
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
      <AdminPageHeader
        title={row.subject}
        description={`${row.applicant_label ?? "Utilisateur"} · ${applicationTypeLabel(row.type)} · ${formatDt(row.created_at)}`}
        actions={
          <AdminStatusBadge tone={statusTone(row.status)}>
            {applicationStatusLabel(row.status)}
          </AdminStatusBadge>
        }
      />

      <section className={cn(adminPanelClassName, "px-4 py-4 sm:px-5")}>
        <h2 className="text-sm font-medium text-muted-foreground">Message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {row.body}
        </p>
      </section>

      {row.status === "pending" ? (
        <form action={reviewApplicationAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={row.id} />
          <label className={adminLabelClassName}>
            <span className="text-muted-foreground">Motif de décision</span>
            <textarea
              name="admin_note"
              required
              minLength={3}
              maxLength={2000}
              rows={4}
              placeholder="Explique la décision (visible par le candidat)."
              className={adminInputClassName}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="decision"
              value="accepted"
              className={cn(buttonVariants())}
            >
              Accepter
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Refuser
            </button>
          </div>
        </form>
      ) : (
        <section className={cn(adminPanelClassName, "px-4 py-4 sm:px-5")}>
          <h2 className="text-sm font-medium text-muted-foreground">
            Décision ({applicationStatusLabel(row.status)})
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {row.admin_note || "Aucun motif renseigné."}
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

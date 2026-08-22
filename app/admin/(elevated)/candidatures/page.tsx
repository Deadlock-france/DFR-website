import Link from "next/link";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import {
  adminFilterChipClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { buttonVariants } from "@/components/shadcn/button";
import { listApplicationsAdmin } from "@/lib/admin/applications";
import {
  applicationStatusLabel,
  applicationTypeLabel,
} from "@/lib/admin/application-types";
import { cn } from "@/lib/utils";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function statusTone(status: string) {
  if (status === "pending") return "pending" as const;
  if (status === "accepted") return "live" as const;
  return "danger" as const;
}

export default async function AdminCandidaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusRaw } = await searchParams;
  const statusFilter =
    statusRaw === "pending" ||
    statusRaw === "accepted" ||
    statusRaw === "rejected"
      ? statusRaw
      : undefined;

  const rows = await listApplicationsAdmin(statusFilter);
  const pendingCount = (
    statusFilter === "pending"
      ? rows
      : await listApplicationsAdmin("pending")
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Candidatures"
        description={`${pendingCount} en attente.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {(
              [
                [undefined, "Toutes"],
                ["pending", "En attente"],
                ["accepted", "Acceptées"],
                ["rejected", "Refusées"],
              ] as const
            ).map(([value, label]) => {
              const href = value
                ? `/admin/candidatures?status=${value}`
                : "/admin/candidatures";
              const active = statusFilter === value || (!statusFilter && !value);
              return (
                <Link
                  key={label}
                  href={href}
                  className={adminFilterChipClassName(active)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune candidature.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                adminPanelClassName,
                "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{row.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.applicant_label ?? "Utilisateur"} ·{" "}
                  {applicationTypeLabel(row.type)} · {formatDt(row.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <AdminStatusBadge tone={statusTone(row.status)}>
                  {applicationStatusLabel(row.status)}
                </AdminStatusBadge>
                <Link
                  href={`/admin/candidatures/${row.id}`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Examiner
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

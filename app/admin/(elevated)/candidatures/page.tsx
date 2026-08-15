import Link from "next/link";

import { listApplicationsAdmin } from "@/lib/admin/applications";
import {
  applicationStatusLabel,
  applicationTypeLabel,
} from "@/lib/admin/application-types";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-colus text-3xl tracking-wide">Candidatures</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingCount} en attente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
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
                className={
                  active
                    ? "border border-[#58a484] bg-[#58a484]/15 px-3 py-1.5 text-[#9fd4bc]"
                    : "border border-[#2a3538] px-3 py-1.5 text-muted-foreground hover:text-foreground"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune candidature.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-[#2a3538] bg-[#0c1214] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{row.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.applicant_label ?? "—"} · {applicationTypeLabel(row.type)}{" "}
                  · {applicationStatusLabel(row.status)} ·{" "}
                  {formatDt(row.created_at)}
                </p>
              </div>
              <Link
                href={`/admin/candidatures/${row.id}`}
                className="cursor-pointer font-medium text-[#58a484] hover:underline"
              >
                Examiner
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

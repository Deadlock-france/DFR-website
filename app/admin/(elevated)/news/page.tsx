import Link from "next/link";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { adminPanelClassName } from "@/components/admin/admin-styles";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { deleteNewsAction } from "@/lib/admin/actions";
import { listAllNewsAdmin } from "@/lib/admin/cms";
import { cn } from "@/lib/utils";

function formatDt(iso: string | null): string {
  if (!iso) return "sans date";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default async function AdminNewsListPage() {
  const rows = await listAllNewsAdmin();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="News"
        description="Articles éditoriaux (markdown assisté)."
        actions={
          <Link
            href="/admin/news/new"
            className={cn(buttonVariants())}
          >
            Nouvel article
          </Link>
        }
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun article.</p>
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
                <Link
                  href={`/admin/news/${row.id}`}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {row.title}
                </Link>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  /{row.slug} · {formatDt(row.published_at ?? row.updated_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge
                  tone={row.status === "published" ? "live" : "draft"}
                >
                  {row.status === "published" ? "Publié" : "Brouillon"}
                </AdminStatusBadge>
                <Link
                  href={`/admin/news/${row.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Modifier
                </Link>
                {row.status === "published" ? (
                  <Link
                    href={`/news/${row.slug}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-muted-foreground",
                    )}
                  >
                    Voir
                  </Link>
                ) : null}
                <form action={deleteNewsAction}>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

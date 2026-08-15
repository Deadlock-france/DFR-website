import Link from "next/link";

import { deleteNewsAction } from "@/lib/admin/actions";
import { listAllNewsAdmin } from "@/lib/admin/cms";

function formatDt(iso: string | null): string {
  if (!iso) return "—";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-colus text-3xl tracking-wide">News</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Articles éditoriaux (markdown assisté).
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="cursor-pointer bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
        >
          Nouvel article
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun article.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-[#2a3538] bg-[#0c1214] px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/news/${row.id}`}
                  className="font-medium text-foreground transition-colors hover:text-[#58a484]"
                >
                  {row.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  /{row.slug} ·{" "}
                  {row.status === "published" ? "Publié" : "Brouillon"} ·{" "}
                  {formatDt(row.published_at ?? row.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={`/admin/news/${row.id}`}
                  className="cursor-pointer font-medium text-[#58a484] hover:underline"
                >
                  Modifier
                </Link>
                {row.status === "published" ? (
                  <Link
                    href={`/news/${row.slug}`}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    Voir
                  </Link>
                ) : null}
                <form action={deleteNewsAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-[#e07070] hover:underline"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

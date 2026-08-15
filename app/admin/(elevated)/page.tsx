import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-colus text-3xl tracking-wide">Tableau de bord</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Annonces, news et demandes de déban.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/annonces"
          className="border border-[#2a3538] bg-[#0c1214] px-4 py-5 transition-colors hover:border-[#58a484]/50"
        >
          <h2 className="font-colus text-xl uppercase tracking-wide">Annonces</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bandeaux / events publiés sur le site.
          </p>
        </Link>
        <Link
          href="/admin/news"
          className="border border-[#2a3538] bg-[#0c1214] px-4 py-5 transition-colors hover:border-[#58a484]/50"
        >
          <h2 className="font-colus text-xl uppercase tracking-wide">News</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Articles avec éditeur markdown assisté.
          </p>
        </Link>
        <Link
          href="/admin/debans"
          className="border border-[#2a3538] bg-[#0c1214] px-4 py-5 transition-colors hover:border-[#58a484]/50"
        >
          <h2 className="font-colus text-xl uppercase tracking-wide">Débans</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Demandes de déban serveur Discord.
          </p>
        </Link>
      </div>
    </div>
  );
}

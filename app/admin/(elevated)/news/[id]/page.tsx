import { notFound } from "next/navigation";

import NewsEditorForm from "@/components/admin/NewsEditorForm";
import { getNewsAdmin } from "@/lib/admin/cms";

export default async function AdminNewsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-colus text-3xl tracking-wide">Nouvel article</h1>
        <NewsEditorForm article={null} />
      </div>
    );
  }

  const article = await getNewsAdmin(id);
  if (!article) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-colus text-3xl tracking-wide">Éditer l’article</h1>
        <p className="mt-1 text-sm text-muted-foreground">/{article.slug}</p>
      </div>
      <NewsEditorForm article={article} />
    </div>
  );
}

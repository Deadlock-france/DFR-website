import { notFound } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
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
        <AdminPageHeader
          title="Nouvel article"
          description="Rédige, prévisualise, puis publie."
        />
        <NewsEditorForm article={null} />
      </div>
    );
  }

  const article = await getNewsAdmin(id);
  if (!article) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Éditer l’article"
        description={`/${article.slug}`}
      />
      <NewsEditorForm article={article} />
    </div>
  );
}

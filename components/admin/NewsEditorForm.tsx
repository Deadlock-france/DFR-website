"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";

import {
  adminInputClassName,
  adminLabelClassName,
} from "@/components/admin/admin-styles";
import NewsMarkdownEditor, {
  type NewsMarkdownEditorHandle,
} from "@/components/admin/NewsMarkdownEditor";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { saveNewsAction } from "@/lib/admin/actions";
import type { SiteNewsArticle } from "@/lib/admin/types";
import { slugifyNewsTitle } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewsEditorForm({
  article,
}: {
  article: SiteNewsArticle | null;
}) {
  const isNew = !article;
  const router = useRouter();
  const editorRef = useRef<NewsMarkdownEditorHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fd = new FormData(form);
    const markdown =
      editorRef.current?.getMarkdown() ??
      String(fd.get("body_markdown") ?? "");
    fd.set("body_markdown", markdown);

    // type=url bloquait parfois la soumission HTML5 ; on valide côté serveur.
    const cover = String(fd.get("cover_url") ?? "").trim();
    if (cover) fd.set("cover_url", cover);
    else fd.set("cover_url", "");

    startTransition(async () => {
      try {
        const result = await saveNewsAction(fd);
        router.push(`/admin/news/${result.id}`);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Enregistrement impossible";
        setError(
          message === "invalid_slug"
            ? "Slug invalide (lettres, chiffres, tirets)."
            : message === "title_required"
              ? "Le titre est obligatoire."
              : message,
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}

      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Titre</span>
        <input
          name="title"
          required
          defaultValue={article?.title ?? ""}
          className={cn(adminInputClassName, "text-lg")}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Slug</span>
          <input
            name="slug"
            defaultValue={article?.slug ?? ""}
            placeholder={slugifyNewsTitle(article?.title ?? "mon-article")}
            className={cn(adminInputClassName, "font-mono")}
          />
        </label>
        <label className={adminLabelClassName}>
          <span className="text-muted-foreground">Statut</span>
          <select
            name="status"
            defaultValue={article?.status ?? "draft"}
            className={adminInputClassName}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
      </div>

      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Extrait</span>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={article?.excerpt ?? ""}
          className={adminInputClassName}
        />
      </label>

      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Cover URL (optionnel)</span>
        <input
          name="cover_url"
          type="text"
          inputMode="url"
          placeholder="https://…"
          defaultValue={article?.cover_url ?? ""}
          className={adminInputClassName}
        />
      </label>

      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Publié le</span>
        <input
          type="datetime-local"
          name="published_at"
          defaultValue={toLocalInputValue(article?.published_at ?? null)}
          className={adminInputClassName}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Contenu (Markdown)</span>
        <NewsMarkdownEditor
          key={article?.id ?? "new"}
          ref={editorRef}
          name="body_markdown"
          defaultValue={article?.body_markdown ?? ""}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : isNew ? "Créer" : "Enregistrer"}
        </Button>
        <Link
          href="/admin/news"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}

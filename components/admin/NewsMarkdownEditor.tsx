"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Crepe } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { NodeSelection } from "@milkdown/kit/prose/state";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";

import {
  parseImageAlign,
  withImageAlign,
  type NewsImageAlign,
} from "@/lib/admin/image-align";
import { uploadNewsImage } from "@/lib/admin/upload-news-image";

export type NewsMarkdownEditorHandle = {
  getMarkdown: () => string;
};

const ALIGN_OPTIONS: { value: NewsImageAlign; label: string }[] = [
  { value: "left", label: "Gauche" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Droite" },
];

function syncImageAlignDom(root: HTMLElement) {
  root.querySelectorAll(".milkdown-image-block").forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    const img = block.querySelector("img[src]");
    if (!(img instanceof HTMLImageElement)) return;
    block.dataset.align = parseImageAlign(img.getAttribute("src") ?? "");
  });
}

/**
 * Éditeur Milkdown Crepe — une seule surface, markdown via ref + input sync.
 */
const NewsMarkdownEditor = forwardRef<
  NewsMarkdownEditorHandle,
  { name: string; defaultValue: string }
>(function NewsMarkdownEditor({ name, defaultValue }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const [markdown, setMarkdown] = useState(defaultValue);
  const [selectedAlign, setSelectedAlign] = useState<NewsImageAlign | null>(
    null,
  );

  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      try {
        const live = crepeRef.current?.getMarkdown?.();
        if (typeof live === "string") return live;
      } catch {
        // éditeur détruit / pas prêt
      }
      return markdown;
    },
  }));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let removeSelectionListeners: (() => void) | undefined;
    const crepe = new Crepe({
      root,
      defaultValue: defaultValue || "",
      features: {
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.ImageBlock]: true,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: "Écris l’article… tape / pour les blocs (dont image)",
          mode: "block",
        },
        [Crepe.Feature.ImageBlock]: {
          maxWidth: 960,
          maxHeight: 1200,
          blockUploadPlaceholderText: "ou colle une URL…",
          inlineUploadPlaceholderText: "ou colle une URL…",
          blockUploadButton: "Upload",
          inlineUploadButton: "Upload",
          blockConfirmButton: "OK",
          inlineConfirmButton: "OK",
          onUpload: uploadNewsImage,
          blockOnUpload: uploadNewsImage,
          inlineOnUpload: uploadNewsImage,
        },
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md) => {
        if (cancelled) return;
        setMarkdown(md);
        syncImageAlignDom(root);
      });
    });

    void crepe.create().then(() => {
      if (cancelled) {
        void crepe.destroy();
        return;
      }
      crepeRef.current = crepe;
      try {
        setMarkdown(crepe.getMarkdown());
      } catch {
        // ignore
      }
      syncImageAlignDom(root);

      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const updateSelection = () => {
          if (cancelled) return;
          const { selection } = view.state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "image-block"
          ) {
            setSelectedAlign(parseImageAlign(selection.node.attrs.src ?? ""));
            syncImageAlignDom(root);
            return;
          }
          setSelectedAlign(null);
        };
        view.dom.addEventListener("mouseup", updateSelection);
        view.dom.addEventListener("keyup", updateSelection);
        view.dom.addEventListener("click", updateSelection);
        removeSelectionListeners = () => {
          view.dom.removeEventListener("mouseup", updateSelection);
          view.dom.removeEventListener("keyup", updateSelection);
          view.dom.removeEventListener("click", updateSelection);
        };
      });
    });

    return () => {
      cancelled = true;
      removeSelectionListeners?.();
      crepeRef.current = null;
      void crepe.destroy();
    };
    // Remount via key= sur le parent quand l’article change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setImageAlign(align: NewsImageAlign) {
    const crepe = crepeRef.current;
    const root = rootRef.current;
    if (!crepe || !root) return;

    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { selection } = state;
      if (
        !(selection instanceof NodeSelection) ||
        selection.node.type.name !== "image-block"
      ) {
        return;
      }
      const src = withImageAlign(String(selection.node.attrs.src ?? ""), align);
      const tr = state.tr.setNodeMarkup(selection.from, undefined, {
        ...selection.node.attrs,
        src,
      });
      view.dispatch(tr);
      setSelectedAlign(align);
      // laisser le DOM se mettre à jour
      requestAnimationFrame(() => syncImageAlignDom(root));
    });
  }

  return (
    <div className="news-md-editor w-full overflow-visible">
      <input type="hidden" name={name} value={markdown} readOnly />
      <div
        className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        role="toolbar"
        aria-label="Alignement de l’image"
      >
        <span>Alignement image</span>
        {ALIGN_OPTIONS.map((option) => {
          const active = selectedAlign === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={selectedAlign == null}
              onClick={() => setImageAlign(option.value)}
              className={
                active
                  ? "cursor-pointer border border-[#58a484] bg-[#58a484]/20 px-2 py-1 text-[#9fd4bc]"
                  : "cursor-pointer border border-[#2a3538] bg-[#12181a] px-2 py-1 transition-colors hover:border-[#58a484]/50 disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              {option.label}
            </button>
          );
        })}
        <span className="text-[11px] opacity-70">
          {selectedAlign == null
            ? "Sélectionne une image"
            : "Défaut : gauche"}
        </span>
      </div>
      <div ref={rootRef} className="min-h-88" />
    </div>
  );
});

export default NewsMarkdownEditor;

import type { Metadata } from "next";

import NotFoundView from "@/components/not-found/NotFoundView";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Page introuvable",
  description: "Cette page n’existe pas sur Deadlock France.",
  path: "/",
});

export default function NotFound() {
  return <NotFoundView />;
}

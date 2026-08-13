import type { Metadata } from "next";

import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Équipe",
  description: "Espace équipe Deadlock France.",
  path: "/equipes",
});

export default function EquipeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

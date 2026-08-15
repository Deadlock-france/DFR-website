import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Admin",
  description: "Espace admin Deadlock France.",
  path: "/admin",
});

/** Layout racine /admin — pas de garde ici (unlock vs elevated). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}

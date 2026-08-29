import type { ReactNode } from "react";

import { requirePermission } from "@/lib/admin/access";

export default async function StatistiquesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin.stats");
  return children;
}

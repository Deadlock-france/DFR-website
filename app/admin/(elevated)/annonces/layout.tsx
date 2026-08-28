import type { ReactNode } from "react";

import { requirePermission } from "@/lib/admin/access";

export default async function AnnoncesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin.announcements");
  return children;
}

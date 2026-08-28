import type { ReactNode } from "react";

import { requirePermission } from "@/lib/admin/access";

export default async function RolesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin.roles");
  return children;
}

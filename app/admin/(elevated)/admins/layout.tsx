import type { ReactNode } from "react";

import { requirePermission } from "@/lib/admin/access";

export default async function AdminsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin.members");
  return children;
}

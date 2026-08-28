import type { ReactNode } from "react";

import { requirePermission } from "@/lib/admin/access";

export default async function CandidaturesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("admin.applications");
  return children;
}

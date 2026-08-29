"use client";

import { useState } from "react";

import AdminRoleEditor from "@/components/admin/AdminRoleEditor";
import AdminRoleMembers from "@/components/admin/AdminRoleMembers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import type { SiteRole, SiteRoleMember } from "@/lib/admin/roles";

export default function AdminRoleDetail({
  role,
  members,
}: {
  role: SiteRole;
  members: SiteRoleMember[];
}) {
  const [tab, setTab] = useState("permissions");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value === "permissions" || value === "members") setTab(value);
      }}
      className="gap-6"
    >
      <TabsList variant="line" aria-label="Sections du rôle">
        <TabsTrigger value="permissions">Scopes</TabsTrigger>
        <TabsTrigger value="members">Membres ({members.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="permissions">
        <AdminRoleEditor role={role} />
      </TabsContent>
      <TabsContent value="members">
        <AdminRoleMembers roleId={role.id} members={members} />
      </TabsContent>
    </Tabs>
  );
}

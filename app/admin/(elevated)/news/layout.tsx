import { redirect } from "next/navigation";

/** CMS news masqué pour le moment : toute URL /admin/news repart au dashboard. */
export default function HiddenNewsAdminLayout() {
  redirect("/admin");
}

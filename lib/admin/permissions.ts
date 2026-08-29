/** Catalogue de permissions (scopes), calqué sur les rôles Discord. */

export const ADMIN_PERMISSIONS = [
  "admin.administrator",
  "site.access",
  "admin.access",
  "admin.announcements",
  "admin.news",
  "admin.applications",
  "admin.stats",
  "admin.members",
  "admin.roles",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const SYSTEM_ADMINISTRATOR_SLUG = "administrateur";

const STAFF_PERMISSIONS: readonly AdminPermission[] = [
  "admin.announcements",
  "admin.news",
  "admin.applications",
  "admin.stats",
  "admin.members",
  "admin.roles",
];

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: readonly AdminPermission[];
};

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    id: "general",
    label: "Général",
    permissions: ["admin.administrator", "site.access", "admin.access"],
  },
  {
    id: "content",
    label: "Contenu",
    permissions: ["admin.announcements", "admin.news", "admin.applications"],
  },
  {
    id: "insights",
    label: "Données",
    permissions: ["admin.stats"],
  },
  {
    id: "staff",
    label: "Équipe",
    permissions: ["admin.members", "admin.roles"],
  },
];

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function permissionLabel(permission: AdminPermission): string {
  switch (permission) {
    case "admin.administrator":
      return "Administrateur";
    case "site.access":
      return "Accéder au site";
    case "admin.access":
      return "Accéder au dashboard";
    case "admin.announcements":
      return "Gérer les annonces";
    case "admin.news":
      return "Gérer les news";
    case "admin.applications":
      return "Traiter les candidatures";
    case "admin.stats":
      return "Voir les statistiques";
    case "admin.members":
      return "Gérer les admins";
    case "admin.roles":
      return "Gérer les rôles";
  }
}

export function permissionDescription(permission: AdminPermission): string {
  switch (permission) {
    case "admin.administrator":
      return "Accorde tous les scopes, y compris la gestion des rôles et des admins.";
    case "site.access":
      return "Entre sur le site sans mot de passe (connexion Discord).";
    case "admin.access":
      return "Ouvre l’espace admin (code d’élévation toujours requis).";
    case "admin.announcements":
      return "Créer, modifier et retirer les bandeaux du site.";
    case "admin.news":
      return "Rédiger et publier les articles (section masquée pour le moment).";
    case "admin.applications":
      return "Examiner et décider des candidatures staff / partenaires.";
    case "admin.stats":
      return "Consulter l’audience du site et les chiffres des showmatchs.";
    case "admin.members":
      return "Ajouter ou retirer des comptes du dashboard.";
    case "admin.roles":
      return "Créer des rôles et définir leurs scopes.";
  }
}

export function sanitizeStoredPermissions(
  raw: readonly string[],
): AdminPermission[] {
  const seen = new Set<AdminPermission>();
  for (const value of raw) {
    if (isAdminPermission(value)) seen.add(value);
  }
  return ADMIN_PERMISSIONS.filter((permission) => seen.has(permission));
}

/**
 * Union + implications : administrateur = tout ;
 * un scope métier implique dashboard + accès site.
 */
export function expandPermissions(
  raw: readonly string[],
): Set<AdminPermission> {
  const stored = sanitizeStoredPermissions(raw);
  const set = new Set<AdminPermission>(stored);
  if (set.has("admin.administrator")) {
    return new Set(ADMIN_PERMISSIONS);
  }
  if (STAFF_PERMISSIONS.some((permission) => set.has(permission))) {
    set.add("admin.access");
  }
  if (set.has("admin.access")) {
    set.add("site.access");
  }
  return set;
}

export function mergePermissionLists(
  lists: ReadonlyArray<readonly string[]>,
): Set<AdminPermission> {
  const merged: string[] = [];
  for (const list of lists) merged.push(...list);
  return expandPermissions(merged);
}

export function hasPermission(
  raw: readonly string[],
  permission: AdminPermission,
): boolean {
  return expandPermissions(raw).has(permission);
}

export function normalizeRoleName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return null;
  return name;
}

export function normalizeRoleColor(raw: string): string | null {
  const value = raw.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return null;
  return value.toUpperCase();
}

export function slugifyRoleName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "role";
}

export const ROLE_COLOR_PRESETS = [
  "#E74C3C",
  "#E67E22",
  "#F1C40F",
  "#2ECC71",
  "#1ABC9C",
  "#4A9B7F",
  "#3498DB",
  "#9B59B6",
  "#E91E63",
  "#95A5A6",
  "#607D8B",
] as const;

export function canDeleteRole(role: { isSystem: boolean }): boolean {
  return !role.isSystem;
}

export function canStripAdministrator(role: { isSystem: boolean }): boolean {
  return !role.isSystem;
}

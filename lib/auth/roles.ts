/**
 * Role model for the admin portal.
 *
 * super_admin — full control, including destructive actions (delete), role changes,
 *               and managing other super admins.
 * admin       — can create/update records, no destructive actions, cannot touch roles.
 * editor/user — read-only inside the admin database.
 */
export const ROLES = ["super_admin", "admin", "editor", "user"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  user: "User",
};

/** Capabilities checked throughout the app. */
export type Capability =
  | "read"
  | "write"
  | "delete"
  | "manage_users"
  | "manage_super_admins";

const CAPABILITIES: Record<Role, Capability[]> = {
  super_admin: ["read", "write", "delete", "manage_users", "manage_super_admins"],
  admin: ["read", "write"],
  editor: ["read"],
  user: ["read"],
};

/** Normalise anything stored in the DB (legacy values, casing, spaces). */
export function normalizeRole(raw: string | null | undefined): Role {
  const value = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "superadmin" || value === "super_admin" || value === "owner" || value === "root") {
    return "super_admin";
  }
  if (value === "admin" || value === "administrator") return "admin";
  if (value === "editor") return "editor";
  return "user";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(normalizeRole(value));
}

export function can(role: string | null | undefined, capability: Capability): boolean {
  return CAPABILITIES[normalizeRole(role)].includes(capability);
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === "super_admin";
}

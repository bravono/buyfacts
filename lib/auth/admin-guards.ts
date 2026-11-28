/**
 * Guardrails for the admin database API.
 *
 * Everything here runs *before* a write touches Prisma, so an ordinary admin
 * cannot do by hand what the UI hides from them.
 */
import { prisma } from "@/lib/prisma";
import { Capability, can, normalizeRole, isSuperAdmin } from "./roles";
import { countActiveSuperAdmins } from "./audit";

export type Guard = { ok: true } | { ok: false; status: number; error: string };

const OK: Guard = { ok: true };
const deny = (error: string, status = 403): Guard => ({ ok: false, status, error });

/**
 * Which capability a table needs for a destructive action.
 * Only the audit trail and user accounts are extra-sensitive; other records
 * are governed by the role's "delete" capability.
 */
export function capabilityForTableAction(table: string, action: "read" | "write" | "delete"): Capability {
  if (action === "read") return "read";
  if (table === "user") return "manage_users";
  if (table === "auditLog") return "manage_super_admins";
  return action === "delete" ? "delete" : "write";
}

/** Reading the user table exposes account metadata — treat it as sensitive. */
export function capabilityForTableRead(table: string): Capability {
  if (table === "user") return "manage_users";
  if (table === "auditLog") return "manage_super_admins";
  return "read";
}

/**
 * Rules that apply to writes on the user table when they come through the
 * generic database editor rather than the dedicated /api/admin/users API.
 */
export async function guardUserTableWrite(params: {
  actorRole: string | null | undefined;
  actorId?: string | number | null;
  operation: "create" | "update" | "delete";
  data?: Record<string, unknown>;
  targetId?: string | number | null;
}): Promise<Guard> {
  const { actorRole, actorId, operation, data, targetId } = params;

  if (!can(actorRole, "manage_users")) {
    return deny("Your role cannot change administrator accounts.");
  }

  // Promote-to-super-admin requires being one already.
  const requestedRole =
    data && data.role !== undefined && data.role !== null ? normalizeRole(String(data.role)) : null;
  if (requestedRole === "super_admin" && !isSuperAdmin(actorRole)) {
    return deny("Only a super admin can grant the super admin role.");
  }

  if (operation === "delete") {
    return deny(
      "Administrator accounts cannot be deleted. Deactivate the account instead (Users → Deactivate).",
      400
    );
  }

  if (operation === "create") {
    if (!data || !data.email) {
      return deny("A user account needs an email address.", 400);
    }
    const email = String(data.email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return deny("An account with that email already exists.", 409);
    }
    return OK;
  }

  // update
  if (targetId === undefined || targetId === null) {
    return deny("A target account id is required.", 400);
  }

  const targetIdNum = Number(targetId);
  if (Number.isNaN(targetIdNum)) return deny("Invalid account id.", 400);

  const target = await prisma.user.findUnique({ where: { id: targetIdNum } });
  if (!target) return deny("Account not found.", 404);

  const targetRole = normalizeRole(target.role);
  const isSelf = actorId != null && Number(actorId) === targetIdNum;

  // Nobody may lock themselves out.
  if (isSelf) {
    if (requestedRole && requestedRole !== targetRole) {
      return deny("You cannot change your own role. Ask another super admin.");
    }
    if (data && data.isActive === false) {
      return deny("You cannot deactivate your own account.");
    }
  }

  // The last active super admin is protected from demotion and deactivation.
  if (targetRole === "super_admin") {
    const losingSuperStatus =
      (requestedRole !== null && requestedRole !== "super_admin") ||
      (data && data.isActive === false && target.isActive);
    if (losingSuperStatus) {
      const others = await countActiveSuperAdmins(targetIdNum);
      if (others === 0) {
        return deny(
          "This is the last active super admin. Promote another super admin first, so the company keeps control of the portal.",
          409
        );
      }
    }
  }

  return OK;
}

import { prisma } from "@/lib/prisma";

export interface AuditInput {
  action: string;
  actorId?: string | number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  target?: string | null;
  targetId?: string | number | null;
  status?: "success" | "failure";
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit row. Never throws: a failed audit write must not break the
 * action it is recording, but it is logged loudly so it cannot pass silently.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId != null ? String(input.actorId) : null,
        actorEmail: input.actorEmail ?? null,
        actorRole: input.actorRole ?? null,
        target: input.target ?? null,
        targetId: input.targetId != null ? String(input.targetId) : null,
        status: input.status ?? "success",
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit entry:", input.action, err);
  }
}

/** Count currently active super admins (used to protect the last one). */
export async function countActiveSuperAdmins(excludeUserId?: number): Promise<number> {
  return prisma.user.count({
    where: {
      role: "super_admin",
      isActive: true,
      ...(excludeUserId != null ? { id: { not: excludeUserId } } : {}),
    },
  });
}

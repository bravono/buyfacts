import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** Reset links live for one hour — long enough to open the mail, short enough to matter. */
export const RESET_TOKEN_TTL_MINUTES = 60;

export interface IssuedResetToken {
  /** The raw token; only ever sent by email, never stored. */
  token: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a single-use password-reset token for a user.
 * Only the SHA-256 of the token is persisted, so a database leak cannot be replayed.
 */
export async function issueResetToken(userId: number): Promise<IssuedResetToken> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      resetTokenHash: hashToken(token),
      resetTokenExpiresAt: expiresAt,
    },
  });

  return { token, expiresAt };
}

export interface ResetTokenMatch {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

/** Find the (single) user whose unexpired reset token matches. */
export async function findUserByResetToken(token: string): Promise<ResetTokenMatch | null> {
  if (!token || typeof token !== "string" || token.length < 32) return null;

  const user = await prisma.user.findFirst({
    where: { resetTokenHash: hashToken(token) },
    select: { id: true, email: true, name: true, role: true, resetTokenExpiresAt: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Consume a reset token (clears it) — call only after the password was changed. */
export async function consumeResetToken(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { resetTokenHash: null, resetTokenExpiresAt: null },
  });
}

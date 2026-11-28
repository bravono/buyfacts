import { NextRequest } from "next/server";
import { verifyJWT, JWTPayload } from "./jwt";
import { AUTH_COOKIE_NAME } from "./session";
import { prisma } from "@/lib/prisma";
import { Capability, can, normalizeRole } from "./roles";

export interface AuthValidationResult {
  isAuthenticated: boolean;
  user?: JWTPayload;
  error?: string;
}

function extractToken(request: NextRequest | Request): string | undefined {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.substring(7).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (match) return match.substring(AUTH_COOKIE_NAME.length + 1);
  }

  return undefined;
}

/**
 * Extract and validate the JWT (Bearer header or httpOnly cookie), then confirm
 * the account still exists, is active, and still holds the role the token claims.
 * A token issued before a demotion or deactivation therefore stops working at once.
 */
export async function validateApiAuth(
  request: NextRequest | Request
): Promise<AuthValidationResult> {
  const token = extractToken(request);
  if (!token) {
    return {
      isAuthenticated: false,
      error: "Authentication required. Missing auth token or session cookie.",
    };
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return { isAuthenticated: false, error: "Invalid or expired JWT token." };
  }

  const userId = Number(payload.userId);
  if (Number.isNaN(userId)) {
    return { isAuthenticated: false, error: "Invalid session subject." };
  }

  const account = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    })
    .catch(() => null);

  if (!account) {
    return { isAuthenticated: false, error: "Account no longer exists." };
  }
  if (!account.isActive) {
    return { isAuthenticated: false, error: "This account has been deactivated." };
  }

  const liveRole = normalizeRole(account.role);
  if (!can(liveRole, "read")) {
    return { isAuthenticated: false, error: "This account has no admin access." };
  }

  return {
    isAuthenticated: true,
    user: { ...payload, email: account.email, role: liveRole },
  };
}

export interface CapabilityResult {
  ok: boolean;
  response?: Response;
  user?: JWTPayload;
}

/**
 * Validate the session AND require a capability.
 * Returns a ready-to-return Response when the caller is not allowed.
 */
export async function requireCapability(
  request: NextRequest | Request,
  capability: Capability
): Promise<CapabilityResult> {
  const auth = await validateApiAuth(request);
  if (!auth.isAuthenticated || !auth.user) {
    return {
      ok: false,
      response: jsonError(auth.error || "Authentication required.", 401),
    };
  }

  if (!can(auth.user.role, capability)) {
    return {
      ok: false,
      user: auth.user,
      response: jsonError(
        `Your role (${normalizeRole(auth.user.role)}) is not allowed to perform this action.`,
        403
      ),
    };
  }

  return { ok: true, user: auth.user };
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

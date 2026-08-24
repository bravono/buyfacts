import { NextRequest } from "next/server";
import { verifyJWT, JWTPayload } from "./jwt";
import { AUTH_COOKIE_NAME } from "./session";

export interface AuthValidationResult {
  isAuthenticated: boolean;
  user?: JWTPayload;
  error?: string;
}

/**
 * Extract and validate JWT token from authorization header (Bearer) or httpOnly cookie.
 */
export async function validateApiAuth(
  request: NextRequest | Request
): Promise<AuthValidationResult> {
  let token: string | undefined;

  // 1. Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fall back to cookie header if request has cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      if (match) {
        token = match.substring(AUTH_COOKIE_NAME.length + 1);
      }
    }
  }

  if (!token) {
    return {
      isAuthenticated: false,
      error: "Authentication required. Missing auth token or session cookie.",
    };
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return {
      isAuthenticated: false,
      error: "Invalid or expired JWT token.",
    };
  }

  return {
    isAuthenticated: true,
    user: payload,
  };
}

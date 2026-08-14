import { NextRequest } from "next/server";
import { verifyJWT, JWTPayload } from "./jwt";

export interface AuthValidationResult {
  isAuthenticated: boolean;
  user?: JWTPayload;
  error?: string;
}

/**
 * Extract and validate Bearer JWT token from Next.js request headers or authorization header
 */
export async function validateApiAuth(
  request: NextRequest | Request
): Promise<AuthValidationResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      isAuthenticated: false,
      error: "Missing Authorization header",
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      isAuthenticated: false,
      error: "Invalid Authorization scheme. Expected 'Bearer <token>'",
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      isAuthenticated: false,
      error: "Empty token payload",
    };
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return {
      isAuthenticated: false,
      error: "Invalid or expired JWT token",
    };
  }

  return {
    isAuthenticated: true,
    user: payload,
  };
}

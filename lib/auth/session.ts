import { cookies } from "next/headers";
import { signJWT, verifyJWT, JWTPayload } from "./jwt";

export const AUTH_COOKIE_NAME = "buyfacts_admin_token";
export const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface UserSessionData {
  userId: string | number;
  email: string;
  name?: string | null;
  role?: string;
}

/**
 * Creates a signed JWT token and stores it in an httpOnly cookie.
 */
export async function createAuthSession(user: UserSessionData): Promise<string> {
  const payload: JWTPayload = {
    userId: String(user.userId),
    email: user.email,
    name: user.name || "",
    role: user.role || "admin",
  };

  const token = await signJWT(payload, undefined, SESSION_EXPIRATION_SECONDS);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRATION_SECONDS,
  });

  return token;
}

/**
 * Retrieves and validates the current session payload from httpOnly cookies.
 */
export async function getAuthSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    return await verifyJWT(token);
  } catch (err) {
    console.error("Error reading auth session:", err);
    return null;
  }
}

/**
 * Deletes the auth session cookie.
 */
export async function deleteAuthSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
  } catch (err) {
    console.error("Error deleting auth session:", err);
  }
}

import crypto from "crypto";

const SCRYPT_KEY_LENGTH = 64;

/** Minimum requirements for any admin password. */
export const PASSWORD_MIN_LENGTH = 12;

export function describePasswordPolicy(): string {
  return `At least ${PASSWORD_MIN_LENGTH} characters, with upper and lower case letters and a number.`;
}

export function validatePasswordStrength(password: string): { ok: boolean; error?: string } {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.` };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "Password must contain a lowercase letter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "Password must contain an uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must contain a number." };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, error: "Password is too repetitive." };
  }
  return { ok: true };
}

/**
 * Hash a plain text password with a unique cryptographic salt using scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify a plain text password against a stored salt:hash string using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return resolve(false);
    }

    const [salt, key] = parts;
    if (!salt || !key) {
      return resolve(false);
    }

    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        if (keyBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}

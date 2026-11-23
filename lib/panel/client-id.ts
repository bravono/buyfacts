import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_LENGTH = 8;

/**
 * Generates a cryptographically random Client ID in BF-XXXXXXXX format.
 * Uses uppercase alphanumeric characters (A-Z, 0-9).
 */
export function generateClientId(): string {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let result = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `BF-${result}`;
}

/**
 * Validates that a string matches the BF-XXXXXXXX Client ID format.
 */
export function isValidClientId(value: string): boolean {
  return /^BF-[A-Z0-9]{8}$/.test(value);
}

/**
 * Validates that a string matches the 8-digit respondent ID format.
 */
export function isValidRespondentId(value: string): boolean {
  return /^[0-9]{8}$/.test(value.trim());
}

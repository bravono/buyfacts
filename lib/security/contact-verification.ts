/**
 * Cubicon human verification for the contact form.
 *
 * Every contact submission must carry the `verificationSessionId` of a Cubicon session that
 * was solved on the "contact_form" sequence and has not been used before. The session is
 * consumed atomically, so one solved puzzle can never back two submissions, even when they
 * arrive at the same moment.
 *
 * The database is passed in so the rules can be tested without one.
 */
import { evaluateSequencePass } from "@/app/api/cubicon-data/route";

/** The Cubicon sequence the contact form's puzzle runs on. */
export const CONTACT_SEQUENCE_SLUG = "contact_form";

/** previousResult values that mark a session as already spent. */
export const SPENT_SESSION_RESULTS = ["used", "consumed"] as const;

export interface ContactVerificationSession {
  id: number;
  sequenceId: number | null;
  passedPuzzles: number;
  totalPuzzlesAttempted: number;
  previousResult: string | null;
  sequence: { slug: string; passThreshold: number | null } | null;
}

export interface ContactVerificationDb {
  findSession(sessionId: string): Promise<ContactVerificationSession | null>;
  /** Number of scored (non-bonus) puzzles in the sequence. */
  countScoredTasks(sequenceId: number | null): Promise<number>;
  /** Marks the session used only if it is still unused. True when this call consumed it. */
  consumeSession(id: number): Promise<boolean>;
}

export type ContactVerificationResult = { ok: true } | { ok: false; error: string };

export const CONTACT_VERIFICATION_ERRORS = {
  missing: "Validation error: Human verification required. Please complete the Cubicon puzzle before submitting.",
  invalid: "Validation error: Invalid verification session.",
  wrongSequence: "Validation error: Verification sequence mismatch.",
  spent: "Validation error: This verification session has already been used. Please solve a new puzzle.",
  notPassed: "Validation error: Human verification was not passed.",
} as const;

const isSpent = (result: string | null) =>
  (SPENT_SESSION_RESULTS as readonly string[]).includes(result ?? "");

export async function verifyAndConsumeContactSession(
  verificationSessionId: unknown,
  db: ContactVerificationDb
): Promise<ContactVerificationResult> {
  if (typeof verificationSessionId !== "string" || !verificationSessionId.trim()) {
    return { ok: false, error: CONTACT_VERIFICATION_ERRORS.missing };
  }

  const session = await db.findSession(verificationSessionId.trim());
  if (!session) return { ok: false, error: CONTACT_VERIFICATION_ERRORS.invalid };
  if (session.sequence?.slug !== CONTACT_SEQUENCE_SLUG) {
    return { ok: false, error: CONTACT_VERIFICATION_ERRORS.wrongSequence };
  }
  if (isSpent(session.previousResult)) return { ok: false, error: CONTACT_VERIFICATION_ERRORS.spent };

  const totalTasks =
    session.totalPuzzlesAttempted > 0 ? session.totalPuzzlesAttempted : await db.countScoredTasks(session.sequenceId);
  const passed = evaluateSequencePass(
    session.passedPuzzles,
    totalTasks > 0 ? totalTasks : 1,
    session.sequence?.passThreshold ?? 0.6
  );
  if (!passed) return { ok: false, error: CONTACT_VERIFICATION_ERRORS.notPassed };

  // Atomic check-and-set: a concurrent submission with the same session loses here.
  if (!(await db.consumeSession(session.id))) return { ok: false, error: CONTACT_VERIFICATION_ERRORS.spent };
  return { ok: true };
}

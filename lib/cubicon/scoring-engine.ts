/**
 * Cubicon Scoring Engine & State Controller
 *
 * Implements Section 7.4 of the BuyFacts Website Completion Specification:
 * - Three correct: Pass immediately.
 * - Two correct after three: Present a fourth question. Pass if fourth answer is correct.
 * - Two incorrect among the first three: Fail immediately.
 * - Two correct followed by an incorrect fourth answer: Fail.
 * - Pass: Show fireworks and the approved message "Congratulations you are human."
 * - Fail: Show approved public survey-capacity message without revealing the failed task or scoring reason.
 * - Retry: Allow unlimited retries using the same puzzle.
 * - Anti-tampering: Prevent browser back, refresh, duplicate clicks from producing false pass or corrupt result.
 * - Privacy: Record internal failure stage for diagnosis, but never expose detailed failure logic in public pages.
 */

export interface TaskAttemptRecord {
  taskIndex: number;
  result: "p" | "f";
}

export type ScoringDecisionType =
  | "continue"
  | "pass"
  | "fail"
  | "retest_fourth";

export type InternalStageType =
  | "in_progress_task_1"
  | "in_progress_task_2"
  | "in_progress_task_3"
  | "passed_clean_3_of_3"
  | "retest_triggered_after_task_3"
  | "passed_after_retest_fourth_task"
  | "early_two_incorrect_at_task_2"
  | "two_incorrect_at_task_3"
  | "failed_after_fourth_task"
  | "passed_custom_threshold"
  | "failed_custom_threshold";

export interface ScoringDecision {
  decision: ScoringDecisionType;
  isCompleted: boolean;
  passed: boolean;
  nextTaskIndex: number;
  expectedTotalTasks: number;
  isFinalTask: boolean;
  fireworks: boolean;
  internalStage: InternalStageType;
  publicHeading: string;
  publicDescription: string;
}

export const CUBICON_MESSAGES = {
  success: {
    heading: "Congratulations you are human",
    description:
      "Next we offer you a number of choices below. Please make a selection and we thank you for considering Cubicon and BuyFacts.",
  },
  rejection: {
    heading: "Thank you for participating",
    description:
      "Sorry our survey has exceeded the number of desired respondents. We hope to see you again when we reach out again. Please select from the choices below.",
  },
};

/**
 * Pure evaluation function for Cubicon Section 7.4 scoring paths.
 *
 * @param attempts Chronological list of completed task attempts in the current session.
 * @param baseTaskCount Total base tasks in sequence (typically 3).
 * @param hasFourthTask Whether a 4th fallback task is available for retest.
 */
export function evaluateScoringDecision(
  attempts: TaskAttemptRecord[],
  baseTaskCount: number = 3,
  hasFourthTask: boolean = true
): ScoringDecision {
  const attemptedCount = attempts.length;
  const passedCount = attempts.filter((a) => a.result === "p").length;
  const failedCount = attempts.filter((a) => a.result === "f").length;

  // Handle non-standard short sequences (e.g. 1 or 2 task unit tests)
  if (baseTaskCount < 3) {
    const isFinished = attemptedCount >= baseTaskCount;
    const passed = isFinished && failedCount === 0;
    return {
      decision: isFinished ? (passed ? "pass" : "fail") : "continue",
      isCompleted: isFinished,
      passed,
      nextTaskIndex: isFinished ? attemptedCount - 1 : attemptedCount,
      expectedTotalTasks: baseTaskCount,
      isFinalTask: attemptedCount >= baseTaskCount - 1,
      fireworks: isFinished && passed,
      internalStage: passed ? "passed_custom_threshold" : "failed_custom_threshold",
      publicHeading: passed ? CUBICON_MESSAGES.success.heading : CUBICON_MESSAGES.rejection.heading,
      publicDescription: passed ? CUBICON_MESSAGES.success.description : CUBICON_MESSAGES.rejection.description,
    };
  }

  // Step 1: After Task 1
  if (attemptedCount === 1) {
    return {
      decision: "continue",
      isCompleted: false,
      passed: false,
      nextTaskIndex: 1,
      expectedTotalTasks: baseTaskCount,
      isFinalTask: false,
      fireworks: false,
      internalStage: "in_progress_task_1",
      publicHeading: "",
      publicDescription: "",
    };
  }

  // Step 2: After Task 2
  if (attemptedCount === 2) {
    // Rule: Two incorrect among first three -> Fail immediately.
    if (failedCount >= 2) {
      return {
        decision: "fail",
        isCompleted: true,
        passed: false,
        nextTaskIndex: 1,
        expectedTotalTasks: baseTaskCount,
        isFinalTask: true,
        fireworks: false,
        internalStage: "early_two_incorrect_at_task_2",
        publicHeading: CUBICON_MESSAGES.rejection.heading,
        publicDescription: CUBICON_MESSAGES.rejection.description,
      };
    }

    return {
      decision: "continue",
      isCompleted: false,
      passed: false,
      nextTaskIndex: 2,
      expectedTotalTasks: baseTaskCount,
      isFinalTask: false,
      fireworks: false,
      internalStage: "in_progress_task_2",
      publicHeading: "",
      publicDescription: "",
    };
  }

  // Step 3: After Task 3
  if (attemptedCount === 3) {
    // Rule: Three correct -> Pass immediately.
    if (passedCount === 3) {
      return {
        decision: "pass",
        isCompleted: true,
        passed: true,
        nextTaskIndex: 2,
        expectedTotalTasks: baseTaskCount,
        isFinalTask: true,
        fireworks: true,
        internalStage: "passed_clean_3_of_3",
        publicHeading: CUBICON_MESSAGES.success.heading,
        publicDescription: CUBICON_MESSAGES.success.description,
      };
    }

    // Rule: Two correct after three -> Present a fourth question.
    if (passedCount === 2 && failedCount === 1) {
      if (hasFourthTask) {
        return {
          decision: "retest_fourth",
          isCompleted: false,
          passed: false,
          nextTaskIndex: 3,
          expectedTotalTasks: 4,
          isFinalTask: true,
          fireworks: false,
          internalStage: "retest_triggered_after_task_3",
          publicHeading: "",
          publicDescription: "",
        };
      }
      // If no fourth task physically available, pass since 2/3 satisfies default threshold
      return {
        decision: "pass",
        isCompleted: true,
        passed: true,
        nextTaskIndex: 2,
        expectedTotalTasks: baseTaskCount,
        isFinalTask: true,
        fireworks: true,
        internalStage: "passed_custom_threshold",
        publicHeading: CUBICON_MESSAGES.success.heading,
        publicDescription: CUBICON_MESSAGES.success.description,
      };
    }

    // Rule: Two or more incorrect -> Fail immediately.
    return {
      decision: "fail",
      isCompleted: true,
      passed: false,
      nextTaskIndex: 2,
      expectedTotalTasks: baseTaskCount,
      isFinalTask: true,
      fireworks: false,
      internalStage: "two_incorrect_at_task_3",
      publicHeading: CUBICON_MESSAGES.rejection.heading,
      publicDescription: CUBICON_MESSAGES.rejection.description,
    };
  }

  // Step 4: After Task 4 (Retest Question)
  if (attemptedCount >= 4) {
    const fourthResult = attempts[3]?.result;

    // Rule: Pass if the fourth answer is correct.
    if (fourthResult === "p") {
      return {
        decision: "pass",
        isCompleted: true,
        passed: true,
        nextTaskIndex: 3,
        expectedTotalTasks: 4,
        isFinalTask: true,
        fireworks: true,
        internalStage: "passed_after_retest_fourth_task",
        publicHeading: CUBICON_MESSAGES.success.heading,
        publicDescription: CUBICON_MESSAGES.success.description,
      };
    }

    // Rule: Two correct followed by an incorrect fourth answer -> Fail.
    return {
      decision: "fail",
      isCompleted: true,
      passed: false,
      nextTaskIndex: 3,
      expectedTotalTasks: 4,
      isFinalTask: true,
      fireworks: false,
      internalStage: "failed_after_fourth_task",
      publicHeading: CUBICON_MESSAGES.rejection.heading,
      publicDescription: CUBICON_MESSAGES.rejection.description,
    };
  }

  // Fallback default
  return {
    decision: "continue",
    isCompleted: false,
    passed: false,
    nextTaskIndex: attemptedCount,
    expectedTotalTasks: baseTaskCount,
    isFinalTask: false,
    fireworks: false,
    internalStage: "in_progress_task_1",
    publicHeading: "",
    publicDescription: "",
  };
}

/**
 * Sanitizes public API responses so internal diagnostic details,
 * failure stages, and scoring formulas are never leaked to public clients.
 */
export function sanitizePublicPayload(data: {
  sessionId: string;
  sequenceId?: number | null;
  sequenceTitle?: string;
  ofTasks: number;
  task: number;
  heading: string;
  description: string;
  screen: string;
  image: string;
  rotation?: number[];
  rotationInterval?: number;
  rotationDirection?: string;
  isFinal: boolean;
  completed: boolean;
  passed?: boolean;
  fireworks?: boolean;
  score?: number;
  result?: "p" | "f" | null;
  redirectUrl?: string;
}): Record<string, any> {
  const isComplete = Boolean(data.completed);
  const isPassed = Boolean(data.passed);

  return {
    sessionId: data.sessionId,
    sequenceId: data.sequenceId ?? null,
    sequenceTitle: data.sequenceTitle || "Cubicon Verification",
    ofTasks: data.ofTasks,
    task: data.task,
    heading: data.heading,
    description: data.description,
    screen: data.screen,
    image: data.image,
    rotation: data.rotation || [0, 0, 0],
    rotationInterval: data.rotationInterval ?? 0,
    rotationDirection: data.rotationDirection || "left",
    isFinal: Boolean(data.isFinal),
    completed: isComplete,
    passed: isPassed,
    fireworks: isComplete && isPassed,
    score: data.score ?? (isPassed ? 1 : 0),
    result: data.result ?? null,
    redirectUrl: data.redirectUrl || "",
  };
}

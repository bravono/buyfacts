-- 0. Drop obsolete legacy prototype tables first to prevent SQLite case-insensitive name collisions
DROP TABLE IF EXISTS "cubiconconfig";
DROP TABLE IF EXISTS "cubiconshare";
DROP TABLE IF EXISTS "feedbacksubmission";

-- 1. EmailVerification
ALTER TABLE "email_verifications" RENAME TO "EmailVerification";

-- 2. CubiconSequence
ALTER TABLE "cubicon_sequences" RENAME TO "CubiconSequence";
ALTER TABLE "CubiconSequence" RENAME COLUMN "pass_threshold" TO "passThreshold";
ALTER TABLE "CubiconSequence" RENAME COLUMN "rotation_direction" TO "rotationDirection";
ALTER TABLE "CubiconSequence" RENAME COLUMN "default_rotation_interval" TO "defaultRotationInterval";
ALTER TABLE "CubiconSequence" RENAME COLUMN "is_active" TO "isActive";
ALTER TABLE "CubiconSequence" RENAME COLUMN "created_by" TO "createdBy";
ALTER TABLE "CubiconSequence" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "CubiconSequence" RENAME COLUMN "updated_at" TO "updatedAt";

-- 3. CubiconTask
ALTER TABLE "cubicon_tasks" RENAME TO "CubiconTask";
ALTER TABLE "CubiconTask" RENAME COLUMN "sequence_id" TO "sequenceId";
ALTER TABLE "CubiconTask" RENAME COLUMN "task_number" TO "taskNumber";
ALTER TABLE "CubiconTask" RENAME COLUMN "question_type" TO "questionType";
ALTER TABLE "CubiconTask" RENAME COLUMN "correct_coordinates" TO "correctCoordinates";
ALTER TABLE "CubiconTask" RENAME COLUMN "start_point" TO "startPoint";
ALTER TABLE "CubiconTask" RENAME COLUMN "mid_point" TO "midPoint";
ALTER TABLE "CubiconTask" RENAME COLUMN "end_point" TO "endPoint";
ALTER TABLE "CubiconTask" DROP COLUMN "rotation_interval";

-- 4. CubiconSession
ALTER TABLE "cubicon_sessions" RENAME TO "CubiconSession";
ALTER TABLE "CubiconSession" RENAME COLUMN "session_id" TO "sessionId";
ALTER TABLE "CubiconSession" RENAME COLUMN "sequence_id" TO "sequenceId";
ALTER TABLE "CubiconSession" RENAME COLUMN "user_email" TO "userEmail";
ALTER TABLE "CubiconSession" RENAME COLUMN "previous_result" TO "previousResult";

-- 5. CubiconAttempt
ALTER TABLE "cubicon_attempts" RENAME TO "CubiconAttempt";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "session_id" TO "sessionId";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "sequence_id" TO "sequenceId";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "user_email" TO "userEmail";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "clicks_data" TO "clicksData";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "start_time" TO "startTime";
ALTER TABLE "CubiconAttempt" RENAME COLUMN "submitted_at" TO "submittedAt";

-- 6. CubiconRegistration
ALTER TABLE "cubicon_registrations" RENAME TO "CubiconRegistration";

-- 7. CubiconShare
ALTER TABLE "cubicon_shares" RENAME TO "CubiconShare";

-- 8. FeedbackSubmission
ALTER TABLE "cubicon_feedback" RENAME TO "FeedbackSubmission";

-- 9. Research Library models
ALTER TABLE "research_lib_surveys" RENAME TO "ResearchLibSurvey";
ALTER TABLE "ResearchLibSurvey" RENAME COLUMN "user_id" TO "userId";

ALTER TABLE "research_lib_responses" RENAME TO "ResearchLibResponse";
ALTER TABLE "ResearchLibResponse" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "ResearchLibResponse" RENAME COLUMN "survey_id" TO "surveyId";

ALTER TABLE "research_lib_timers" RENAME TO "ResearchLibTimer";
ALTER TABLE "ResearchLibTimer" RENAME COLUMN "user_id" TO "userId";

ALTER TABLE "research_lib_elements" RENAME TO "ResearchLibElement";
ALTER TABLE "ResearchLibElement" RENAME COLUMN "user_id" TO "userId";

ALTER TABLE "research_lib_app_states" RENAME TO "ResearchLibAppState";
ALTER TABLE "ResearchLibAppState" RENAME COLUMN "user_id" TO "userId";

-- 10. Recreate unique indexes with new model and field names
DROP INDEX IF EXISTS "cubicon_sequences_slug_key";
CREATE UNIQUE INDEX "CubiconSequence_slug_key" ON "CubiconSequence"("slug");

DROP INDEX IF EXISTS "cubicon_sessions_session_id_key";
CREATE UNIQUE INDEX "CubiconSession_sessionId_key" ON "CubiconSession"("sessionId");

DROP INDEX IF EXISTS "email_verifications_token_key";
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

DROP INDEX IF EXISTS "research_lib_app_states_user_id_key";
CREATE UNIQUE INDEX "ResearchLibAppState_userId_key" ON "ResearchLibAppState"("userId");

DROP INDEX IF EXISTS "research_lib_elements_user_id_key";
CREATE UNIQUE INDEX "ResearchLibElement_userId_key" ON "ResearchLibElement"("userId");

DROP INDEX IF EXISTS "research_lib_timers_user_id_key";
CREATE UNIQUE INDEX "ResearchLibTimer_userId_key" ON "ResearchLibTimer"("userId");

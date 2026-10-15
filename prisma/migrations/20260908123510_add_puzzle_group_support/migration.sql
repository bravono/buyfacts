-- CreateTable
CREATE TABLE "cubicon_sequences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "pass_threshold" REAL DEFAULT 0.66,
    "rotation_direction" TEXT DEFAULT 'left',
    "default_rotation_interval" INTEGER DEFAULT 15,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" TEXT DEFAULT 'system',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cubicon_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "sequence_id" INTEGER,
    "taskIndex" INTEGER NOT NULL,
    "user_email" TEXT,
    "clicks_data" TEXT DEFAULT '{}',
    "start_time" TEXT,
    "result" TEXT NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cubicon_attempts_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "cubicon_sequences" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cubicon_attempts" ("clicks_data", "id", "result", "session_id", "start_time", "submitted_at", "taskIndex", "user_email") SELECT "clicks_data", "id", "result", "session_id", "start_time", "submitted_at", "taskIndex", "user_email" FROM "cubicon_attempts";
DROP TABLE "cubicon_attempts";
ALTER TABLE "new_cubicon_attempts" RENAME TO "cubicon_attempts";
CREATE TABLE "new_cubicon_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "sequence_id" INTEGER,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "user_email" TEXT DEFAULT '',
    "passedPuzzles" INTEGER NOT NULL DEFAULT 0,
    "totalPuzzlesAttempted" INTEGER NOT NULL DEFAULT 0,
    "previous_result" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cubicon_sessions_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "cubicon_sequences" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cubicon_sessions" ("createdAt", "id", "passedPuzzles", "previous_result", "session_id", "taskIndex", "totalPuzzlesAttempted", "updatedAt", "user_email") SELECT "createdAt", "id", "passedPuzzles", "previous_result", "session_id", "taskIndex", "totalPuzzlesAttempted", "updatedAt", "user_email" FROM "cubicon_sessions";
DROP TABLE "cubicon_sessions";
ALTER TABLE "new_cubicon_sessions" RENAME TO "cubicon_sessions";
CREATE UNIQUE INDEX "cubicon_sessions_session_id_key" ON "cubicon_sessions"("session_id");
CREATE TABLE "new_cubicon_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sequence_id" INTEGER,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "task_number" INTEGER,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screen" TEXT DEFAULT '',
    "image" TEXT NOT NULL,
    "rotation" TEXT DEFAULT 'left',
    "rotation_interval" INTEGER DEFAULT 15,
    "rotationInterval" INTEGER DEFAULT 15,
    "question_type" TEXT DEFAULT 'Selection',
    "correct_coordinates" TEXT DEFAULT '',
    "start_point" TEXT DEFAULT '',
    "mid_point" TEXT DEFAULT '',
    "end_point" TEXT DEFAULT '',
    "tolerance" REAL DEFAULT 0.5,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cubicon_tasks_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "cubicon_sequences" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cubicon_tasks" ("correct_coordinates", "createdAt", "description", "end_point", "heading", "id", "image", "isFinal", "mid_point", "question_type", "rotation", "rotationInterval", "rotation_interval", "screen", "start_point", "taskIndex", "task_number", "tolerance") SELECT "correct_coordinates", "createdAt", "description", "end_point", "heading", "id", "image", "isFinal", "mid_point", "question_type", "rotation", "rotationInterval", "rotation_interval", "screen", "start_point", "taskIndex", "task_number", "tolerance" FROM "cubicon_tasks";
DROP TABLE "cubicon_tasks";
ALTER TABLE "new_cubicon_tasks" RENAME TO "cubicon_tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "cubicon_sequences_slug_key" ON "cubicon_sequences"("slug");

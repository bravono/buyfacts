-- CreateTable
CREATE TABLE "cubicon_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "task_number" INTEGER,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screen" TEXT DEFAULT '',
    "image" TEXT NOT NULL,
    "rotation" TEXT DEFAULT 'left',
    "rotationInterval" INTEGER DEFAULT 15,
    "question_type" TEXT DEFAULT 'Selection',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cubicon_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "user_email" TEXT DEFAULT '',
    "passedPuzzles" INTEGER NOT NULL DEFAULT 0,
    "totalPuzzlesAttempted" INTEGER NOT NULL DEFAULT 0,
    "previous_result" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cubicon_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "taskIndex" INTEGER NOT NULL,
    "user_email" TEXT,
    "clicks_data" TEXT DEFAULT '{}',
    "start_time" TEXT,
    "result" TEXT NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cubicon_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "interest" TEXT DEFAULT 'Founding Client',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "cubicon_sessions_session_id_key" ON "cubicon_sessions"("session_id");

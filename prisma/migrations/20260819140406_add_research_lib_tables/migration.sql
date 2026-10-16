-- CreateTable
CREATE TABLE "research_lib_surveys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL DEFAULT 'system_default',
    "heading" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "widget" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "combo" TEXT NOT NULL,
    "blanks" TEXT NOT NULL,
    "durationInMin" TEXT DEFAULT '30',
    "pauseDuration" TEXT DEFAULT '3',
    "timeCounter" TEXT DEFAULT 'down',
    "isFollowup" INTEGER DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "research_lib_responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "survey_id" INTEGER,
    "answers" TEXT NOT NULL,
    "story" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "research_lib_timers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "sessionTimer" TEXT DEFAULT '{}',
    "pauseTimer" TEXT DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "research_lib_elements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "state" TEXT DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "research_lib_app_states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "state" TEXT DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "research_lib_timers_user_id_key" ON "research_lib_timers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_lib_elements_user_id_key" ON "research_lib_elements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_lib_app_states_user_id_key" ON "research_lib_app_states"("user_id");

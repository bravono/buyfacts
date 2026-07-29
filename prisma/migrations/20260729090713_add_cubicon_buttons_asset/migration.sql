-- CreateTable
CREATE TABLE "DashboardButton" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'video',
    "subtitle" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Services',
    "color" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CubiconTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskIndex" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "rotation" TEXT NOT NULL DEFAULT 'left',
    "rotationInterval" INTEGER NOT NULL DEFAULT 10,
    "targetX" REAL,
    "targetY" REAL,
    "targetZ" REAL,
    "targetPoints" TEXT,
    "tolerance" REAL NOT NULL DEFAULT 0.5,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "interest" TEXT NOT NULL DEFAULT 'General Inquiry',
    "message" TEXT NOT NULL,
    "isEighteen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ContactInquiry" ("company", "createdAt", "email", "id", "interest", "message", "name") SELECT "company", "createdAt", "email", "id", "interest", "message", "name" FROM "ContactInquiry";
DROP TABLE "ContactInquiry";
ALTER TABLE "new_ContactInquiry" RENAME TO "ContactInquiry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CubiconTask_taskIndex_key" ON "CubiconTask"("taskIndex");

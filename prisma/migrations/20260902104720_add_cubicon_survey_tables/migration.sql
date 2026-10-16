-- AlterTable
ALTER TABLE "cubicon_tasks" ADD COLUMN "rotation_interval" INTEGER DEFAULT 15;

-- CreateTable
CREATE TABLE "cubicon_shares" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "senderName" TEXT DEFAULT '',
    "senderEmail" TEXT DEFAULT '',
    "receiverName" TEXT DEFAULT '',
    "receiverEmail" TEXT DEFAULT '',
    "sharePlatform" TEXT DEFAULT 'email',
    "shareUrl" TEXT DEFAULT '',
    "sessionId" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'invited',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cubicon_feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT DEFAULT '',
    "userEmail" TEXT DEFAULT '',
    "sessionId" TEXT DEFAULT '',
    "feedbackText" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

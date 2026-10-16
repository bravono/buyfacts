-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('ARTICLE', 'VIDEO', 'PDF', 'AUDIO');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "interest" TEXT NOT NULL DEFAULT 'General Inquiry',
    "message" TEXT NOT NULL,
    "isEighteen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'contact',
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardButton" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "seeItUrl" TEXT,
    "hearItUrl" TEXT,
    "readItUrl" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'video',
    "subtitle" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Services',
    "color" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardButton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchLibSurvey" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'system_default',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchLibResponse" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "surveyId" INTEGER,
    "answers" TEXT NOT NULL,
    "story" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchLibTimer" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTimer" TEXT DEFAULT '{}',
    "pauseTimer" TEXT DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibTimer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchLibElement" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchLibAppState" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibAppState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconSequence" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "passThreshold" DOUBLE PRECISION DEFAULT 0.66,
    "rotationDirection" TEXT DEFAULT 'left',
    "defaultRotationInterval" INTEGER DEFAULT 15,
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" TEXT DEFAULT 'system',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconTask" (
    "id" SERIAL NOT NULL,
    "sequenceId" INTEGER,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "taskNumber" INTEGER,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screen" TEXT DEFAULT '',
    "image" TEXT NOT NULL,
    "rotation" TEXT DEFAULT 'left',
    "rotationInterval" INTEGER DEFAULT 15,
    "questionType" TEXT DEFAULT 'Selection',
    "correctCoordinates" TEXT DEFAULT '',
    "startPoint" TEXT DEFAULT '',
    "midPoint" TEXT DEFAULT '',
    "endPoint" TEXT DEFAULT '',
    "tolerance" DOUBLE PRECISION DEFAULT 0.5,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconSession" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequenceId" INTEGER,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "userEmail" TEXT DEFAULT '',
    "passedPuzzles" INTEGER NOT NULL DEFAULT 0,
    "totalPuzzlesAttempted" INTEGER NOT NULL DEFAULT 0,
    "previousResult" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconAttempt" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequenceId" INTEGER,
    "taskIndex" INTEGER NOT NULL,
    "userEmail" TEXT,
    "clicksData" TEXT DEFAULT '{}',
    "startTime" TEXT,
    "result" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconRegistration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "interest" TEXT DEFAULT 'Founding Client',
    "notes" TEXT,
    "isUsBased" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CubiconShare" (
    "id" SERIAL NOT NULL,
    "senderName" TEXT DEFAULT '',
    "senderEmail" TEXT DEFAULT '',
    "receiverName" TEXT DEFAULT '',
    "receiverEmail" TEXT DEFAULT '',
    "sharePlatform" TEXT DEFAULT 'email',
    "shareUrl" TEXT DEFAULT '',
    "sessionId" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CubiconShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" SERIAL NOT NULL,
    "userId" TEXT DEFAULT '',
    "userEmail" TEXT DEFAULT '',
    "sessionId" TEXT DEFAULT '',
    "feedbackText" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "format" "ContentFormat" NOT NULL,
    "sourceUrl" TEXT,
    "embedCode" TEXT,
    "topicId" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSubscription_email_key" ON "NotificationSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchLibTimer_userId_key" ON "ResearchLibTimer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchLibElement_userId_key" ON "ResearchLibElement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchLibAppState_userId_key" ON "ResearchLibAppState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CubiconSequence_slug_key" ON "CubiconSequence"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CubiconSession_sessionId_key" ON "CubiconSession"("sessionId");

-- CreateIndex
CREATE INDEX "VaultAsset_publishedAt_idx" ON "VaultAsset"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "VaultAsset_format_idx" ON "VaultAsset"("format");

-- CreateIndex
CREATE INDEX "VaultAsset_topicId_idx" ON "VaultAsset"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- AddForeignKey
ALTER TABLE "CubiconTask" ADD CONSTRAINT "CubiconTask_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CubiconSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CubiconSession" ADD CONSTRAINT "CubiconSession_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CubiconSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CubiconAttempt" ADD CONSTRAINT "CubiconAttempt_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CubiconSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAsset" ADD CONSTRAINT "VaultAsset_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

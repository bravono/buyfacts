-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "interest" TEXT NOT NULL DEFAULT 'General Inquiry',
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CubiconRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'Medium',
    "requestConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "isEighteen" BOOLEAN NOT NULL DEFAULT true,
    "priorityScore" REAL NOT NULL DEFAULT 0.0,
    "selectedAreas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positiveFeedback" TEXT NOT NULL,
    "negativeFeedback" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CubiconConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actionRequired" TEXT NOT NULL DEFAULT 'tap',
    "shape" TEXT NOT NULL DEFAULT 'square',
    "pause" INTEGER,
    "rotationType" TEXT,
    "puzzleType" TEXT,
    "threshold" REAL,
    "welcomeMessage" TEXT,
    "selectedImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSubscription_email_key" ON "NotificationSubscription"("email");

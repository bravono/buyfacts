/*
  Warnings:

  - You are about to drop the column `mediaUrl` on the `DashboardButton` table. All the data in the column will be lost.
  - You are about to drop the column `blanks` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the column `heading` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the column `instruction` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the column `isFollowup` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the column `story` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the column `widget` on the `ResearchLibSurvey` table. All the data in the column will be lost.
  - You are about to drop the `ResearchLibAppState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchLibElement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResearchLibTimer` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "DashboardButton" DROP COLUMN "mediaUrl",
ADD COLUMN     "descriptionText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ResearchLibSurvey" DROP COLUMN "blanks",
DROP COLUMN "heading",
DROP COLUMN "instruction",
DROP COLUMN "isFollowup",
DROP COLUMN "story",
DROP COLUMN "widget",
ADD COLUMN     "title" TEXT DEFAULT 'AI Marketing Directional Measurement',
ALTER COLUMN "combo" SET DEFAULT 'narWid';

-- DropTable
DROP TABLE "ResearchLibAppState";

-- DropTable
DROP TABLE "ResearchLibElement";

-- DropTable
DROP TABLE "ResearchLibTimer";

-- CreateTable
CREATE TABLE "ResearchLibTask" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "taskIndex" INTEGER NOT NULL DEFAULT 0,
    "heading" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "widget" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "story" TEXT,
    "blanks" TEXT NOT NULL,
    "isFollowup" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchLibTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ResearchLibTask" ADD CONSTRAINT "ResearchLibTask_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ResearchLibSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `CubiconConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CubiconRegistration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CubiconTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeedbackSubmission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CubiconConfig";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CubiconRegistration";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CubiconTask";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FeedbackSubmission";
PRAGMA foreign_keys=on;

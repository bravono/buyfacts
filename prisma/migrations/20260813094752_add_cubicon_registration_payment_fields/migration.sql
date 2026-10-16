-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CubiconRegistration" (
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
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paypalOrderId" TEXT,
    "amountPaid" REAL NOT NULL DEFAULT 100.00,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CubiconRegistration" ("createdAt", "email", "firstName", "id", "isEighteen", "lastName", "phone", "priorityScore", "requestConfirmation", "selectedAreas", "urgency") SELECT "createdAt", "email", "firstName", "id", "isEighteen", "lastName", "phone", "priorityScore", "requestConfirmation", "selectedAreas", "urgency" FROM "CubiconRegistration";
DROP TABLE "CubiconRegistration";
ALTER TABLE "new_CubiconRegistration" RENAME TO "CubiconRegistration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

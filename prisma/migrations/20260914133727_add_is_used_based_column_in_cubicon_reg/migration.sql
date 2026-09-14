-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cubicon_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "interest" TEXT DEFAULT 'Founding Client',
    "notes" TEXT,
    "isUsBased" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_cubicon_registrations" ("company", "createdAt", "email", "id", "interest", "name", "notes", "role") SELECT "company", "createdAt", "email", "id", "interest", "name", "notes", "role" FROM "cubicon_registrations";
DROP TABLE "cubicon_registrations";
ALTER TABLE "new_cubicon_registrations" RENAME TO "cubicon_registrations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

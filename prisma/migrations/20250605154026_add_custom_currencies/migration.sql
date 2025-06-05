-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_currencies" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    CONSTRAINT "currencies_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_currencies" ("code", "name", "symbol") SELECT "code", "name", "symbol" FROM "currencies";
DROP TABLE "currencies";
ALTER TABLE "new_currencies" RENAME TO "currencies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

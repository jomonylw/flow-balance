-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyCode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounts_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_accounts" ("categoryId", "color", "createdAt", "description", "id", "name", "updatedAt", "userId") SELECT "categoryId", "color", "createdAt", "description", "id", "name", "updatedAt", "userId" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

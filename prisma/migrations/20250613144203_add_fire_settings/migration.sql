/*
  Warnings:

  - Made the column `currencyCode` on table `accounts` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounts_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_accounts" ("categoryId", "color", "createdAt", "currencyCode", "description", "id", "name", "updatedAt", "userId") SELECT "categoryId", "color", "createdAt", "currencyCode", "description", "id", "name", "updatedAt", "userId" FROM "accounts";
DROP TABLE "accounts";
ALTER TABLE "new_accounts" RENAME TO "accounts";
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");
CREATE TABLE "new_user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "baseCurrencyCode" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "fireEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fireSWR" DECIMAL NOT NULL DEFAULT 4.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_settings_baseCurrencyCode_fkey" FOREIGN KEY ("baseCurrencyCode") REFERENCES "currencies" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("baseCurrencyCode", "createdAt", "dateFormat", "id", "language", "theme", "updatedAt", "userId") SELECT "baseCurrencyCode", "createdAt", "dateFormat", "id", "language", "theme", "updatedAt", "userId" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to alter the column `fireSWR` on the `user_settings` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "baseCurrencyCode" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "fireEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fireSWR" REAL NOT NULL DEFAULT 4.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_settings_baseCurrencyCode_fkey" FOREIGN KEY ("baseCurrencyCode") REFERENCES "currencies" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("baseCurrencyCode", "createdAt", "dateFormat", "fireEnabled", "fireSWR", "id", "language", "theme", "updatedAt", "userId") SELECT "baseCurrencyCode", "createdAt", "dateFormat", "fireEnabled", "fireSWR", "id", "language", "theme", "updatedAt", "userId" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

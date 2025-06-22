-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_recurring_processing_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "processedRecurring" INTEGER NOT NULL DEFAULT 0,
    "processedLoans" INTEGER NOT NULL DEFAULT 0,
    "processedExchangeRates" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_processing_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_recurring_processing_logs" ("createdAt", "endTime", "errorMessage", "failedCount", "id", "processedLoans", "processedRecurring", "startTime", "status", "updatedAt", "userId") SELECT "createdAt", "endTime", "errorMessage", "failedCount", "id", "processedLoans", "processedRecurring", "startTime", "status", "updatedAt", "userId" FROM "recurring_processing_logs";
DROP TABLE "recurring_processing_logs";
ALTER TABLE "new_recurring_processing_logs" RENAME TO "recurring_processing_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

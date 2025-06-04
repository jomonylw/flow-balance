/*
  Warnings:

  - Added the required column `type` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("createdAt", "id", "name", "order", "parentId", "updatedAt", "userId", "type")
SELECT "createdAt", "id", "name", "order", "parentId", "updatedAt", "userId",
  CASE
    WHEN name LIKE '%银行%' OR name LIKE '%现金%' OR name LIKE '%存款%' OR name LIKE '%投资%' OR name LIKE '%股票%' OR name LIKE '%基金%' OR name LIKE '%债券%' OR name LIKE '%房产%' OR name LIKE '%车辆%' OR name LIKE '%资产%' THEN 'ASSET'
    WHEN name LIKE '%信用卡%' OR name LIKE '%贷款%' OR name LIKE '%借款%' OR name LIKE '%应付%' OR name LIKE '%负债%' THEN 'LIABILITY'
    WHEN name LIKE '%工资%' OR name LIKE '%薪水%' OR name LIKE '%收入%' OR name LIKE '%奖金%' OR name LIKE '%分红%' OR name LIKE '%利息%' OR name LIKE '%租金%' THEN 'INCOME'
    WHEN name LIKE '%餐饮%' OR name LIKE '%交通%' OR name LIKE '%购物%' OR name LIKE '%娱乐%' OR name LIKE '%医疗%' OR name LIKE '%教育%' OR name LIKE '%住房%' OR name LIKE '%水电%' OR name LIKE '%通讯%' OR name LIKE '%支出%' OR name LIKE '%费用%' THEN 'EXPENSE'
    ELSE 'ASSET'
  END as type
FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_userId_name_parentId_key" ON "categories"("userId", "name", "parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

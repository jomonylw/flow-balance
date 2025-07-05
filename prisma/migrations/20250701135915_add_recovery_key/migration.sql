/*
  Warnings:

  - A unique constraint covering the columns `[recoveryKey]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "recoveryKey" TEXT;
ALTER TABLE "users" ADD COLUMN "recoveryKeyCreatedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "users_recoveryKey_key" ON "users"("recoveryKey");

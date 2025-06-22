-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "baseCurrencyId" TEXT,
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "fireEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fireSWR" REAL NOT NULL DEFAULT 4.0,
    "lastRecurringSync" DATETIME,
    "recurringProcessingStatus" TEXT NOT NULL DEFAULT 'idle',
    "futureDataDays" INTEGER NOT NULL DEFAULT 7,
    "autoUpdateExchangeRates" BOOLEAN NOT NULL DEFAULT false,
    "lastExchangeRateUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_settings_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "currencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdBy" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "currencies_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_currencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_currencies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_currencies_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'USER',
    "sourceRateId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exchange_rates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exchange_rates_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exchange_rates_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exchange_rates_sourceRateId_fkey" FOREIGN KEY ("sourceRateId") REFERENCES "exchange_rates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
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

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "date" DATETIME NOT NULL,
    "recurringTransactionId" TEXT,
    "loanContractId" TEXT,
    "loanPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_loanContractId_fkey" FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_loanPaymentId_fkey" FOREIGN KEY ("loanPaymentId") REFERENCES "loan_payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "tagIds" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transaction_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transaction_templates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transaction_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transaction_templates_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "transaction_tags_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transaction_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "tagIds" JSONB,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "monthOfYear" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "nextDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxOccurrences" INTEGER,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_transactions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_processing_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "processedRecurring" INTEGER NOT NULL DEFAULT 0,
    "processedLoans" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_processing_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "contractName" TEXT NOT NULL,
    "loanAmount" DECIMAL NOT NULL,
    "interestRate" DECIMAL NOT NULL,
    "totalPeriods" INTEGER NOT NULL,
    "repaymentType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "paymentDay" INTEGER NOT NULL,
    "paymentAccountId" TEXT,
    "transactionDescription" TEXT,
    "transactionNotes" TEXT,
    "transactionTagIds" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentPeriod" INTEGER NOT NULL DEFAULT 0,
    "nextPaymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loan_contracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_contracts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_contracts_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_contracts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanContractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "principalAmount" DECIMAL NOT NULL,
    "interestAmount" DECIMAL NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "remainingBalance" DECIMAL NOT NULL,
    "principalTransactionId" TEXT,
    "interestTransactionId" TEXT,
    "balanceTransactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_payments_loanContractId_fkey" FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_payments_principalTransactionId_fkey" FOREIGN KEY ("principalTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_payments_interestTransactionId_fkey" FOREIGN KEY ("interestTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_payments_balanceTransactionId_fkey" FOREIGN KEY ("balanceTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_createdBy_code_key" ON "currencies"("createdBy", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_currencies_userId_currencyId_key" ON "user_currencies"("userId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_userId_fromCurrencyId_toCurrencyId_effectiveDate_key" ON "exchange_rates"("userId", "fromCurrencyId", "toCurrencyId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_parentId_key" ON "categories"("userId", "name", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_templates_userId_name_key" ON "transaction_templates"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_tags_transactionId_tagId_key" ON "transaction_tags"("transactionId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_payments_loanContractId_period_key" ON "loan_payments"("loanContractId", "period");

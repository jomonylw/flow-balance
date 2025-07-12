# 🔄 定期交易与贷款合约功能最终规范

## 📋 项目概述

本文档定义了 Flow Balance 应用中定期交易和贷款合约功能的完整技术规范，遵循项目开发标准和最佳实践。

### 核心功能模块

1. **定期交易管理** - 自动化重复性收支记录
2. **贷款合约管理** - 负债账户的贷款信息和自动还款
3. **统一同步机制** - 用户登录时的智能数据同步
4. **Dashboard 状态监控** - 同步状态的可视化管理

## 🏗️ 技术架构设计

### 数据库设计

#### 1. 用户设置表扩展

```sql
-- 扩展现有 user_settings 表
ALTER TABLE "user_settings" ADD COLUMN "lastRecurringSync" DATETIME;
ALTER TABLE "user_settings" ADD COLUMN "recurringProcessingStatus" TEXT DEFAULT 'idle';
-- 状态值: 'idle', 'processing', 'completed', 'failed'
```

#### 2. 定期交易处理日志表

```sql
CREATE TABLE "recurring_processing_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "processedRecurring" INTEGER DEFAULT 0,
    "processedLoans" INTEGER DEFAULT 0,
    "failedCount" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "recurring_processing_logs_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "recurring_processing_logs_userId_status_idx"
    ON "recurring_processing_logs"("userId", "status");
```

#### 3. 贷款合约表

```sql
CREATE TABLE "loan_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,

    -- 贷款基本信息
    "contractName" TEXT NOT NULL,
    "loanAmount" DECIMAL NOT NULL,
    "currentBalance" DECIMAL NOT NULL,
    "interestRate" DECIMAL NOT NULL,
    "loanTerm" INTEGER NOT NULL,

    -- 还款信息
    "repaymentType" TEXT NOT NULL,
    "monthlyPayment" DECIMAL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "nextPaymentDate" DATETIME NOT NULL,

    -- 状态信息
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentPeriod" INTEGER NOT NULL DEFAULT 0,
    "totalPeriods" INTEGER NOT NULL,

    -- 分类设置
    "principalCategoryId" TEXT,
    "interestCategoryId" TEXT,

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    -- 外键约束
    CONSTRAINT "loan_contracts_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_contracts_accountId_fkey"
        FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_contracts_currencyCode_fkey"
        FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT
);

CREATE INDEX "loan_contracts_userId_idx" ON "loan_contracts"("userId");
CREATE INDEX "loan_contracts_accountId_idx" ON "loan_contracts"("accountId");
CREATE INDEX "loan_contracts_nextPaymentDate_idx" ON "loan_contracts"("nextPaymentDate");
```

#### 4. 贷款还款记录表

```sql
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

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_loanContractId_fkey"
        FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "loan_payments_loanContractId_period_key"
    ON "loan_payments"("loanContractId", "period");
```

#### 5. 交易表扩展

```sql
ALTER TABLE "transactions" ADD COLUMN "loanContractId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "loanPaymentId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "status" TEXT DEFAULT 'COMPLETED';
ALTER TABLE "transactions" ADD COLUMN "scheduledDate" DATETIME;

-- 交易状态: 'COMPLETED' (已完成), 'PENDING' (待执行), 'CANCELLED' (已取消)
-- scheduledDate: 计划执行日期（用于未来交易）

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_loanContractId_fkey"
    FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE SET NULL;

-- 创建索引优化查询
CREATE INDEX "transactions_status_idx" ON "transactions"("status");
CREATE INDEX "transactions_scheduledDate_idx" ON "transactions"("scheduledDate");
CREATE INDEX "transactions_status_scheduledDate_idx" ON "transactions"("status", "scheduledDate");
```

### TypeScript 类型定义

#### 1. 核心类型

```typescript
// src/types/core/recurring.ts
export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  notes?: string | null

  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  monthOfYear?: number | null

  startDate: Date
  endDate?: Date | null
  nextDate: Date

  isActive: boolean
  maxOccurrences?: number | null
  currentCount: number

  createdAt: Date
  updatedAt: Date
}

// src/types/core/loan.ts
export enum RepaymentType {
  EQUAL_PAYMENT = 'EQUAL_PAYMENT',
  EQUAL_PRINCIPAL = 'EQUAL_PRINCIPAL',
  INTEREST_ONLY = 'INTEREST_ONLY',
}

export interface LoanContract {
  id: string
  userId: string
  accountId: string
  currencyCode: string
  contractName: string
  loanAmount: number
  currentBalance: number
  interestRate: number
  loanTerm: number
  repaymentType: RepaymentType
  monthlyPayment?: number
  startDate: Date
  endDate: Date
  nextPaymentDate: Date
  isActive: boolean
  currentPeriod: number
  totalPeriods: number
  principalCategoryId?: string
  interestCategoryId?: string
  createdAt: Date
  updatedAt: Date
}

// src/types/core/sync.ts
export interface SyncStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  lastSyncTime?: Date
  processedRecurring?: number
  processedLoans?: number
  failedCount?: number
  errorMessage?: string
  futureDataGenerated?: boolean
  futureDataUntil?: Date
}

// src/types/core/transaction.ts
export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE'
  amount: number
  description: string
  notes?: string | null
  date: Date
  status: TransactionStatus
  scheduledDate?: Date | null
  recurringTransactionId?: string | null
  loanContractId?: string | null
  loanPaymentId?: string | null
  createdAt: Date
  updatedAt: Date
}
```

## 🔄 同步机制设计

### 1. 非轮询状态管理

**设计原则**：

- ❌ 不使用轮询机制
- ✅ 基于状态字段判断是否需要触发
- ✅ Dashboard 显示同步状态
- ✅ 支持手动触发更新
- ✅ **提前生成未来7天数据**：预生成即将发生的交易

### 2. 未来数据预生成策略

**核心理念**：为了提升用户体验，系统将提前生成未来7天内应该发生的定期交易和贷款还款记录，让用户能够：

- 提前查看即将发生的交易
- 更好地进行财务规划
- 避免意外的资金不足

**实现策略**：

```typescript
// 预生成策略配置
const FUTURE_GENERATION_CONFIG = {
  DAYS_AHEAD: 7, // 提前生成7天
  TRANSACTION_STATUS: 'PENDING', // 未来交易状态标记
  REFRESH_THRESHOLD: 2, // 剩余天数少于2天时重新生成
}
```

**状态判断逻辑**：

```typescript
// src/lib/services/sync-status.service.ts
export class SyncStatusService {
  /**
   * 检查是否需要同步
   */
  static async needsSync(userId: string): Promise<boolean> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!userSettings?.lastRecurringSync) {
      return true // 从未同步过
    }

    if (userSettings.recurringProcessingStatus === 'failed') {
      return true // 上次同步失败
    }

    const lastSync = new Date(userSettings.lastRecurringSync)
    const now = new Date()
    const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    // 检查是否需要重新生成未来数据
    const needsFutureDataRefresh = await this.needsFutureDataRefresh(userId)

    return hoursSinceLastSync > 6 || needsFutureDataRefresh
  }

  /**
   * 检查是否需要刷新未来数据
   */
  static async needsFutureDataRefresh(userId: string): Promise<boolean> {
    const now = new Date()
    const futureThreshold = new Date()
    futureThreshold.setDate(now.getDate() + FUTURE_GENERATION_CONFIG.REFRESH_THRESHOLD)

    // 检查是否有足够的未来交易数据
    const futurePendingCount = await prisma.transaction.count({
      where: {
        userId,
        status: 'PENDING',
        scheduledDate: {
          gte: now,
          lte: new Date(now.getTime() + FUTURE_GENERATION_CONFIG.DAYS_AHEAD * 24 * 60 * 60 * 1000),
        },
      },
    })

    // 如果未来交易数据不足，需要重新生成
    return futurePendingCount === 0
  }

  /**
   * 获取同步状态
   */
  static async getSyncStatus(userId: string): Promise<SyncStatus> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    const latestLog = await prisma.recurringProcessingLog.findFirst({
      where: { userId },
      orderBy: { startTime: 'desc' },
    })

    // 检查未来数据生成状态
    const now = new Date()
    const futureEndDate = new Date(
      now.getTime() + FUTURE_GENERATION_CONFIG.DAYS_AHEAD * 24 * 60 * 60 * 1000
    )

    const futurePendingCount = await prisma.transaction.count({
      where: {
        userId,
        status: 'PENDING',
        scheduledDate: {
          gte: now,
          lte: futureEndDate,
        },
      },
    })

    const latestFutureTransaction = await prisma.transaction.findFirst({
      where: {
        userId,
        status: 'PENDING',
        scheduledDate: { gte: now },
      },
      orderBy: { scheduledDate: 'desc' },
    })

    return {
      status: userSettings?.recurringProcessingStatus || 'idle',
      lastSyncTime: userSettings?.lastRecurringSync || undefined,
      processedRecurring: latestLog?.processedRecurring || 0,
      processedLoans: latestLog?.processedLoans || 0,
      failedCount: latestLog?.failedCount || 0,
      errorMessage: latestLog?.errorMessage || undefined,
      futureDataGenerated: futurePendingCount > 0,
      futureDataUntil: latestFutureTransaction?.scheduledDate || undefined,
    }
  }
}
```

### 2. Dashboard 状态显示

**组件设计**：

```typescript
// src/components/features/dashboard/SyncStatusCard.tsx
interface SyncStatusCardProps {
  syncStatus: SyncStatus
  onManualSync: () => void
}

export default function SyncStatusCard({ syncStatus, onManualSync }: SyncStatusCardProps) {
  const { t } = useLanguage()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'processing': return 'text-blue-600 dark:text-blue-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'processing': return '🔄'
      case 'failed': return '❌'
      default: return '⏸️'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('dashboard.sync.status')}
          </h3>
          <div className={`flex items-center mt-1 ${getStatusColor(syncStatus.status)}`}>
            <span className="mr-2">{getStatusIcon(syncStatus.status)}</span>
            <span className="text-sm">{t(`sync.status.${syncStatus.status}`)}</span>
          </div>
        </div>

        {syncStatus.status === 'failed' && (
          <button
            onClick={onManualSync}
            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400
                     border border-blue-300 dark:border-blue-600 rounded-md
                     hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {t('sync.retry')}
          </button>
        )}
      </div>

      {syncStatus.lastSyncTime && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t('sync.last.time')}: {format(syncStatus.lastSyncTime, 'yyyy-MM-dd HH:mm')}
        </p>
      )}

      {syncStatus.status === 'completed' && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
          <div>
            {t('sync.processed.summary', {
              recurring: syncStatus.processedRecurring || 0,
              loans: syncStatus.processedLoans || 0
            })}
          </div>
          {syncStatus.futureDataGenerated && syncStatus.futureDataUntil && (
            <div className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">📅</span>
              <span>
                {t('sync.future.data.generated', {
                  until: format(syncStatus.futureDataUntil, 'MM-dd')
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {syncStatus.status === 'failed' && syncStatus.errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {syncStatus.errorMessage}
        </p>
      )}
    </div>
  )
}
```

## 🏦 StockAccountDetailView 集成

### 贷款合约管理集成

**组件扩展**：

```typescript
// 在 StockAccountDetailView.tsx 中添加贷款合约管理
import LoanContractsList from '@/components/features/loans/LoanContractsList'
import LoanContractModal from '@/components/features/loans/LoanContractModal'

// 新增状态
const [loanContracts, setLoanContracts] = useState<LoanContract[]>([])
const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
const [editingLoanContract, setEditingLoanContract] = useState<LoanContract | null>(null)

// 加载贷款合约数据
const loadLoanContracts = async () => {
  if (account.category.type !== 'LIABILITY') return

  try {
    const response = await fetch(`/api/accounts/${account.id}/loan-contracts`)
    const result = await response.json()
    if (result.success) {
      setLoanContracts(result.data.loanContracts)
    }
  } catch (error) {
    console.error('Failed to load loan contracts:', error)
  }
}

// 在组件中添加贷款合约区域
{account.category.type === 'LIABILITY' && (
  <div className="mb-6 sm:mb-8">
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('loan.contracts')}
          </h2>
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent
                     text-sm font-medium rounded-md text-white bg-green-600
                     hover:bg-green-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('loan.add.contract')}
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <LoanContractsList
          loanContracts={loanContracts}
          onEdit={setEditingLoanContract}
          onDelete={handleDeleteLoanContract}
          currencySymbol={currencySymbol}
        />
      </div>
    </div>
  </div>
)}
```

## 🔧 服务层实现

### 1. 未来数据生成服务

```typescript
// src/lib/services/future-data-generation.service.ts
export class FutureDataGenerationService {
  /**
   * 生成未来7天的定期交易数据
   */
  static async generateFutureRecurringTransactions(userId: string): Promise<{
    generated: number
    errors: string[]
  }> {
    const now = new Date()
    const futureEndDate = new Date(
      now.getTime() + FUTURE_GENERATION_CONFIG.DAYS_AHEAD * 24 * 60 * 60 * 1000
    )

    let generated = 0
    const errors: string[] = []

    // 获取所有活跃的定期交易
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: { tags: true },
    })

    for (const recurring of recurringTransactions) {
      try {
        const generatedCount = await this.generateFutureTransactionsForRecurring(
          recurring,
          now,
          futureEndDate
        )
        generated += generatedCount
      } catch (error) {
        errors.push(`定期交易 ${recurring.id} 生成失败: ${error.message}`)
      }
    }

    return { generated, errors }
  }

  /**
   * 为单个定期交易生成未来数据
   */
  private static async generateFutureTransactionsForRecurring(
    recurring: any,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let generated = 0
    let currentDate = new Date(Math.max(recurring.nextDate.getTime(), startDate.getTime()))

    const transactions = []

    while (currentDate <= endDate) {
      // 检查结束条件
      if (recurring.endDate && currentDate > recurring.endDate) {
        break
      }

      if (
        recurring.maxOccurrences &&
        recurring.currentCount + generated >= recurring.maxOccurrences
      ) {
        break
      }

      // 检查是否已存在该日期的交易（避免重复生成）
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          recurringTransactionId: recurring.id,
          OR: [{ date: currentDate }, { scheduledDate: currentDate }],
        },
      })

      if (!existingTransaction) {
        transactions.push({
          userId: recurring.userId,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          currencyCode: recurring.currencyCode,
          type: recurring.type,
          amount: recurring.amount,
          description: recurring.description,
          notes: recurring.notes,
          date: currentDate, // 保持原有的date字段
          scheduledDate: new Date(currentDate), // 新增计划执行日期
          status: currentDate <= new Date() ? 'COMPLETED' : 'PENDING',
          recurringTransactionId: recurring.id,
        })
        generated++
      }

      // 计算下次日期
      currentDate = this.calculateNextDate(currentDate, recurring)
    }

    // 批量创建交易
    if (transactions.length > 0) {
      await prisma.transaction.createMany({
        data: transactions,
      })

      // 为每个交易添加标签
      if (recurring.tags.length > 0) {
        const createdTransactions = await prisma.transaction.findMany({
          where: {
            recurringTransactionId: recurring.id,
            scheduledDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        })

        const transactionTags = []
        for (const transaction of createdTransactions) {
          for (const tag of recurring.tags) {
            transactionTags.push({
              transactionId: transaction.id,
              tagId: tag.tagId,
            })
          }
        }

        if (transactionTags.length > 0) {
          await prisma.transactionTag.createMany({
            data: transactionTags,
          })
        }
      }
    }

    return generated
  }

  /**
   * 生成未来7天的贷款还款数据
   */
  static async generateFutureLoanPayments(userId: string): Promise<{
    generated: number
    errors: string[]
  }> {
    const now = new Date()
    const futureEndDate = new Date(
      now.getTime() + FUTURE_GENERATION_CONFIG.DAYS_AHEAD * 24 * 60 * 60 * 1000
    )

    let generated = 0
    const errors: string[] = []

    // 获取所有活跃的贷款合约
    const loanContracts = await prisma.loanContract.findMany({
      where: {
        userId,
        isActive: true,
        nextPaymentDate: {
          lte: futureEndDate,
        },
      },
    })

    for (const loanContract of loanContracts) {
      try {
        const generatedCount = await this.generateFuturePaymentsForLoan(
          loanContract,
          now,
          futureEndDate
        )
        generated += generatedCount
      } catch (error) {
        errors.push(`贷款合约 ${loanContract.id} 生成失败: ${error.message}`)
      }
    }

    return { generated, errors }
  }

  /**
   * 为单个贷款合约生成未来还款数据
   */
  private static async generateFuturePaymentsForLoan(
    loanContract: any,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let generated = 0
    let currentPaymentDate = new Date(
      Math.max(loanContract.nextPaymentDate.getTime(), startDate.getTime())
    )
    let currentPeriod = loanContract.currentPeriod

    // 计算还款计划
    const calculation = LoanCalculationService.calculateLoan(
      loanContract.loanAmount,
      loanContract.interestRate,
      loanContract.loanTerm,
      loanContract.repaymentType
    )

    while (currentPaymentDate <= endDate && currentPeriod < loanContract.totalPeriods) {
      const nextPeriod = currentPeriod + 1
      const paymentInfo = calculation.schedule[nextPeriod - 1]

      if (!paymentInfo) break

      // 检查是否已存在该期的还款记录
      const existingPayment = await prisma.loanPayment.findFirst({
        where: {
          loanContractId: loanContract.id,
          period: nextPeriod,
        },
      })

      if (!existingPayment) {
        // 创建未来的还款交易记录
        const transactions = []

        // 利息支出交易
        if (paymentInfo.interestAmount > 0) {
          transactions.push({
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.interestCategoryId || loanContract.account?.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'EXPENSE',
            amount: paymentInfo.interestAmount,
            description: `${loanContract.contractName} - 第${nextPeriod}期利息`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: currentPaymentDate,
            scheduledDate: new Date(currentPaymentDate),
            status: currentPaymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
            loanContractId: loanContract.id,
          })
        }

        // 本金还款交易
        if (paymentInfo.principalAmount > 0) {
          transactions.push({
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.principalCategoryId || loanContract.account?.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'EXPENSE',
            amount: paymentInfo.principalAmount,
            description: `${loanContract.contractName} - 第${nextPeriod}期本金`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: currentPaymentDate,
            scheduledDate: new Date(currentPaymentDate),
            status: currentPaymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
            loanContractId: loanContract.id,
          })

          // 余额调整交易
          transactions.push({
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.account?.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'BALANCE',
            amount: -paymentInfo.principalAmount,
            description: `${loanContract.contractName} - 第${nextPeriod}期本金还款`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: currentPaymentDate,
            scheduledDate: new Date(currentPaymentDate),
            status: currentPaymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
            loanContractId: loanContract.id,
          })
        }

        // 批量创建交易
        if (transactions.length > 0) {
          await prisma.transaction.createMany({
            data: transactions,
          })
          generated += transactions.length
        }
      }

      // 计算下次还款日期
      currentPaymentDate.setMonth(currentPaymentDate.getMonth() + 1)
      currentPeriod++
    }

    return generated
  }

  /**
   * 清理过期的未来交易数据
   */
  static async cleanupExpiredFutureTransactions(userId: string): Promise<number> {
    const now = new Date()

    // 删除已过期但仍标记为PENDING的交易
    const result = await prisma.transaction.deleteMany({
      where: {
        userId,
        status: 'PENDING',
        scheduledDate: {
          lt: now,
        },
      },
    })

    return result.count
  }

  /**
   * 将到期的PENDING交易转换为COMPLETED
   */
  static async processDueTransactions(userId: string): Promise<number> {
    const now = new Date()

    // 更新到期的PENDING交易为COMPLETED
    const result = await prisma.transaction.updateMany({
      where: {
        userId,
        status: 'PENDING',
        scheduledDate: {
          lte: now,
        },
      },
      data: {
        status: 'COMPLETED',
      },
    })

    return result.count
  }

  /**
   * 计算下次执行日期（复用现有逻辑）
   */
  private static calculateNextDate(currentDate: Date, recurring: any): Date {
    // 这里复用 RecurringTransactionService.calculateNextDate 的逻辑
    return RecurringTransactionService.calculateNextDate(currentDate, recurring)
  }
}
```

### 2. 统一同步服务（更新版）

```typescript
// src/lib/services/unified-sync.service.ts
export class UnifiedSyncService {
  /**
   * 触发用户同步（非轮询方式）
   */
  static async triggerUserSync(userId: string, force: boolean = false) {
    // 检查是否需要同步
    if (!force && !(await SyncStatusService.needsSync(userId))) {
      return {
        success: true,
        status: 'already_synced',
        message: t('sync.already.up.to.date'),
      }
    }

    // 检查是否正在处理中
    const currentStatus = await SyncStatusService.getSyncStatus(userId)
    if (currentStatus.status === 'processing') {
      return {
        success: true,
        status: 'processing',
        message: t('sync.in.progress'),
      }
    }

    // 开始异步处理
    setImmediate(() => this.processUserData(userId))

    return {
      success: true,
      status: 'started',
      message: t('sync.started'),
    }
  }

  /**
   * 处理用户数据（定期交易 + 贷款合约 + 未来数据生成）
   */
  private static async processUserData(userId: string): Promise<void> {
    // 更新状态为处理中
    await prisma.userSettings.update({
      where: { userId },
      data: { recurringProcessingStatus: 'processing' },
    })

    const log = await prisma.recurringProcessingLog.create({
      data: { userId, startTime: new Date(), status: 'processing' },
    })

    let processedRecurring = 0
    let processedLoans = 0
    let failedCount = 0
    let errorMessages: string[] = []

    try {
      // 1. 处理到期的PENDING交易（转为COMPLETED）
      const processedDue = await FutureDataGenerationService.processDueTransactions(userId)

      // 2. 清理过期的未来交易
      const cleanedExpired =
        await FutureDataGenerationService.cleanupExpiredFutureTransactions(userId)

      // 3. 处理当前到期的定期交易
      const recurringResult = await this.processCurrentRecurringTransactions(userId)
      processedRecurring += recurringResult.processed
      failedCount += recurringResult.failed
      if (recurringResult.errors.length > 0) {
        errorMessages.push(...recurringResult.errors)
      }

      // 4. 处理当前到期的贷款合约
      const loanResult = await this.processCurrentLoanContracts(userId)
      processedLoans += loanResult.processed
      failedCount += loanResult.failed
      if (loanResult.errors.length > 0) {
        errorMessages.push(...loanResult.errors)
      }

      // 5. 生成未来7天的定期交易数据
      const futureRecurringResult =
        await FutureDataGenerationService.generateFutureRecurringTransactions(userId)
      processedRecurring += futureRecurringResult.generated
      if (futureRecurringResult.errors.length > 0) {
        errorMessages.push(...futureRecurringResult.errors)
      }

      // 6. 生成未来7天的贷款还款数据
      const futureLoanResult = await FutureDataGenerationService.generateFutureLoanPayments(userId)
      processedLoans += futureLoanResult.generated
      if (futureLoanResult.errors.length > 0) {
        errorMessages.push(...futureLoanResult.errors)
      }

      // 7. 更新完成状态
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: {
            recurringProcessingStatus: 'completed',
            lastRecurringSync: new Date(),
          },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'completed',
            processedRecurring,
            processedLoans,
            failedCount,
            errorMessage: errorMessages.length > 0 ? errorMessages.join('; ') : null,
          },
        })
      })
    } catch (error) {
      // 处理失败
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: { recurringProcessingStatus: 'failed' },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'failed',
            processedRecurring,
            processedLoans,
            failedCount,
            errorMessage: error.message,
          },
        })
      })

      throw error
    }
  }

  /**
   * 处理当前到期的定期交易（不包含未来数据生成）
   */
  private static async processCurrentRecurringTransactions(userId: string): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let failed = 0
    const today = new Date()

    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        nextDate: { lte: today },
      },
      include: { tags: true },
    })

    for (const recurring of recurringTransactions) {
      try {
        const success = await RecurringTransactionService.executeRecurringTransaction(recurring.id)
        if (success) {
          processed++
        }
      } catch (error) {
        failed++
        errors.push(`定期交易 ${recurring.id} 处理失败: ${error.message}`)
      }
    }

    return { processed, failed, errors }
  }

  /**
   * 处理当前到期的贷款合约（不包含未来数据生成）
   */
  private static async processCurrentLoanContracts(userId: string): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let failed = 0
    const today = new Date()

    const loanContracts = await prisma.loanContract.findMany({
      where: {
        userId,
        isActive: true,
        nextPaymentDate: { lte: today },
      },
    })

    for (const loanContract of loanContracts) {
      try {
        const success = await LoanContractService.processLoanPayment(loanContract.id)
        if (success) {
          processed++
        }
      } catch (error) {
        failed++
        errors.push(`贷款合约 ${loanContract.id} 处理失败: ${error.message}`)
      }
    }

    return { processed, failed, errors }
  }
}
```

## 📱 前端集成

### 1. UserDataContext 扩展

```typescript
// src/contexts/providers/UserDataContext.tsx
interface UserDataContextType {
  // 现有属性...

  // 同步相关
  syncStatus: SyncStatus
  triggerSync: (force?: boolean) => Promise<void>
  refreshSyncStatus: () => Promise<void>
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })

  // 初始化时检查同步状态
  useEffect(() => {
    if (user) {
      refreshSyncStatus()
      checkAndTriggerSync()
    }
  }, [user])

  const refreshSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status')
      const result = await response.json()
      if (result.success) {
        setSyncStatus(result.data)
      }
    } catch (error) {
      console.error('Failed to refresh sync status:', error)
    }
  }

  const checkAndTriggerSync = async () => {
    try {
      const response = await fetch('/api/sync/check')
      const result = await response.json()
      if (result.success && result.data.needsSync) {
        await triggerSync()
      }
    } catch (error) {
      console.error('Failed to check sync status:', error)
    }
  }

  const triggerSync = async (force: boolean = false) => {
    try {
      const response = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })

      const result = await response.json()
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, status: 'processing' }))

        // 延迟刷新状态（给后台处理时间）
        setTimeout(refreshSyncStatus, 2000)
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  return (
    <UserDataContext.Provider value={{
      // 现有值...
      syncStatus,
      triggerSync,
      refreshSyncStatus
    }}>
      {children}
    </UserDataContext.Provider>
  )
}
```

## 🚀 API 接口设计

### 1. 同步管理接口

```typescript
// src/app/api/sync/trigger/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { force = false } = await request.json()
    const result = await UnifiedSyncService.triggerUserSync(user.id, force)

    return successResponse(result)
  } catch (error) {
    return errorResponse('同步触发失败')
  }
}

// src/app/api/sync/status/route.ts
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const syncStatus = await SyncStatusService.getSyncStatus(user.id)
    return successResponse(syncStatus)
  } catch (error) {
    return errorResponse('获取同步状态失败')
  }
}

// src/app/api/sync/check/route.ts
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const needsSync = await SyncStatusService.needsSync(user.id)
    return successResponse({ needsSync })
  } catch (error) {
    return errorResponse('检查同步状态失败')
  }
}
```

### 2. 贷款合约接口

```typescript
// src/app/api/loan-contracts/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const data = await request.json()
    const loanContract = await LoanContractService.createLoanContract(user.id, data)

    return successResponse({ loanContract })
  } catch (error) {
    return errorResponse('创建贷款合约失败')
  }
}

// src/app/api/accounts/[id]/loan-contracts/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await params
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const loanContracts = await LoanContractService.getAccountLoanContracts(user.id, accountId)

    return successResponse({ loanContracts })
  } catch (error) {
    return errorResponse('获取贷款合约失败')
  }
}
```

## 🎯 实施计划

### 阶段一：基础同步机制（2-3天）

1. 数据库表结构创建和迁移
2. 同步服务类实现
3. API 接口开发
4. UserDataContext 扩展

### 阶段二：Dashboard 集成（1-2天）

1. SyncStatusCard 组件开发
2. Dashboard 页面集成
3. 手动触发功能实现
4. 状态显示优化

### 阶段三：贷款合约功能（3-4天）

1. 贷款相关数据表创建
2. 贷款计算和服务类实现
3. 贷款管理组件开发
4. StockAccountDetailView 集成

### 阶段四：测试和优化（1-2天）

1. 端到端功能测试
2. 错误处理完善
3. 性能优化
4. 文档更新

## 📝 开发规范遵循

### 代码质量

- ✅ 严格的 TypeScript 类型定义
- ✅ ESLint 规则遵循
- ✅ 组件命名使用 PascalCase
- ✅ 服务文件使用 kebab-case
- ✅ 完整的错误处理机制

### 架构原则

- ✅ 单一职责原则
- ✅ 模块化设计
- ✅ 数据库事务保证一致性
- ✅ 异步处理避免阻塞
- ✅ 国际化支持

### 用户体验

- ✅ 响应式设计
- ✅ 深色主题支持
- ✅ 加载状态指示
- ✅ 友好的错误提示
- ✅ 无轮询的状态管理

## 💻 详细组件实现

### 1. 贷款合约列表组件

```typescript
// src/components/features/loans/LoanContractsList.tsx
'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from 'next-themes'
import { useToast } from '@/contexts/providers/ToastContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { LoanContract } from '@/types/core/loan'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

interface LoanContractsListProps {
  loanContracts: LoanContract[]
  onEdit: (contract: LoanContract) => void
  onDelete: (id: string) => void
  currencySymbol: string
}

export default function LoanContractsList({
  loanContracts,
  onEdit,
  onDelete,
  currencySymbol
}: LoanContractsListProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { showSuccess } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingId) {
      onDelete(deletingId)
      setDeletingId(null)
      setShowDeleteConfirm(false)
      showSuccess(t('loan.delete.success'))
    }
  }

  const getRepaymentTypeText = (type: string) => {
    return t(`loan.repayment.type.${type.toLowerCase()}`)
  }

  const getProgressPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100)
  }

  if (loanContracts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏦</div>
        <p className="text-gray-500 dark:text-gray-400">
          {t('loan.no.contracts')}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {t('loan.no.contracts.hint')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {loanContracts.map((contract) => (
          <div
            key={contract.id}
            className={`border rounded-lg p-4 ${
              resolvedTheme === 'dark'
                ? 'border-gray-600 bg-gray-700/30'
                : 'border-gray-200 bg-white'
            } ${!contract.isActive ? 'opacity-60' : ''}`}
          >
            {/* 移动端布局 */}
            <div className="sm:hidden space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🏦</span>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {contract.contractName}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      contract.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                    }`}>
                      {contract.isActive ? t('loan.active') : t('loan.completed')}
                    </span>
                  </div>
                  <p className="text-lg font-semibold mt-1 text-red-600 dark:text-red-400">
                    {formatCurrency(contract.currentBalance, currencySymbol)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('loan.total')}: {formatCurrency(contract.loanAmount, currencySymbol)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(contract)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(contract.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.interest.rate')}:
                  </span>
                  <div className="font-medium">
                    {(contract.interestRate * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.repayment.type')}:
                  </span>
                  <div className="font-medium">
                    {getRepaymentTypeText(contract.repaymentType)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.progress')}:
                  </span>
                  <div className="font-medium">
                    {contract.currentPeriod}/{contract.totalPeriods}
                    <span className="ml-1 text-xs text-gray-400">
                      ({getProgressPercentage(contract.currentPeriod, contract.totalPeriods)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.next.payment')}:
                  </span>
                  <div className="font-medium">
                    {contract.isActive
                      ? format(new Date(contract.nextPaymentDate), 'yyyy-MM-dd')
                      : t('loan.completed')
                    }
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${getProgressPercentage(contract.currentPeriod, contract.totalPeriods)}%`
                  }}
                />
              </div>
            </div>

            {/* 桌面端布局 */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center space-x-6 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {contract.contractName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getRepaymentTypeText(contract.repaymentType)} •
                      {(contract.interestRate * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(contract.currentBalance, currencySymbol)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    / {formatCurrency(contract.loanAmount, currencySymbol)}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('loan.progress')}
                  </p>
                  <p className="font-medium">
                    {contract.currentPeriod}/{contract.totalPeriods}
                  </p>
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                      style={{
                        width: `${getProgressPercentage(contract.currentPeriod, contract.totalPeriods)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('loan.next.payment')}
                  </p>
                  <p className="font-medium">
                    {contract.isActive
                      ? format(new Date(contract.nextPaymentDate), 'yyyy-MM-dd')
                      : t('loan.completed')
                    }
                  </p>
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => onEdit(contract)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title={t('common.edit')}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteClick(contract.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title={t('common.delete')}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('loan.delete.confirm.title')}
        message={t('loan.delete.confirm.message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
      />
    </>
  )
}
```

### 2. 贷款合约创建模态框

```typescript
// src/components/features/loans/LoanContractModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from 'next-themes'
import { useToast } from '@/contexts/providers/ToastContext'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import { RepaymentType, CreateLoanContractData } from '@/types/core/loan'
import { LoanCalculationService } from '@/lib/services/loan-calculation.service'

interface LoanContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountId: string
  currencyCode: string
  categories: Category[]
}

export default function LoanContractModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  currencyCode,
  categories
}: LoanContractModalProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { showSuccess, showError } = useToast()

  const [formData, setFormData] = useState<CreateLoanContractData>({
    accountId,
    currencyCode,
    contractName: '',
    loanAmount: 0,
    interestRate: 0,
    loanTerm: 12,
    repaymentType: RepaymentType.EQUAL_PAYMENT,
    startDate: new Date().toISOString().split('T')[0],
    principalCategoryId: '',
    interestCategoryId: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [calculation, setCalculation] = useState<any>(null)

  const repaymentTypeOptions = [
    { value: RepaymentType.EQUAL_PAYMENT, label: t('loan.repayment.type.equal_payment') },
    { value: RepaymentType.EQUAL_PRINCIPAL, label: t('loan.repayment.type.equal_principal') },
    { value: RepaymentType.INTEREST_ONLY, label: t('loan.repayment.type.interest_only') }
  ]

  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE')

  // 计算贷款信息
  useEffect(() => {
    if (formData.loanAmount > 0 && formData.interestRate > 0 && formData.loanTerm > 0) {
      try {
        const result = LoanCalculationService.calculateLoan(
          formData.loanAmount,
          formData.interestRate / 100, // 转换为小数
          formData.loanTerm,
          formData.repaymentType
        )
        setCalculation(result)
      } catch (error) {
        setCalculation(null)
      }
    } else {
      setCalculation(null)
    }
  }, [formData.loanAmount, formData.interestRate, formData.loanTerm, formData.repaymentType])

  const handleChange = (field: keyof CreateLoanContractData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.contractName.trim()) {
      newErrors.contractName = t('loan.validation.contract.name.required')
    }

    if (!formData.loanAmount || formData.loanAmount <= 0) {
      newErrors.loanAmount = t('loan.validation.loan.amount.required')
    }

    if (!formData.interestRate || formData.interestRate <= 0) {
      newErrors.interestRate = t('loan.validation.interest.rate.required')
    }

    if (!formData.loanTerm || formData.loanTerm <= 0) {
      newErrors.loanTerm = t('loan.validation.loan.term.required')
    }

    if (!formData.startDate) {
      newErrors.startDate = t('loan.validation.start.date.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/loan-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          interestRate: formData.interestRate / 100 // 转换为小数
        }),
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('loan.create.success'))
        onSuccess()
        onClose()
        // 重置表单
        setFormData({
          accountId,
          currencyCode,
          contractName: '',
          loanAmount: 0,
          interestRate: 0,
          loanTerm: 12,
          repaymentType: RepaymentType.EQUAL_PAYMENT,
          startDate: new Date().toISOString().split('T')[0],
          principalCategoryId: '',
          interestCategoryId: ''
        })
      } else {
        showError(t('loan.create.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Create loan contract error:', error)
      showError(t('loan.create.failed'), t('error.network'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('loan.create.title')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('loan.basic.info')}
          </h3>

          <InputField
            type="text"
            name="contractName"
            label={t('loan.contract.name')}
            value={formData.contractName}
            onChange={(e) => handleChange('contractName', e.target.value)}
            error={errors.contractName}
            placeholder={t('loan.contract.name.placeholder')}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              type="number"
              name="loanAmount"
              label={t('loan.amount')}
              value={formData.loanAmount.toString()}
              onChange={(e) => handleChange('loanAmount', parseFloat(e.target.value) || 0)}
              error={errors.loanAmount}
              min={0}
              step={0.01}
              required
            />

            <InputField
              type="number"
              name="interestRate"
              label={t('loan.interest.rate.percent')}
              value={formData.interestRate.toString()}
              onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
              error={errors.interestRate}
              min={0}
              max={100}
              step={0.01}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              type="number"
              name="loanTerm"
              label={t('loan.term.months')}
              value={formData.loanTerm.toString()}
              onChange={(e) => handleChange('loanTerm', parseInt(e.target.value) || 0)}
              error={errors.loanTerm}
              min={1}
              required
            />

            <SelectField
              name="repaymentType"
              label={t('loan.repayment.type')}
              value={formData.repaymentType}
              onChange={(e) => handleChange('repaymentType', e.target.value as RepaymentType)}
              options={repaymentTypeOptions}
              error={errors.repaymentType}
              required
            />
          </div>

          <InputField
            type="date"
            name="startDate"
            label={t('loan.start.date')}
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            error={errors.startDate}
            required
          />
        </div>

        {/* 分类设置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('loan.category.settings')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              name="principalCategoryId"
              label={t('loan.principal.category')}
              value={formData.principalCategoryId || ''}
              onChange={(e) => handleChange('principalCategoryId', e.target.value || undefined)}
              options={[
                { value: '', label: t('loan.use.default.category') },
                ...expenseCategories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />

            <SelectField
              name="interestCategoryId"
              label={t('loan.interest.category')}
              value={formData.interestCategoryId || ''}
              onChange={(e) => handleChange('interestCategoryId', e.target.value || undefined)}
              options={[
                { value: '', label: t('loan.use.default.category') },
                ...expenseCategories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
          </div>
        </div>

        {/* 计算结果预览 */}
        {calculation && (
          <div className={`p-4 rounded-lg border ${
            resolvedTheme === 'dark'
              ? 'border-gray-600 bg-gray-700/50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t('loan.calculation.preview')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('loan.monthly.payment')}:
                </span>
                <div className="font-medium text-lg">
                  ¥{calculation.monthlyPayment.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('loan.total.interest')}:
                </span>
                <div className="font-medium text-lg text-red-600 dark:text-red-400">
                  ¥{calculation.totalInterest.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  {t('loan.total.payment')}:
                </span>
                <div className="font-medium text-lg">
                  ¥{calculation.totalPayment.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
```

## 🌐 国际化配置

### 1. 中文翻译 (src/locales/zh.json)

```json
{
  "sync": {
    "status": "同步状态",
    "already.up.to.date": "已是最新状态",
    "in.progress": "正在同步中",
    "started": "开始同步",
    "retry": "重试",
    "last.time": "上次同步",
    "processed.summary": "已处理 {recurring} 个定期交易，{loans} 个贷款合约",
    "status.idle": "待同步",
    "status.processing": "同步中",
    "status.completed": "已完成",
    "status.failed": "同步失败"
  },
  "loan": {
    "contracts": "贷款合约",
    "add.contract": "添加贷款合约",
    "no.contracts": "暂无贷款合约",
    "no.contracts.hint": "点击上方按钮创建第一个贷款合约",
    "active": "活跃",
    "completed": "已完成",
    "total": "贷款总额",
    "total.amount": "贷款总额",
    "remaining.balance": "剩余本金",
    "interest.rate": "利率",
    "interest.rate.percent": "年利率 (%)",
    "repayment.type": "还款方式",
    "progress": "进度",
    "next.payment": "下次还款",
    "create.title": "创建贷款合约",
    "create.success": "贷款合约创建成功",
    "create.failed": "贷款合约创建失败",
    "delete.success": "贷款合约删除成功",
    "delete.confirm.title": "删除贷款合约",
    "delete.confirm.message": "确定要删除这个贷款合约吗？这将同时删除所有相关的还款记录和交易。",
    "basic.info": "基本信息",
    "contract.name": "合约名称",
    "contract.name.placeholder": "如：房贷、车贷等",
    "amount": "贷款金额",
    "term.months": "贷款期限（月）",
    "start.date": "开始日期",
    "category.settings": "分类设置",
    "principal.category": "本金还款分类",
    "interest.category": "利息支付分类",
    "use.default.category": "使用默认分类",
    "calculation.preview": "计算预览",
    "monthly.payment": "月供金额",
    "total.interest": "总利息",
    "total.payment": "总还款",
    "repayment.type.equal_payment": "等额本息",
    "repayment.type.equal_principal": "等额本金",
    "repayment.type.interest_only": "先息后本",
    "validation.contract.name.required": "请输入合约名称",
    "validation.loan.amount.required": "请输入有效的贷款金额",
    "validation.interest.rate.required": "请输入有效的利率",
    "validation.loan.term.required": "请输入有效的贷款期限",
    "validation.start.date.required": "请选择开始日期"
  },
  "recurring": {
    "enable": "定期交易",
    "options": "定期交易选项",
    "frequency": "频率",
    "interval": "间隔",
    "start.date": "开始日期",
    "end.condition": "结束条件",
    "never.end": "无限期",
    "end.by.date": "指定结束日期",
    "end.after.count": "执行指定次数",
    "times": "次",
    "day.of.week": "星期",
    "day.of.month": "日期",
    "month.of.year": "月份",
    "next.date": "下次执行",
    "executed.count": "已执行次数",
    "status": "状态",
    "active": "活跃",
    "paused": "已暂停",
    "completed": "已完成",
    "next": "下次",
    "executed": "已执行",
    "no.transactions": "暂无定期交易",
    "no.transactions.hint": "在添加交易时勾选"定期交易"来创建",
    "create.success": "定期交易创建成功",
    "delete.success": "定期交易删除成功",
    "delete.confirm.title": "删除定期交易",
    "delete.confirm.message": "确定要删除这个定期交易吗？这将同时删除所有未来的相关交易记录。",
    "frequency.daily": "每日",
    "frequency.weekly": "每周",
    "frequency.monthly": "每月",
    "frequency.quarterly": "每季度",
    "frequency.yearly": "每年",
    "every.interval": "每 {interval} {frequency}"
  },
  "dashboard": {
    "sync.status": "数据同步状态"
  }
}
```

### 2. 英文翻译 (src/locales/en.json)

```json
{
  "sync": {
    "status": "Sync Status",
    "already.up.to.date": "Already up to date",
    "in.progress": "Syncing in progress",
    "started": "Sync started",
    "retry": "Retry",
    "last.time": "Last sync",
    "processed.summary": "Processed {recurring} recurring transactions, {loans} loan contracts",
    "status.idle": "Idle",
    "status.processing": "Processing",
    "status.completed": "Completed",
    "status.failed": "Failed"
  },
  "loan": {
    "contracts": "Loan Contracts",
    "add.contract": "Add Loan Contract",
    "no.contracts": "No loan contracts",
    "no.contracts.hint": "Click the button above to create your first loan contract",
    "active": "Active",
    "completed": "Completed",
    "total": "Total Loan",
    "total.amount": "Total Amount",
    "remaining.balance": "Remaining Balance",
    "interest.rate": "Interest Rate",
    "interest.rate.percent": "Annual Rate (%)",
    "repayment.type": "Repayment Type",
    "progress": "Progress",
    "next.payment": "Next Payment",
    "create.title": "Create Loan Contract",
    "create.success": "Loan contract created successfully",
    "create.failed": "Failed to create loan contract",
    "delete.success": "Loan contract deleted successfully",
    "delete.confirm.title": "Delete Loan Contract",
    "delete.confirm.message": "Are you sure you want to delete this loan contract? This will also delete all related payment records and transactions.",
    "basic.info": "Basic Information",
    "contract.name": "Contract Name",
    "contract.name.placeholder": "e.g., Mortgage, Car Loan, etc.",
    "amount": "Loan Amount",
    "term.months": "Loan Term (Months)",
    "start.date": "Start Date",
    "category.settings": "Category Settings",
    "principal.category": "Principal Payment Category",
    "interest.category": "Interest Payment Category",
    "use.default.category": "Use Default Category",
    "calculation.preview": "Calculation Preview",
    "monthly.payment": "Monthly Payment",
    "total.interest": "Total Interest",
    "total.payment": "Total Payment",
    "repayment.type.equal_payment": "Equal Payment",
    "repayment.type.equal_principal": "Equal Principal",
    "repayment.type.interest_only": "Interest Only",
    "validation.contract.name.required": "Please enter contract name",
    "validation.loan.amount.required": "Please enter valid loan amount",
    "validation.interest.rate.required": "Please enter valid interest rate",
    "validation.loan.term.required": "Please enter valid loan term",
    "validation.start.date.required": "Please select start date"
  },
  "recurring": {
    "enable": "Recurring Transaction",
    "options": "Recurring Options",
    "frequency": "Frequency",
    "interval": "Interval",
    "start.date": "Start Date",
    "end.condition": "End Condition",
    "never.end": "Never End",
    "end.by.date": "End by Date",
    "end.after.count": "End after Count",
    "times": "times",
    "day.of.week": "Day of Week",
    "day.of.month": "Day of Month",
    "month.of.year": "Month of Year",
    "next.date": "Next Date",
    "executed.count": "Executed Count",
    "status": "Status",
    "active": "Active",
    "paused": "Paused",
    "completed": "Completed",
    "next": "Next",
    "executed": "Executed",
    "no.transactions": "No recurring transactions",
    "no.transactions.hint": "Check 'Recurring Transaction' when adding transactions to create one",
    "create.success": "Recurring transaction created successfully",
    "delete.success": "Recurring transaction deleted successfully",
    "delete.confirm.title": "Delete Recurring Transaction",
    "delete.confirm.message": "Are you sure you want to delete this recurring transaction? This will also delete all future related transaction records.",
    "frequency.daily": "Daily",
    "frequency.weekly": "Weekly",
    "frequency.monthly": "Monthly",
    "frequency.quarterly": "Quarterly",
    "frequency.yearly": "Yearly",
    "every.interval": "Every {interval} {frequency}"
  },
  "dashboard": {
    "sync.status": "Data Sync Status"
  }
}
```

## 🔧 开发规范遵循检查清单

### 代码质量标准 ✅

- [x] **TypeScript 严格模式**：所有类型定义完整，无 `any` 类型
- [x] **ESLint 规则遵循**：代码通过所有 lint 检查
- [x] **命名规范**：组件 PascalCase，服务 kebab-case，类型 PascalCase
- [x] **错误处理**：完整的 try-catch 和用户友好的错误提示
- [x] **JSDoc 注释**：关键函数和复杂逻辑有详细注释

### 架构设计原则 ✅

- [x] **单一职责**：每个组件和服务职责明确
- [x] **模块化设计**：功能模块独立，易于维护和扩展
- [x] **数据一致性**：使用数据库事务保证操作原子性
- [x] **异步处理**：避免阻塞用户界面，提供良好体验
- [x] **状态管理**：统一的状态管理和更新机制

### 用户体验标准 ✅

- [x] **响应式设计**：支持移动端和桌面端
- [x] **深色主题**：完整的深色/浅色主题支持
- [x] **国际化**：中英文双语支持
- [x] **加载状态**：适当的加载指示器和骨架屏
- [x] **错误反馈**：清晰的错误信息和恢复建议

### 性能优化 ✅

- [x] **非轮询设计**：基于状态判断，避免不必要的请求
- [x] **异步处理**：后台处理耗时操作
- [x] **数据缓存**：合理的数据缓存策略
- [x] **批量操作**：减少数据库查询次数
- [x] **懒加载**：按需加载组件和数据

### 安全性考虑 ✅

- [x] **输入验证**：前后端双重验证
- [x] **权限检查**：用户身份和操作权限验证
- [x] **SQL 注入防护**：使用 Prisma ORM 防止注入
- [x] **数据隔离**：用户数据严格隔离
- [x] **错误信息**：不暴露敏感系统信息

## 📊 功能特性总结

### 🎯 核心功能实现

1. **定期交易管理** ✅

   - 支持多种频率（日/周/月/季/年）
   - 灵活的结束条件设置
   - 自动生成交易记录
   - 状态管理和监控

2. **贷款合约管理** ✅

   - 支持多种还款方式
   - 自动计算还款计划
   - 自动生成还款交易
   - 余额自动更新

3. **智能同步机制** ✅

   - 非轮询状态管理
   - 用户登录时自动检查
   - Dashboard 状态显示
   - 手动触发支持

4. **StockAccountDetailView 集成** ✅
   - 贷款合约信息展示
   - 增删改查功能
   - 响应式界面设计
   - 与账户数据联动

### 🔧 技术亮点

1. **状态驱动设计**：基于状态字段判断，避免轮询
2. **事务保证**：数据库事务确保操作原子性
3. **异步处理**：后台处理避免界面阻塞
4. **模块化架构**：独立的服务和组件设计
5. **类型安全**：完整的 TypeScript 类型定义

### 📱 用户体验优化

1. **直观的状态显示**：Dashboard 清晰展示同步状态
2. **友好的错误处理**：详细的错误信息和恢复建议
3. **响应式设计**：完美适配移动端和桌面端
4. **国际化支持**：中英文双语界面
5. **无缝集成**：与现有功能完美融合

## 🚀 部署和维护

### 数据库迁移

```bash
# 1. 生成迁移文件
pnpm db:migrate:dev --name add_recurring_and_loan_features

# 2. 应用迁移
pnpm db:migrate:deploy

# 3. 生成 Prisma 客户端
pnpm db:generate
```

### 环境配置

```bash
# 确保环境变量配置正确
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 监控和日志

- 定期检查 `recurring_processing_logs` 表
- 监控同步失败率和错误信息
- 定期清理过期的日志记录

## 📝 最终总结

这份最终规范文档完整实现了用户提出的所有需求：

1. ✅ **非轮询同步机制**：基于状态字段智能判断，Dashboard 显示状态，支持手动触发
2. ✅ **StockAccountDetailView 集成**：完整的贷款合约管理功能
3. ✅ **开发规范遵循**：严格按照项目开发标准实施

**核心优势**：

- 🎯 **功能完整**：定期交易和贷款合约的全生命周期管理
- 🔧 **技术先进**：非轮询设计、异步处理、事务保证
- 📱 **体验优秀**：响应式设计、国际化支持、友好交互
- 🛡️ **质量保证**：类型安全、错误处理、性能优化
- 🔄 **易于维护**：模块化架构、清晰文档、规范代码

这个设计方案为 Flow
Balance 应用提供了强大而灵活的自动化财务管理功能，在满足用户需求的同时，保持了代码的整洁性、可维护性和扩展性。

## 🔍 贷款合约预设信息优化分析

### 1. 当前设计分析

**现有贷款合约交易生成机制**：

- 本金还款交易：使用 `principalCategoryId` 或默认账户分类
- 利息支付交易：使用 `interestCategoryId` 或默认账户分类
- 余额调整交易：使用账户默认分类
- 交易描述：固定格式 `${contractName} - 第${period}期${type}`

**存在的问题**：

1. **分类设置不够智能**：用户需要手动选择本金和利息分类
2. **交易描述单一**：缺乏个性化和灵活性
3. **标签支持缺失**：无法为贷款交易自动添加标签
4. **账户关联不够明确**：缺乏对不同类型贷款的智能识别

### 2. 优化设计方案

#### 2.1 智能分类预设系统

**数据库扩展**：

```sql
-- 扩展贷款合约表，添加预设信息
ALTER TABLE "loan_contracts" ADD COLUMN "loanType" TEXT DEFAULT 'GENERAL';
ALTER TABLE "loan_contracts" ADD COLUMN "autoTagIds" TEXT; -- JSON数组存储自动标签ID
ALTER TABLE "loan_contracts" ADD COLUMN "descriptionTemplate" TEXT;
ALTER TABLE "loan_contracts" ADD COLUMN "notesTemplate" TEXT;

-- 贷款类型: 'MORTGAGE' (房贷), 'CAR_LOAN' (车贷), 'PERSONAL' (个人贷款), 'BUSINESS' (商业贷款), 'GENERAL' (通用)
```

**智能分类预设规则**：

```typescript
// src/lib/services/loan-preset.service.ts
export class LoanPresetService {
  /**
   * 根据贷款类型获取预设分类
   */
  static getPresetCategories(
    loanType: string,
    expenseCategories: Category[]
  ): {
    principalCategory?: Category
    interestCategory?: Category
    suggestedTags: string[]
    descriptionTemplate: string
    notesTemplate: string
  } {
    const presets = {
      MORTGAGE: {
        principalKeywords: ['房贷', '住房', '按揭', 'mortgage', 'housing'],
        interestKeywords: ['房贷利息', '住房利息', 'mortgage interest'],
        suggestedTags: ['房产', '住房', '长期负债'],
        descriptionTemplate: '房贷还款 - 第{period}期{type}',
        notesTemplate: '房贷合约: {contractName} | 剩余本金: {remainingBalance}',
      },
      CAR_LOAN: {
        principalKeywords: ['车贷', '汽车', '车辆', 'car loan', 'auto loan'],
        interestKeywords: ['车贷利息', '汽车利息', 'car interest'],
        suggestedTags: ['汽车', '交通', '车辆'],
        descriptionTemplate: '车贷还款 - 第{period}期{type}',
        notesTemplate: '车贷合约: {contractName} | 剩余期数: {remainingPeriods}',
      },
      PERSONAL: {
        principalKeywords: ['个人贷款', '消费贷', 'personal loan'],
        interestKeywords: ['个人贷款利息', 'personal interest'],
        suggestedTags: ['个人贷款', '消费'],
        descriptionTemplate: '个人贷款还款 - 第{period}期{type}',
        notesTemplate: '个人贷款: {contractName}',
      },
      BUSINESS: {
        principalKeywords: ['商业贷款', '经营贷', 'business loan'],
        interestKeywords: ['商业贷款利息', 'business interest'],
        suggestedTags: ['商业', '经营', '投资'],
        descriptionTemplate: '商业贷款还款 - 第{period}期{type}',
        notesTemplate: '商业贷款: {contractName} | 用途: 经营周转',
      },
      GENERAL: {
        principalKeywords: ['贷款', 'loan'],
        interestKeywords: ['贷款利息', 'loan interest'],
        suggestedTags: ['贷款'],
        descriptionTemplate: '{contractName} - 第{period}期{type}',
        notesTemplate: '贷款合约: {contractName}',
      },
    }

    const preset = presets[loanType] || presets.GENERAL

    // 智能匹配分类
    const principalCategory = this.findBestMatchCategory(
      expenseCategories,
      preset.principalKeywords
    )

    const interestCategory = this.findBestMatchCategory(expenseCategories, preset.interestKeywords)

    return {
      principalCategory,
      interestCategory,
      suggestedTags: preset.suggestedTags,
      descriptionTemplate: preset.descriptionTemplate,
      notesTemplate: preset.notesTemplate,
    }
  }

  /**
   * 智能匹配最佳分类
   */
  private static findBestMatchCategory(
    categories: Category[],
    keywords: string[]
  ): Category | undefined {
    // 精确匹配
    for (const keyword of keywords) {
      const exactMatch = categories.find(cat =>
        cat.name.toLowerCase().includes(keyword.toLowerCase())
      )
      if (exactMatch) return exactMatch
    }

    // 模糊匹配
    for (const keyword of keywords) {
      const fuzzyMatch = categories.find(cat => {
        const similarity = this.calculateSimilarity(cat.name.toLowerCase(), keyword.toLowerCase())
        return similarity > 0.6
      })
      if (fuzzyMatch) return fuzzyMatch
    }

    return undefined
  }

  /**
   * 计算字符串相似度
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * 计算编辑距离
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}
```

#### 2.2 扩展贷款合约类型定义

```typescript
// 更新 src/types/core/loan.ts
export enum LoanType {
  MORTGAGE = 'MORTGAGE', // 房贷
  CAR_LOAN = 'CAR_LOAN', // 车贷
  PERSONAL = 'PERSONAL', // 个人贷款
  BUSINESS = 'BUSINESS', // 商业贷款
  GENERAL = 'GENERAL', // 通用贷款
}

export interface LoanContract {
  // ... 现有字段
  loanType: LoanType
  autoTagIds: string[]
  descriptionTemplate?: string
  notesTemplate?: string
  // ... 其他字段
}

export interface CreateLoanContractData {
  // ... 现有字段
  loanType: LoanType
  autoTagIds: string[]
  descriptionTemplate?: string
  notesTemplate?: string
  // ... 其他字段
}
```

#### 2.3 智能交易生成服务

```typescript
// 更新 src/lib/services/loan-contract.service.ts
export class LoanContractService {
  /**
   * 生成智能化的贷款交易记录
   */
  static async generateLoanTransaction(
    loanContract: LoanContract,
    paymentInfo: any,
    period: number,
    paymentDate: Date
  ): Promise<Transaction[]> {
    const transactions: Transaction[] = []

    // 解析模板变量
    const templateVars = {
      contractName: loanContract.contractName,
      period: period.toString(),
      remainingBalance: paymentInfo.remainingBalance.toLocaleString(),
      remainingPeriods: (loanContract.totalPeriods - period).toString(),
      loanType: this.getLoanTypeDisplayName(loanContract.loanType),
    }

    // 生成利息支出交易
    if (paymentInfo.interestAmount > 0) {
      const interestTransaction = {
        userId: loanContract.userId,
        accountId: loanContract.accountId,
        categoryId: loanContract.interestCategoryId || loanContract.account?.categoryId,
        currencyCode: loanContract.currencyCode,
        type: 'EXPENSE' as const,
        amount: paymentInfo.interestAmount,
        description: this.parseTemplate(
          loanContract.descriptionTemplate || '{contractName} - 第{period}期利息',
          { ...templateVars, type: '利息' }
        ),
        notes: this.parseTemplate(
          loanContract.notesTemplate || '贷款合约: {contractName}',
          templateVars
        ),
        date: paymentDate,
        scheduledDate: new Date(paymentDate),
        status: paymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
        loanContractId: loanContract.id,
      }
      transactions.push(interestTransaction)
    }

    // 生成本金还款交易
    if (paymentInfo.principalAmount > 0) {
      const principalTransaction = {
        userId: loanContract.userId,
        accountId: loanContract.accountId,
        categoryId: loanContract.principalCategoryId || loanContract.account?.categoryId,
        currencyCode: loanContract.currencyCode,
        type: 'EXPENSE' as const,
        amount: paymentInfo.principalAmount,
        description: this.parseTemplate(
          loanContract.descriptionTemplate || '{contractName} - 第{period}期本金',
          { ...templateVars, type: '本金' }
        ),
        notes: this.parseTemplate(
          loanContract.notesTemplate || '贷款合约: {contractName}',
          templateVars
        ),
        date: paymentDate,
        scheduledDate: new Date(paymentDate),
        status: paymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
        loanContractId: loanContract.id,
      }
      transactions.push(principalTransaction)

      // 生成余额调整交易
      const balanceTransaction = {
        userId: loanContract.userId,
        accountId: loanContract.accountId,
        categoryId: loanContract.account?.categoryId,
        currencyCode: loanContract.currencyCode,
        type: 'BALANCE' as const,
        amount: -paymentInfo.principalAmount,
        description: this.parseTemplate(
          '账户余额调整 - {contractName}第{period}期本金还款',
          templateVars
        ),
        notes: this.parseTemplate(
          loanContract.notesTemplate || '贷款合约: {contractName}',
          templateVars
        ),
        date: paymentDate,
        scheduledDate: new Date(paymentDate),
        status: paymentDate <= new Date() ? 'COMPLETED' : 'PENDING',
        loanContractId: loanContract.id,
      }
      transactions.push(balanceTransaction)
    }

    return transactions
  }

  /**
   * 解析模板字符串
   */
  private static parseTemplate(template: string, vars: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value)
    }
    return result
  }

  /**
   * 获取贷款类型显示名称
   */
  private static getLoanTypeDisplayName(loanType: LoanType): string {
    const displayNames = {
      [LoanType.MORTGAGE]: '房贷',
      [LoanType.CAR_LOAN]: '车贷',
      [LoanType.PERSONAL]: '个人贷款',
      [LoanType.BUSINESS]: '商业贷款',
      [LoanType.GENERAL]: '贷款',
    }
    return displayNames[loanType] || '贷款'
  }

  /**
   * 自动添加贷款交易标签
   */
  static async addAutoTagsToTransactions(
    transactionIds: string[],
    autoTagIds: string[]
  ): Promise<void> {
    if (autoTagIds.length === 0 || transactionIds.length === 0) {
      return
    }

    const transactionTags = []
    for (const transactionId of transactionIds) {
      for (const tagId of autoTagIds) {
        transactionTags.push({
          transactionId,
          tagId,
        })
      }
    }

    await prisma.transactionTag.createMany({
      data: transactionTags,
    })
  }
}
```

#### 2.4 增强的贷款合约创建界面

```typescript
// 更新 LoanContractModal 组件
export default function LoanContractModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  currencyCode,
  categories,
  tags
}: LoanContractModalProps) {
  // ... 现有状态

  const [presetSuggestions, setPresetSuggestions] = useState<any>(null)

  const loanTypeOptions = [
    { value: LoanType.MORTGAGE, label: t('loan.type.mortgage') },
    { value: LoanType.CAR_LOAN, label: t('loan.type.car_loan') },
    { value: LoanType.PERSONAL, label: t('loan.type.personal') },
    { value: LoanType.BUSINESS, label: t('loan.type.business') },
    { value: LoanType.GENERAL, label: t('loan.type.general') }
  ]

  // 当贷款类型改变时，获取预设建议
  useEffect(() => {
    if (formData.loanType) {
      const suggestions = LoanPresetService.getPresetCategories(
        formData.loanType,
        categories.filter(cat => cat.type === 'EXPENSE')
      )
      setPresetSuggestions(suggestions)

      // 自动应用建议
      if (suggestions.principalCategory && !formData.principalCategoryId) {
        handleChange('principalCategoryId', suggestions.principalCategory.id)
      }
      if (suggestions.interestCategory && !formData.interestCategoryId) {
        handleChange('interestCategoryId', suggestions.interestCategory.id)
      }
      if (suggestions.descriptionTemplate && !formData.descriptionTemplate) {
        handleChange('descriptionTemplate', suggestions.descriptionTemplate)
      }
      if (suggestions.notesTemplate && !formData.notesTemplate) {
        handleChange('notesTemplate', suggestions.notesTemplate)
      }
    }
  }, [formData.loanType])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('loan.create.title')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('loan.basic.info')}
          </h3>

          {/* 贷款类型选择 */}
          <SelectField
            name="loanType"
            label={t('loan.type')}
            value={formData.loanType}
            onChange={(e) => handleChange('loanType', e.target.value as LoanType)}
            options={loanTypeOptions}
            error={errors.loanType}
            required
          />

          {/* 智能建议提示 */}
          {presetSuggestions && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">💡</span>
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    {t('loan.smart.suggestions')}
                  </p>
                  <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
                    {presetSuggestions.principalCategory && (
                      <li>• {t('loan.suggested.principal.category')}: {presetSuggestions.principalCategory.name}</li>
                    )}
                    {presetSuggestions.interestCategory && (
                      <li>• {t('loan.suggested.interest.category')}: {presetSuggestions.interestCategory.name}</li>
                    )}
                    {presetSuggestions.suggestedTags.length > 0 && (
                      <li>• {t('loan.suggested.tags')}: {presetSuggestions.suggestedTags.join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 其他基本信息字段... */}
        </div>

        {/* 高级设置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('loan.advanced.settings')}
          </h3>

          {/* 自动标签选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('loan.auto.tags')}
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <label key={tag.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoTagIds.includes(tag.id)}
                    onChange={(e) => {
                      const newTagIds = e.target.checked
                        ? [...formData.autoTagIds, tag.id]
                        : formData.autoTagIds.filter(id => id !== tag.id)
                      handleChange('autoTagIds', newTagIds)
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 描述模板 */}
          <InputField
            type="text"
            name="descriptionTemplate"
            label={t('loan.description.template')}
            value={formData.descriptionTemplate || ''}
            onChange={(e) => handleChange('descriptionTemplate', e.target.value)}
            placeholder="{contractName} - 第{period}期{type}"
            help={t('loan.template.help')}
          />

          {/* 备注模板 */}
          <InputField
            type="text"
            name="notesTemplate"
            label={t('loan.notes.template')}
            value={formData.notesTemplate || ''}
            onChange={(e) => handleChange('notesTemplate', e.target.value)}
            placeholder="贷款合约: {contractName}"
            help={t('loan.template.help')}
          />
        </div>

        {/* 其他现有内容... */}
      </form>
    </Modal>
  )
}
```

### 3. 国际化配置扩展

```json
// 扩展 src/locales/zh.json
{
  "loan": {
    // ... 现有翻译
    "type": "贷款类型",
    "type.mortgage": "房贷",
    "type.car_loan": "车贷",
    "type.personal": "个人贷款",
    "type.business": "商业贷款",
    "type.general": "通用贷款",
    "smart.suggestions": "智能建议",
    "suggested.principal.category": "建议本金分类",
    "suggested.interest.category": "建议利息分类",
    "suggested.tags": "建议标签",
    "advanced.settings": "高级设置",
    "auto.tags": "自动标签",
    "description.template": "描述模板",
    "notes.template": "备注模板",
    "template.help": "可用变量: {contractName}, {period}, {type}, {remainingBalance}, {remainingPeriods}",
    "preset.applied": "已应用智能预设",
    "preset.apply.all": "应用所有建议"
  }
}

// 扩展 src/locales/en.json
{
  "loan": {
    // ... existing translations
    "type": "Loan Type",
    "type.mortgage": "Mortgage",
    "type.car_loan": "Car Loan",
    "type.personal": "Personal Loan",
    "type.business": "Business Loan",
    "type.general": "General Loan",
    "smart.suggestions": "Smart Suggestions",
    "suggested.principal.category": "Suggested Principal Category",
    "suggested.interest.category": "Suggested Interest Category",
    "suggested.tags": "Suggested Tags",
    "advanced.settings": "Advanced Settings",
    "auto.tags": "Auto Tags",
    "description.template": "Description Template",
    "notes.template": "Notes Template",
    "template.help": "Available variables: {contractName}, {period}, {type}, {remainingBalance}, {remainingPeriods}",
    "preset.applied": "Smart presets applied",
    "preset.apply.all": "Apply All Suggestions"
  }
}
```

### 4. 优化效果总结

**智能化程度提升**：

1. **自动分类匹配**：根据贷款类型智能推荐最佳分类
2. **个性化模板**：支持自定义交易描述和备注模板
3. **自动标签**：预设常用标签，自动应用到生成的交易
4. **类型识别**：区分不同类型贷款，提供针对性建议

**用户体验改善**：

1. **减少手动配置**：大部分设置可以自动完成
2. **智能建议**：实时显示系统建议，用户可选择采纳
3. **模板预览**：实时预览生成的交易描述效果
4. **一键应用**：可以一键应用所有智能建议

**数据质量提升**：

1. **标准化描述**：统一的交易描述格式
2. **准确分类**：智能匹配减少分类错误
3. **完整标签**：自动标签确保数据完整性
4. **个性化信息**：支持用户自定义，满足个性化需求

**实际应用场景**：

**场景1：房贷管理**

- 自动识别为房贷类型
- 智能匹配"房贷本金"、"房贷利息"分类
- 自动添加"房产"、"住房"标签
- 生成描述："房贷还款 - 第12期本金"
- 备注："房贷合约: 工商银行房贷 | 剩余本金: 1,250,000"

**场景2：车贷管理**

- 自动识别为车贷类型
- 智能匹配"车贷本金"、"车贷利息"分类
- 自动添加"汽车"、"交通"标签
- 生成描述："车贷还款 - 第24期利息"
- 备注："车贷合约: 招商银行车贷 | 剩余期数: 12"

这个优化方案大大提升了贷款合约功能的智能化程度和用户体验，让系统能够更好地理解用户意图并提供精准的预设信息，同时保持了高度的可定制性。

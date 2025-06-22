/**
 * 统一的重复检查服务
 * 为定期交易和贷款合约提供一致的重复检查逻辑
 */

import { PrismaClient } from '@prisma/client'

// 定义具体类型以替代 any
type PrismaTransaction = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0]

const prisma = new PrismaClient()

// 检查类型枚举
export enum CheckType {
  RECURRING_TRANSACTION = 'RECURRING_TRANSACTION',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
}

// 检查配置接口
export interface DuplicateCheckConfig {
  type: CheckType
  userId: string
  dateRange: {
    startDate: Date
    endDate: Date
  }
  // 定期交易相关
  recurringTransactionId?: string
  // 贷款合约相关
  loanContractId?: string
  loanPaymentId?: string
}

// 检查结果接口
export interface DuplicateCheckResult {
  existingDates: Set<string>
  conflictingRecords: Array<{
    id: string
    date: Date
    status?: string
  }>
}

// 并发检查结果接口
export interface ConcurrencyCheckResult {
  isValid: boolean
  reason?: string
  currentStatus?: string
}

export class DuplicateCheckService {
  /**
   * 标准化日期为YYYY-MM-DD格式，避免时区转换问题
   * 使用本地时间确保日期一致性
   */
  static normalizeDate(date: Date): string {
    // 使用本地时间的年月日，避免UTC转换导致的日期偏移
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    return (
      year +
      '-' +
      String(month).padStart(2, '0') +
      '-' +
      String(day).padStart(2, '0')
    )
  }

  /**
   * 标准化日期范围，确保时间边界正确
   */
  static normalizeDateRange(
    startDate: Date,
    endDate: Date
  ): {
    normalizedStartDate: Date
    normalizedEndDate: Date
  } {
    // 开始日期设置为当天的开始时间
    const normalizedStartDate = new Date(startDate)
    normalizedStartDate.setHours(0, 0, 0, 0)

    // 结束日期设置为当天的结束时间
    const normalizedEndDate = new Date(endDate)
    normalizedEndDate.setHours(23, 59, 59, 999)

    return { normalizedStartDate, normalizedEndDate }
  }

  /**
   * 检查定期交易的重复记录
   */
  static async checkRecurringTransactionDuplicates(
    config: DuplicateCheckConfig
  ): Promise<DuplicateCheckResult> {
    if (!config.recurringTransactionId) {
      throw new Error('定期交易检查需要提供 recurringTransactionId')
    }

    const { normalizedStartDate, normalizedEndDate } = this.normalizeDateRange(
      config.dateRange.startDate,
      config.dateRange.endDate
    )

    // 查询已存在的交易记录
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        recurringTransactionId: config.recurringTransactionId,
        userId: config.userId,
        date: {
          gte: normalizedStartDate,
          lte: normalizedEndDate,
        },
      },
      select: {
        id: true,
        date: true,
      },
    })

    // 创建已存在日期的Set
    const existingDates = new Set(
      existingTransactions.map(t => this.normalizeDate(t.date))
    )

    return {
      existingDates,
      conflictingRecords: existingTransactions.map(t => ({
        id: t.id,
        date: t.date,
      })),
    }
  }

  /**
   * 检查贷款还款的重复记录
   */
  static async checkLoanPaymentDuplicates(
    config: DuplicateCheckConfig
  ): Promise<DuplicateCheckResult> {
    if (!config.loanContractId) {
      throw new Error('贷款还款检查需要提供 loanContractId')
    }

    const { normalizedStartDate, normalizedEndDate } = this.normalizeDateRange(
      config.dateRange.startDate,
      config.dateRange.endDate
    )

    // 查询已存在的还款记录
    const existingPayments = await prisma.loanPayment.findMany({
      where: {
        loanContractId: config.loanContractId,
        userId: config.userId,
        paymentDate: {
          gte: normalizedStartDate,
          lte: normalizedEndDate,
        },
      },
      select: {
        id: true,
        paymentDate: true,
        status: true,
      },
    })

    // 创建已存在日期的Set（只考虑已完成的还款）
    const existingDates = new Set(
      existingPayments
        .filter(
          p => (p as unknown as { status: string }).status === 'COMPLETED'
        )
        .map(p => this.normalizeDate(p.paymentDate))
    )

    return {
      existingDates,
      conflictingRecords: existingPayments.map(p => ({
        id: p.id,
        date: p.paymentDate,
        status: (p as unknown as { status: string }).status,
      })),
    }
  }

  /**
   * 统一的重复检查入口
   */
  static async checkDuplicates(
    config: DuplicateCheckConfig
  ): Promise<DuplicateCheckResult> {
    switch (config.type) {
      case CheckType.RECURRING_TRANSACTION:
        return this.checkRecurringTransactionDuplicates(config)
      case CheckType.LOAN_PAYMENT:
        return this.checkLoanPaymentDuplicates(config)
      default:
        throw new Error(`不支持的检查类型: ${config.type}`)
    }
  }

  /**
   * 在事务内检查并发安全性（定期交易）
   */
  static async checkRecurringTransactionConcurrency(
    tx: PrismaTransaction,
    recurringTransactionId: string,
    targetDates: Date[]
  ): Promise<ConcurrencyCheckResult> {
    // 在事务内重新检查是否有新创建的交易
    const newTransactions = await tx.transaction.findMany({
      where: {
        recurringTransactionId,
        date: {
          in: targetDates,
        },
      },
      select: {
        date: true,
      },
    })

    if (newTransactions.length > 0) {
      const conflictDates = newTransactions.map(t => this.normalizeDate(t.date))
      return {
        isValid: false,
        reason: `检测到并发创建的交易记录，冲突日期: ${conflictDates.join(', ')}`,
      }
    }

    return { isValid: true }
  }

  /**
   * 在事务内检查并发安全性（贷款还款）
   */
  static async checkLoanPaymentConcurrency(
    tx: PrismaTransaction,
    loanPaymentId: string
  ): Promise<ConcurrencyCheckResult> {
    // 在事务内重新检查还款记录状态
    const currentPayment = await tx.loanPayment.findUnique({
      where: { id: loanPaymentId },
      select: { status: true },
    })

    if (!currentPayment) {
      return {
        isValid: false,
        reason: '还款记录不存在',
      }
    }

    const status = (currentPayment as unknown as { status: string }).status
    if (status !== 'PENDING') {
      return {
        isValid: false,
        reason: '还款记录状态已变更，可能已被其他进程处理',
        currentStatus: status,
      }
    }

    return { isValid: true }
  }

  /**
   * 统一的并发检查入口
   */
  static async checkConcurrency(
    tx: PrismaTransaction,
    config: DuplicateCheckConfig,
    targetDates?: Date[]
  ): Promise<ConcurrencyCheckResult> {
    switch (config.type) {
      case CheckType.RECURRING_TRANSACTION:
        if (!config.recurringTransactionId || !targetDates) {
          throw new Error(
            '定期交易并发检查需要提供 recurringTransactionId 和 targetDates'
          )
        }
        return this.checkRecurringTransactionConcurrency(
          tx,
          config.recurringTransactionId,
          targetDates
        )
      case CheckType.LOAN_PAYMENT:
        if (!config.loanPaymentId) {
          throw new Error('贷款还款并发检查需要提供 loanPaymentId')
        }
        return this.checkLoanPaymentConcurrency(tx, config.loanPaymentId)
      default:
        throw new Error(`不支持的并发检查类型: ${config.type}`)
    }
  }

  /**
   * 过滤掉已存在的日期
   */
  static filterExistingDates<T extends { date: Date }>(
    items: T[],
    existingDates: Set<string>
  ): T[] {
    return items.filter(item => {
      const dateString = this.normalizeDate(item.date)
      return !existingDates.has(dateString)
    })
  }

  /**
   * 检查指定日期是否已存在
   */
  static isDateExists(date: Date, existingDates: Set<string>): boolean {
    const dateString = this.normalizeDate(date)
    return existingDates.has(dateString)
  }
}

/**
 * 时间相关业务逻辑验证器
 * 提供时间敏感的业务逻辑验证，包括日期计算、时间序列验证等
 */

import type { ValidationResult } from '@/types/core'
import { calculateLoanPaymentDateForPeriod } from '@/lib/utils/format'
import { prisma } from '@/lib/database/connection-manager'

// Using shared prisma instance from connection-manager

// ============================================================================
// 时间逻辑验证器类
// ============================================================================

export class TimeLogicValidator {
  /**
   * 验证用户所有时间相关业务逻辑
   */
  static async validateUserTimeLogic(
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 1. 验证交易日期逻辑
      const transactionValidation =
        await this.validateTransactionDateLogic(userId)
      errors.push(...transactionValidation.errors)
      warnings.push(...transactionValidation.warnings)
      suggestions.push(...transactionValidation.suggestions)

      // 2. 验证贷款还款日期计算
      const loanValidation = await this.validateLoanPaymentDateLogic(userId)
      errors.push(...loanValidation.errors)
      warnings.push(...loanValidation.warnings)
      suggestions.push(...loanValidation.suggestions)

      // 3. 验证定期交易时间计算
      const recurringValidation =
        await this.validateRecurringTransactionTimeLogic(userId)
      errors.push(...recurringValidation.errors)
      warnings.push(...recurringValidation.warnings)
      suggestions.push(...recurringValidation.suggestions)

      // 4. 验证汇率生效日期逻辑
      const exchangeRateValidation =
        await this.validateExchangeRateDateLogic(userId)
      errors.push(...exchangeRateValidation.errors)
      warnings.push(...exchangeRateValidation.warnings)
      suggestions.push(...exchangeRateValidation.suggestions)

      // 5. 验证时间序列一致性
      const timeSeriesValidation =
        await this.validateTimeSeriesConsistency(userId)
      errors.push(...timeSeriesValidation.errors)
      warnings.push(...timeSeriesValidation.warnings)
      suggestions.push(...timeSeriesValidation.suggestions)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score: this.calculateTimeLogicScore(errors.length, warnings.length),
        details: {
          accountsChecked: 0,
          transactionsChecked: 0,
          categoriesWithoutType: 0,
          invalidTransactions: 0,
          businessLogicViolations: warnings.length,
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['验证时间相关业务逻辑时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证交易日期逻辑
   */
  private static async validateTransactionDateLogic(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 1000, // 限制检查最近1000笔交易
      })

      const now = new Date()
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      )
      const oneMonthFromNow = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      )

      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.date)
        const createdDate = new Date(transaction.createdAt)

        // 验证交易日期不能晚于创建日期超过合理范围
        if (transactionDate > createdDate) {
          const daysDiff = Math.ceil(
            (transactionDate.getTime() - createdDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
          if (daysDiff > 7) {
            warnings.push(
              `交易"${transaction.description}"的交易日期比创建日期晚${daysDiff}天`
            )
          }
        }

        // 验证未来日期交易
        if (transactionDate > oneMonthFromNow) {
          warnings.push(
            `交易"${transaction.description}"的日期过于超前（${transactionDate.toLocaleDateString()}）`
          )
          suggestions.push('建议检查未来日期交易的合理性')
        }

        // 验证过于久远的交易
        if (transactionDate < oneYearAgo) {
          const yearsDiff = Math.floor(
            (now.getTime() - transactionDate.getTime()) /
              (1000 * 60 * 60 * 24 * 365)
          )
          if (yearsDiff > 5) {
            warnings.push(
              `交易"${transaction.description}"的日期过于久远（${yearsDiff}年前）`
            )
          }
        }

        // 验证日期格式和有效性
        if (isNaN(transactionDate.getTime())) {
          errors.push(`交易"${transaction.description}"的日期格式无效`)
        }

        // 验证时区一致性（检查是否有明显的时区问题）
        const hoursDiff = Math.abs(
          (transactionDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
        )
        if (hoursDiff > 24 && hoursDiff < 48) {
          // 可能的时区问题
          warnings.push(`交易"${transaction.description}"可能存在时区问题`)
        }
      }
    } catch {
      errors.push('验证交易日期逻辑时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证贷款还款日期计算
   */
  private static async validateLoanPaymentDateLogic(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const loanContracts = await prisma.loanContract.findMany({
        where: { userId },
        include: { payments: true },
      })

      for (const contract of loanContracts) {
        // 验证下次还款日期计算
        if (contract.isActive && contract.nextPaymentDate) {
          const expectedNextDate = calculateLoanPaymentDateForPeriod(
            contract.startDate,
            contract.currentPeriod + 1,
            contract.paymentDay
          )

          const actualNextDate = new Date(contract.nextPaymentDate)
          const daysDiff = Math.abs(
            (expectedNextDate.getTime() - actualNextDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )

          if (daysDiff > 1) {
            errors.push(
              `贷款合约"${contract.contractName}"的下次还款日期计算错误`
            )
          }
        }

        // 验证还款计划日期序列
        const sortedPayments = contract.payments.sort(
          (a, b) => a.period - b.period
        )
        for (let i = 0; i < sortedPayments.length; i++) {
          const payment = sortedPayments[i]
          const expectedDate = calculateLoanPaymentDateForPeriod(
            contract.startDate,
            payment.period,
            contract.paymentDay
          )

          if (payment.paymentDate) {
            const actualDate = new Date(payment.paymentDate)
            const daysDiff = Math.abs(
              (expectedDate.getTime() - actualDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )

            if (daysDiff > 1) {
              errors.push(
                `贷款合约"${contract.contractName}"第${payment.period}期还款日期计算错误`
              )
            }
          }

          // 验证还款日期的连续性
          if (i > 0) {
            const prevPayment = sortedPayments[i - 1]
            if (prevPayment.paymentDate && payment.paymentDate) {
              const prevDate = new Date(prevPayment.paymentDate)
              const currentDate = new Date(payment.paymentDate)
              const monthsDiff =
                (currentDate.getFullYear() - prevDate.getFullYear()) * 12 +
                (currentDate.getMonth() - prevDate.getMonth())

              if (monthsDiff !== 1) {
                warnings.push(
                  `贷款合约"${contract.contractName}"第${payment.period}期与前一期的间隔不是1个月`
                )
              }
            }
          }
        }

        // 验证还款日期的合理性
        if (contract.paymentDay > 28) {
          warnings.push(
            `贷款合约"${contract.contractName}"的还款日（${contract.paymentDay}号）可能在某些月份无效`
          )
          suggestions.push('建议将还款日设置在1-28号之间')
        }

        // 验证贷款期限与实际还款计划的一致性
        if (contract.payments.length > 0) {
          const lastPayment = contract.payments.reduce((latest, current) =>
            current.period > latest.period ? current : latest
          )

          if (lastPayment.period !== contract.totalPeriods) {
            warnings.push(
              `贷款合约"${contract.contractName}"的还款计划期数与总期数不一致`
            )
          }
        }
      }
    } catch {
      errors.push('验证贷款还款日期逻辑时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证定期交易时间计算
   */
  private static async validateRecurringTransactionTimeLogic(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const recurringTransactions = await prisma.recurringTransaction.findMany({
        where: { userId },
      })

      const now = new Date()

      for (const recurring of recurringTransactions) {
        // 验证下次执行日期的合理性
        const nextDate = new Date(recurring.nextDate)
        const startDate = new Date(recurring.startDate)

        if (nextDate < startDate) {
          errors.push(
            `定期交易"${recurring.description}"的下次执行日期早于开始日期`
          )
        }

        // 验证结束日期逻辑
        if (recurring.endDate) {
          const endDate = new Date(recurring.endDate)
          if (nextDate > endDate && recurring.isActive) {
            warnings.push(
              `定期交易"${recurring.description}"的下次执行日期超过结束日期但仍处于活跃状态`
            )
            suggestions.push('建议停用已过期的定期交易')
          }
        }

        // 验证执行次数逻辑
        if (
          recurring.maxOccurrences &&
          recurring.currentCount >= recurring.maxOccurrences
        ) {
          if (recurring.isActive) {
            warnings.push(
              `定期交易"${recurring.description}"已达到最大执行次数但仍处于活跃状态`
            )
          }
        }

        // 验证频率设置的时间逻辑
        if (recurring.frequency === 'MONTHLY' && recurring.dayOfMonth) {
          if (recurring.dayOfMonth > 28) {
            warnings.push(
              `定期交易"${recurring.description}"的月度执行日期可能在某些月份无效`
            )
          }
        }

        // 验证过期的定期交易
        if (recurring.isActive && nextDate < now) {
          const daysPast = Math.ceil(
            (now.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysPast > 7) {
            warnings.push(
              `定期交易"${recurring.description}"已过期${daysPast}天未执行`
            )
            suggestions.push('建议执行过期的定期交易或调整执行时间')
          }
        }

        // 验证时间间隔的合理性
        const intervalDays = this.getIntervalInDays(
          recurring.frequency,
          recurring.interval
        )
        if (intervalDays > 365) {
          warnings.push(
            `定期交易"${recurring.description}"的执行间隔超过1年，请确认是否合理`
          )
        }
      }
    } catch {
      errors.push('验证定期交易时间逻辑时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证汇率生效日期逻辑
   */
  private static async validateExchangeRateDateLogic(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const exchangeRates = await prisma.exchangeRate.findMany({
        where: { userId },
        orderBy: { effectiveDate: 'desc' },
      })

      const now = new Date()

      for (const rate of exchangeRates) {
        const effectiveDate = new Date(rate.effectiveDate)

        // 验证生效日期不能是未来
        if (effectiveDate > now) {
          errors.push(
            `汇率记录的生效日期不能是未来日期（${effectiveDate.toLocaleDateString()}）`
          )
        }

        // 验证API汇率的时效性
        if (rate.type === 'API') {
          const daysDiff = Math.ceil(
            (now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysDiff > 7) {
            warnings.push(`API汇率数据已过期${daysDiff}天，建议更新`)
          }
        }

        // 验证用户输入汇率的合理性
        if (rate.type === 'USER') {
          const daysDiff = Math.ceil(
            (now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysDiff > 30) {
            suggestions.push(
              '用户输入的汇率数据已超过30天，建议确认是否需要更新'
            )
          }
        }
      }

      // 验证同一货币对的汇率时间序列
      const currencyPairs = new Map<string, typeof exchangeRates>()
      for (const rate of exchangeRates) {
        const pairKey = `${rate.fromCurrencyId}-${rate.toCurrencyId}`
        if (!currencyPairs.has(pairKey)) {
          currencyPairs.set(pairKey, [])
        }
        currencyPairs.get(pairKey)!.push(rate)
      }

      for (const [pairKey, rates] of currencyPairs) {
        const sortedRates = rates.sort(
          (a, b) =>
            new Date(a.effectiveDate).getTime() -
            new Date(b.effectiveDate).getTime()
        )

        // 检查是否有重复日期的汇率
        for (let i = 1; i < sortedRates.length; i++) {
          const prevDate = new Date(sortedRates[i - 1].effectiveDate)
          const currentDate = new Date(sortedRates[i].effectiveDate)

          if (prevDate.toDateString() === currentDate.toDateString()) {
            warnings.push(
              `货币对${pairKey}在${currentDate.toLocaleDateString()}有重复的汇率记录`
            )
          }
        }
      }
    } catch {
      errors.push('验证汇率生效日期逻辑时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证时间序列一致性
   */
  private static async validateTimeSeriesConsistency(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 验证账户创建时间与首笔交易时间的一致性
      const accounts = await prisma.account.findMany({
        where: { userId },
        include: {
          transactions: {
            orderBy: { date: 'asc' },
            take: 1,
          },
        },
      })

      for (const account of accounts) {
        if (account.transactions.length > 0) {
          const firstTransaction = account.transactions[0]
          const accountCreated = new Date(account.createdAt)
          const firstTransactionDate = new Date(firstTransaction.date)

          if (firstTransactionDate < accountCreated) {
            const daysDiff = Math.ceil(
              (accountCreated.getTime() - firstTransactionDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
            if (daysDiff > 1) {
              warnings.push(
                `账户"${account.name}"的首笔交易日期早于账户创建日期${daysDiff}天`
              )
            }
          }
        }
      }

      // 验证用户设置更新时间的一致性
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      if (userSettings) {
        const settingsUpdated = new Date(userSettings.updatedAt)
        const now = new Date()
        const daysDiff = Math.ceil(
          (now.getTime() - settingsUpdated.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysDiff > 365) {
          suggestions.push('用户设置超过1年未更新，建议检查设置是否需要调整')
        }
      }
    } catch {
      errors.push('验证时间序列一致性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 获取间隔天数
   */
  private static getIntervalInDays(
    frequency: string,
    interval: number
  ): number {
    switch (frequency) {
      case 'DAILY':
        return interval
      case 'WEEKLY':
        return interval * 7
      case 'MONTHLY':
        return interval * 30
      case 'QUARTERLY':
        return interval * 90
      case 'YEARLY':
        return interval * 365
      default:
        return 0
    }
  }

  /**
   * 计算时间逻辑评分
   */
  private static calculateTimeLogicScore(
    errorCount: number,
    warningCount: number
  ): number {
    let score = 100
    score -= errorCount * 12 // 每个错误扣12分
    score -= warningCount * 2 // 每个警告扣2分
    return Math.max(0, score)
  }
}

// ============================================================================
// 导出验证函数
// ============================================================================

export const validateTimeLogic = TimeLogicValidator.validateUserTimeLogic

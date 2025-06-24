/**
 * 跨模块数据一致性验证器
 * 提供跨功能模块的数据一致性检查和关联数据完整性验证
 */

import { PrismaClient } from '@prisma/client'
import {
  AccountType,
  TransactionType,
  convertPrismaTransactionType,
  convertPrismaAccountType,
} from '@/types/core/constants'
import type { ValidationResult } from '@/types/core'

const prisma = new PrismaClient()

// ============================================================================
// 数据一致性验证器类
// ============================================================================

export class DataConsistencyValidator {
  /**
   * 验证用户所有数据的一致性
   */
  static async validateUserDataConsistency(
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 1. 账户余额一致性检查
      const balanceValidation =
        await this.validateAccountBalanceConsistency(userId)
      errors.push(...balanceValidation.errors)
      warnings.push(...balanceValidation.warnings)
      suggestions.push(...balanceValidation.suggestions)

      // 2. 贷款合约数据一致性检查
      const loanValidation = await this.validateLoanContractConsistency(userId)
      errors.push(...loanValidation.errors)
      warnings.push(...loanValidation.warnings)
      suggestions.push(...loanValidation.suggestions)

      // 3. 定期交易数据一致性检查
      const recurringValidation =
        await this.validateRecurringTransactionConsistency(userId)
      errors.push(...recurringValidation.errors)
      warnings.push(...recurringValidation.warnings)
      suggestions.push(...recurringValidation.suggestions)

      // 4. 交易记录完整性检查
      const transactionValidation =
        await this.validateTransactionIntegrity(userId)
      errors.push(...transactionValidation.errors)
      warnings.push(...transactionValidation.warnings)
      suggestions.push(...transactionValidation.suggestions)

      // 5. 货币和汇率一致性检查
      const currencyValidation = await this.validateCurrencyConsistency(userId)
      errors.push(...currencyValidation.errors)
      warnings.push(...currencyValidation.warnings)
      suggestions.push(...currencyValidation.suggestions)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score: this.calculateConsistencyScore(errors.length, warnings.length),
        details: {
          accountsChecked: 0, // 将在具体验证中计算
          transactionsChecked: 0,
          categoriesWithoutType: 0,
          invalidTransactions: 0,
          businessLogicViolations: warnings.length,
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['验证数据一致性时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证账户余额一致性
   */
  private static async validateAccountBalanceConsistency(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const accounts = await prisma.account.findMany({
        where: { userId },
        include: {
          category: true,
          transactions: {
            orderBy: { date: 'desc' },
          },
        },
      })

      for (const account of accounts) {
        // 存量类账户余额检查
        if (
          account.category.type === AccountType.ASSET ||
          account.category.type === AccountType.LIABILITY
        ) {
          const balanceTransactions = account.transactions.filter(
            t => t.type === TransactionType.BALANCE
          )

          if (
            balanceTransactions.length === 0 &&
            account.transactions.length > 0
          ) {
            warnings.push(
              `存量类账户"${account.name}"缺少余额调整交易，可能导致余额不准确`
            )
            suggestions.push(
              `建议为账户"${account.name}"添加余额调整交易或使用余额更新功能`
            )
          }

          // 检查是否有非余额调整交易
          const nonBalanceTransactions = account.transactions.filter(
            t => t.type !== TransactionType.BALANCE
          )

          if (nonBalanceTransactions.length > 0) {
            warnings.push(
              `存量类账户"${account.name}"包含${nonBalanceTransactions.length}笔非余额调整交易`
            )
            suggestions.push(
              `建议将存量类账户"${account.name}"的普通交易转换为余额调整交易`
            )
          }
        }

        // 流量类账户检查
        if (
          account.category.type === AccountType.INCOME ||
          account.category.type === AccountType.EXPENSE
        ) {
          const balanceTransactions = account.transactions.filter(
            t => t.type === TransactionType.BALANCE
          )

          if (balanceTransactions.length > 0) {
            errors.push(`流量类账户"${account.name}"不应该包含余额调整交易`)
          }

          // 检查交易类型匹配
          const mismatchedTransactions = account.transactions.filter(t => {
            if (account.category.type === AccountType.INCOME) {
              return t.type !== TransactionType.INCOME
            }
            if (account.category.type === AccountType.EXPENSE) {
              return t.type !== TransactionType.EXPENSE
            }
            return false
          })

          if (mismatchedTransactions.length > 0) {
            errors.push(
              `流量类账户"${account.name}"包含${mismatchedTransactions.length}笔类型不匹配的交易`
            )
          }
        }
      }
    } catch {
      errors.push('验证账户余额一致性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证贷款合约数据一致性
   */
  private static async validateLoanContractConsistency(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const loanContracts = await prisma.loanContract.findMany({
        where: { userId },
        include: {
          account: { include: { category: true } },
          payments: {
            include: {
              principalTransaction: true,
              interestTransaction: true,
              balanceTransaction: true,
            },
          },
          transactions: true,
        },
      })

      for (const contract of loanContracts) {
        // 验证贷款账户类型
        if (contract.account.category.type !== AccountType.LIABILITY) {
          errors.push(
            `贷款合约"${contract.contractName}"关联的账户不是负债类型`
          )
        }

        // 验证还款记录与交易记录的一致性
        for (const payment of contract.payments) {
          if (payment.status === 'COMPLETED') {
            // 检查是否有对应的交易记录
            if (
              !payment.principalTransactionId &&
              !payment.interestTransactionId
            ) {
              errors.push(
                `贷款合约"${contract.contractName}"第${payment.period}期已完成但缺少交易记录`
              )
            }

            // 验证交易金额与还款金额的一致性
            if (payment.principalTransaction) {
              const amountDiff = Math.abs(
                Number(payment.principalAmount) -
                  Number(payment.principalTransaction.amount)
              )
              if (amountDiff > 0.01) {
                errors.push(
                  `贷款合约"${contract.contractName}"第${payment.period}期本金金额不一致`
                )
              }
            }

            if (payment.interestTransaction) {
              const amountDiff = Math.abs(
                Number(payment.interestAmount) -
                  Number(payment.interestTransaction.amount)
              )
              if (amountDiff > 0.01) {
                errors.push(
                  `贷款合约"${contract.contractName}"第${payment.period}期利息金额不一致`
                )
              }
            }
          }
        }

        // 验证当前期数与还款记录的一致性
        const completedPayments = contract.payments.filter(
          p => p.status === 'COMPLETED'
        )
        if (contract.currentPeriod !== completedPayments.length) {
          warnings.push(
            `贷款合约"${contract.contractName}"当前期数与已完成还款期数不一致`
          )
        }

        // 验证下次还款日期
        if (
          contract.isActive &&
          contract.currentPeriod < contract.totalPeriods
        ) {
          if (!contract.nextPaymentDate) {
            errors.push(
              `活跃贷款合约"${contract.contractName}"缺少下次还款日期`
            )
          }
        }
      }
    } catch {
      errors.push('验证贷款合约数据一致性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证定期交易数据一致性
   */
  private static async validateRecurringTransactionConsistency(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const recurringTransactions = await prisma.recurringTransaction.findMany({
        where: { userId },
        include: {
          account: { include: { category: true } },
        },
      })

      for (const recurring of recurringTransactions) {
        // 验证交易类型与账户类型的匹配
        const accountType = recurring.account.category.type
        if (
          (accountType === AccountType.INCOME &&
            recurring.type !== TransactionType.INCOME) ||
          (accountType === AccountType.EXPENSE &&
            recurring.type !== TransactionType.EXPENSE)
        ) {
          errors.push(
            `定期交易"${recurring.description}"的类型与账户类型不匹配`
          )
        }

        // 验证下次执行日期
        if (recurring.isActive) {
          const now = new Date()
          if (recurring.nextDate < now) {
            warnings.push(
              `定期交易"${recurring.description}"的下次执行日期已过期`
            )
            suggestions.push('建议执行过期的定期交易或更新执行时间')
          }

          // 验证结束日期
          if (recurring.endDate && recurring.nextDate > recurring.endDate) {
            warnings.push(
              `定期交易"${recurring.description}"的下次执行日期超过结束日期`
            )
          }

          // 验证最大执行次数
          if (
            recurring.maxOccurrences &&
            recurring.currentCount >= recurring.maxOccurrences
          ) {
            warnings.push(
              `定期交易"${recurring.description}"已达到最大执行次数但仍处于活跃状态`
            )
          }
        }

        // 验证频率设置的合理性
        if (
          recurring.frequency === 'MONTHLY' &&
          recurring.dayOfMonth &&
          recurring.dayOfMonth > 28
        ) {
          warnings.push(
            `定期交易"${recurring.description}"的月度执行日期可能在某些月份无效`
          )
        }
      }

      // 检查是否有生成的交易记录
      const generatedTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          recurringTransactionId: { not: null },
        },
      })

      const recurringIds = recurringTransactions.map(r => r.id)
      const orphanedTransactions = generatedTransactions.filter(
        t =>
          t.recurringTransactionId &&
          !recurringIds.includes(t.recurringTransactionId)
      )

      if (orphanedTransactions.length > 0) {
        warnings.push(
          `发现${orphanedTransactions.length}笔交易关联的定期交易已不存在`
        )
      }
    } catch {
      errors.push('验证定期交易数据一致性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证交易记录完整性
   */
  private static async validateTransactionIntegrity(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: {
          account: { include: { category: true } },
          category: true,
          currency: true,
          tags: { include: { tag: true } },
        },
      })

      for (const transaction of transactions) {
        // 验证必要关联
        if (!transaction.account) {
          errors.push(`交易"${transaction.description}"缺少关联账户`)
        }
        if (!transaction.category) {
          errors.push(`交易"${transaction.description}"缺少关联分类`)
        }
        if (!transaction.currency) {
          errors.push(`交易"${transaction.description}"缺少关联货币`)
        }

        // 验证金额有效性
        if (Number(transaction.amount) <= 0) {
          errors.push(`交易"${transaction.description}"金额无效`)
        }

        // 验证日期合理性
        const transactionDate = new Date(transaction.date)
        const createdDate = new Date(transaction.createdAt)
        if (transactionDate > createdDate) {
          const daysDiff = Math.ceil(
            (transactionDate.getTime() - createdDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
          if (daysDiff > 30) {
            warnings.push(
              `交易"${transaction.description}"的交易日期比创建日期晚${daysDiff}天`
            )
          }
        }

        // 验证交易类型与账户类型的匹配
        if (transaction.account && transaction.account.category) {
          const accountType = transaction.account.category.type
          const transactionType = transaction.type

          const isValidCombination = this.validateTransactionAccountTypeMatch(
            convertPrismaTransactionType(transactionType),
            convertPrismaAccountType(accountType)
          )

          if (!isValidCombination) {
            errors.push(
              `交易"${transaction.description}"的类型与账户类型不匹配`
            )
          }
        }
      }

      // 检查孤立的标签关联
      const transactionTags = await prisma.transactionTag.findMany({
        where: {
          transaction: { userId },
        },
        include: {
          transaction: true,
          tag: true,
        },
      })

      const orphanedTags = transactionTags.filter(
        tt => !tt.transaction || !tt.tag
      )

      if (orphanedTags.length > 0) {
        warnings.push(`发现${orphanedTags.length}个孤立的交易标签关联`)
      }
    } catch {
      errors.push('验证交易记录完整性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证货币和汇率一致性
   */
  private static async validateCurrencyConsistency(
    userId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 获取用户设置的基础货币
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: { baseCurrency: true },
      })

      if (!userSettings?.baseCurrency) {
        warnings.push('未设置基础货币，可能影响汇率转换')
        suggestions.push('建议在用户设置中指定基础货币')
        return { errors, warnings, suggestions }
      }

      // 检查所有使用的货币是否都有到基础货币的汇率
      const [usedCurrencies, exchangeRates] = await Promise.all([
        prisma.currency.findMany({
          where: {
            OR: [
              { accounts: { some: { userId } } },
              { transactions: { some: { userId } } },
            ],
          },
        }),
        prisma.exchangeRate.findMany({
          where: { userId },
        }),
      ])

      const baseCurrencyId = userSettings.baseCurrency.id
      const otherCurrencies = usedCurrencies.filter(
        c => c.id !== baseCurrencyId
      )

      for (const currency of otherCurrencies) {
        const hasRateToBase = exchangeRates.some(
          rate =>
            (rate.fromCurrencyId === currency.id &&
              rate.toCurrencyId === baseCurrencyId) ||
            (rate.fromCurrencyId === baseCurrencyId &&
              rate.toCurrencyId === currency.id)
        )

        if (!hasRateToBase) {
          warnings.push(
            `货币"${currency.code}"缺少与基础货币的汇率，可能影响金额转换`
          )
        }
      }

      // 检查汇率数据的时效性
      const now = new Date()
      const outdatedRates = exchangeRates.filter(rate => {
        const daysDiff = Math.ceil(
          (now.getTime() - rate.effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        return rate.type === 'API' && daysDiff > 7
      })

      if (outdatedRates.length > 0) {
        warnings.push(`${outdatedRates.length}个API汇率数据已过期`)
        suggestions.push('建议更新过期的汇率数据')
      }
    } catch {
      errors.push('验证货币和汇率一致性时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证交易类型与账户类型的匹配
   */
  private static validateTransactionAccountTypeMatch(
    transactionType: TransactionType,
    accountType: AccountType
  ): boolean {
    switch (accountType) {
      case AccountType.ASSET:
      case AccountType.LIABILITY:
        return transactionType === TransactionType.BALANCE
      case AccountType.INCOME:
        return transactionType === TransactionType.INCOME
      case AccountType.EXPENSE:
        return transactionType === TransactionType.EXPENSE
      default:
        return false
    }
  }

  /**
   * 计算一致性评分
   */
  private static calculateConsistencyScore(
    errorCount: number,
    warningCount: number
  ): number {
    let score = 100
    score -= errorCount * 10 // 每个错误扣10分
    score -= warningCount * 2 // 每个警告扣2分
    return Math.max(0, score)
  }
}

// ============================================================================
// 导出验证函数
// ============================================================================

export const validateDataConsistency =
  DataConsistencyValidator.validateUserDataConsistency

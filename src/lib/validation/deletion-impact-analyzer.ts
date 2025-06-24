/**
 * 数据删除影响分析器
 * 分析数据删除操作对系统其他部分的影响，提供删除前的风险评估
 */

import { PrismaClient } from '@prisma/client'
import type { ValidationResult } from '@/types/core'

const prisma = new PrismaClient()

// ============================================================================
// 删除影响分析结果接口
// ============================================================================

interface DeletionImpactResult extends ValidationResult {
  impactSummary: {
    affectedTables: string[]
    affectedRecords: number
    criticalDependencies: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  recommendations: {
    canDelete: boolean
    requiresBackup: boolean
    alternativeActions: string[]
    deletionSteps: string[]
  }
}

// ============================================================================
// 数据删除影响分析器类
// ============================================================================

export class DeletionImpactAnalyzer {
  /**
   * 分析用户删除的影响
   */
  static async analyzeUserDeletionImpact(
    userId: string
  ): Promise<DeletionImpactResult> {
    const errors: string[] = []
    const warnings: string[] = []

    const affectedTables: string[] = []
    const criticalDependencies: string[] = []
    let affectedRecords = 0

    try {
      // 统计用户相关数据
      const [
        accountsCount,
        transactionsCount,
        categoriesCount,
        tagsCount,
        exchangeRatesCount,
        loanContractsCount,
        recurringTransactionsCount,
        customCurrenciesCount,
      ] = await Promise.all([
        prisma.account.count({ where: { userId } }),
        prisma.transaction.count({ where: { userId } }),
        prisma.category.count({ where: { userId } }),
        prisma.tag.count({ where: { userId } }),
        prisma.exchangeRate.count({ where: { userId } }),
        prisma.loanContract.count({ where: { userId } }),
        prisma.recurringTransaction.count({ where: { userId } }),
        prisma.currency.count({ where: { createdBy: userId } }),
      ])

      affectedRecords =
        accountsCount +
        transactionsCount +
        categoriesCount +
        tagsCount +
        exchangeRatesCount +
        loanContractsCount +
        recurringTransactionsCount +
        customCurrenciesCount

      // 分析各表的影响
      if (accountsCount > 0) {
        affectedTables.push('accounts')
        if (accountsCount > 10) {
          warnings.push(`将删除${accountsCount}个账户`)
        }
      }

      if (transactionsCount > 0) {
        affectedTables.push('transactions')
        if (transactionsCount > 100) {
          warnings.push(`将删除${transactionsCount}笔交易记录`)
          criticalDependencies.push('大量交易数据')
        }
      }

      if (loanContractsCount > 0) {
        affectedTables.push('loan_contracts', 'loan_payments')
        criticalDependencies.push('贷款合约和还款记录')
        warnings.push(`将删除${loanContractsCount}个贷款合约及相关还款记录`)
      }

      if (recurringTransactionsCount > 0) {
        affectedTables.push('recurring_transactions')
        warnings.push(`将删除${recurringTransactionsCount}个定期交易设置`)
      }

      if (customCurrenciesCount > 0) {
        affectedTables.push('currencies')
        criticalDependencies.push('自定义货币')
        warnings.push(`将删除${customCurrenciesCount}个自定义货币`)
      }

      if (exchangeRatesCount > 0) {
        affectedTables.push('exchange_rates')
        warnings.push(`将删除${exchangeRatesCount}个汇率记录`)
      }

      // 检查是否有其他用户使用了该用户创建的货币
      if (customCurrenciesCount > 0) {
        const currenciesInUse = await prisma.currency.findMany({
          where: { createdBy: userId },
          include: {
            accounts: { where: { userId: { not: userId } } },
            transactions: { where: { userId: { not: userId } } },
          },
        })

        const currenciesUsedByOthers = currenciesInUse.filter(
          c => c.accounts.length > 0 || c.transactions.length > 0
        )

        if (currenciesUsedByOthers.length > 0) {
          errors.push(
            `${currenciesUsedByOthers.length}个自定义货币正被其他用户使用，无法删除`
          )
          criticalDependencies.push('其他用户依赖的货币')
        }
      }

      const riskLevel = this.calculateRiskLevel(
        affectedRecords,
        criticalDependencies.length,
        errors.length
      )

      const canDelete = errors.length === 0
      const requiresBackup =
        affectedRecords > 50 || criticalDependencies.length > 0

      return {
        isValid: canDelete,
        errors,
        warnings,
        suggestions: [
          '删除用户将永久删除所有相关数据',
          '建议在删除前导出重要数据',
          '确认用户确实需要被删除',
        ],
        score: canDelete ? 100 : 0,
        impactSummary: {
          affectedTables,
          affectedRecords,
          criticalDependencies,
          riskLevel,
        },
        recommendations: {
          canDelete,
          requiresBackup,
          alternativeActions: canDelete ? [] : ['修复依赖关系后再删除'],
          deletionSteps: this.generateDeletionSteps(affectedTables),
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['分析用户删除影响时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
        impactSummary: {
          affectedTables: [],
          affectedRecords: 0,
          criticalDependencies: [],
          riskLevel: 'CRITICAL',
        },
        recommendations: {
          canDelete: false,
          requiresBackup: true,
          alternativeActions: ['请联系系统管理员'],
          deletionSteps: [],
        },
      }
    }
  }

  /**
   * 分析账户删除的影响
   */
  static async analyzeAccountDeletionImpact(
    userId: string,
    accountId: string
  ): Promise<DeletionImpactResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    const affectedTables: string[] = []
    const criticalDependencies: string[] = []

    try {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
        include: {
          transactions: true,
          loanContracts: true,
          paymentLoanContracts: true,
          recurringTransactions: true,
        },
      })

      if (!account) {
        return {
          isValid: false,
          errors: ['账户不存在'],
          warnings: [],
          suggestions: [],
          score: 0,
          impactSummary: {
            affectedTables: [],
            affectedRecords: 0,
            criticalDependencies: [],
            riskLevel: 'CRITICAL',
          },
          recommendations: {
            canDelete: false,
            requiresBackup: false,
            alternativeActions: [],
            deletionSteps: [],
          },
        }
      }

      let affectedRecords = 1 // 账户本身

      // 检查交易记录
      if (account.transactions.length > 0) {
        affectedTables.push('transactions')
        affectedRecords += account.transactions.length
        warnings.push(`将删除${account.transactions.length}笔交易记录`)

        if (account.transactions.length > 50) {
          criticalDependencies.push('大量交易数据')
        }
      }

      // 检查贷款合约
      if (account.loanContracts.length > 0) {
        affectedTables.push('loan_contracts', 'loan_payments')
        criticalDependencies.push('贷款合约')
        errors.push(
          `账户关联${account.loanContracts.length}个贷款合约，无法删除`
        )
        suggestions.push('请先删除或转移贷款合约')
      }

      // 检查作为还款账户的贷款合约
      if (account.paymentLoanContracts.length > 0) {
        criticalDependencies.push('还款账户关联')
        errors.push(
          `账户被${account.paymentLoanContracts.length}个贷款合约用作还款账户`
        )
        suggestions.push('请先更改贷款合约的还款账户设置')
      }

      // 检查定期交易
      if (account.recurringTransactions.length > 0) {
        affectedTables.push('recurring_transactions')
        warnings.push(
          `将删除${account.recurringTransactions.length}个定期交易设置`
        )
        suggestions.push('考虑将定期交易转移到其他账户')
      }

      const riskLevel = this.calculateRiskLevel(
        affectedRecords,
        criticalDependencies.length,
        errors.length
      )

      const canDelete = errors.length === 0
      const requiresBackup = account.transactions.length > 10

      return {
        isValid: canDelete,
        errors,
        warnings,
        suggestions,
        score: canDelete ? 90 : 0,
        impactSummary: {
          affectedTables,
          affectedRecords,
          criticalDependencies,
          riskLevel,
        },
        recommendations: {
          canDelete,
          requiresBackup,
          alternativeActions: canDelete ? [] : ['解除关联后再删除'],
          deletionSteps: canDelete
            ? ['删除定期交易设置', '删除交易记录', '删除账户']
            : [],
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['分析账户删除影响时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
        impactSummary: {
          affectedTables: [],
          affectedRecords: 0,
          criticalDependencies: [],
          riskLevel: 'CRITICAL',
        },
        recommendations: {
          canDelete: false,
          requiresBackup: true,
          alternativeActions: ['请联系系统管理员'],
          deletionSteps: [],
        },
      }
    }
  }

  /**
   * 分析分类删除的影响
   */
  static async analyzeCategoryDeletionImpact(
    userId: string,
    categoryId: string
  ): Promise<DeletionImpactResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    const criticalDependencies: string[] = []

    try {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
        include: {
          children: true,
          accounts: true,
          transactions: true,
        },
      })

      if (!category) {
        return {
          isValid: false,
          errors: ['分类不存在'],
          warnings: [],
          suggestions: [],
          score: 0,
          impactSummary: {
            affectedTables: [],
            affectedRecords: 0,
            criticalDependencies: [],
            riskLevel: 'CRITICAL',
          },
          recommendations: {
            canDelete: false,
            requiresBackup: false,
            alternativeActions: [],
            deletionSteps: [],
          },
        }
      }

      const affectedRecords = 1 // 分类本身

      // 检查子分类
      if (category.children.length > 0) {
        errors.push(`分类包含${category.children.length}个子分类，无法删除`)
        suggestions.push('请先删除或移动子分类')
        criticalDependencies.push('子分类')
      }

      // 检查关联账户
      if (category.accounts.length > 0) {
        errors.push(`分类被${category.accounts.length}个账户使用，无法删除`)
        suggestions.push('请先将账户移动到其他分类')
        criticalDependencies.push('关联账户')
      }

      // 检查关联交易
      if (category.transactions.length > 0) {
        errors.push(`分类被${category.transactions.length}笔交易使用，无法删除`)
        suggestions.push('请先将交易移动到其他分类')
        criticalDependencies.push('关联交易')
      }

      const riskLevel = this.calculateRiskLevel(
        affectedRecords,
        criticalDependencies.length,
        errors.length
      )

      const canDelete = errors.length === 0

      return {
        isValid: canDelete,
        errors,
        warnings,
        suggestions,
        score: canDelete ? 100 : 0,
        impactSummary: {
          affectedTables: canDelete ? ['categories'] : [],
          affectedRecords,
          criticalDependencies,
          riskLevel,
        },
        recommendations: {
          canDelete,
          requiresBackup: false,
          alternativeActions: canDelete ? [] : ['移除所有关联后再删除'],
          deletionSteps: canDelete ? ['删除分类'] : [],
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['分析分类删除影响时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
        impactSummary: {
          affectedTables: [],
          affectedRecords: 0,
          criticalDependencies: [],
          riskLevel: 'CRITICAL',
        },
        recommendations: {
          canDelete: false,
          requiresBackup: true,
          alternativeActions: ['请联系系统管理员'],
          deletionSteps: [],
        },
      }
    }
  }

  /**
   * 分析货币删除的影响
   */
  static async analyzeCurrencyDeletionImpact(
    userId: string,
    currencyId: string
  ): Promise<DeletionImpactResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    const affectedTables: string[] = []
    const criticalDependencies: string[] = []

    try {
      const currency = await prisma.currency.findFirst({
        where: { id: currencyId, createdBy: userId },
        include: {
          accounts: true,
          transactions: true,
          fromExchangeRates: true,
          toExchangeRates: true,
          userSettings: true,
        },
      })

      if (!currency) {
        return {
          isValid: false,
          errors: ['货币不存在或无权删除'],
          warnings: [],
          suggestions: [],
          score: 0,
          impactSummary: {
            affectedTables: [],
            affectedRecords: 0,
            criticalDependencies: [],
            riskLevel: 'CRITICAL',
          },
          recommendations: {
            canDelete: false,
            requiresBackup: false,
            alternativeActions: [],
            deletionSteps: [],
          },
        }
      }

      let affectedRecords = 1 // 货币本身

      // 检查是否被设为基础货币
      if (currency.userSettings.length > 0) {
        errors.push('货币被设置为基础货币，无法删除')
        suggestions.push('请先更改基础货币设置')
        criticalDependencies.push('基础货币设置')
      }

      // 检查关联账户
      if (currency.accounts.length > 0) {
        errors.push(`货币被${currency.accounts.length}个账户使用，无法删除`)
        suggestions.push('请先将账户的货币更改为其他货币')
        criticalDependencies.push('关联账户')
      }

      // 检查关联交易
      if (currency.transactions.length > 0) {
        errors.push(`货币被${currency.transactions.length}笔交易使用，无法删除`)
        criticalDependencies.push('关联交易')
      }

      // 检查汇率记录
      const totalExchangeRates =
        currency.fromExchangeRates.length + currency.toExchangeRates.length
      if (totalExchangeRates > 0) {
        affectedTables.push('exchange_rates')
        affectedRecords += totalExchangeRates
        warnings.push(`将删除${totalExchangeRates}个汇率记录`)
      }

      const riskLevel = this.calculateRiskLevel(
        affectedRecords,
        criticalDependencies.length,
        errors.length
      )

      const canDelete = errors.length === 0

      return {
        isValid: canDelete,
        errors,
        warnings,
        suggestions,
        score: canDelete ? 90 : 0,
        impactSummary: {
          affectedTables: canDelete ? ['currencies', 'exchange_rates'] : [],
          affectedRecords,
          criticalDependencies,
          riskLevel,
        },
        recommendations: {
          canDelete,
          requiresBackup: totalExchangeRates > 0,
          alternativeActions: canDelete ? [] : ['移除所有关联后再删除'],
          deletionSteps: canDelete ? ['删除相关汇率记录', '删除货币'] : [],
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['分析货币删除影响时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
        impactSummary: {
          affectedTables: [],
          affectedRecords: 0,
          criticalDependencies: [],
          riskLevel: 'CRITICAL',
        },
        recommendations: {
          canDelete: false,
          requiresBackup: true,
          alternativeActions: ['请联系系统管理员'],
          deletionSteps: [],
        },
      }
    }
  }

  /**
   * 计算风险等级
   */
  private static calculateRiskLevel(
    affectedRecords: number,
    criticalDependencies: number,
    errorCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (errorCount > 0) return 'CRITICAL'
    if (criticalDependencies > 2 || affectedRecords > 1000) return 'HIGH'
    if (criticalDependencies > 0 || affectedRecords > 100) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * 生成删除步骤
   */
  private static generateDeletionSteps(affectedTables: string[]): string[] {
    const steps: string[] = []

    // 按依赖关系排序删除步骤
    const tableOrder = [
      'loan_payments',
      'loan_contracts',
      'recurring_transactions',
      'transaction_tags',
      'transactions',
      'accounts',
      'exchange_rates',
      'categories',
      'tags',
      'currencies',
      'user_settings',
      'users',
    ]

    for (const table of tableOrder) {
      if (affectedTables.includes(table)) {
        steps.push(`删除${table}表中的相关记录`)
      }
    }

    return steps
  }
}

// ============================================================================
// 导出分析函数
// ============================================================================

export const analyzeUserDeletionImpact =
  DeletionImpactAnalyzer.analyzeUserDeletionImpact
export const analyzeAccountDeletionImpact =
  DeletionImpactAnalyzer.analyzeAccountDeletionImpact
export const analyzeCategoryDeletionImpact =
  DeletionImpactAnalyzer.analyzeCategoryDeletionImpact
export const analyzeCurrencyDeletionImpact =
  DeletionImpactAnalyzer.analyzeCurrencyDeletionImpact

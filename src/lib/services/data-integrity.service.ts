/**
 * 数据完整性检查服务
 * 提供数据导入导出过程中的完整性验证和修复功能
 */

import { prisma } from '@/lib/database/connection-manager'
import type { ExportedData } from '@/types/data-import'

export interface IntegrityCheckResult {
  isValid: boolean
  errors: IntegrityError[]
  warnings: IntegrityWarning[]
  suggestions: IntegritySuggestion[]
  statistics: IntegrityStatistics
}

export interface IntegrityError {
  type:
    | 'missing_reference'
    | 'invalid_data'
    | 'constraint_violation'
    | 'data_corruption'
  entity: string
  entityId: string
  field?: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface IntegrityWarning {
  type: 'data_inconsistency' | 'performance_issue' | 'deprecated_format'
  entity: string
  message: string
}

export interface IntegritySuggestion {
  type: 'optimization' | 'cleanup' | 'migration'
  message: string
  action?: string
}

export interface IntegrityStatistics {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  orphanedRecords: number
  duplicateRecords: number
  checkDuration: number
}

export class DataIntegrityService {
  /**
   * 检查导出数据的完整性
   */
  static async checkExportDataIntegrity(
    data: ExportedData
  ): Promise<IntegrityCheckResult> {
    const startTime = Date.now()
    const errors: IntegrityError[] = []
    const warnings: IntegrityWarning[] = []
    const suggestions: IntegritySuggestion[] = []

    try {
      // 1. 检查基本结构完整性
      this.checkBasicStructure(data, errors)

      // 2. 检查引用完整性
      this.checkReferenceIntegrity(data, errors, warnings)

      // 3. 检查数据一致性
      this.checkDataConsistency(data, warnings, suggestions)

      // 4. 检查业务逻辑完整性
      this.checkBusinessLogicIntegrity(data, errors, warnings)

      // 5. 检查数据格式和类型
      this.checkDataFormats(data, errors, warnings)

      const statistics = this.calculateStatistics(data, errors, startTime)

      return {
        isValid:
          errors.filter(e => e.severity === 'critical' || e.severity === 'high')
            .length === 0,
        errors,
        warnings,
        suggestions,
        statistics,
      }
    } catch (error) {
      errors.push({
        type: 'data_corruption',
        entity: 'export_data',
        entityId: 'unknown',
        message: `完整性检查过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'critical',
      })

      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        statistics: this.calculateStatistics(data, errors, startTime),
      }
    }
  }

  /**
   * 检查用户数据库数据的完整性
   */
  static async checkUserDataIntegrity(
    userId: string
  ): Promise<IntegrityCheckResult> {
    const startTime = Date.now()
    const errors: IntegrityError[] = []
    const warnings: IntegrityWarning[] = []
    const suggestions: IntegritySuggestion[] = []

    try {
      // 1. 检查账户数据完整性
      await this.checkAccountIntegrity(userId, errors, warnings)

      // 2. 检查交易数据完整性
      await this.checkTransactionIntegrity(userId, errors, warnings)

      // 3. 检查贷款数据完整性
      await this.checkLoanIntegrity(userId, errors, warnings)

      // 4. 检查定期交易完整性
      await this.checkRecurringTransactionIntegrity(userId, errors, warnings)

      // 5. 检查汇率数据完整性
      await this.checkExchangeRateIntegrity(userId, errors, warnings)

      // 6. 检查孤立数据
      await this.checkOrphanedData(userId, warnings, suggestions)

      const statistics = await this.calculateUserDataStatistics(
        userId,
        errors,
        startTime
      )

      return {
        isValid:
          errors.filter(e => e.severity === 'critical' || e.severity === 'high')
            .length === 0,
        errors,
        warnings,
        suggestions,
        statistics,
      }
    } catch (error) {
      errors.push({
        type: 'data_corruption',
        entity: 'user_data',
        entityId: userId,
        message: `用户数据完整性检查过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'critical',
      })

      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        statistics: await this.calculateUserDataStatistics(
          userId,
          errors,
          startTime
        ),
      }
    }
  }

  /**
   * 检查基本结构完整性
   */
  private static checkBasicStructure(
    data: ExportedData,
    errors: IntegrityError[]
  ): void {
    // 检查必需字段
    if (!data.exportInfo) {
      errors.push({
        type: 'missing_reference',
        entity: 'export_info',
        entityId: 'root',
        message: '缺少导出信息',
        severity: 'critical',
      })
    }

    if (!data.user) {
      errors.push({
        type: 'missing_reference',
        entity: 'user',
        entityId: 'root',
        message: '缺少用户信息',
        severity: 'critical',
      })
    }

    // 检查数组字段
    const arrayFields = [
      'categories',
      'accounts',
      'transactions',
      'tags',
      'userCurrencies',
      'customCurrencies',
      'exchangeRates',
      'transactionTemplates',
      'recurringTransactions',
      'loanContracts',
      'loanPayments',
    ]

    arrayFields.forEach(field => {
      if (!Array.isArray(data[field as keyof ExportedData])) {
        errors.push({
          type: 'invalid_data',
          entity: field,
          entityId: 'root',
          field,
          message: `${field} 应该是数组类型`,
          severity: 'high',
        })
      }
    })
  }

  /**
   * 检查引用完整性
   */
  private static checkReferenceIntegrity(
    data: ExportedData,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): void {
    // 创建ID映射表
    const categoryIds = new Set(data.categories.map(c => c.id))
    const accountIds = new Set(data.accounts.map(a => a.id))
    const currencyCodes = new Set([
      ...data.userCurrencies.map(uc => uc.currencyCode),
      ...data.customCurrencies.map(cc => cc.code),
    ])
    const tagIds = new Set(data.tags.map(t => t.id))

    // 检查账户引用
    data.accounts.forEach(account => {
      if (!categoryIds.has(account.categoryId)) {
        errors.push({
          type: 'missing_reference',
          entity: 'account',
          entityId: account.id,
          field: 'categoryId',
          message: `账户 "${account.name}" 引用了不存在的分类 ID: ${account.categoryId}`,
          severity: 'high',
        })
      }

      if (!currencyCodes.has(account.currencyCode)) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'account',
          message: `账户 "${account.name}" 使用了未定义的货币: ${account.currencyCode}`,
        })
      }
    })

    // 检查交易引用
    data.transactions.forEach(transaction => {
      if (!accountIds.has(transaction.accountId)) {
        errors.push({
          type: 'missing_reference',
          entity: 'transaction',
          entityId: transaction.id,
          field: 'accountId',
          message: `交易 "${transaction.description}" 引用了不存在的账户 ID: ${transaction.accountId}`,
          severity: 'high',
        })
      }

      if (!currencyCodes.has(transaction.currencyCode)) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'transaction',
          message: `交易 "${transaction.description}" 使用了未定义的货币: ${transaction.currencyCode}`,
        })
      }

      // 检查标签引用
      transaction.tags?.forEach(tag => {
        if (!tagIds.has(tag.id)) {
          warnings.push({
            type: 'data_inconsistency',
            entity: 'transaction',
            message: `交易 "${transaction.description}" 引用了不存在的标签 ID: ${tag.id}`,
          })
        }
      })
    })
  }

  /**
   * 检查数据一致性
   */
  private static checkDataConsistency(
    data: ExportedData,
    warnings: IntegrityWarning[],
    suggestions: IntegritySuggestion[]
  ): void {
    // 检查重复名称
    const accountNames = data.accounts.map(a => a.name)
    const duplicateAccountNames = accountNames.filter(
      (name, index) => accountNames.indexOf(name) !== index
    )

    if (duplicateAccountNames.length > 0) {
      warnings.push({
        type: 'data_inconsistency',
        entity: 'account',
        message: `发现重复的账户名称: ${duplicateAccountNames.join(', ')}`,
      })

      suggestions.push({
        type: 'cleanup',
        message: '建议重命名重复的账户以避免混淆',
        action: 'rename_duplicate_accounts',
      })
    }

    // 检查分类层级结构
    const categoryMap = new Map(data.categories.map(c => [c.id, c]))
    data.categories.forEach(category => {
      if (category.parentId && !categoryMap.has(category.parentId)) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'category',
          message: `分类 "${category.name}" 的父分类不存在`,
        })
      }
    })

    // 检查数据量合理性
    if (data.transactions.length > 50000) {
      suggestions.push({
        type: 'optimization',
        message: '交易数据量较大，建议考虑数据归档或分批处理',
        action: 'archive_old_transactions',
      })
    }
  }

  /**
   * 检查业务逻辑完整性
   */
  private static checkBusinessLogicIntegrity(
    data: ExportedData,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): void {
    // 检查交易金额
    data.transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount)
      // BALANCE类型交易允许为0（如贷款还完时余额为0），其他类型必须大于0
      const isInvalidAmount =
        isNaN(amount) ||
        (transaction.type === 'BALANCE' ? amount < 0 : amount <= 0)
      if (isInvalidAmount) {
        errors.push({
          type: 'invalid_data',
          entity: 'transaction',
          entityId: transaction.id,
          field: 'amount',
          message: `交易 "${transaction.description}" 的金额无效: ${transaction.amount}`,
          severity: 'high',
        })
      }

      // 检查日期合理性
      const transactionDate = new Date(transaction.date)
      const now = new Date()
      if (transactionDate > now) {
        const daysDiff = Math.ceil(
          (transactionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysDiff > 365) {
          warnings.push({
            type: 'data_inconsistency',
            entity: 'transaction',
            message: `交易 "${transaction.description}" 的日期过于未来 (${daysDiff} 天后)`,
          })
        }
      }
    })

    // 检查贷款合约逻辑
    data.loanContracts.forEach(loan => {
      const principal = parseFloat(loan.loanAmount)
      const interestRate = parseFloat(loan.interestRate)

      if (principal <= 0) {
        errors.push({
          type: 'invalid_data',
          entity: 'loan_contract',
          entityId: loan.id,
          field: 'loanAmount',
          message: `贷款合约的本金金额无效: ${loan.loanAmount}`,
          severity: 'high',
        })
      }

      if (interestRate < 0 || interestRate > 100) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'loan_contract',
          message: `贷款合约的利率可能不合理: ${loan.interestRate}%`,
        })
      }

      // 检查开始日期是否有效
      const startDate = new Date(loan.startDate)
      if (isNaN(startDate.getTime())) {
        errors.push({
          type: 'invalid_data',
          entity: 'loan_contract',
          entityId: loan.id,
          field: 'startDate',
          message: `贷款合约的开始日期格式无效: ${loan.startDate}`,
          severity: 'high',
        })
      }
    })
  }

  /**
   * 检查数据格式和类型
   */
  private static checkDataFormats(
    data: ExportedData,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): void {
    // 检查日期格式
    const dateFields = [
      { entity: 'transaction', field: 'date', items: data.transactions },
      {
        entity: 'loan_contract',
        field: 'startDate',
        items: data.loanContracts,
      },
      { entity: 'loan_contract', field: 'endDate', items: data.loanContracts },
    ]

    dateFields.forEach(({ entity, field, items }) => {
      items.forEach((item: any) => {
        const dateValue = item[field]
        if (dateValue && isNaN(new Date(dateValue).getTime())) {
          errors.push({
            type: 'invalid_data',
            entity,
            entityId: item.id,
            field,
            message: `${entity} 的 ${field} 格式无效: ${dateValue}`,
            severity: 'medium',
          })
        }
      })
    })

    // 检查货币代码格式
    const currencyCodePattern = /^[A-Z]{3}$/
    data.userCurrencies.forEach(uc => {
      if (!currencyCodePattern.test(uc.currencyCode)) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'user_currency',
          message: `货币代码格式可能不标准: ${uc.currencyCode}`,
        })
      }
    })
  }

  /**
   * 检查账户数据完整性
   */
  private static async checkAccountIntegrity(
    userId: string,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): Promise<void> {
    // 检查账户是否有对应的分类和货币
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        category: true,
        currency: true,
        _count: {
          select: { transactions: true },
        },
      },
    })

    accounts.forEach(account => {
      if (!account.category) {
        errors.push({
          type: 'missing_reference',
          entity: 'account',
          entityId: account.id,
          field: 'categoryId',
          message: `账户 "${account.name}" 缺少关联的分类`,
          severity: 'high',
        })
      }

      if (!account.currency) {
        errors.push({
          type: 'missing_reference',
          entity: 'account',
          entityId: account.id,
          field: 'currencyId',
          message: `账户 "${account.name}" 缺少关联的货币`,
          severity: 'high',
        })
      }

      // 检查无交易的账户
      if (account._count.transactions === 0) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'account',
          message: `账户 "${account.name}" 没有任何交易记录`,
        })
      }
    })
  }

  /**
   * 检查交易数据完整性
   */
  private static async checkTransactionIntegrity(
    userId: string,
    errors: IntegrityError[],
    _warnings: IntegrityWarning[]
  ): Promise<void> {
    // 检查交易的关联数据
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        account: true,
        currency: true,
      },
    })

    transactions.forEach(transaction => {
      if (!transaction.account) {
        errors.push({
          type: 'missing_reference',
          entity: 'transaction',
          entityId: transaction.id,
          field: 'accountId',
          message: `交易 "${transaction.description}" 缺少关联的账户`,
          severity: 'high',
        })
      }

      if (!transaction.currency) {
        errors.push({
          type: 'missing_reference',
          entity: 'transaction',
          entityId: transaction.id,
          field: 'currencyId',
          message: `交易 "${transaction.description}" 缺少关联的货币`,
          severity: 'high',
        })
      }

      // 检查金额合理性
      if (Number(transaction.amount) <= 0) {
        errors.push({
          type: 'invalid_data',
          entity: 'transaction',
          entityId: transaction.id,
          field: 'amount',
          message: `交易 "${transaction.description}" 的金额无效`,
          severity: 'high',
        })
      }
    })
  }

  /**
   * 检查贷款数据完整性
   */
  private static async checkLoanIntegrity(
    userId: string,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): Promise<void> {
    const loanContracts = await prisma.loanContract.findMany({
      where: { userId },
      include: {
        account: true,
        paymentAccount: true,
        currency: true,
        payments: true,
      },
    })

    loanContracts.forEach(loan => {
      if (!loan.account) {
        errors.push({
          type: 'missing_reference',
          entity: 'loan_contract',
          entityId: loan.id,
          field: 'accountId',
          message: '贷款合约缺少关联的账户',
          severity: 'high',
        })
      }

      if (!loan.currency) {
        errors.push({
          type: 'missing_reference',
          entity: 'loan_contract',
          entityId: loan.id,
          field: 'currencyId',
          message: '贷款合约缺少关联的货币',
          severity: 'high',
        })
      }

      // 检查还款记录数量
      const expectedPayments = loan.totalPeriods
      const actualPayments = loan.payments.length
      if (actualPayments > expectedPayments) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'loan_contract',
          message: `贷款合约的还款记录数量 (${actualPayments}) 超过了总期数 (${expectedPayments})`,
        })
      }
    })
  }

  /**
   * 检查定期交易完整性
   */
  private static async checkRecurringTransactionIntegrity(
    userId: string,
    errors: IntegrityError[],
    _warnings: IntegrityWarning[]
  ): Promise<void> {
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        account: true,
        currency: true,
      },
    })

    recurringTransactions.forEach(rt => {
      if (!rt.account) {
        errors.push({
          type: 'missing_reference',
          entity: 'recurring_transaction',
          entityId: rt.id,
          field: 'accountId',
          message: `定期交易 "${rt.description}" 缺少关联的账户`,
          severity: 'high',
        })
      }

      if (!rt.currency) {
        errors.push({
          type: 'missing_reference',
          entity: 'recurring_transaction',
          entityId: rt.id,
          field: 'currencyId',
          message: `定期交易 "${rt.description}" 缺少关联的货币`,
          severity: 'high',
        })
      }

      // 检查日期逻辑
      if (rt.endDate && rt.startDate >= rt.endDate) {
        errors.push({
          type: 'invalid_data',
          entity: 'recurring_transaction',
          entityId: rt.id,
          message: `定期交易 "${rt.description}" 的开始日期不能晚于或等于结束日期`,
          severity: 'high',
        })
      }
    })
  }

  /**
   * 检查汇率数据完整性
   */
  private static async checkExchangeRateIntegrity(
    userId: string,
    errors: IntegrityError[],
    warnings: IntegrityWarning[]
  ): Promise<void> {
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    exchangeRates.forEach(rate => {
      if (!rate.fromCurrencyRef) {
        errors.push({
          type: 'missing_reference',
          entity: 'exchange_rate',
          entityId: rate.id,
          field: 'fromCurrencyId',
          message: '汇率记录缺少源货币引用',
          severity: 'high',
        })
      }

      if (!rate.toCurrencyRef) {
        errors.push({
          type: 'missing_reference',
          entity: 'exchange_rate',
          entityId: rate.id,
          field: 'toCurrencyId',
          message: '汇率记录缺少目标货币引用',
          severity: 'high',
        })
      }

      // 检查汇率合理性
      const rateValue = Number(rate.rate)
      if (rateValue <= 0) {
        errors.push({
          type: 'invalid_data',
          entity: 'exchange_rate',
          entityId: rate.id,
          field: 'rate',
          message: '汇率值必须大于0',
          severity: 'high',
        })
      }

      if (rateValue > 10000) {
        warnings.push({
          type: 'data_inconsistency',
          entity: 'exchange_rate',
          message: `汇率值可能过高: ${rateValue}`,
        })
      }
    })
  }

  /**
   * 检查孤立数据
   */
  private static async checkOrphanedData(
    userId: string,
    warnings: IntegrityWarning[],
    suggestions: IntegritySuggestion[]
  ): Promise<void> {
    // 检查未使用的标签
    const unusedTags = await prisma.tag.findMany({
      where: {
        userId,
        transactions: {
          none: {},
        },
      },
    })

    if (unusedTags.length > 0) {
      warnings.push({
        type: 'data_inconsistency',
        entity: 'tag',
        message: `发现 ${unusedTags.length} 个未使用的标签`,
      })

      suggestions.push({
        type: 'cleanup',
        message: '建议删除未使用的标签以保持数据整洁',
        action: 'delete_unused_tags',
      })
    }

    // 检查未使用的交易模板
    const unusedTemplates = await prisma.transactionTemplate.findMany({
      where: {
        userId,
        // 这里可以添加更复杂的逻辑来检查模板是否被使用
      },
    })

    if (unusedTemplates.length > 10) {
      suggestions.push({
        type: 'cleanup',
        message: `发现 ${unusedTemplates.length} 个交易模板，建议定期清理不需要的模板`,
        action: 'review_transaction_templates',
      })
    }
  }

  /**
   * 计算统计信息
   */
  private static calculateStatistics(
    data: ExportedData,
    errors: IntegrityError[],
    startTime: number
  ): IntegrityStatistics {
    const totalRecords = this.getTotalRecordCount(data)
    const invalidRecords = errors.filter(
      e => e.severity === 'critical' || e.severity === 'high'
    ).length

    return {
      totalRecords,
      validRecords: totalRecords - invalidRecords,
      invalidRecords,
      orphanedRecords: 0, // 需要具体实现
      duplicateRecords: 0, // 需要具体实现
      checkDuration: Date.now() - startTime,
    }
  }

  /**
   * 计算用户数据统计信息
   */
  private static async calculateUserDataStatistics(
    userId: string,
    errors: IntegrityError[],
    startTime: number
  ): Promise<IntegrityStatistics> {
    const [
      accountCount,
      transactionCount,
      tagCount,
      templateCount,
      recurringCount,
      loanCount,
    ] = await Promise.all([
      prisma.account.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.tag.count({ where: { userId } }),
      prisma.transactionTemplate.count({ where: { userId } }),
      prisma.recurringTransaction.count({ where: { userId } }),
      prisma.loanContract.count({ where: { userId } }),
    ])

    const totalRecords =
      accountCount +
      transactionCount +
      tagCount +
      templateCount +
      recurringCount +
      loanCount
    const invalidRecords = errors.filter(
      e => e.severity === 'critical' || e.severity === 'high'
    ).length

    return {
      totalRecords,
      validRecords: totalRecords - invalidRecords,
      invalidRecords,
      orphanedRecords: 0, // 需要具体实现
      duplicateRecords: 0, // 需要具体实现
      checkDuration: Date.now() - startTime,
    }
  }

  /**
   * 获取总记录数
   */
  private static getTotalRecordCount(data: ExportedData): number {
    return (
      data.categories.length +
      data.accounts.length +
      data.transactions.length +
      data.tags.length +
      data.userCurrencies.length +
      data.customCurrencies.length +
      data.exchangeRates.length +
      data.transactionTemplates.length +
      data.recurringTransactions.length +
      data.loanContracts.length +
      data.loanPayments.length
    )
  }
}

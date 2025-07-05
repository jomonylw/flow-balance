/**
 * 数据验证工具
 * 确保存量类和流量类数据的准确性和一致性
 *
 * 🔧 优化版本 - 增强验证逻辑和错误处理
 * 🌐 支持国际化 - 使用翻译键生成多语言错误信息
 */

import type { ValidationResult } from '@/types/core'
import { AccountType, TransactionType } from '@/types/core/constants'

interface ValidationAccount {
  id: string
  name: string
  category: {
    id: string
    name: string
    type?: AccountType
  }
  transactions: ValidationTransaction[]
}

interface ValidationTransaction {
  id: string
  type: TransactionType
  amount: number
  date: string
  description: string
  currency: {
    code: string
    symbol: string
  }
}

// 翻译函数类型
type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>
) => string

interface ValidationDetails {
  accountsChecked: number
  transactionsChecked: number
  categoriesWithoutType: number
  invalidTransactions: number
  businessLogicViolations: number
}

/**
 * 验证账户数据的完整性和一致性（支持国际化）
 */
export function validateAccountDataWithI18n(
  accounts: ValidationAccount[],
  t: TranslationFunction
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  accounts.forEach(account => {
    // 验证账户类型设置
    if (!account.category.type) {
      errors.push(`账户 "${account.name}" 未设置账户类型`)
      suggestions.push(
        `请为账户 "${account.name}" 设置正确的账户类型（资产、负债、收入、支出）`
      )
    }

    // 验证交易数据
    account.transactions.forEach(transaction => {
      // 验证交易金额
      // BALANCE类型交易允许为0（如贷款还完时余额为0），其他类型必须大于0
      if (
        transaction.type === 'BALANCE'
          ? transaction.amount < 0
          : transaction.amount <= 0
      ) {
        errors.push(
          `账户 "${account.name}" 中存在无效的交易金额: ${transaction.amount}`
        )
      }

      // 验证交易类型与账户类型的匹配
      if (account.category.type) {
        const isValidCombination = validateTransactionAccountType(
          transaction.type,
          account.category.type
        )
        if (!isValidCombination) {
          warnings.push(
            t('validation.account.type.mismatch', {
              accountName: account.name,
              accountType: account.category.type,
              transactionType: transaction.type,
            })
          )
        }
      }

      // 验证交易日期
      const transactionDate = new Date(transaction.date)
      if (isNaN(transactionDate.getTime())) {
        errors.push(
          `账户 "${account.name}" 中存在无效的交易日期: ${transaction.date}`
        )
      }

      // 验证交易描述
      if (!transaction.description || transaction.description.trim() === '') {
        warnings.push(`账户 "${account.name}" 中存在空的交易描述`)
      }
    })

    // 验证流量类账户的特殊规则
    if (
      account.category.type === AccountType.INCOME ||
      account.category.type === AccountType.EXPENSE
    ) {
      const relevantTransactions = account.transactions.filter(
        t =>
          (account.category.type === AccountType.INCOME &&
            t.type === TransactionType.INCOME) ||
          (account.category.type === AccountType.EXPENSE &&
            t.type === TransactionType.EXPENSE)
      )

      if (relevantTransactions.length !== account.transactions.length) {
        warnings.push(`流量类账户 "${account.name}" 中存在不匹配的交易类型`)
      }
    }
  })

  // 计算数据质量评分
  const totalTransactions = accounts.reduce(
    (sum, acc) => sum + (acc.transactions?.length || 0),
    0
  )

  // 计算无效交易数量
  const invalidTransactions = accounts.reduce((sum, acc) => {
    return (
      sum +
      acc.transactions.filter(t => {
        // 无效交易的条件：
        // 1. 金额无效 - BALANCE类型交易允许为0，其他类型必须大于0
        if (t.type === 'BALANCE' ? t.amount < 0 : t.amount <= 0) return true
        // 2. 日期无效
        if (isNaN(new Date(t.date).getTime())) return true
        // 3. 描述为空
        if (!t.description || t.description.trim() === '') return true
        // 4. 交易类型与账户类型不匹配
        if (acc.category?.type) {
          const isValidCombination = validateTransactionAccountType(
            t.type,
            acc.category.type
          )
          if (!isValidCombination) return true
        }
        return false
      }).length
    )
  }, 0)

  const details: ValidationDetails = {
    accountsChecked: accounts.length,
    transactionsChecked: totalTransactions,
    categoriesWithoutType: accounts.filter(acc => !acc.category?.type).length,
    invalidTransactions,
    businessLogicViolations: warnings.filter(
      w => w.includes('不匹配') || w.includes('mismatched')
    ).length,
  }

  const score = calculateDataQualityScore(
    details,
    errors.length,
    warnings.length
  )

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
    details,
  }
}

/**
 * 验证账户数据的完整性和一致性（原版本，保持向后兼容）
 */
export function validateAccountData(
  accounts: ValidationAccount[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  accounts.forEach(account => {
    // 验证账户类型设置
    if (!account.category.type) {
      errors.push(`账户 "${account.name}" 未设置账户类型`)
      suggestions.push(
        `请为账户 "${account.name}" 设置正确的账户类型（资产、负债、收入、支出）`
      )
    }

    // 验证交易数据
    account.transactions.forEach(transaction => {
      // 验证交易金额
      // BALANCE类型交易允许为0（如贷款还完时余额为0），其他类型必须大于0
      if (
        transaction.type === 'BALANCE'
          ? transaction.amount < 0
          : transaction.amount <= 0
      ) {
        errors.push(
          `账户 "${account.name}" 中存在无效的交易金额: ${transaction.amount}`
        )
      }

      // 验证交易类型与账户类型的匹配
      if (account.category.type) {
        const isValidCombination = validateTransactionAccountType(
          transaction.type,
          account.category.type
        )
        if (!isValidCombination) {
          warnings.push(
            `账户 "${account.name}" (${account.category.type}) 中存在不匹配的交易类型: ${transaction.type}`
          )
        }
      }

      // 验证交易日期
      const transactionDate = new Date(transaction.date)
      if (isNaN(transactionDate.getTime())) {
        errors.push(
          `账户 "${account.name}" 中存在无效的交易日期: ${transaction.date}`
        )
      }

      // 验证交易描述
      if (!transaction.description || transaction.description.trim() === '') {
        warnings.push(`账户 "${account.name}" 中存在空的交易描述`)
      }
    })

    // 验证流量类账户的特殊规则
    if (
      account.category.type === AccountType.INCOME ||
      account.category.type === AccountType.EXPENSE
    ) {
      const relevantTransactions = account.transactions.filter(
        t =>
          (account.category.type === AccountType.INCOME &&
            t.type === TransactionType.INCOME) ||
          (account.category.type === AccountType.EXPENSE &&
            t.type === TransactionType.EXPENSE)
      )

      if (relevantTransactions.length !== account.transactions.length) {
        warnings.push(`流量类账户 "${account.name}" 中存在不匹配的交易类型`)
      }
    }
  })

  // 计算数据质量评分
  const totalTransactions = accounts.reduce(
    (sum, acc) => sum + (acc.transactions?.length || 0),
    0
  )

  // 计算无效交易数量
  const invalidTransactions = accounts.reduce((sum, acc) => {
    return (
      sum +
      acc.transactions.filter(t => {
        // 无效交易的条件：
        // 1. 金额无效 - BALANCE类型交易允许为0，其他类型必须大于0
        if (t.type === 'BALANCE' ? t.amount < 0 : t.amount <= 0) return true
        // 2. 日期无效
        if (isNaN(new Date(t.date).getTime())) return true
        // 3. 描述为空
        if (!t.description || t.description.trim() === '') return true
        // 4. 交易类型与账户类型不匹配
        if (acc.category?.type) {
          const isValidCombination = validateTransactionAccountType(
            t.type,
            acc.category.type
          )
          if (!isValidCombination) return true
        }
        return false
      }).length
    )
  }, 0)

  const details: ValidationDetails = {
    accountsChecked: accounts.length,
    transactionsChecked: totalTransactions,
    categoriesWithoutType: accounts.filter(acc => !acc.category?.type).length,
    invalidTransactions,
    businessLogicViolations: warnings.filter(w => w.includes('不匹配')).length,
  }

  const score = calculateDataQualityScore(
    details,
    errors.length,
    warnings.length
  )

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
    details,
  }
}

/**
 * 验证交易类型与账户类型的匹配性
 */
function validateTransactionAccountType(
  transactionType: TransactionType,
  accountType: AccountType
): boolean {
  switch (accountType) {
    case AccountType.ASSET:
    case AccountType.LIABILITY:
      // 存量类账户：普通交易应该被禁止，只允许余额调整
      if (transactionType === TransactionType.BALANCE) {
        return true
      } else {
        // 普通交易在存量类账户中应该被标记为问题
        return false
      }
    case AccountType.INCOME:
      // 收入类账户只应该有收入交易
      return transactionType === TransactionType.INCOME
    case AccountType.EXPENSE:
      // 支出类账户只应该有支出交易
      return transactionType === TransactionType.EXPENSE
    default:
      return false
  }
}

interface ChartSeries {
  data?: unknown[]
  name?: string
}

interface ValidationChartData {
  netWorthChart?: {
    series: ChartSeries[]
  }
  cashFlowChart?: {
    series: ChartSeries[]
  }
}

/**
 * 验证图表数据的准确性
 */
export function validateChartData(data: ValidationChartData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 验证净资产图表数据
  if (data.netWorthChart) {
    const { series } = data.netWorthChart

    series.forEach((serie: ChartSeries, index: number) => {
      if (!serie.data || !Array.isArray(serie.data)) {
        errors.push(`净资产图表系列 ${index} 缺少有效数据`)
      } else {
        // 验证数据点是否为有效数字
        serie.data.forEach((value: unknown, dataIndex: number) => {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(
              `净资产图表系列 ${index} 数据点 ${dataIndex} 不是有效数字: ${value}`
            )
          }
        })
      }
    })
  }

  // 验证现金流图表数据
  if (data.cashFlowChart) {
    const { series } = data.cashFlowChart

    series.forEach((serie: ChartSeries, index: number) => {
      if (!serie.data || !Array.isArray(serie.data)) {
        errors.push(`现金流图表系列 ${index} 缺少有效数据`)
      } else {
        // 验证现金流数据的合理性
        serie.data.forEach((value: unknown, dataIndex: number) => {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(
              `现金流图表系列 ${index} 数据点 ${dataIndex} 不是有效数字: ${value}`
            )
          }

          // 支出应该是负数或正数（取决于显示方式）
          if (serie.name === '支出' && typeof value === 'number' && value > 0) {
            warnings.push('现金流图表支出数据可能需要显示为负数')
          }
        })
      }
    })
  }

  const details: ValidationDetails = {
    accountsChecked: 0,
    transactionsChecked: 0,
    categoriesWithoutType: 0,
    invalidTransactions: 0,
    businessLogicViolations: 0,
  }

  const score = calculateDataQualityScore(
    details,
    errors.length,
    warnings.length
  )

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
    details,
  }
}

/**
 * 计算数据质量评分
 */
function calculateDataQualityScore(
  details: ValidationDetails,
  errorCount: number,
  warningCount: number
): number {
  if (details.accountsChecked === 0) return 0

  let score = 100

  // 错误扣分（每个错误扣10分）
  score -= errorCount * 10

  // 警告扣分（每个警告扣5分）
  score -= warningCount * 5

  // 未设置类型的分类扣分
  if (details.categoriesWithoutType > 0) {
    score -= (details.categoriesWithoutType / details.accountsChecked) * 20
  }

  // 业务逻辑违规扣分
  score -= details.businessLogicViolations * 3

  return Math.max(0, Math.min(100, score))
}

interface CategoryData {
  name: string
  type?: AccountType
}

interface CategorySummaryData {
  currentNetValue?: number
  totalFlow?: number
  transactionCount?: number
}

/**
 * 验证分类汇总数据的准确性
 */
export function validateCategorySummary(
  category: CategoryData,
  summaryData: CategorySummaryData
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (!category.type) {
    errors.push(`分类 "${category.name}" 未设置账户类型`)
    suggestions.push('请设置分类的账户类型以获得准确的统计分析')

    const details: ValidationDetails = {
      accountsChecked: 0,
      transactionsChecked: 0,
      categoriesWithoutType: 1,
      invalidTransactions: 0,
      businessLogicViolations: 0,
    }

    return {
      isValid: false,
      errors,
      warnings,
      suggestions,
      score: 0,
      details,
    }
  }

  // 验证存量类分类
  if (
    category.type === AccountType.ASSET ||
    category.type === AccountType.LIABILITY
  ) {
    if (!summaryData.currentNetValue && summaryData.currentNetValue !== 0) {
      warnings.push(`存量类分类 "${category.name}" 缺少当前净值数据`)
    }

    if (summaryData.transactionCount === 0) {
      suggestions.push(
        `存量类分类 "${category.name}" 暂无交易记录，建议添加账户并更新余额`
      )
    }
  }

  // 验证流量类分类
  if (
    category.type === AccountType.INCOME ||
    category.type === AccountType.EXPENSE
  ) {
    if (!summaryData.totalFlow && summaryData.totalFlow !== 0) {
      warnings.push(`流量类分类 "${category.name}" 缺少流量数据`)
    }

    if (summaryData.transactionCount === 0) {
      suggestions.push(
        `流量类分类 "${category.name}" 暂无交易记录，建议添加相关交易`
      )
    }
  }

  const details: ValidationDetails = {
    accountsChecked: 1,
    transactionsChecked: summaryData.transactionCount || 0,
    categoriesWithoutType: 0,
    invalidTransactions: 0,
    businessLogicViolations: 0,
  }

  const score = calculateDataQualityScore(
    details,
    errors.length,
    warnings.length
  )

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
    details,
  }
}

interface ValidationTransactionFormData {
  accountId?: string
  categoryId?: string
  amount?: string | number
  description?: string
  date?: string
}

/**
 * 验证交易表单数据
 */
export function validateTransactionForm(
  formData: ValidationTransactionFormData
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 验证必填字段
  if (!formData.accountId) {
    errors.push('请选择账户')
  }

  if (!formData.amount || parseFloat(String(formData.amount)) <= 0) {
    errors.push('请输入有效的金额')
  }

  if (!formData.description?.trim()) {
    errors.push('请输入交易描述')
  }

  if (!formData.date) {
    errors.push('请选择交易日期')
  } else {
    const transactionDate = new Date(formData.date)
    if (isNaN(transactionDate.getTime())) {
      errors.push('请输入有效的日期')
    } else if (transactionDate > new Date()) {
      warnings.push('交易日期为未来日期，请确认是否正确')
    }
  }

  // 验证金额范围
  const amount = parseFloat(String(formData.amount || '0'))
  if (amount > 10000000) {
    warnings.push('交易金额较大，请确认是否正确')
  }

  const details: ValidationDetails = {
    accountsChecked: 0,
    transactionsChecked: 1,
    categoriesWithoutType: 0,
    invalidTransactions: errors.length > 0 ? 1 : 0,
    businessLogicViolations: 0,
  }

  const score = calculateDataQualityScore(
    details,
    errors.length,
    warnings.length
  )

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
    details,
  }
}

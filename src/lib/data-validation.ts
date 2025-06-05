/**
 * 数据验证工具
 * 确保存量类和流量类数据的准确性和一致性
 */

interface Account {
  id: string
  name: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  date: string
  description: string
  currency: {
    code: string
    symbol: string
  }
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * 验证账户数据的完整性和一致性
 */
export function validateAccountData(accounts: Account[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  accounts.forEach(account => {
    // 验证账户类型设置
    if (!account.category.type) {
      errors.push(`账户 "${account.name}" 未设置账户类型`)
      suggestions.push(`请为账户 "${account.name}" 设置正确的账户类型（资产、负债、收入、支出）`)
    }

    // 验证交易数据
    account.transactions.forEach(transaction => {
      // 验证交易金额
      if (transaction.amount <= 0) {
        errors.push(`账户 "${account.name}" 中存在无效的交易金额: ${transaction.amount}`)
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
        errors.push(`账户 "${account.name}" 中存在无效的交易日期: ${transaction.date}`)
      }

      // 验证交易描述
      if (!transaction.description || transaction.description.trim() === '') {
        warnings.push(`账户 "${account.name}" 中存在空的交易描述`)
      }
    })

    // 验证存量类账户的特殊规则
    if (account.category.type === 'ASSET' || account.category.type === 'LIABILITY') {
      const balanceAdjustments = account.transactions.filter(t => 
        t.description.includes('余额更新') || t.description.includes('余额调整')
      )
      
      if (balanceAdjustments.length === 0 && account.transactions.length > 0) {
        suggestions.push(
          `存量类账户 "${account.name}" 建议使用"余额更新"功能而不是直接添加交易`
        )
      }
    }

    // 验证流量类账户的特殊规则
    if (account.category.type === 'INCOME' || account.category.type === 'EXPENSE') {
      const relevantTransactions = account.transactions.filter(t => 
        (account.category.type === 'INCOME' && t.type === 'INCOME') ||
        (account.category.type === 'EXPENSE' && t.type === 'EXPENSE')
      )
      
      if (relevantTransactions.length !== account.transactions.length) {
        warnings.push(
          `流量类账户 "${account.name}" 中存在不匹配的交易类型`
        )
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}

/**
 * 验证交易类型与账户类型的匹配性
 */
function validateTransactionAccountType(
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER',
  accountType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
): boolean {
  switch (accountType) {
    case 'ASSET':
    case 'LIABILITY':
      // 存量类账户可以有任何类型的交易（用于余额调整）
      return true
    case 'INCOME':
      // 收入类账户主要应该有收入交易
      return transactionType === 'INCOME'
    case 'EXPENSE':
      // 支出类账户主要应该有支出交易
      return transactionType === 'EXPENSE'
    default:
      return false
  }
}

/**
 * 验证图表数据的准确性
 */
export function validateChartData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 验证净资产图表数据
  if (data.netWorthChart) {
    const { series } = data.netWorthChart
    
    series.forEach((serie: any, index: number) => {
      if (!serie.data || !Array.isArray(serie.data)) {
        errors.push(`净资产图表系列 ${index} 缺少有效数据`)
      } else {
        // 验证数据点是否为有效数字
        serie.data.forEach((value: any, dataIndex: number) => {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`净资产图表系列 ${index} 数据点 ${dataIndex} 不是有效数字: ${value}`)
          }
        })
      }
    })
  }

  // 验证现金流图表数据
  if (data.cashFlowChart) {
    const { series } = data.cashFlowChart
    
    series.forEach((serie: any, index: number) => {
      if (!serie.data || !Array.isArray(serie.data)) {
        errors.push(`现金流图表系列 ${index} 缺少有效数据`)
      } else {
        // 验证现金流数据的合理性
        serie.data.forEach((value: any, dataIndex: number) => {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`现金流图表系列 ${index} 数据点 ${dataIndex} 不是有效数字: ${value}`)
          }
          
          // 支出应该是负数或正数（取决于显示方式）
          if (serie.name === '支出' && value > 0) {
            warnings.push(`现金流图表支出数据可能需要显示为负数`)
          }
        })
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}

/**
 * 验证分类汇总数据的准确性
 */
export function validateCategorySummary(category: any, summaryData: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (!category.type) {
    errors.push(`分类 "${category.name}" 未设置账户类型`)
    suggestions.push('请设置分类的账户类型以获得准确的统计分析')
    return { isValid: false, errors, warnings, suggestions }
  }

  // 验证存量类分类
  if (category.type === 'ASSET' || category.type === 'LIABILITY') {
    if (!summaryData.currentNetValue && summaryData.currentNetValue !== 0) {
      warnings.push(`存量类分类 "${category.name}" 缺少当前净值数据`)
    }
    
    if (summaryData.transactionCount === 0) {
      suggestions.push(`存量类分类 "${category.name}" 暂无交易记录，建议添加账户并更新余额`)
    }
  }

  // 验证流量类分类
  if (category.type === 'INCOME' || category.type === 'EXPENSE') {
    if (!summaryData.totalFlow && summaryData.totalFlow !== 0) {
      warnings.push(`流量类分类 "${category.name}" 缺少流量数据`)
    }
    
    if (summaryData.transactionCount === 0) {
      suggestions.push(`流量类分类 "${category.name}" 暂无交易记录，建议添加相关交易`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}

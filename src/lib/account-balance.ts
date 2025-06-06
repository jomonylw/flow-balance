/**
 * 账户余额计算服务
 * 正确区分存量账户（资产、负债）和流量账户（收入、支出）的余额计算逻辑
 * 支持多货币转换和本位币统计
 *
 * 🔧 优化版本 - 增强数据一致性和错误处理
 */

import { convertMultipleCurrencies, ConversionResult } from './currency-conversion'

export interface Transaction {
  id?: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  date?: string | Date
  description?: string
  currency: {
    code: string
    symbol: string
    name: string
  }
}

export interface Account {
  id: string
  name: string
  category: {
    id?: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions: Transaction[]
}

export interface CalculationOptions {
  asOfDate?: Date
  includePendingTransactions?: boolean
  validateData?: boolean
}

export interface AccountBalance {
  currencyCode: string
  amount: number
  currency: {
    code: string
    symbol: string
    name: string
  }
}

/**
 * 计算单个账户的余额
 * @param account 账户信息
 * @param options 计算选项
 * @returns 按币种分组的余额
 */
export function calculateAccountBalance(
  account: Account,
  options: CalculationOptions = {}
): Record<string, AccountBalance> {
  const { asOfDate, validateData = true } = options
  const balances: Record<string, AccountBalance> = {}

  // 数据验证
  if (validateData) {
    if (!account || !account.transactions) {
      console.warn(`账户 ${account?.name || 'Unknown'} 缺少交易数据`)
      return balances
    }

    if (!account.category?.type) {
      console.warn(`账户 ${account.name} 未设置账户类型`)
    }
  }

  // 过滤和验证交易
  let transactions = account.transactions.filter(transaction => {
    // 基础验证
    if (!transaction || typeof transaction.amount !== 'number') {
      if (validateData) {
        console.warn(`账户 ${account.name} 中发现无效交易:`, transaction)
      }
      return false
    }

    // 日期过滤
    if (asOfDate && transaction.date) {
      const transactionDate = new Date(transaction.date)
      if (isNaN(transactionDate.getTime())) {
        if (validateData) {
          console.warn(`账户 ${account.name} 中发现无效日期:`, transaction.date)
        }
        return false
      }
      return transactionDate <= asOfDate
    }

    return true
  })

  transactions.forEach(transaction => {
    const currencyCode = transaction.currency?.code

    if (!currencyCode) {
      if (validateData) {
        console.warn(`账户 ${account.name} 中发现无效币种:`, transaction)
      }
      return
    }

    if (!balances[currencyCode]) {
      balances[currencyCode] = {
        currencyCode,
        amount: 0,
        currency: transaction.currency
      }
    }

    const amount = transaction.amount

    // 根据账户类型和交易类型计算余额
    let accountType = account.category.type

    // 如果账户类型未设置，但分类名称包含特定关键词，尝试推断类型
    if (!accountType && validateData) {
      const categoryName = account.category.name?.toLowerCase() || ''
      if (categoryName.includes('资产') || categoryName.includes('现金') || categoryName.includes('银行') || categoryName.includes('投资')) {
        accountType = 'ASSET'
        if (validateData) {
          console.log(`推断账户 ${account.name} 为资产类账户`)
        }
      } else if (categoryName.includes('负债') || categoryName.includes('贷款') || categoryName.includes('信用卡')) {
        accountType = 'LIABILITY'
        if (validateData) {
          console.log(`推断账户 ${account.name} 为负债类账户`)
        }
      } else if (categoryName.includes('收入') || categoryName.includes('工资') || categoryName.includes('奖金')) {
        accountType = 'INCOME'
        if (validateData) {
          console.log(`推断账户 ${account.name} 为收入类账户`)
        }
      } else if (categoryName.includes('支出') || categoryName.includes('费用') || categoryName.includes('消费')) {
        accountType = 'EXPENSE'
        if (validateData) {
          console.log(`推断账户 ${account.name} 为支出类账户`)
        }
      }
    }

    try {
      switch (accountType) {
        case 'ASSET':
          // 资产类账户：收入增加余额，支出减少余额
          if (transaction.type === 'INCOME') {
            balances[currencyCode].amount += amount
          } else if (transaction.type === 'EXPENSE') {
            balances[currencyCode].amount -= amount
          } else if (transaction.type === 'TRANSFER') {
            // 转账交易需要根据具体业务逻辑处理
            balances[currencyCode].amount += amount
          }
          break

        case 'LIABILITY':
          // 负债类账户：借入（收入）增加余额，偿还（支出）减少余额
          if (transaction.type === 'INCOME') {
            balances[currencyCode].amount += amount
          } else if (transaction.type === 'EXPENSE') {
            balances[currencyCode].amount -= amount
          } else if (transaction.type === 'TRANSFER') {
            balances[currencyCode].amount += amount
          }
          break

        case 'INCOME':
          // 收入类账户：只记录收入交易（累计收入）
          if (transaction.type === 'INCOME') {
            balances[currencyCode].amount += amount
          } else if (validateData) {
            // 对于余额更新交易，不显示警告
            if (!transaction.description?.includes('余额更新')) {
              console.warn(`收入类账户 ${account.name} 中发现非收入交易:`, transaction)
            }
          }
          break

        case 'EXPENSE':
          // 支出类账户：只记录支出交易（累计支出）
          if (transaction.type === 'EXPENSE') {
            balances[currencyCode].amount += amount
          } else if (validateData) {
            // 对于余额更新交易，不显示警告
            if (!transaction.description?.includes('余额更新')) {
              console.warn(`支出类账户 ${account.name} 中发现非支出交易:`, transaction)
            }
          }
          break

        default:
          // 未设置账户类型时的兜底处理 - 按资产类账户处理
          if (validateData) {
            console.warn(`账户 ${account.name} 未设置账户类型，按资产类账户处理`)
          }
          if (transaction.type === 'INCOME') {
            balances[currencyCode].amount += amount
          } else if (transaction.type === 'EXPENSE') {
            balances[currencyCode].amount -= amount
          } else if (transaction.type === 'TRANSFER') {
            balances[currencyCode].amount += amount
          }
          break
      }
    } catch (error) {
      if (validateData) {
        console.error(`计算账户 ${account.name} 余额时发生错误:`, error, transaction)
      }
    }
  })
  
  return balances
}

/**
 * 计算多个账户的汇总余额
 * @param accounts 账户列表
 * @param options 计算选项
 * @returns 按币种分组的汇总余额
 */
export function calculateTotalBalance(
  accounts: Account[],
  options: CalculationOptions = {}
): Record<string, AccountBalance> {
  const totalBalances: Record<string, AccountBalance> = {}

  if (!accounts || accounts.length === 0) {
    return totalBalances
  }

  accounts.forEach(account => {
    try {
      const accountBalances = calculateAccountBalance(account, options)

      Object.values(accountBalances).forEach(balance => {
        const currencyCode = balance.currencyCode

        if (!totalBalances[currencyCode]) {
          totalBalances[currencyCode] = {
            currencyCode,
            amount: 0,
            currency: balance.currency
          }
        }

        totalBalances[currencyCode].amount += balance.amount
      })
    } catch (error) {
      if (options.validateData !== false) {
        console.error(`计算账户 ${account?.name || 'Unknown'} 汇总余额时发生错误:`, error)
      }
    }
  })

  return totalBalances
}

/**
 * 按账户类型分组计算余额
 * @param accounts 账户列表
 * @param asOfDate 截止日期（可选）
 * @returns 按账户类型和币种分组的余额
 */
export function calculateBalancesByType(
  accounts: Account[], 
  asOfDate?: Date
): Record<string, Record<string, AccountBalance>> {
  const balancesByType: Record<string, Record<string, AccountBalance>> = {
    ASSET: {},
    LIABILITY: {},
    INCOME: {},
    EXPENSE: {}
  }
  
  accounts.forEach(account => {
    const accountType = account.category.type || 'ASSET' // 默认为资产类
    const accountBalances = calculateAccountBalance(account, { asOfDate })

    Object.values(accountBalances).forEach(balance => {
      const currencyCode = balance.currencyCode

      if (!balancesByType[accountType][currencyCode]) {
        balancesByType[accountType][currencyCode] = {
          currencyCode,
          amount: 0,
          currency: balance.currency
        }
      }

      balancesByType[accountType][currencyCode].amount += balance.amount
    })
  })
  
  return balancesByType
}

/**
 * 计算净资产（资产 - 负债）
 * @param accounts 账户列表
 * @param asOfDate 截止日期（可选）
 * @returns 按币种分组的净资产
 */
export function calculateNetWorth(
  accounts: Account[],
  asOfDate?: Date
): Record<string, AccountBalance> {
  const balancesByType = calculateBalancesByType(accounts, asOfDate)
  const netWorth: Record<string, AccountBalance> = {}
  
  // 获取所有涉及的币种
  const allCurrencies = new Set<string>()
  Object.values(balancesByType).forEach(typeBalances => {
    Object.keys(typeBalances).forEach(currencyCode => {
      allCurrencies.add(currencyCode)
    })
  })
  
  // 计算每种币种的净资产
  allCurrencies.forEach(currencyCode => {
    const assetBalance = balancesByType.ASSET[currencyCode]?.amount || 0
    const liabilityBalance = balancesByType.LIABILITY[currencyCode]?.amount || 0
    
    // 获取币种信息
    const currency = balancesByType.ASSET[currencyCode]?.currency || 
                    balancesByType.LIABILITY[currencyCode]?.currency
    
    if (currency) {
      netWorth[currencyCode] = {
        currencyCode,
        amount: assetBalance - liabilityBalance,
        currency
      }
    }
  })
  
  return netWorth
}

/**
 * 验证账户类型是否正确设置
 * @param accounts 账户列表
 * @returns 验证结果和建议
 */
export function validateAccountTypes(accounts: Account[]): {
  isValid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  
  accounts.forEach(account => {
    if (!account.category.type) {
      issues.push(`账户 "${account.name}" 未设置账户类型`)
      suggestions.push(`建议为账户 "${account.name}" 设置正确的账户类型（资产、负债、收入、支出）`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

/**
 * 扩展的账户余额接口，包含货币转换信息
 */
export interface AccountBalanceWithConversion extends AccountBalance {
  convertedAmount?: number
  baseCurrency?: {
    code: string
    symbol: string
    name: string
  }
  conversionRate?: number
  conversionSuccess?: boolean
  conversionError?: string
}

/**
 * 计算账户余额并转换为本位币
 * @param userId 用户ID
 * @param account 账户信息
 * @param baseCurrency 本位币
 * @param options 计算选项
 * @returns 包含转换信息的余额数据
 */
export async function calculateAccountBalanceWithConversion(
  userId: string,
  account: Account,
  baseCurrency: { code: string; symbol: string; name: string },
  options: CalculationOptions = {}
): Promise<Record<string, AccountBalanceWithConversion>> {
  // 先计算原始余额
  const originalBalances = calculateAccountBalance(account, options)
  const balancesWithConversion: Record<string, AccountBalanceWithConversion> = {}

  // 准备转换数据
  const amountsToConvert = Object.values(originalBalances).map(balance => ({
    amount: balance.amount,
    currency: balance.currencyCode
  }))

  try {
    // 批量转换货币
    const conversionResults = await convertMultipleCurrencies(
      userId,
      amountsToConvert,
      baseCurrency.code,
      options.asOfDate
    )

    // 合并转换结果
    Object.keys(originalBalances).forEach((currencyCode, index) => {
      const originalBalance = originalBalances[currencyCode]
      const conversionResult = conversionResults[index]

      balancesWithConversion[currencyCode] = {
        ...originalBalance,
        convertedAmount: conversionResult.convertedAmount,
        baseCurrency,
        conversionRate: conversionResult.exchangeRate,
        conversionSuccess: conversionResult.success,
        conversionError: conversionResult.error
      }
    })
  } catch (error) {
    console.error('货币转换失败:', error)

    // 转换失败时，返回原始余额
    Object.keys(originalBalances).forEach(currencyCode => {
      const originalBalance = originalBalances[currencyCode]
      balancesWithConversion[currencyCode] = {
        ...originalBalance,
        convertedAmount: originalBalance.amount,
        baseCurrency,
        conversionRate: 1,
        conversionSuccess: false,
        conversionError: '货币转换服务不可用'
      }
    })
  }

  return balancesWithConversion
}

/**
 * 计算多个账户的汇总余额并转换为本位币
 * @param userId 用户ID
 * @param accounts 账户列表
 * @param baseCurrency 本位币
 * @param options 计算选项
 * @returns 转换为本位币的汇总余额
 */
export async function calculateTotalBalanceWithConversion(
  userId: string,
  accounts: Account[],
  baseCurrency: { code: string; symbol: string; name: string },
  options: CalculationOptions = {}
): Promise<{
  totalInBaseCurrency: number
  totalsByOriginalCurrency: Record<string, AccountBalance>
  conversionDetails: ConversionResult[]
  hasConversionErrors: boolean
}> {
  let totalInBaseCurrency = 0
  const totalsByOriginalCurrency: Record<string, AccountBalance> = {}
  const conversionDetails: ConversionResult[] = []
  let hasConversionErrors = false

  // 计算所有账户的原始余额
  const allAmountsToConvert: Array<{ amount: number; currency: string }> = []

  for (const account of accounts) {
    const accountBalances = calculateAccountBalance(account, options)

    Object.values(accountBalances).forEach(balance => {
      const currencyCode = balance.currencyCode

      if (!totalsByOriginalCurrency[currencyCode]) {
        totalsByOriginalCurrency[currencyCode] = {
          currencyCode,
          amount: 0,
          currency: balance.currency
        }
      }

      totalsByOriginalCurrency[currencyCode].amount += balance.amount
    })
  }

  // 准备转换数据
  Object.values(totalsByOriginalCurrency).forEach(balance => {
    allAmountsToConvert.push({
      amount: balance.amount,
      currency: balance.currencyCode
    })
  })

  try {
    // 批量转换货币
    const conversionResults = await convertMultipleCurrencies(
      userId,
      allAmountsToConvert,
      baseCurrency.code,
      options.asOfDate
    )

    conversionDetails.push(...conversionResults)

    // 计算本位币总额
    conversionResults.forEach(result => {
      if (result.success) {
        totalInBaseCurrency += result.convertedAmount
      } else {
        hasConversionErrors = true
        // 转换失败时，如果是相同货币则使用原始金额，否则标记为不可用
        if (result.fromCurrency === baseCurrency.code) {
          totalInBaseCurrency += result.originalAmount
        } else {
          console.warn(`汇率转换失败: ${result.fromCurrency} -> ${baseCurrency.code}, 金额: ${result.originalAmount}`)
          // 不添加到总额中，避免数据偏差
        }
      }
    })
  } catch (error) {
    console.error('批量货币转换失败:', error)
    hasConversionErrors = true

    // 转换失败时，只使用本位币的金额，其他货币标记为不可用
    Object.values(totalsByOriginalCurrency).forEach(balance => {
      if (balance.currencyCode === baseCurrency.code) {
        totalInBaseCurrency += balance.amount
      } else {
        console.warn(`无法转换货币 ${balance.currencyCode} 的金额: ${balance.amount}`)
      }
    })
  }

  return {
    totalInBaseCurrency,
    totalsByOriginalCurrency,
    conversionDetails,
    hasConversionErrors
  }
}

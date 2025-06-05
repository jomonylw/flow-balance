/**
 * 账户余额计算服务
 * 正确区分存量账户（资产、负债）和流量账户（收入、支出）的余额计算逻辑
 *
 * 🔧 优化版本 - 增强数据一致性和错误处理
 */

export interface Transaction {
  id?: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  date?: string | Date
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
    const accountType = account.category.type

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
          } else if (validateData && transaction.type !== 'INCOME') {
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
          } else if (validateData && transaction.type !== 'EXPENSE') {
            // 对于余额更新交易，不显示警告
            if (!transaction.description?.includes('余额更新')) {
              console.warn(`支出类账户 ${account.name} 中发现非支出交易:`, transaction)
            }
          }
          break

        default:
          // 未设置账户类型时的兜底处理
          if (validateData) {
            console.warn(`账户 ${account.name} 未设置账户类型，使用默认计算方式`)
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
    const accountBalances = calculateAccountBalance(account, asOfDate)
    
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

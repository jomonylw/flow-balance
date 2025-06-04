/**
 * 账户余额计算服务
 * 正确区分存量账户（资产、负债）和流量账户（收入、支出）的余额计算逻辑
 */

export interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
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
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions: Transaction[]
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
 * @param asOfDate 截止日期（可选，用于计算特定时点的余额）
 * @returns 按币种分组的余额
 */
export function calculateAccountBalance(
  account: Account, 
  asOfDate?: Date
): Record<string, AccountBalance> {
  const balances: Record<string, AccountBalance> = {}
  
  // 过滤交易（如果指定了截止日期）
  let transactions = account.transactions
  if (asOfDate) {
    transactions = account.transactions.filter(t => 
      new Date((t as any).date) <= asOfDate
    )
  }

  transactions.forEach(transaction => {
    const currencyCode = transaction.currency.code
    
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
    
    switch (accountType) {
      case 'ASSET':
        // 资产类账户：收入增加余额，支出减少余额
        if (transaction.type === 'INCOME') {
          balances[currencyCode].amount += amount
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode].amount -= amount
        }
        break
        
      case 'LIABILITY':
        // 负债类账户：借入（收入）增加余额，偿还（支出）减少余额
        if (transaction.type === 'INCOME') {
          balances[currencyCode].amount += amount
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode].amount -= amount
        }
        break
        
      case 'INCOME':
        // 收入类账户：收入增加余额（累计收入）
        if (transaction.type === 'INCOME') {
          balances[currencyCode].amount += amount
        }
        break
        
      case 'EXPENSE':
        // 支出类账户：支出增加余额（累计支出）
        if (transaction.type === 'EXPENSE') {
          balances[currencyCode].amount += amount
        }
        break
        
      default:
        // 兼容旧数据：按原有逻辑处理
        if (transaction.type === 'INCOME') {
          balances[currencyCode].amount += amount
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode].amount -= amount
        }
    }
    
    // 转账交易需要特殊处理，这里简化处理
  })
  
  return balances
}

/**
 * 计算多个账户的汇总余额
 * @param accounts 账户列表
 * @param asOfDate 截止日期（可选）
 * @returns 按币种分组的汇总余额
 */
export function calculateTotalBalance(
  accounts: Account[], 
  asOfDate?: Date
): Record<string, AccountBalance> {
  const totalBalances: Record<string, AccountBalance> = {}
  
  accounts.forEach(account => {
    const accountBalances = calculateAccountBalance(account, asOfDate)
    
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

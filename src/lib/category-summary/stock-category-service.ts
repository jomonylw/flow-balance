/**
 * 存量类分类汇总服务
 * 专门处理资产(ASSET)和负债(LIABILITY)分类的汇总逻辑
 */

import { prisma } from '@/lib/prisma'
import { calculateAccountBalance } from '@/lib/account-balance'
import {
  StockCategorySummary,
  AccountSummary,
  ChildCategorySummary,
  CategoryWithChildren,
  AccountWithTransactions
} from './types'
import {
  getAllCategoryIds,
  serializeAccountData,
  calculateChildCategoryBalances,
  calculateCategoryTotalBalances,
  getUserCurrencies,
  extractBalanceChangeFromNotes
} from './utils'

/**
 * 获取存量类分类汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @returns 存量类分类汇总数据
 */
export async function getStockCategorySummary(
  categoryId: string,
  userId: string
): Promise<StockCategorySummary> {
  // 验证分类是否属于当前用户且为存量类
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: userId,
      type: {
        in: ['ASSET', 'LIABILITY']
      }
    },
    include: {
      parent: true,
      children: {
        orderBy: [
          { order: 'asc' },
          { name: 'asc' }
        ]
      }
    }
  }) as CategoryWithChildren | null

  if (!category) {
    throw new Error('存量类分类不存在或无权限访问')
  }

  // 获取所有相关分类ID
  const allCategoryIds = await getAllCategoryIds(prisma, categoryId)

  // 获取该分类及其所有子分类下的账户
  const allAccounts = await prisma.account.findMany({
    where: {
      userId: userId,
      categoryId: {
        in: allCategoryIds
      }
    },
    include: {
      category: true,
      transactions: {
        include: {
          currency: true
        }
      }
    }
  })

  // 计算所有账户余额
  const allAccountSummaries: AccountSummary[] = allAccounts.map(account => {
    const serializedAccount = serializeAccountData(account)
    const accountBalances = calculateAccountBalance(serializedAccount)

    // 转换为简单的余额记录格式
    const balances: Record<string, number> = {}
    Object.entries(accountBalances).forEach(([currencyCode, balanceData]) => {
      balances[currencyCode] = (balanceData as any).amount
    })

    return {
      id: account.id,
      name: account.name,
      description: account.description || undefined,
      categoryId: account.categoryId,
      balances,
      transactionCount: account.transactions.length
    }
  })

  // 分离直属账户和子分类账户
  const directAccounts = allAccountSummaries.filter(
    account => account.categoryId === categoryId
  )

  // 为每个子分类计算汇总余额
  const childrenWithBalances: ChildCategorySummary[] = await Promise.all(
    category.children.map(async (child) => {
      const childAccountIds = await getAllCategoryIds(prisma, child.id)
      const childBalances = calculateChildCategoryBalances(
        allAccountSummaries,
        childAccountIds
      )

      const childAccounts = allAccountSummaries.filter(account =>
        childAccountIds.includes(account.categoryId)
      )

      return {
        id: child.id,
        name: child.name,
        type: child.type,
        balances: childBalances,
        accountCount: childAccounts.length,
        order: child.order
      }
    })
  )

  // 计算分类总余额
  const categoryBalances = calculateCategoryTotalBalances(allAccountSummaries)

  // 获取相关交易
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId,
      categoryId: {
        in: allCategoryIds
      }
    },
    include: {
      currency: true,
      account: true
    },
    orderBy: { date: 'desc' }
  })

  // 计算存量类特有的余额变化汇总
  const balanceChangeSummary = calculateStockBalanceChanges(
    transactions,
    category.type as 'ASSET' | 'LIABILITY'
  )

  // 获取最近的交易
  const recentTransactions = transactions.slice(0, 10).map(transaction => ({
    id: transaction.id,
    type: transaction.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
    amount: parseFloat(transaction.amount.toString()),
    description: transaction.description,
    notes: transaction.notes || undefined,
    date: transaction.date.toISOString(),
    currency: {
      code: transaction.currency.code,
      symbol: transaction.currency.symbol,
      name: transaction.currency.name
    },
    account: {
      id: transaction.account.id,
      name: transaction.account.name
    }
  }))

  // 获取用户货币
  const currencies = await getUserCurrencies(prisma, userId)

  return {
    category: {
      id: category.id,
      name: category.name,
      type: category.type,
      parent: category.parent,
      childrenCount: category.children.length
    },
    children: childrenWithBalances,
    accounts: directAccounts,
    allAccounts: allAccountSummaries,
    categoryBalances,
    balanceChangeSummary,
    recentTransactions,
    currencies,
    stats: {
      totalAccounts: allAccountSummaries.length,
      directAccounts: directAccounts.length,
      totalTransactions: transactions.length,
      totalChildren: category.children.length
    }
  }
}

/**
 * 计算存量类账户的余额变化汇总
 * @param transactions 交易列表
 * @param categoryType 分类类型
 * @returns 余额变化汇总
 */
function calculateStockBalanceChanges(
  transactions: any[],
  categoryType: 'ASSET' | 'LIABILITY'
): Record<string, {
  currentBalance: number
  balanceAdjustments: number
  netChanges: number
  count: number
}> {
  const summary: Record<string, {
    currentBalance: number
    balanceAdjustments: number
    netChanges: number
    count: number
  }> = {}

  transactions.forEach(transaction => {
    const currencyCode = transaction.currency.code
    if (!summary[currencyCode]) {
      summary[currencyCode] = {
        currentBalance: 0,
        balanceAdjustments: 0,
        netChanges: 0,
        count: 0
      }
    }

    const amount = parseFloat(transaction.amount.toString())
    summary[currencyCode].count++

    if (transaction.type === 'BALANCE_ADJUSTMENT') {
      // 余额调整：从备注中提取实际变化金额
      const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
      const actualChange = changeAmount !== null ? changeAmount : amount
      summary[currencyCode].balanceAdjustments += actualChange
      summary[currencyCode].netChanges += actualChange
    } else {
      // 普通交易：根据账户类型处理
      let balanceChange = 0
      if (categoryType === 'ASSET') {
        // 资产类：收入增加，支出减少
        balanceChange = transaction.type === 'INCOME' ? amount : -amount
      } else if (categoryType === 'LIABILITY') {
        // 负债类：支出增加，收入减少
        balanceChange = transaction.type === 'EXPENSE' ? amount : -amount
      }
      summary[currencyCode].netChanges += balanceChange
    }
  })

  return summary
}

/**
 * 流量类分类汇总服务
 * 专门处理收入(INCOME)和支出(EXPENSE)分类的汇总逻辑
 */

import { prisma } from '@/lib/prisma'
import { calculateAccountBalance } from '@/lib/account-balance'
import {
  FlowCategorySummary,
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
  getUserCurrencies
} from './utils'

/**
 * 获取流量类分类汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @returns 流量类分类汇总数据
 */
export async function getFlowCategorySummary(
  categoryId: string,
  userId: string
): Promise<FlowCategorySummary> {
  // 验证分类是否属于当前用户且为流量类
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: userId,
      type: {
        in: ['INCOME', 'EXPENSE']
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
    throw new Error('流量类分类不存在或无权限访问')
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

  // 计算所有账户余额（对于流量类，这实际上是累计流量）
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

  // 计算分类总流量
  const categoryTotals = calculateCategoryTotalBalances(allAccountSummaries)

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

  // 计算流量类特有的交易汇总
  const transactionSummary = calculateFlowTransactionSummary(
    transactions,
    category.type as 'INCOME' | 'EXPENSE'
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
    categoryTotals,
    transactionSummary,
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
 * 计算流量类账户的交易汇总
 * @param transactions 交易列表
 * @param categoryType 分类类型
 * @returns 交易汇总
 */
function calculateFlowTransactionSummary(
  transactions: any[],
  categoryType: 'INCOME' | 'EXPENSE'
): Record<string, {
  income: number
  expense: number
  count: number
  net: number
}> {
  const summary: Record<string, {
    income: number
    expense: number
    count: number
    net: number
  }> = {}

  transactions.forEach(transaction => {
    const currencyCode = transaction.currency.code
    if (!summary[currencyCode]) {
      summary[currencyCode] = {
        income: 0,
        expense: 0,
        count: 0,
        net: 0
      }
    }

    const amount = parseFloat(transaction.amount.toString())
    summary[currencyCode].count++

    // 流量类账户不应该有余额调整交易
    if (transaction.type === 'BALANCE_ADJUSTMENT') {
      console.warn(`流量类分类不应该有余额调整交易: ${transaction.id}`)
      return
    }

    // 根据交易类型统计
    if (transaction.type === 'INCOME') {
      summary[currencyCode].income += amount
      // 对于收入类分类，收入是正向流量
      if (categoryType === 'INCOME') {
        summary[currencyCode].net += amount
      }
    } else if (transaction.type === 'EXPENSE') {
      summary[currencyCode].expense += amount
      // 对于支出类分类，支出是正向流量
      if (categoryType === 'EXPENSE') {
        summary[currencyCode].net += amount
      }
    }
  })

  return summary
}

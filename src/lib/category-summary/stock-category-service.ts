/**
 * 存量类分类汇总服务
 * 专门处理资产(ASSET)和负债(LIABILITY)分类的汇总逻辑
 * 只处理 BALANCE_ADJUSTMENT 类型交易，提供多时间点余额数据
 */

import { prisma } from '@/lib/prisma'
import { calculateAccountBalance } from '@/lib/account-balance'
import { convertMultipleCurrencies } from '@/lib/currency-conversion'
import {
  AccountSummary,
  ChildCategorySummary,
  CategoryWithChildren
} from './types'
import {
  getAllCategoryIds,
  serializeAccountData,
  calculateChildCategoryBalances,
  extractBalanceChangeFromNotes
} from './utils'

/**
 * 计算账户在不同时间点的余额（只处理 BALANCE_ADJUSTMENT 类型）
 * @param account 账户数据
 * @param userId 用户ID
 * @param baseCurrency 本位币
 * @returns 多时间点余额数据
 */
async function calculateHistoricalBalances(
  account: any,
  userId: string,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<{
  currentMonth: Record<string, number>
  lastMonth: Record<string, number>
  yearStart: Record<string, number>
  currentMonthInBaseCurrency: Record<string, number>
  lastMonthInBaseCurrency: Record<string, number>
  yearStartInBaseCurrency: Record<string, number>
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // 时间点定义
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
  const yearStartEnd = new Date(currentYear, 0, 0, 23, 59, 59, 999) // 去年年末

  // 只处理 BALANCE_ADJUSTMENT 类型的交易
  const balanceAdjustments = account.transactions.filter((t: any) =>
    t.type === 'BALANCE_ADJUSTMENT'
  )

  // 计算各时间点的余额
  const currentMonthBalances: Record<string, number> = {}
  const lastMonthBalances: Record<string, number> = {}
  const yearStartBalances: Record<string, number> = {}

  // 按货币分组处理
  const currencyGroups: Record<string, any[]> = {}
  balanceAdjustments.forEach((transaction: any) => {
    const currencyCode = transaction.currency.code
    if (!currencyGroups[currencyCode]) {
      currencyGroups[currencyCode] = []
    }
    currencyGroups[currencyCode].push(transaction)
  })

  // 为每种货币计算余额
  Object.entries(currencyGroups).forEach(([currencyCode, transactions]) => {
    // 按时间排序
    const sortedTransactions = transactions.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 计算各时间点的累计余额
    let yearStartBalance = 0
    let lastMonthBalance = 0
    let currentMonthBalance = 0

    sortedTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
      const actualChange = changeAmount !== null ? changeAmount : parseFloat(transaction.amount.toString())

      // 累计到各时间点
      if (transactionDate <= yearStartEnd) {
        yearStartBalance += actualChange
      }
      if (transactionDate <= lastMonthEnd) {
        lastMonthBalance += actualChange
      }
      if (transactionDate <= thisMonthEnd) {
        currentMonthBalance += actualChange
      }
    })

    yearStartBalances[currencyCode] = yearStartBalance
    lastMonthBalances[currencyCode] = lastMonthBalance
    currentMonthBalances[currencyCode] = currentMonthBalance
  })

  // 货币转换
  const allAmounts = [
    ...Object.entries(currentMonthBalances).map(([currency, amount]) => ({ amount, currency })),
    ...Object.entries(lastMonthBalances).map(([currency, amount]) => ({ amount, currency })),
    ...Object.entries(yearStartBalances).map(([currency, amount]) => ({ amount, currency }))
  ]

  let conversionResults: any[] = []
  if (allAmounts.length > 0) {
    conversionResults = await convertMultipleCurrencies(
      userId,
      allAmounts,
      baseCurrency.code
    )
  }

  // 构建转换后的余额
  const currentMonthInBaseCurrency: Record<string, number> = {}
  const lastMonthInBaseCurrency: Record<string, number> = {}
  const yearStartInBaseCurrency: Record<string, number> = {}

  let resultIndex = 0
  Object.entries(currentMonthBalances).forEach(([currency]) => {
    const result = conversionResults[resultIndex++]
    currentMonthInBaseCurrency[currency] = result?.success ? result.convertedAmount : currentMonthBalances[currency]
  })

  Object.entries(lastMonthBalances).forEach(([currency]) => {
    const result = conversionResults[resultIndex++]
    lastMonthInBaseCurrency[currency] = result?.success ? result.convertedAmount : lastMonthBalances[currency]
  })

  Object.entries(yearStartBalances).forEach(([currency]) => {
    const result = conversionResults[resultIndex++]
    yearStartInBaseCurrency[currency] = result?.success ? result.convertedAmount : yearStartBalances[currency]
  })

  return {
    currentMonth: currentMonthBalances,
    lastMonth: lastMonthBalances,
    yearStart: yearStartBalances,
    currentMonthInBaseCurrency,
    lastMonthInBaseCurrency,
    yearStartInBaseCurrency
  }
}

/**
 * 获取存量类分类汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @returns 存量类分类汇总数据
 */
export async function getStockCategorySummary(
  categoryId: string,
  userId: string
): Promise<{
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
}> {
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

  // 获取用户的本位币设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { baseCurrency: true }
  })

  const baseCurrency = userSettings?.baseCurrency || {
    code: 'CNY',
    symbol: '¥',
    name: '人民币'
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

  // 计算所有账户余额（包含历史余额数据）
  const allAccountSummaries: AccountSummary[] = await Promise.all(
    allAccounts.map(async account => {
      const serializedAccount = serializeAccountData(account)
      const accountBalances = calculateAccountBalance(serializedAccount)

      // 转换为简单的余额记录格式
      const balances: Record<string, number> = {}
      Object.entries(accountBalances).forEach(([currencyCode, balanceData]) => {
        balances[currencyCode] = balanceData.amount
      })

      // 计算历史余额数据
      const historicalBalances = await calculateHistoricalBalances(
        account,
        userId,
        baseCurrency
      )

      return {
        id: account.id,
        name: account.name,
        description: account.description || undefined,
        categoryId: account.categoryId,
        balances,
        transactionCount: account.transactions.filter((t: any) => t.type === 'BALANCE_ADJUSTMENT').length,
        historicalBalances
      }
    })
  )

  // 分离直属账户和子分类账户
  const directAccounts = allAccountSummaries.filter(
    account => account.categoryId === categoryId
  )

  // 为每个子分类计算汇总余额（包含历史余额数据）
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

      // 计算子分类的历史余额汇总
      const childHistoricalBalances = {
        currentMonth: {} as Record<string, number>,
        lastMonth: {} as Record<string, number>,
        yearStart: {} as Record<string, number>,
        currentMonthInBaseCurrency: {} as Record<string, number>,
        lastMonthInBaseCurrency: {} as Record<string, number>,
        yearStartInBaseCurrency: {} as Record<string, number>
      }

      // 汇总子账户的历史余额
      childAccounts.forEach(account => {
        if (account.historicalBalances) {
          // 汇总当月余额
          Object.entries(account.historicalBalances.currentMonth).forEach(([currency, amount]) => {
            childHistoricalBalances.currentMonth[currency] = (childHistoricalBalances.currentMonth[currency] || 0) + amount
          })

          // 汇总上月余额
          Object.entries(account.historicalBalances.lastMonth).forEach(([currency, amount]) => {
            childHistoricalBalances.lastMonth[currency] = (childHistoricalBalances.lastMonth[currency] || 0) + amount
          })

          // 汇总年初余额
          Object.entries(account.historicalBalances.yearStart).forEach(([currency, amount]) => {
            childHistoricalBalances.yearStart[currency] = (childHistoricalBalances.yearStart[currency] || 0) + amount
          })

          // 汇总本币余额
          Object.entries(account.historicalBalances.currentMonthInBaseCurrency).forEach(([currency, amount]) => {
            childHistoricalBalances.currentMonthInBaseCurrency[currency] = (childHistoricalBalances.currentMonthInBaseCurrency[currency] || 0) + amount
          })

          Object.entries(account.historicalBalances.lastMonthInBaseCurrency).forEach(([currency, amount]) => {
            childHistoricalBalances.lastMonthInBaseCurrency[currency] = (childHistoricalBalances.lastMonthInBaseCurrency[currency] || 0) + amount
          })

          Object.entries(account.historicalBalances.yearStartInBaseCurrency).forEach(([currency, amount]) => {
            childHistoricalBalances.yearStartInBaseCurrency[currency] = (childHistoricalBalances.yearStartInBaseCurrency[currency] || 0) + amount
          })
        }
      })

      return {
        id: child.id,
        name: child.name,
        type: child.type,
        balances: childBalances,
        accountCount: childAccounts.length,
        order: child.order,
        historicalBalances: childHistoricalBalances
      }
    })
  )

  return {
    children: childrenWithBalances,
    accounts: directAccounts
  }
}

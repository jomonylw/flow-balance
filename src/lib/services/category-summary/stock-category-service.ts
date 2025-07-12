/**
 * 存量类分类汇总服务
 * 专门处理资产(ASSET)和负债(LIABILITY)分类的汇总逻辑
 * 提供按月分组的、包含所有历史月份的余额数据
 */

import { prisma } from '@/lib/database/connection-manager'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import type {
  ServiceCategoryWithChildren,
  ServiceBalance,
  BaseCurrency,
  MonthlyBalance,
  MonthlyChildCategorySummary,
  MonthlyReport,
} from './types'
import { getAllCategoryIds, extractBalanceChangeFromNotes } from './utils'
import {
  TransactionType,
  type Account,
  type Currency,
  type Transaction,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { AccountType } from '@/types/core/constants'

type BalanceAdjustmentTransaction = {
  date: string | Date
  notes: string | null
  amount: Decimal | number | string
  type: string
  currency: {
    code: string
  }
}

/**
 * 计算账户从首次交易至今的逐月历史余额
 * @param account 账户数据，包含交易
 * @param allMonths 所有需要计算的月份 (YYYY-MM)
 * @param baseCurrency 本位币
 * @param userId 用户ID
 * @returns 按月份 (YYYY-MM) 组织的余额数据
 */
async function calculateMonthlyHistoricalBalances(
  account: Account & {
    currency: Currency | null
    transactions: (Transaction & { currency: Currency })[]
  },
  allMonths: string[],
  baseCurrency: BaseCurrency,
  userId: string
): Promise<Record<string, MonthlyBalance>> {
  const monthlyBalances: Record<string, Record<string, number>> = {}
  const balanceAdjustments = account.transactions.filter(
    t => t.type === TransactionType.BALANCE
  )

  if (balanceAdjustments.length === 0) {
    return {}
  }

  // 按货币分组并排序交易
  const currencyGroups: Record<string, BalanceAdjustmentTransaction[]> = {}
  balanceAdjustments.forEach(transaction => {
    const currencyCode = transaction.currency.code
    if (!currencyGroups[currencyCode]) {
      currencyGroups[currencyCode] = []
    }
    currencyGroups[currencyCode].push(transaction)
  })

  Object.values(currencyGroups).forEach(transactions => {
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  })

  // 为每个月计算余额
  allMonths.forEach(month => {
    const monthEnd = new Date(
      parseInt(month.substring(0, 4)),
      parseInt(month.substring(5, 7)),
      0,
      23,
      59,
      59,
      999
    )
    monthlyBalances[month] = {}

    Object.entries(currencyGroups).forEach(([currencyCode, transactions]) => {
      let balance = 0
      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.date)
        if (transactionDate <= monthEnd) {
          const changeAmount = extractBalanceChangeFromNotes(
            transaction.notes || ''
          )
          balance =
            changeAmount !== null
              ? changeAmount
              : parseFloat(transaction.amount.toString())
        } else {
          break // 交易已排序，后续无需再检查
        }
      }
      monthlyBalances[month][currencyCode] = balance
    })
  })

  // 填充空缺月份的数据
  let lastMonthBalance: Record<string, number> | null = null
  for (const month of allMonths) {
    if (Object.keys(monthlyBalances[month]).length === 0 && lastMonthBalance) {
      monthlyBalances[month] = { ...lastMonthBalance }
    }
    // 如果当前月份有数据，则更新 lastMonthBalance
    if (Object.values(monthlyBalances[month]).some(v => v !== 0)) {
      lastMonthBalance = { ...monthlyBalances[month] }
    }
  }

  // 准备货币转换
  const conversionRequests: {
    amount: number
    currency: string
    month: string
  }[] = []
  allMonths.forEach(month => {
    Object.entries(monthlyBalances[month]).forEach(([currency, amount]) => {
      if (amount !== 0) {
        conversionRequests.push({ amount, currency, month })
      }
    })
  })

  const conversionResults =
    conversionRequests.length > 0
      ? await convertMultipleCurrencies(
          userId,
          conversionRequests,
          baseCurrency.code
        )
      : []

  // 整理最终结果
  const finalBalances: Record<string, MonthlyBalance> = {}
  let conversionIndex = 0
  allMonths.forEach(month => {
    const original: ServiceBalance = {}
    const converted: ServiceBalance = {}
    Object.entries(monthlyBalances[month]).forEach(([currency, amount]) => {
      original[currency] = amount
      if (amount !== 0) {
        const result = conversionResults[conversionIndex++]
        converted[currency] = result?.success ? result.convertedAmount : amount
      } else {
        converted[currency] = 0
      }
    })
    finalBalances[month] = { original, converted }
  })

  return finalBalances
}

/**
 * 获取存量类分类的月度历史汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @param timeRange 时间范围，'lastYear' 表示去年1月1日至今，'all' 表示全部数据
 * @returns 按月倒序排列的报告数组
 */
export async function getStockCategorySummary(
  categoryId: string,
  userId: string,
  timeRange: string = 'lastYear'
): Promise<MonthlyReport[]> {
  // 1. 获取分类和本位币信息
  // prisma instance is already available
  const category = (await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: userId,
      type: { in: ['ASSET', 'LIABILITY'] },
    },
    include: {
      children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
    },
  })) as ServiceCategoryWithChildren | null

  if (!category) {
    throw new Error('存量类分类不存在或无权限访问')
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { baseCurrency: true },
  })
  const baseCurrency = userSettings?.baseCurrency || {
    code: 'CNY',
    symbol: '¥',
    name: '人民币',
  }

  // 2. 计算时间范围
  let dateFilter: { gte?: Date } | undefined = undefined
  if (timeRange === 'lastYear') {
    // 去年1月1日至今
    const lastYear = new Date().getFullYear() - 1
    const startDate = new Date(lastYear, 0, 1) // 去年1月1日
    dateFilter = { gte: startDate }
  }
  // timeRange === 'all' 时不添加日期过滤

  // 3. 获取所有相关账户及其交易
  const allCategoryIds = await getAllCategoryIds(prisma, categoryId)
  const allAccounts = await prisma.account.findMany({
    where: {
      userId: userId,
      categoryId: { in: allCategoryIds },
    },
    include: {
      currency: true,
      transactions: {
        where: {
          type: TransactionType.BALANCE,
          ...(dateFilter && { date: dateFilter }),
        },
        include: { currency: true },
        orderBy: { date: 'asc' },
      },
    },
  })

  // 4. 确定全局月份范围
  let firstTransactionDate = new Date()

  // 根据时间范围设置起始日期
  if (timeRange === 'lastYear') {
    const lastYear = new Date().getFullYear() - 1
    firstTransactionDate = new Date(lastYear, 0, 1) // 去年1月1日
  } else {
    // timeRange === 'all' 时，查找最早的交易日期
    allAccounts.forEach(account => {
      if (account.transactions.length > 0) {
        const accountFirstDate = new Date(account.transactions[0].date)
        if (accountFirstDate < firstTransactionDate) {
          firstTransactionDate = accountFirstDate
        }
      }
    })
  }

  const allMonths: string[] = []
  const now = new Date()
  const startDate = new Date(
    firstTransactionDate.getFullYear(),
    firstTransactionDate.getMonth(),
    1
  )
  while (startDate <= now) {
    allMonths.push(
      `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`
    )
    startDate.setMonth(startDate.getMonth() + 1)
  }

  if (allMonths.length === 0) {
    const month = now.getMonth() + 1
    allMonths.push(`${now.getFullYear()}-${month < 10 ? '0' + month : month}`)
  }

  // 4. 为每个账户计算月度历史余额
  const accountMonthlyBalances: Record<
    string,
    Record<string, MonthlyBalance>
  > = {}
  await Promise.all(
    allAccounts.map(async account => {
      if (account.transactions.length > 0) {
        accountMonthlyBalances[account.id] =
          await calculateMonthlyHistoricalBalances(
            account,
            allMonths,
            baseCurrency,
            userId
          )
      } else {
        // 为没有交易记录的账户创建0金额的月度余额数据
        const zeroBalances: Record<string, MonthlyBalance> = {}
        for (const month of allMonths) {
          zeroBalances[month] = {
            original: { [account.currency.code]: 0 },
            converted: { [baseCurrency.code]: 0 },
          }
        }
        accountMonthlyBalances[account.id] = zeroBalances
      }
    })
  )

  // 5. 按月聚合报告
  const monthlyReports: Record<string, MonthlyReport> = {}

  for (const month of allMonths) {
    const report: MonthlyReport = {
      month,
      childCategories: [],
      directAccounts: [],
    }

    // 聚合子分类数据
    const validChildren = category.children.filter(
      child => child.type === 'ASSET' || child.type === 'LIABILITY'
    )
    await Promise.all(
      validChildren.map(async child => {
        const childCategoryIds = await getAllCategoryIds(prisma, child.id)
        const childAccounts = allAccounts.filter(acc =>
          childCategoryIds.includes(acc.categoryId)
        )

        const summary: MonthlyChildCategorySummary = {
          id: child.id,
          name: child.name,
          type: child.type as AccountType,
          order: child.order,
          accountCount: childAccounts.length,
          balances: { original: {}, converted: {} },
        }

        childAccounts.forEach(acc => {
          const balances = accountMonthlyBalances[acc.id]?.[month]
          if (balances) {
            Object.entries(balances.original).forEach(([currency, amount]) => {
              summary.balances.original[currency] =
                (summary.balances.original[currency] || 0) + amount
            })
            Object.entries(balances.converted).forEach(([currency, amount]) => {
              summary.balances.converted[currency] =
                (summary.balances.converted[currency] || 0) + amount
            })
          }
        })
        report.childCategories.push(summary)
      })
    )

    // 聚合直属账户数据
    const directAccounts = allAccounts.filter(
      acc => acc.categoryId === categoryId
    )
    directAccounts.forEach(acc => {
      const balances = accountMonthlyBalances[acc.id]?.[month]
      const currencyCode = acc.currency?.code || baseCurrency.code
      report.directAccounts.push({
        id: acc.id,
        name: acc.name,
        description: acc.description || undefined,
        categoryId: acc.categoryId,
        balances: balances || {
          original: { [currencyCode]: 0 },
          converted: { [currencyCode]: 0 },
        },
        transactionCount: acc.transactions.length,
      })
    })

    monthlyReports[month] = report
  }

  // 6. 格式化并返回结果
  return Object.values(monthlyReports).sort((a, b) =>
    b.month.localeCompare(a.month)
  )
}

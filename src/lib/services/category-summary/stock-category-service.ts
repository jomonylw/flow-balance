/**
 * 存量类分类汇总服务
 * 专门处理资产(ASSET)和负债(LIABILITY)分类的汇总逻辑
 * 提供按月分组的、包含所有历史月份的余额数据
 *
 * 优化版本：使用数据库聚合查询替代内存计算
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
import {
  extractBalanceChangeFromNotes,
  buildCategoryHierarchyMap,
  getDescendantsFromHierarchyMap,
} from './utils'
import {
  TransactionType,
  type Account,
  type Currency,
  type Transaction,
  // Prisma,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { getMonthlyStockSummary } from '@/lib/database/raw-queries'

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
async function _calculateMonthlyHistoricalBalances(
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
 * 获取存量类分类的月度历史汇总数据 (优化版本)
 * 使用数据库聚合查询替代内存计算，显著提升性能
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

  // 2. 构建分类层级关系图（一次性获取，避免循环查询）
  const hierarchyMap = await buildCategoryHierarchyMap(prisma, userId, [
    'ASSET',
    'LIABILITY',
  ])
  const allCategoryIds = getDescendantsFromHierarchyMap(
    hierarchyMap,
    categoryId
  )

  // 3. 计算时间范围
  let startDate: Date
  const now = new Date()

  if (timeRange === 'lastYear') {
    // 去年1月1日至今
    const lastYear = now.getFullYear() - 1
    startDate = new Date(lastYear, 0, 1) // 去年1月1日
  } else {
    // timeRange === 'all' 时，查找最早的交易日期
    const earliestTransaction = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        account: {
          categoryId: { in: allCategoryIds },
        },
        type: 'BALANCE',
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    startDate = earliestTransaction
      ? new Date(
          earliestTransaction.date.getFullYear(),
          earliestTransaction.date.getMonth(),
          1
        )
      : new Date() // 如果没有交易，使用当前日期
  }

  // 4. 生成月份范围
  const allMonths: string[] = []
  const currentStartDate = new Date(startDate)

  while (currentStartDate <= now) {
    allMonths.push(
      `${currentStartDate.getFullYear()}-${(currentStartDate.getMonth() + 1).toString().padStart(2, '0')}`
    )
    currentStartDate.setMonth(currentStartDate.getMonth() + 1)
  }

  if (allMonths.length === 0) {
    // 如果没有月份，至少包含当前月份
    const month = now.getMonth() + 1
    allMonths.push(`${now.getFullYear()}-${month < 10 ? '0' + month : month}`)
  }

  // 5. 使用统一查询服务获取月末余额数据
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  const monthlyBalanceData = await getMonthlyStockSummary(
    categoryId,
    userId,
    startDate,
    endDate,
    allCategoryIds
  )

  // 7. 处理聚合数据并进行货币转换
  const monthlyDataMap: Record<
    string,
    Record<
      string,
      {
        original: Record<string, number>
        converted: Record<string, number>
        transactionCount: number
      }
    >
  > = {}

  // 初始化所有月份的数据结构
  for (const month of allMonths) {
    monthlyDataMap[month] = {}
  }

  // 按账户和月份组织数据
  const accountDataByMonth: Record<
    string,
    Record<
      string,
      {
        account_id: string
        account_name: string
        account_description: string | null
        category_id: string
        amounts: Record<string, number>
      }
    >
  > = {}

  for (const row of monthlyBalanceData) {
    const {
      month,
      accountId,
      accountName,
      accountDescription,
      categoryId,
      currencyCode,
      balanceAmount,
    } = row

    if (!accountDataByMonth[month]) {
      accountDataByMonth[month] = {}
    }

    if (!accountDataByMonth[month][accountId]) {
      accountDataByMonth[month][accountId] = {
        account_id: accountId,
        account_name: accountName,
        account_description: accountDescription,
        category_id: categoryId,
        amounts: {},
      }
    }

    accountDataByMonth[month][accountId].amounts[currencyCode] = balanceAmount
  }

  // 进行货币转换
  const conversionRequests: Array<{
    amount: number
    currency: string
  }> = []

  for (const month of allMonths) {
    const monthData = accountDataByMonth[month] || {}
    for (const accountData of Object.values(monthData)) {
      for (const [currency, amount] of Object.entries(accountData.amounts)) {
        if (amount !== 0 && currency !== baseCurrency.code) {
          conversionRequests.push({
            amount,
            currency: currency,
          })
        }
      }
    }
  }

  const conversionResults =
    conversionRequests.length > 0
      ? await convertMultipleCurrencies(
          userId,
          conversionRequests,
          baseCurrency.code
        )
      : []

  // 应用转换结果
  let conversionIndex = 0
  for (const month of allMonths) {
    const monthData = accountDataByMonth[month] || {}

    for (const accountData of Object.values(monthData)) {
      const original: Record<string, number> = {}
      const converted: Record<string, number> = {}

      for (const [currency, amount] of Object.entries(accountData.amounts)) {
        original[currency] = amount

        if (amount !== 0) {
          if (currency === baseCurrency.code) {
            // 本位币直接使用原金额
            converted[currency] = amount
          } else {
            // 非本位币转换为本位币，但保持原货币作为键
            const result = conversionResults[conversionIndex++]
            const convertedAmount = result?.success
              ? result.convertedAmount
              : amount
            converted[currency] = convertedAmount
          }
        } else {
          converted[currency] = 0
        }
      }

      monthlyDataMap[month][accountData.account_id] = {
        original,
        converted,
        transactionCount: 0, // 存量账户不统计交易数量
      }
    }
  }

  // 8. 生成月度报告
  const monthlyReports: Record<string, MonthlyReport> = {}

  // 获取所有账户信息（用于构建报告结构）
  const allAccounts = await prisma.account.findMany({
    where: {
      userId: userId,
      categoryId: { in: allCategoryIds },
    },
    select: {
      id: true,
      name: true,
      description: true,
      categoryId: true,
      currency: {
        select: { code: true },
      },
    },
  })

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

    validChildren.forEach(child => {
      const childCategoryIds = getDescendantsFromHierarchyMap(
        hierarchyMap,
        child.id
      )
      const childAccounts = allAccounts.filter(acc =>
        childCategoryIds.includes(acc.categoryId)
      )

      const summary: MonthlyChildCategorySummary = {
        id: child.id,
        name: child.name,
        type: child.type as string, // 转换为字符串类型
        order: child.order,
        accountCount: childAccounts.length,
        balances: { original: {}, converted: {} },
      }

      // 聚合子分类下所有账户的数据
      childAccounts.forEach(acc => {
        const accountData = monthlyDataMap[month]?.[acc.id]
        if (accountData) {
          Object.entries(accountData.original).forEach(([currency, amount]) => {
            summary.balances.original[currency] =
              (summary.balances.original[currency] || 0) + amount
          })
          Object.entries(accountData.converted).forEach(
            ([currency, amount]) => {
              summary.balances.converted[currency] =
                (summary.balances.converted[currency] || 0) + amount
            }
          )
        }
      })

      report.childCategories.push(summary)
    })

    // 聚合直属账户数据
    const directAccounts = allAccounts.filter(
      acc => acc.categoryId === categoryId
    )

    directAccounts.forEach(acc => {
      const accountData = monthlyDataMap[month]?.[acc.id]
      const currencyCode = acc.currency?.code || baseCurrency.code

      report.directAccounts.push({
        id: acc.id,
        name: acc.name,
        categoryId: acc.categoryId,
        balances: accountData
          ? {
              original: accountData.original,
              converted: accountData.converted,
            }
          : {
              original: { [currencyCode]: 0 },
              converted: { [currencyCode]: 0 },
            },
        transactionCount: 0, // 存量账户不统计交易数量
      })
    })

    monthlyReports[month] = report
  }

  // 9. 格式化并返回结果
  return Object.values(monthlyReports).sort((a, b) =>
    b.month.localeCompare(a.month)
  )
}

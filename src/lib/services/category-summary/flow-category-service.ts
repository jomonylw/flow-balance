/**
 * 流量类分类汇总服务
 * 专门处理收入(INCOME)和支出(EXPENSE)分类的汇总逻辑
 * 提供按月分组的、包含所有历史月份的流量数据
 */

import { getPrismaClient } from '@/lib/database/connection-manager'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import type {
  ServiceCategoryWithChildren,
  ServiceBalance,
  BaseCurrency,
  MonthlyBalance,
  MonthlyChildCategorySummary,
  MonthlyReport,
} from './types'
import { getAllCategoryIds } from './utils'
import { Decimal } from '@prisma/client/runtime/library'
import { AccountType } from '@/types/core/constants'

type FlowTransaction = {
  date: string | Date
  amount: Decimal | number | string
  type: 'INCOME' | 'EXPENSE'
  currency: {
    code: string
  }
}

/**
 * 计算账户从首次交易至今的逐月历史流量
 * @param account 账户数据，包含交易
 * @param allMonths 所有需要计算的月份 (YYYY-MM)
 * @param baseCurrency 本位币
 * @param userId 用户ID
 * @returns 按月份 (YYYY-MM) 组织的流量数据
 */
async function calculateMonthlyHistoricalFlows(
  account: { id: string; transactions: FlowTransaction[] },
  allMonths: string[],
  baseCurrency: BaseCurrency,
  userId: string
): Promise<Record<string, MonthlyBalance>> {
  const monthlyFlows: Record<string, Record<string, number>> = {}
  const flowTransactions = account.transactions.filter(
    t => t.type === 'INCOME' || t.type === 'EXPENSE'
  )

  if (flowTransactions.length === 0) {
    return {}
  }

  // 按货币分组并排序交易
  const currencyGroups: Record<string, FlowTransaction[]> = {}
  flowTransactions.forEach(transaction => {
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

  // 为每个月计算当月流量
  allMonths.forEach(month => {
    const year = parseInt(month.substring(0, 4))
    const monthIndex = parseInt(month.substring(5, 7)) - 1 // JavaScript的Date月份是0-indexed
    monthlyFlows[month] = {}

    Object.entries(currencyGroups).forEach(([currencyCode, transactions]) => {
      let monthFlow = 0
      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.date)
        // 检查交易是否在当前月份
        if (
          transactionDate.getFullYear() === year &&
          transactionDate.getMonth() === monthIndex
        ) {
          const amount = parseFloat(transaction.amount.toString())
          // 累计当月流量
          monthFlow += amount
        }
      }
      monthlyFlows[month][currencyCode] = monthFlow
    })
  })

  // 准备货币转换
  const conversionRequests: {
    amount: number
    currency: string
    month: string
  }[] = []
  allMonths.forEach(month => {
    Object.entries(monthlyFlows[month]).forEach(([currency, amount]) => {
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
    Object.entries(monthlyFlows[month]).forEach(([currency, amount]) => {
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
 * 获取流量类分类的月度历史汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @returns 按月倒序排列的报告数组
 */
export async function getFlowCategorySummary(
  categoryId: string,
  userId: string
): Promise<MonthlyReport[]> {
  // 1. 获取分类和本位币信息
  const prisma = await getPrismaClient()
  const category = (await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId: userId,
      type: { in: ['INCOME', 'EXPENSE'] },
    },
    include: {
      children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
    },
  })) as ServiceCategoryWithChildren | null

  if (!category) {
    throw new Error('流量类分类不存在或无权限访问')
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

  // 2. 获取所有相关账户及其交易
  const allCategoryIds = await getAllCategoryIds(prisma, categoryId)
  const allAccounts = await prisma.account.findMany({
    where: {
      userId: userId,
      categoryId: { in: allCategoryIds },
    },
    include: {
      currency: true,
      transactions: {
        where: { type: { in: ['INCOME', 'EXPENSE'] } },
        include: { currency: true },
        orderBy: { date: 'asc' },
      },
    },
  })

  // 3. 确定全局月份范围
  const allMonths: string[] = []
  const now = new Date()

  // 找到最早的交易日期
  const transactionDates: Date[] = []
  allAccounts.forEach(account => {
    if (account.transactions.length > 0) {
      transactionDates.push(new Date(account.transactions[0].date))
    }
  })

  if (transactionDates.length > 0) {
    // 找到最早的日期
    const firstTransactionDate = new Date(
      Math.min(...transactionDates.map(d => d.getTime()))
    )
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
  } else {
    // 如果没有交易，至少包含当前月份
    const month = now.getMonth() + 1
    allMonths.push(`${now.getFullYear()}-${month < 10 ? '0' + month : month}`)
  }

  // 4. 为每个账户计算月度历史流量
  const accountMonthlyFlows: Record<string, Record<string, MonthlyBalance>> = {}
  await Promise.all(
    allAccounts.map(async account => {
      if (account.transactions.length > 0) {
        // 转换交易数据格式以匹配FlowTransaction类型
        const flowTransactions: FlowTransaction[] = account.transactions
          .filter(t => t.type === 'INCOME' || t.type === 'EXPENSE')
          .map(t => ({
            date: t.date,
            amount: t.amount,
            type: t.type as 'INCOME' | 'EXPENSE',
            currency: {
              code: t.currency.code,
            },
          }))

        accountMonthlyFlows[account.id] = await calculateMonthlyHistoricalFlows(
          { id: account.id, transactions: flowTransactions },
          allMonths,
          baseCurrency,
          userId
        )
      } else {
        // 为没有交易记录的账户创建0金额的月度流量数据
        const zeroFlows: Record<string, MonthlyBalance> = {}
        for (const month of allMonths) {
          zeroFlows[month] = {
            original: { [account.currency.code]: 0 },
            converted: { [baseCurrency.code]: 0 },
          }
        }
        accountMonthlyFlows[account.id] = zeroFlows
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
      child => child.type === 'INCOME' || child.type === 'EXPENSE'
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
          const balances = accountMonthlyFlows[acc.id]?.[month]
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
      const balances = accountMonthlyFlows[acc.id]?.[month]
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

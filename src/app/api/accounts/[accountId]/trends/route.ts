import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  subDays,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import type { TransactionWithBasic, Currency } from '@/types/database'
import type { TrendDataPoint } from '@/types/core'

/**
 * 账户趋势数据 API
 * 返回存量/流量账户的历史趋势数据，用于图表展示
 *
 * 查询参数：
 * - range: 'lastMonth' | 'lastYear' | 'all' (默认: 'lastYear')
 * - granularity: 'daily' | 'monthly' (默认: 根据range自动选择)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    if (!account) {
      return notFoundResponse('账户不存在')
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'lastYear'
    const granularity =
      searchParams.get('granularity') ||
      (range === 'lastMonth' ? 'daily' : 'monthly')

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 确定时间范围
    const now = new Date()
    let startDate: Date
    const endDate: Date = now

    switch (range) {
      case 'lastMonth':
        startDate = subDays(now, 30)
        break
      case 'lastYear':
        startDate = subMonths(now, 12)
        break
      case 'all':
        // 获取账户最早的交易日期
        const firstTransaction = await prisma.transaction.findFirst({
          where: { accountId },
          orderBy: { date: 'asc' },
        })
        startDate = firstTransaction
          ? firstTransaction.date
          : subMonths(now, 12)
        break
      default:
        startDate = subMonths(now, 12)
    }

    // 获取账户的所有交易记录
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        currency: true,
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    // 根据账户类型生成不同的趋势数据
    const accountType = account.category?.type

    let trendData: TrendDataPoint[] = []

    if (accountType === 'ASSET' || accountType === 'LIABILITY') {
      // 存量账户：计算余额变动趋势
      trendData = await generateStockAccountTrend(
        accountId,
        transactions,
        startDate,
        endDate,
        granularity,
        baseCurrency,
        user.id
      )
    } else {
      // 流量账户：计算交易流水趋势
      trendData = await generateFlowAccountTrend(
        accountId,
        transactions,
        startDate,
        endDate,
        granularity,
        baseCurrency,
        user.id
      )
    }

    return successResponse({
      account: {
        id: account.id,
        name: account.name,
        type: accountType,
      },
      range,
      granularity,
      baseCurrency,
      data: trendData,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Get account trends error:', error)
    return errorResponse('获取账户趋势数据失败', 500)
  }
}

/**
 * 生成存量账户的余额变动趋势
 */
async function generateStockAccountTrend(
  accountId: string,
  transactions: TransactionWithBasic[],
  startDate: Date,
  endDate: Date,
  granularity: string,
  baseCurrency: Currency | { code: string; symbol: string; name: string },
  userId: string
): Promise<TrendDataPoint[]> {
  const intervals =
    granularity === 'daily'
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : eachMonthOfInterval({ start: startDate, end: endDate })

  const trendData = []
  let runningBalance = 0

  // 获取起始日期之前的初始余额
  const initialTransactions = await prisma.transaction.findMany({
    where: {
      accountId: accountId, // 直接使用accountId而不是从transactions获取
      date: { lt: startDate },
    },
    include: { currency: true },
    orderBy: { date: 'asc' },
  })

  // 计算初始余额
  for (const transaction of initialTransactions) {
    const amount = parseFloat(transaction.amount.toString())
    if (transaction.type === 'BALANCE') {
      // 从备注中提取余额变化
      const balanceChange = extractBalanceChangeFromNotes(transaction.notes)
      if (balanceChange !== null) {
        runningBalance += balanceChange
      } else {
        runningBalance = amount // 直接设置余额
      }
    }
  }

  // 准备货币转换数据
  const amountsToConvert: Array<{ amount: number; currency: string }> = []

  for (const interval of intervals) {
    const intervalStart =
      granularity === 'daily' ? startOfDay(interval) : startOfMonth(interval)
    const intervalEnd =
      granularity === 'daily' ? endOfDay(interval) : endOfMonth(interval)

    // 获取该时间段内的交易
    const intervalTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate >= intervalStart && transactionDate <= intervalEnd
    })

    // 计算该时间段的余额变化
    for (const transaction of intervalTransactions) {
      const amount = parseFloat(transaction.amount.toString())
      if (transaction.type === 'BALANCE') {
        const balanceChange = extractBalanceChangeFromNotes(transaction.notes)
        if (balanceChange !== null) {
          runningBalance += balanceChange
        } else {
          runningBalance = amount
        }
      }
    }

    // 确定货币代码
    const currencyCode =
      intervalTransactions[0]?.currency?.code ||
      transactions[0]?.currency?.code ||
      baseCurrency.code

    // 添加到转换列表
    amountsToConvert.push({
      amount: runningBalance,
      currency: currencyCode,
    })

    trendData.push({
      date: format(
        interval,
        granularity === 'daily' ? 'yyyy-MM-dd' : 'yyyy-MM'
      ),
      originalAmount: runningBalance,
      originalCurrency: currencyCode,
      transactionCount: intervalTransactions.length,
      convertedAmount: 0, // Will be filled by currency conversion
      hasConversionError: false, // Will be filled by currency conversion
    })
  }

  // 批量转换货币
  if (amountsToConvert.length > 0) {
    const conversionResults = await convertMultipleCurrencies(
      userId,
      amountsToConvert,
      baseCurrency.code
    )

    trendData.forEach((item, index) => {
      const conversionResult = conversionResults[index]
      item.convertedAmount = conversionResult.convertedAmount
      item.hasConversionError = !conversionResult.success
    })
  } else {
    // 如果没有数据需要转换，设置默认值
    trendData.forEach(item => {
      item.convertedAmount = item.originalAmount
      item.hasConversionError = false
    })
  }

  return trendData
}

/**
 * 生成流量账户的交易流水趋势
 */
async function generateFlowAccountTrend(
  accountId: string,
  transactions: TransactionWithBasic[],
  startDate: Date,
  endDate: Date,
  granularity: string,
  baseCurrency: Currency | { code: string; symbol: string; name: string },
  userId: string
): Promise<TrendDataPoint[]> {
  const intervals =
    granularity === 'daily'
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : eachMonthOfInterval({ start: startDate, end: endDate })

  const trendData = []
  const amountsToConvert: Array<{ amount: number; currency: string }> = []

  for (const interval of intervals) {
    const intervalStart =
      granularity === 'daily' ? startOfDay(interval) : startOfMonth(interval)
    const intervalEnd =
      granularity === 'daily' ? endOfDay(interval) : endOfMonth(interval)

    // 获取该时间段内的交易
    const intervalTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate >= intervalStart && transactionDate <= intervalEnd
    })

    // 计算该时间段的交易总额
    let totalAmount = 0
    for (const transaction of intervalTransactions) {
      const amount = parseFloat(transaction.amount.toString())
      if (transaction.type === 'INCOME' || transaction.type === 'EXPENSE') {
        totalAmount += amount
      }
    }

    // 确定货币代码
    const currencyCode =
      intervalTransactions[0]?.currency?.code || baseCurrency.code

    // 添加到转换列表
    amountsToConvert.push({
      amount: totalAmount,
      currency: currencyCode,
    })

    trendData.push({
      date: format(
        interval,
        granularity === 'daily' ? 'yyyy-MM-dd' : 'yyyy-MM'
      ),
      originalAmount: totalAmount,
      originalCurrency: currencyCode,
      transactionCount: intervalTransactions.length,
      convertedAmount: 0, // Will be filled by currency conversion
      hasConversionError: false, // Will be filled by currency conversion
    })
  }

  // 批量转换货币
  if (amountsToConvert.length > 0) {
    const conversionResults = await convertMultipleCurrencies(
      userId,
      amountsToConvert,
      baseCurrency.code
    )

    trendData.forEach((item, index) => {
      const conversionResult = conversionResults[index]
      item.convertedAmount = conversionResult.convertedAmount
      item.hasConversionError = !conversionResult.success
    })
  } else {
    // 如果没有数据需要转换，设置默认值
    trendData.forEach(item => {
      item.convertedAmount = item.originalAmount
      item.hasConversionError = false
    })
  }

  return trendData
}

/**
 * 从交易备注中提取余额变化金额
 */
function extractBalanceChangeFromNotes(notes: string | null): number | null {
  if (!notes) return null

  // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
  const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
}

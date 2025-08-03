import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import { getCommonError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import {
  getAccountTrendData,
  getFlowAccountTrendData,
} from '@/lib/database/queries'
import { subMonths, subDays } from 'date-fns'
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
      name: 'Chinese Yuan',
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

    // 根据账户类型生成不同的趋势数据
    const accountType = account.category?.type
    let trendData: TrendDataPoint[] = []

    if (accountType === 'ASSET' || accountType === 'LIABILITY') {
      // 存量账户：使用优化的数据库查询计算余额变动趋势
      const stockTrendData = await getAccountTrendData(
        user.id,
        accountId,
        startDate,
        endDate,
        granularity as 'daily' | 'monthly'
      )

      // 准备货币转换数据
      const amountsToConvert = stockTrendData.map(item => ({
        amount: item.balance,
        currency: item.currencyCode,
      }))

      // 批量转换货币
      let conversionResults: Array<{
        convertedAmount: number
        success: boolean
      }> = []
      if (amountsToConvert.length > 0) {
        conversionResults = await convertMultipleCurrencies(
          user.id,
          amountsToConvert,
          baseCurrency.code
        )
      }

      // 转换为API响应格式
      trendData = stockTrendData.map((item, index) => {
        const conversionResult = conversionResults[index] || {
          convertedAmount: item.balance,
          success: true,
        }
        return {
          date: item.period,
          originalAmount: item.balance,
          originalCurrency: item.currencyCode,
          transactionCount: item.transactionCount,
          convertedAmount: conversionResult.convertedAmount,
          hasConversionError: !conversionResult.success,
        }
      })
    } else {
      // 流量账户：使用优化的数据库查询计算交易流水趋势
      const flowTrendData = await getFlowAccountTrendData(
        user.id,
        accountId,
        startDate,
        endDate,
        granularity as 'daily' | 'monthly'
      )

      // 准备货币转换数据
      const amountsToConvert = flowTrendData.map(item => ({
        amount: item.totalAmount,
        currency: item.currencyCode,
      }))

      // 批量转换货币
      let conversionResults: Array<{
        convertedAmount: number
        success: boolean
      }> = []
      if (amountsToConvert.length > 0) {
        conversionResults = await convertMultipleCurrencies(
          user.id,
          amountsToConvert,
          baseCurrency.code
        )
      }

      // 转换为API响应格式
      trendData = flowTrendData.map((item, index) => {
        const conversionResult = conversionResults[index] || {
          convertedAmount: item.totalAmount,
          success: true,
        }
        return {
          date: item.period,
          originalAmount: item.totalAmount,
          originalCurrency: item.currencyCode,
          transactionCount: item.transactionCount,
          convertedAmount: conversionResult.convertedAmount,
          hasConversionError: !conversionResult.success,
        }
      })
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
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}

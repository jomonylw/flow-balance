import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import { getCommonError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { getAccountBalanceDetails } from '@/lib/services/dashboard-query.service'
import {
  convertMultipleCurrencies,
  type ConversionResult,
} from '@/lib/services/currency.service'
import { normalizeEndOfDay } from '@/lib/utils/date-range'

/**
 * 批量获取所有账户余额 - 高效版本
 * 使用数据库聚合查询替代内存计算，大幅提升性能
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountIds = searchParams
      .get('accountIds')
      ?.split(',')
      .filter(Boolean)

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

    // 获取当前日期，确保不包含未来的交易记录
    const now = new Date()
    const nowEndOfDay = normalizeEndOfDay(now)

    // 使用高效的数据库聚合查询获取账户余额详情
    // 对于流量账户，默认获取当前月份的数据
    const daysSinceMonthStart = now.getDate()

    let accountDetails = await getAccountBalanceDetails(
      user.id,
      nowEndOfDay,
      daysSinceMonthStart // 使用当前月份已过天数作为期间
    )

    // 如果指定了特定账户ID，则过滤结果
    if (accountIds && accountIds.length > 0) {
      accountDetails = accountDetails.filter(account =>
        accountIds.includes(account.id)
      )
    }

    // 构建响应数据结构
    const accountBalances: Record<
      string,
      {
        id: string
        name: string
        categoryId: string
        accountType: string
        balances: Record<
          string,
          {
            amount: number
            currency: {
              code: string
              symbol: string
              name: string
            }
          }
        >
        balanceInBaseCurrency: number
      }
    > = {}

    // 准备货币转换数据
    const amountsToConvert: Array<{ amount: number; currency: string }> = []

    // 获取所有需要的货币信息
    const currencyCodes = new Set<string>()
    accountDetails.forEach(account => {
      Object.keys(account.balances).forEach(currencyCode => {
        currencyCodes.add(currencyCode)
      })
    })

    // 批量获取货币信息
    const currencies = await prisma.currency.findMany({
      where: {
        code: {
          in: Array.from(currencyCodes),
        },
      },
    })

    const currencyMap = new Map(
      currencies.map(currency => [
        currency.code,
        {
          code: currency.code,
          symbol: currency.symbol,
          name: currency.name,
        },
      ])
    )

    // 处理账户数据
    for (const account of accountDetails) {
      const balancesForResponse: Record<
        string,
        {
          amount: number
          currency: {
            code: string
            symbol: string
            name: string
          }
        }
      > = {}

      Object.entries(account.balances).forEach(([currencyCode, amount]) => {
        const currency = currencyMap.get(currencyCode) || {
          code: currencyCode,
          symbol: currencyCode,
          name: currencyCode,
        }

        balancesForResponse[currencyCode] = {
          amount,
          currency,
        }

        // 收集需要转换的金额
        if (currencyCode !== baseCurrency.code) {
          amountsToConvert.push({
            amount,
            currency: currencyCode,
          })
        }
      })

      accountBalances[account.id] = {
        id: account.id,
        name: account.name,
        categoryId: account.category.id,
        accountType: account.category.type,
        balances: balancesForResponse,
        balanceInBaseCurrency: 0, // 稍后计算
      }
    }

    // 批量转换货币到本位币
    let conversionResults: ConversionResult[] = []
    if (amountsToConvert.length > 0) {
      try {
        conversionResults = await convertMultipleCurrencies(
          user.id,
          amountsToConvert,
          baseCurrency.code
        )
      } catch (error) {
        console.error('Currency conversion error:', error)
      }
    }

    // 计算每个账户的本位币余额
    Object.values(accountBalances).forEach(account => {
      let totalInBaseCurrency = 0

      Object.entries(account.balances).forEach(
        ([currencyCode, balanceData]) => {
          if (currencyCode === baseCurrency.code) {
            // 本位币直接累加
            totalInBaseCurrency += balanceData.amount
          } else {
            // 查找转换结果
            const conversionResult = conversionResults.find(
              result =>
                result.originalAmount === balanceData.amount &&
                result.fromCurrency === currencyCode
            )

            if (conversionResult && conversionResult.success) {
              totalInBaseCurrency += conversionResult.convertedAmount
            } else {
              // 转换失败时，记录警告但不影响其他数据
              console.warn(
                `Failed to convert ${balanceData.amount} ${currencyCode} to ${baseCurrency.code} for account ${account.name}`
              )
            }
          }
        }
      )

      account.balanceInBaseCurrency = totalInBaseCurrency
    })

    return successResponse({
      accountBalances,
      baseCurrency,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get account balances error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}

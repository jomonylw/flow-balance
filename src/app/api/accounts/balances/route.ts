import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { calculateAccountBalance } from '@/lib/account-balance'
import { convertMultipleCurrencies } from '@/lib/currency-conversion'

// 这个函数已经不需要了，因为我们现在使用统一的 calculateAccountBalance 函数
// 保留注释以便理解之前的逻辑
// function calculateCurrentMonthFlow(account: any): Record<string, any> {
//   // 之前的逻辑：计算当前月份的流量汇总
//   // 现在由 calculateAccountBalance 统一处理
// }

// 批量获取所有账户余额
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountIds = searchParams.get('accountIds')?.split(',').filter(Boolean)

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    // 构建查询条件
    const whereCondition: any = {
      userId: user.id
    }

    // 如果指定了账户ID，则只获取这些账户
    if (accountIds && accountIds.length > 0) {
      whereCondition.id = {
        in: accountIds
      }
    }

    // 获取所有账户及其交易数据
    const accounts = await prisma.account.findMany({
      where: whereCondition,
      include: {
        category: true,
        transactions: {
          include: {
            currency: true
          },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // 批量计算所有账户余额
    const accountBalances: Record<string, {
      id: string
      name: string
      categoryId: string
      accountType: string
      balances: Record<string, {
        amount: number
        currency: {
          code: string
          symbol: string
          name: string
        }
      }>
      balanceInBaseCurrency: number
    }> = {}

    // 准备货币转换数据
    const amountsToConvert: Array<{ amount: number; currency: string }> = []

    for (const account of accounts) {
      const accountType = account.category?.type || 'ASSET'

      // 序列化账户数据，将 Decimal 转换为 number
      const serializedAccount = {
        ...account,
        transactions: account.transactions.map(transaction => ({
          ...transaction,
          amount: parseFloat(transaction.amount.toString()),
          date: transaction.date.toISOString()
        }))
      }

      let balances: Record<string, any> = {}

      if (accountType === 'ASSET' || accountType === 'LIABILITY') {
        // 存量账户：获取最新余额
        balances = calculateAccountBalance(serializedAccount)
      } else {
        // 流量账户：计算当前月份的流量汇总
        // 使用期间计算，默认为当前月份
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        balances = calculateAccountBalance(serializedAccount, {
          periodStart,
          periodEnd,
          usePeriodCalculation: true
        })
      }

      // 转换为API响应格式
      const balancesForResponse: Record<string, {
        amount: number
        currency: {
          code: string
          symbol: string
          name: string
        }
      }> = {}

      Object.entries(balances).forEach(([currencyCode, balanceData]) => {
        balancesForResponse[currencyCode] = {
          amount: balanceData.amount,
          currency: balanceData.currency
        }

        // 收集需要转换的金额
        if (currencyCode !== baseCurrency.code) {
          amountsToConvert.push({
            amount: balanceData.amount,
            currency: currencyCode
          })
        }
      })

      accountBalances[account.id] = {
        id: account.id,
        name: account.name,
        categoryId: account.categoryId,
        accountType,
        balances: balancesForResponse,
        balanceInBaseCurrency: 0 // 稍后计算
      }
    }

    // 批量转换货币到本位币
    let conversionResults: any[] = []
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

      Object.entries(account.balances).forEach(([currencyCode, balanceData]) => {
        if (currencyCode === baseCurrency.code) {
          // 本位币直接累加
          totalInBaseCurrency += balanceData.amount
        } else {
          // 查找转换结果
          const conversionResult = conversionResults.find(result =>
            result.originalAmount === balanceData.amount &&
            result.fromCurrency === currencyCode
          )

          if (conversionResult && conversionResult.success) {
            totalInBaseCurrency += conversionResult.convertedAmount
          } else {
            // 转换失败时，记录警告但不影响其他数据
            console.warn(`Failed to convert ${balanceData.amount} ${currencyCode} to ${baseCurrency.code} for account ${account.name}`)
          }
        }
      })

      account.balanceInBaseCurrency = totalInBaseCurrency
    })

    return successResponse({
      accountBalances,
      baseCurrency,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Get account balances error:', error)
    return errorResponse('获取账户余额失败', 500)
  }
}

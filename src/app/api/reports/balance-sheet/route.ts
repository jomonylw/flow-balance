import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { TransactionType, AccountType } from '@/types/core/constants'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { calculateAccountBalance } from '@/lib/services/account.service'

/**
 * 个人资产负债表 API
 * 反映特定时间点的资产、负债和净资产状况（存量概念）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString()
    const targetDate = new Date(asOfDate)

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

    // 获取所有账户及其交易（截止到指定日期）
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          where: {
            date: {
              lte: targetDate,
            },
          },
          include: {
            currency: true,
          },
        },
      },
    })

    // 按账户类型分组计算余额
    const balanceSheet = {
      assets: {
        categories: {} as Record<
          string,
          {
            categoryName: string
            accounts: Array<{
              id: string
              name: string
              balance: number
              currency: { code: string; symbol: string; name: string }
              balanceInBaseCurrency?: number
              conversionRate?: number
              conversionSuccess?: boolean
              conversionError?: string
            }>
            totalByCurrency: Record<string, number>
            totalInBaseCurrency?: number
          }
        >,
        totalByCurrency: {} as Record<string, number>,
      },
      liabilities: {
        categories: {} as Record<
          string,
          {
            categoryName: string
            accounts: Array<{
              id: string
              name: string
              balance: number
              currency: { code: string; symbol: string; name: string }
              balanceInBaseCurrency?: number
              conversionRate?: number
              conversionSuccess?: boolean
              conversionError?: string
            }>
            totalByCurrency: Record<string, number>
            totalInBaseCurrency?: number
          }
        >,
        totalByCurrency: {} as Record<string, number>,
      },
      equity: {} as Record<string, number>,
    }

    accounts.forEach(account => {
      // 只处理资产和负债类账户（存量账户）
      if (
        !account.category.type ||
        !['ASSET', 'LIABILITY'].includes(account.category.type)
      ) {
        return
      }

      // 序列化账户数据，将 Decimal 转换为 number，并映射交易类型
      const serializedAccount = {
        ...account,
        category: account.category
          ? {
              id: account.category.id,
              name: account.category.name,
              type: account.category.type as AccountType | undefined,
            }
          : {
              id: 'unknown',
              name: 'Unknown',
              type: undefined,
            },
        transactions: account.transactions.map(transaction => ({
          id: transaction.id,
          type: transaction.type as TransactionType,
          amount: parseFloat(transaction.amount.toString()),
          date: transaction.date.toISOString(),
          description: transaction.description,
          notes: transaction.notes,
          currency: {
            code: transaction.currency.code,
            symbol: transaction.currency.symbol,
            name: transaction.currency.name,
          },
        })),
      }

      // 使用专业的余额计算服务，传入截止日期
      const accountBalances = calculateAccountBalance(serializedAccount, {
        asOfDate: targetDate,
        validateData: true,
      })

      // 将账户按类别分组
      Object.entries(accountBalances).forEach(([currencyCode, balanceData]) => {
        const balance = balanceData.amount

        if (Math.abs(balance) < 0.01) return // 忽略接近零的余额

        const accountInfo = {
          id: account.id,
          name: account.name,
          balance,
          currency: balanceData.currency,
        }

        const categoryId = account.category.id
        const categoryName = account.category.name
        const accountType = account.category.type

        if (accountType === AccountType.ASSET) {
          // 初始化资产类别
          if (!balanceSheet.assets.categories[categoryId]) {
            balanceSheet.assets.categories[categoryId] = {
              categoryName,
              accounts: [],
              totalByCurrency: {},
            }
          }

          balanceSheet.assets.categories[categoryId].accounts.push(accountInfo)

          if (
            !balanceSheet.assets.categories[categoryId].totalByCurrency[
              currencyCode
            ]
          ) {
            balanceSheet.assets.categories[categoryId].totalByCurrency[
              currencyCode
            ] = 0
          }
          balanceSheet.assets.categories[categoryId].totalByCurrency[
            currencyCode
          ] += balance

          // 累计到总资产
          if (!balanceSheet.assets.totalByCurrency[currencyCode]) {
            balanceSheet.assets.totalByCurrency[currencyCode] = 0
          }
          balanceSheet.assets.totalByCurrency[currencyCode] += balance
        } else if (accountType === AccountType.LIABILITY) {
          // 初始化负债类别
          if (!balanceSheet.liabilities.categories[categoryId]) {
            balanceSheet.liabilities.categories[categoryId] = {
              categoryName,
              accounts: [],
              totalByCurrency: {},
            }
          }

          balanceSheet.liabilities.categories[categoryId].accounts.push(
            accountInfo
          )

          if (
            !balanceSheet.liabilities.categories[categoryId].totalByCurrency[
              currencyCode
            ]
          ) {
            balanceSheet.liabilities.categories[categoryId].totalByCurrency[
              currencyCode
            ] = 0
          }
          balanceSheet.liabilities.categories[categoryId].totalByCurrency[
            currencyCode
          ] += balance

          // 累计到总负债
          if (!balanceSheet.liabilities.totalByCurrency[currencyCode]) {
            balanceSheet.liabilities.totalByCurrency[currencyCode] = 0
          }
          balanceSheet.liabilities.totalByCurrency[currencyCode] += balance
        }
      })
    })

    // 计算净资产（所有者权益）
    const allCurrencies = new Set([
      ...Object.keys(balanceSheet.assets.totalByCurrency),
      ...Object.keys(balanceSheet.liabilities.totalByCurrency),
    ])

    allCurrencies.forEach(currencyCode => {
      const totalAssets = balanceSheet.assets.totalByCurrency[currencyCode] || 0
      const totalLiabilities =
        balanceSheet.liabilities.totalByCurrency[currencyCode] || 0
      balanceSheet.equity[currencyCode] = totalAssets - totalLiabilities
    })

    // 货币转换到本位币 - 增强版本，包含账户和类别级别的转换
    let baseCurrencyTotals = {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
    }

    try {
      // 收集所有需要转换的金额（包括账户级别）
      const allAmountsToConvert: Array<{
        amount: number
        currency: string
        type: 'asset' | 'liability'
        categoryId: string
        accountId: string
      }> = []

      // 收集资产账户的转换数据
      Object.entries(balanceSheet.assets.categories).forEach(
        ([categoryId, category]) => {
          category.accounts.forEach(account => {
            if (
              Math.abs(account.balance) > 0.01 &&
              account.currency.code !== baseCurrency.code
            ) {
              allAmountsToConvert.push({
                amount: Math.abs(account.balance),
                currency: account.currency.code,
                type: 'asset',
                categoryId,
                accountId: account.id,
              })
            }
          })
        }
      )

      // 收集负债账户的转换数据
      Object.entries(balanceSheet.liabilities.categories).forEach(
        ([categoryId, category]) => {
          category.accounts.forEach(account => {
            if (
              Math.abs(account.balance) > 0.01 &&
              account.currency.code !== baseCurrency.code
            ) {
              allAmountsToConvert.push({
                amount: Math.abs(account.balance),
                currency: account.currency.code,
                type: 'liability',
                categoryId,
                accountId: account.id,
              })
            }
          })
        }
      )

      // 执行批量货币转换
      const conversionResults = await convertMultipleCurrencies(
        user.id,
        allAmountsToConvert.map(item => ({
          amount: item.amount,
          currency: item.currency,
        })),
        baseCurrency.code,
        targetDate
      )

      // 应用转换结果到账户
      conversionResults.forEach((result, index) => {
        const conversionData = allAmountsToConvert[index]
        const convertedAmount = result.success
          ? result.convertedAmount
          : result.originalAmount

        if (conversionData.type === 'asset') {
          // 找到对应的资产账户并添加转换信息
          const category =
            balanceSheet.assets.categories[conversionData.categoryId]
          const account = category.accounts.find(
            acc => acc.id === conversionData.accountId
          )
          if (account) {
            account.balanceInBaseCurrency = convertedAmount
            account.conversionRate = result.exchangeRate
            account.conversionSuccess = result.success
            account.conversionError = result.error
          }
        } else {
          // 找到对应的负债账户并添加转换信息
          const category =
            balanceSheet.liabilities.categories[conversionData.categoryId]
          const account = category.accounts.find(
            acc => acc.id === conversionData.accountId
          )
          if (account) {
            account.balanceInBaseCurrency = convertedAmount
            account.conversionRate = result.exchangeRate
            account.conversionSuccess = result.success
            account.conversionError = result.error
          }
        }
      })

      // 为本位币账户设置转换信息
      Object.values(balanceSheet.assets.categories).forEach(category => {
        category.accounts.forEach(account => {
          if (account.currency.code === baseCurrency.code) {
            account.balanceInBaseCurrency = Math.abs(account.balance)
            account.conversionRate = 1
            account.conversionSuccess = true
          }
        })
      })

      Object.values(balanceSheet.liabilities.categories).forEach(category => {
        category.accounts.forEach(account => {
          if (account.currency.code === baseCurrency.code) {
            account.balanceInBaseCurrency = Math.abs(account.balance)
            account.conversionRate = 1
            account.conversionSuccess = true
          }
        })
      })

      // 计算类别级别的本位币总计
      Object.values(balanceSheet.assets.categories).forEach(category => {
        category.totalInBaseCurrency = category.accounts.reduce(
          (sum, account) => sum + (account.balanceInBaseCurrency || 0),
          0
        )
      })

      Object.values(balanceSheet.liabilities.categories).forEach(category => {
        category.totalInBaseCurrency = category.accounts.reduce(
          (sum, account) => sum + (account.balanceInBaseCurrency || 0),
          0
        )
      })

      // 计算总计
      baseCurrencyTotals.totalAssets = Object.values(
        balanceSheet.assets.categories
      ).reduce((sum, category) => sum + (category.totalInBaseCurrency || 0), 0)

      baseCurrencyTotals.totalLiabilities = Object.values(
        balanceSheet.liabilities.categories
      ).reduce((sum, category) => sum + (category.totalInBaseCurrency || 0), 0)

      baseCurrencyTotals.netWorth =
        baseCurrencyTotals.totalAssets - baseCurrencyTotals.totalLiabilities
    } catch (error) {
      console.error('货币转换失败:', error)
      // 如果转换失败，使用原始数据（仅限本位币）
      baseCurrencyTotals = {
        totalAssets:
          balanceSheet.assets.totalByCurrency[baseCurrency.code] || 0,
        totalLiabilities:
          balanceSheet.liabilities.totalByCurrency[baseCurrency.code] || 0,
        netWorth: balanceSheet.equity[baseCurrency.code] || 0,
      }
    }

    return successResponse({
      balanceSheet,
      asOfDate: targetDate.toISOString(),
      baseCurrency,
      summary: {
        totalAssets: balanceSheet.assets.totalByCurrency,
        totalLiabilities: balanceSheet.liabilities.totalByCurrency,
        netWorth: balanceSheet.equity,
        baseCurrencyTotals,
      },
    })
  } catch (error) {
    console.error('Get balance sheet error:', error)
    return errorResponse('获取资产负债表失败', 500)
  }
}

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { convertMultipleCurrencies } from '@/lib/currency-conversion'
import { calculateAccountBalance } from '@/lib/account-balance'



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
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    // 获取所有账户及其交易（截止到指定日期）
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          where: {
            date: {
              lte: targetDate
            }
          },
          include: {
            currency: true
          }
        }
      }
    })

    // 按账户类型分组计算余额
    const balanceSheet = {
      assets: {
        categories: {} as Record<string, {
          categoryName: string
          accounts: any[]
          totalByCurrency: Record<string, number>
        }>,
        totalByCurrency: {} as Record<string, number>
      },
      liabilities: {
        categories: {} as Record<string, {
          categoryName: string
          accounts: any[]
          totalByCurrency: Record<string, number>
        }>,
        totalByCurrency: {} as Record<string, number>
      },
      equity: {} as Record<string, number>
    }

    accounts.forEach(account => {
      // 只处理资产和负债类账户（存量账户）
      if (!account.category.type || !['ASSET', 'LIABILITY'].includes(account.category.type)) {
        return
      }

      // 序列化账户数据，将 Decimal 转换为 number
      const serializedAccount = {
        ...account,
        transactions: account.transactions.map(transaction => ({
          ...transaction,
          amount: parseFloat(transaction.amount.toString()),
          date: transaction.date.toISOString()
        }))
      }

      // 使用专业的余额计算服务，传入截止日期
      const accountBalances = calculateAccountBalance(serializedAccount, {
        asOfDate: targetDate,
        validateData: true
      })

      // 将账户按类别分组
      Object.entries(accountBalances).forEach(([currencyCode, balanceData]) => {
        const balance = balanceData.amount

        if (Math.abs(balance) < 0.01) return // 忽略接近零的余额

        const accountInfo = {
          id: account.id,
          name: account.name,
          balance,
          currency: balanceData.currency
        }

        const categoryId = account.category.id
        const categoryName = account.category.name
        const accountType = account.category.type

        if (accountType === 'ASSET') {
          // 初始化资产类别
          if (!balanceSheet.assets.categories[categoryId]) {
            balanceSheet.assets.categories[categoryId] = {
              categoryName,
              accounts: [],
              totalByCurrency: {}
            }
          }

          balanceSheet.assets.categories[categoryId].accounts.push(accountInfo)

          if (!balanceSheet.assets.categories[categoryId].totalByCurrency[currencyCode]) {
            balanceSheet.assets.categories[categoryId].totalByCurrency[currencyCode] = 0
          }
          balanceSheet.assets.categories[categoryId].totalByCurrency[currencyCode] += balance

          // 累计到总资产
          if (!balanceSheet.assets.totalByCurrency[currencyCode]) {
            balanceSheet.assets.totalByCurrency[currencyCode] = 0
          }
          balanceSheet.assets.totalByCurrency[currencyCode] += balance

        } else if (accountType === 'LIABILITY') {
          // 初始化负债类别
          if (!balanceSheet.liabilities.categories[categoryId]) {
            balanceSheet.liabilities.categories[categoryId] = {
              categoryName,
              accounts: [],
              totalByCurrency: {}
            }
          }

          balanceSheet.liabilities.categories[categoryId].accounts.push(accountInfo)

          if (!balanceSheet.liabilities.categories[categoryId].totalByCurrency[currencyCode]) {
            balanceSheet.liabilities.categories[categoryId].totalByCurrency[currencyCode] = 0
          }
          balanceSheet.liabilities.categories[categoryId].totalByCurrency[currencyCode] += balance

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
      ...Object.keys(balanceSheet.liabilities.totalByCurrency)
    ])

    allCurrencies.forEach(currencyCode => {
      const totalAssets = balanceSheet.assets.totalByCurrency[currencyCode] || 0
      const totalLiabilities = balanceSheet.liabilities.totalByCurrency[currencyCode] || 0
      balanceSheet.equity[currencyCode] = totalAssets - totalLiabilities
    })

    // 货币转换到本位币
    let baseCurrencyTotals = {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0
    }

    try {
      // 准备转换数据
      const assetAmounts = Object.entries(balanceSheet.assets.totalByCurrency)
        .filter(([_, amount]) => Math.abs(amount) > 0.01)
        .map(([currencyCode, amount]) => ({
          amount: Math.abs(amount),
          currency: currencyCode
        }))

      const liabilityAmounts = Object.entries(balanceSheet.liabilities.totalByCurrency)
        .filter(([_, amount]) => Math.abs(amount) > 0.01)
        .map(([currencyCode, amount]) => ({
          amount: Math.abs(amount),
          currency: currencyCode
        }))

      // 执行货币转换
      const [assetConversions, liabilityConversions] = await Promise.all([
        convertMultipleCurrencies(user.id, assetAmounts, baseCurrency.code, targetDate),
        convertMultipleCurrencies(user.id, liabilityAmounts, baseCurrency.code, targetDate)
      ])

      // 计算本位币总计
      baseCurrencyTotals.totalAssets = assetConversions.reduce((sum, result) =>
        sum + (result.success ? result.convertedAmount : result.originalAmount), 0
      )

      baseCurrencyTotals.totalLiabilities = liabilityConversions.reduce((sum, result) =>
        sum + (result.success ? result.convertedAmount : result.originalAmount), 0
      )

      baseCurrencyTotals.netWorth = baseCurrencyTotals.totalAssets - baseCurrencyTotals.totalLiabilities

    } catch (error) {
      console.error('货币转换失败:', error)
      // 如果转换失败，使用原始数据（仅限本位币）
      baseCurrencyTotals = {
        totalAssets: balanceSheet.assets.totalByCurrency[baseCurrency.code] || 0,
        totalLiabilities: balanceSheet.liabilities.totalByCurrency[baseCurrency.code] || 0,
        netWorth: balanceSheet.equity[baseCurrency.code] || 0
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
        baseCurrencyTotals
      }
    })
  } catch (error) {
    console.error('Get balance sheet error:', error)
    return errorResponse('获取资产负债表失败', 500)
  }
}

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

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
        current: {} as Record<string, { accounts: any[], total: number }>,
        nonCurrent: {} as Record<string, { accounts: any[], total: number }>,
        total: {} as Record<string, number>
      },
      liabilities: {
        current: {} as Record<string, { accounts: any[], total: number }>,
        nonCurrent: {} as Record<string, { accounts: any[], total: number }>,
        total: {} as Record<string, number>
      },
      equity: {} as Record<string, number>
    }

    accounts.forEach(account => {
      // 只处理资产和负债类账户（存量账户）
      if (!account.category.type || !['ASSET', 'LIABILITY'].includes(account.category.type)) {
        return
      }

      // 计算账户余额（按币种）
      const balances: Record<string, number> = {}
      
      account.transactions.forEach(transaction => {
        const currencyCode = transaction.currency.code
        if (!balances[currencyCode]) {
          balances[currencyCode] = 0
        }
        
        const amount = parseFloat(transaction.amount.toString()) // 确保转换为number

        // 资产类账户：收入增加，支出减少
        // 负债类账户：借入（收入）增加，偿还（支出）减少
        if (transaction.type === 'INCOME') {
          balances[currencyCode] += amount
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode] -= amount
        }
        // 转账交易需要特殊处理，这里简化处理
      })

      // 将账户分类到资产负债表的相应部分
      Object.entries(balances).forEach(([currencyCode, balance]) => {
        if (Math.abs(balance) < 0.01) return // 忽略接近零的余额

        const accountInfo = {
          id: account.id,
          name: account.name,
          category: account.category.name,
          balance,
          currency: account.transactions.find(t => t.currency.code === currencyCode)?.currency
        }

        if (account.category.type === 'ASSET') {
          // 资产分类（简化版本，实际应用中可以更细分）
          const isCurrentAsset = ['现金', '银行存款', '活期存款', '货币基金'].some(keyword => 
            account.category.name.includes(keyword) || account.name.includes(keyword)
          )
          
          const assetType = isCurrentAsset ? 'current' : 'nonCurrent'
          
          if (!balanceSheet.assets[assetType][currencyCode]) {
            balanceSheet.assets[assetType][currencyCode] = { accounts: [], total: 0 }
          }
          
          balanceSheet.assets[assetType][currencyCode].accounts.push(accountInfo)
          balanceSheet.assets[assetType][currencyCode].total += balance
          
          if (!balanceSheet.assets.total[currencyCode]) {
            balanceSheet.assets.total[currencyCode] = 0
          }
          balanceSheet.assets.total[currencyCode] += balance
          
        } else if (account.category.type === 'LIABILITY') {
          // 负债分类
          const isCurrentLiability = ['信用卡', '短期贷款', '应付'].some(keyword => 
            account.category.name.includes(keyword) || account.name.includes(keyword)
          )
          
          const liabilityType = isCurrentLiability ? 'current' : 'nonCurrent'
          
          if (!balanceSheet.liabilities[liabilityType][currencyCode]) {
            balanceSheet.liabilities[liabilityType][currencyCode] = { accounts: [], total: 0 }
          }
          
          balanceSheet.liabilities[liabilityType][currencyCode].accounts.push(accountInfo)
          balanceSheet.liabilities[liabilityType][currencyCode].total += balance
          
          if (!balanceSheet.liabilities.total[currencyCode]) {
            balanceSheet.liabilities.total[currencyCode] = 0
          }
          balanceSheet.liabilities.total[currencyCode] += balance
        }
      })
    })

    // 计算净资产（所有者权益）
    Object.keys(balanceSheet.assets.total).forEach(currencyCode => {
      const totalAssets = balanceSheet.assets.total[currencyCode] || 0
      const totalLiabilities = balanceSheet.liabilities.total[currencyCode] || 0
      balanceSheet.equity[currencyCode] = totalAssets - totalLiabilities
    })

    return successResponse({
      balanceSheet,
      asOfDate: targetDate.toISOString(),
      baseCurrency,
      summary: {
        totalAssets: balanceSheet.assets.total,
        totalLiabilities: balanceSheet.liabilities.total,
        netWorth: balanceSheet.equity
      }
    })
  } catch (error) {
    console.error('Get balance sheet error:', error)
    return errorResponse('获取资产负债表失败', 500)
  }
}

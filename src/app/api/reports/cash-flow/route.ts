import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

/**
 * 个人现金流量表 API
 * 反映特定时期内的现金流入和流出情况（流量概念）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()
    
    const periodStart = new Date(startDate)
    const periodEnd = new Date(endDate)

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    // 获取期间内的所有交易
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        account: {
          include: {
            category: true
          }
        },
        category: true,
        currency: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 现金流量表结构
    const cashFlow = {
      operatingActivities: {
        inflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        outflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        net: {} as Record<string, number>
      },
      investingActivities: {
        inflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        outflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        net: {} as Record<string, number>
      },
      financingActivities: {
        inflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        outflows: {} as Record<string, { categories: Record<string, { amount: number, transactions: any[] }>, total: number }>,
        net: {} as Record<string, number>
      },
      netCashFlow: {} as Record<string, number>
    }

    // 分类现金流活动的函数
    const categorizeActivity = (transaction: any) => {
      const categoryName = transaction.category.name.toLowerCase()
      const accountCategoryName = transaction.account.category.name.toLowerCase()
      
      // 投资活动：投资相关的现金流
      if (categoryName.includes('投资') || categoryName.includes('理财') || 
          accountCategoryName.includes('投资') || accountCategoryName.includes('股票') ||
          accountCategoryName.includes('基金') || accountCategoryName.includes('债券')) {
        return 'investing'
      }
      
      // 筹资活动：借贷相关的现金流
      if (categoryName.includes('贷款') || categoryName.includes('借款') || 
          accountCategoryName.includes('贷款') || accountCategoryName.includes('信用卡') ||
          categoryName.includes('还款')) {
        return 'financing'
      }
      
      // 经营活动：日常收支
      return 'operating'
    }

    // 处理每笔交易
    transactions.forEach(transaction => {
      const currencyCode = transaction.currency.code
      const amount = parseFloat(transaction.amount.toString()) // 确保转换为number
      const activityType = categorizeActivity(transaction)
      const categoryName = transaction.category.name
      
      // 确定是流入还是流出
      let isInflow = false
      let isOutflow = false
      
      if (transaction.type === 'INCOME') {
        isInflow = true
      } else if (transaction.type === 'EXPENSE') {
        isOutflow = true
      }
      // 转账交易需要特殊处理，这里简化处理
      
      if (!isInflow && !isOutflow) return

      // 选择活动类型
      let activity
      switch (activityType) {
        case 'investing':
          activity = cashFlow.investingActivities
          break
        case 'financing':
          activity = cashFlow.financingActivities
          break
        default:
          activity = cashFlow.operatingActivities
      }

      const flowType = isInflow ? 'inflows' : 'outflows'
      
      // 初始化数据结构
      if (!activity[flowType][currencyCode]) {
        activity[flowType][currencyCode] = { categories: {}, total: 0 }
      }
      
      if (!activity[flowType][currencyCode].categories[categoryName]) {
        activity[flowType][currencyCode].categories[categoryName] = { amount: 0, transactions: [] }
      }
      
      // 累加金额
      activity[flowType][currencyCode].categories[categoryName].amount += amount
      activity[flowType][currencyCode].categories[categoryName].transactions.push({
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount,
        account: transaction.account.name
      })
      
      activity[flowType][currencyCode].total += amount
    })

    // 计算各活动的净现金流
    const calculateNetFlow = (activity: any) => {
      const currencies = new Set([
        ...Object.keys(activity.inflows),
        ...Object.keys(activity.outflows)
      ])
      
      currencies.forEach(currencyCode => {
        const inflow = activity.inflows[currencyCode]?.total || 0
        const outflow = activity.outflows[currencyCode]?.total || 0
        activity.net[currencyCode] = inflow - outflow
      })
    }

    calculateNetFlow(cashFlow.operatingActivities)
    calculateNetFlow(cashFlow.investingActivities)
    calculateNetFlow(cashFlow.financingActivities)

    // 计算总净现金流
    const allCurrencies = new Set([
      ...Object.keys(cashFlow.operatingActivities.net),
      ...Object.keys(cashFlow.investingActivities.net),
      ...Object.keys(cashFlow.financingActivities.net)
    ])

    allCurrencies.forEach(currencyCode => {
      const operatingNet = cashFlow.operatingActivities.net[currencyCode] || 0
      const investingNet = cashFlow.investingActivities.net[currencyCode] || 0
      const financingNet = cashFlow.financingActivities.net[currencyCode] || 0
      
      cashFlow.netCashFlow[currencyCode] = operatingNet + investingNet + financingNet
    })

    return successResponse({
      cashFlow,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      },
      baseCurrency,
      summary: {
        operatingCashFlow: cashFlow.operatingActivities.net,
        investingCashFlow: cashFlow.investingActivities.net,
        financingCashFlow: cashFlow.financingActivities.net,
        netCashFlow: cashFlow.netCashFlow
      }
    })
  } catch (error) {
    console.error('Get cash flow statement error:', error)
    return errorResponse('获取现金流量表失败', 500)
  }
}

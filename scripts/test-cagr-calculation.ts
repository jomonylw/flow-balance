import { prisma } from '../src/lib/database/prisma'
import { calculateHistoricalCAGR } from '../src/lib/services/cagr.service'
import { AccountType } from '../src/types/core/constants'

async function testCAGRCalculation() {
  try {
    console.log('测试CAGR计算功能...')

    // 获取演示用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('未找到演示用户')
      return
    }

    console.log(`用户: ${user.email}`)

    // 获取用户的基础货币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (!userSettings?.baseCurrency) {
      console.log('用户未设置基础货币')
      return
    }

    const baseCurrency = {
      code: userSettings.baseCurrency.code,
      symbol: userSettings.baseCurrency.symbol,
      name: userSettings.baseCurrency.name,
    }

    console.log(`基础货币: ${baseCurrency.code}`)

    // 获取资产和负债账户
    const [assetAccounts, liabilityAccounts] = await Promise.all([
      prisma.account.findMany({
        where: {
          userId: user.id,
          category: { type: AccountType.ASSET },
        },
        include: {
          category: true,
          currency: true,
          transactions: {
            include: { currency: true },
          },
        },
      }),
      prisma.account.findMany({
        where: {
          userId: user.id,
          category: { type: AccountType.LIABILITY },
        },
        include: {
          category: true,
          currency: true,
          transactions: {
            include: { currency: true },
          },
        },
      }),
    ])

    console.log(`资产账户数量: ${assetAccounts.length}`)
    console.log(`负债账户数量: ${liabilityAccounts.length}`)

    // 转换为服务层需要的格式
    const serviceAssetAccounts = assetAccounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        id: account.category.id,
        name: account.category.name,
        type: account.category.type as AccountType,
      },
      transactions: account.transactions.map(t => ({
        type: t.type as any,
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency,
      })),
    }))

    const serviceLiabilityAccounts = liabilityAccounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        id: account.category.id,
        name: account.category.name,
        type: account.category.type as AccountType,
      },
      transactions: account.transactions.map(t => ({
        type: t.type as any,
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency,
      })),
    }))

    // 计算CAGR
    console.log('\n开始计算CAGR...')
    const cagrResult = await calculateHistoricalCAGR(
      user.id,
      serviceAssetAccounts,
      serviceLiabilityAccounts,
      baseCurrency
    )

    console.log('\n=== CAGR计算结果 ===')
    console.log(`是否有效: ${cagrResult.isValid}`)
    console.log(`CAGR: ${cagrResult.cagr.toFixed(2)}%`)
    console.log(`开始日期: ${cagrResult.startDate?.toISOString().split('T')[0] || '无'}`)
    console.log(`结束日期: ${cagrResult.endDate.toISOString().split('T')[0]}`)
    console.log(`计算年数: ${cagrResult.years.toFixed(2)}年`)
    console.log(`初始净资产: ${cagrResult.initialNetWorth.toFixed(2)} ${baseCurrency.code}`)
    console.log(`当前净资产: ${cagrResult.currentNetWorth.toFixed(2)} ${baseCurrency.code}`)
    console.log(`期间净投入: ${cagrResult.totalNetContribution.toFixed(2)} ${baseCurrency.code}`)
    console.log(`调整后增长: ${cagrResult.adjustedGrowth.toFixed(2)} ${baseCurrency.code}`)
    console.log(`说明: ${cagrResult.message || '无'}`)

    if (cagrResult.isValid) {
      console.log('\n=== 计算验证 ===')
      const expectedFinalValue = cagrResult.initialNetWorth + cagrResult.adjustedGrowth
      const calculatedFinalValue = cagrResult.initialNetWorth * Math.pow(1 + cagrResult.cagr / 100, cagrResult.years)
      console.log(`预期最终价值: ${expectedFinalValue.toFixed(2)}`)
      console.log(`CAGR计算的最终价值: ${calculatedFinalValue.toFixed(2)}`)
      console.log(`差异: ${Math.abs(expectedFinalValue - calculatedFinalValue).toFixed(2)}`)
    }

    // 获取一些统计信息
    const totalTransactions = await prisma.transaction.count({
      where: { userId: user.id },
    })

    const earliestTransaction = await prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    console.log('\n=== 数据统计 ===')
    console.log(`总交易数: ${totalTransactions}`)
    console.log(`最早交易: ${earliestTransaction?.date.toISOString().split('T')[0] || '无'}`)

  } catch (error) {
    console.error('测试CAGR计算失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testCAGRCalculation()

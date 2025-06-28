/**
 * 测试资产负债率计算
 */

import { PrismaClient } from '@prisma/client'
import { 
  calculateTotalBalanceWithConversion,
} from '../src/lib/services/account.service'
import { TransactionType, AccountType } from '../src/types/core/constants'

const prisma = new PrismaClient()

async function testDebtToAssetRatio() {
  try {
    console.log('🔍 测试资产负债率计算...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

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

    // 获取账户余额汇总
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true,
          },
        },
      },
    })

    // 转换账户数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        ...account.category,
        type: account.category?.type as AccountType | undefined,
      },
      transactions: account.transactions.map(t => ({
        type: t.type as TransactionType,
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency,
      })),
    }))

    // 分离存量类账户
    const stockAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === AccountType.ASSET ||
        account.category?.type === AccountType.LIABILITY
    )

    // 获取当前日期
    const now = new Date()

    // 计算总资产和总负债
    const assetAccountsForTotal = stockAccounts.filter(
      account => account.category?.type === AccountType.ASSET
    )
    const liabilityAccountsForTotal = stockAccounts.filter(
      account => account.category?.type === AccountType.LIABILITY
    )

    const totalAssetsResult = await calculateTotalBalanceWithConversion(
      user.id,
      assetAccountsForTotal,
      baseCurrency,
      { asOfDate: now }
    )

    const totalLiabilitiesResult = await calculateTotalBalanceWithConversion(
      user.id,
      liabilityAccountsForTotal,
      baseCurrency,
      { asOfDate: now }
    )

    console.log('📊 资产负债率计算测试:')
    console.log(`  本位币: ${baseCurrency.code} (${baseCurrency.symbol})`)
    console.log(`  总资产: ${baseCurrency.symbol}${totalAssetsResult.totalInBaseCurrency.toFixed(2)}`)
    console.log(`  总负债: ${baseCurrency.symbol}${totalLiabilitiesResult.totalInBaseCurrency.toFixed(2)}`)
    
    // 计算净资产
    const netWorth = totalAssetsResult.totalInBaseCurrency - totalLiabilitiesResult.totalInBaseCurrency
    console.log(`  净资产: ${netWorth >= 0 ? '+' : '-'}${baseCurrency.symbol}${Math.abs(netWorth).toFixed(2)}`)

    // 计算资产负债率
    const debtToAssetRatio = totalAssetsResult.totalInBaseCurrency > 0
      ? (totalLiabilitiesResult.totalInBaseCurrency / totalAssetsResult.totalInBaseCurrency) * 100
      : 0

    console.log(`  资产负债率: ${debtToAssetRatio.toFixed(2)}%`)

    // 验证计算逻辑
    console.log('\n🔧 计算验证:')
    console.log(`  公式: (总负债 / 总资产) × 100%`)
    console.log(`  计算: (${totalLiabilitiesResult.totalInBaseCurrency.toFixed(2)} / ${totalAssetsResult.totalInBaseCurrency.toFixed(2)}) × 100%`)
    console.log(`  结果: ${debtToAssetRatio.toFixed(2)}%`)

    // 健康度评估
    console.log('\n📈 财务健康度评估:')
    if (debtToAssetRatio <= 30) {
      console.log('  ✅ 优秀 - 资产负债率低于30%，财务状况良好')
    } else if (debtToAssetRatio <= 50) {
      console.log('  ⚠️  良好 - 资产负债率在30%-50%之间，需要适度控制负债')
    } else if (debtToAssetRatio <= 70) {
      console.log('  ⚠️  警告 - 资产负债率在50%-70%之间，负债压力较大')
    } else {
      console.log('  🚨 危险 - 资产负债率超过70%，需要紧急降低负债')
    }

    // 模拟前端显示格式
    console.log('\n🖥️  前端显示格式:')
    console.log(`  净资产: ${netWorth >= 0 ? '+' : '-'}${baseCurrency.symbol}${Math.abs(netWorth).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`  资产负债率: ${debtToAssetRatio.toFixed(2)}%`)

    console.log('\n✅ 测试完成!')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDebtToAssetRatio()

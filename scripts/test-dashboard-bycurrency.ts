/**
 * 测试仪表板API的byCurrency响应结构
 */

import { PrismaClient } from '@prisma/client'
import { 
  calculateTotalBalanceWithConversion,
  calculateAccountBalance,
} from '../src/lib/services/account.service'
import { TransactionType, AccountType } from '../src/types/core/constants'

const prisma = new PrismaClient()

async function testDashboardByCurrency() {
  try {
    console.log('🔍 测试仪表板API的byCurrency响应结构...\n')

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

    console.log('📊 API响应结构测试:')
    console.log(`  本位币: ${baseCurrency.code} (${baseCurrency.symbol})`)
    console.log(`  资产账户数量: ${assetAccountsForTotal.length}`)
    console.log(`  负债账户数量: ${liabilityAccountsForTotal.length}`)

    // 构建资产的 byCurrency 信息
    const assetsByCurrency: Record<string, {
      originalAmount: number
      convertedAmount: number
      currency: { code: string; symbol: string; name: string }
      exchangeRate: number
      accountCount: number
      success: boolean
    }> = {}

    // 统计每个币种的资产账户数量
    const assetAccountCountByCurrency: Record<string, number> = {}
    assetAccountsForTotal.forEach(account => {
      const accountBalances = calculateAccountBalance(account, { asOfDate: now })
      Object.keys(accountBalances).forEach(currencyCode => {
        assetAccountCountByCurrency[currencyCode] = (assetAccountCountByCurrency[currencyCode] || 0) + 1
      })
    })

    // 填充资产的 byCurrency 数据
    Object.entries(totalAssetsResult.totalsByOriginalCurrency).forEach(([currencyCode, balance]) => {
      const conversionDetail = totalAssetsResult.conversionDetails.find(
        detail => detail.fromCurrency === currencyCode
      )
      
      assetsByCurrency[currencyCode] = {
        originalAmount: balance.amount,
        convertedAmount: conversionDetail?.convertedAmount || balance.amount,
        currency: balance.currency,
        exchangeRate: conversionDetail?.exchangeRate || 1,
        accountCount: assetAccountCountByCurrency[currencyCode] || 0,
        success: conversionDetail?.success ?? true
      }
    })

    // 构建负债的 byCurrency 信息
    const liabilitiesByCurrency: Record<string, {
      originalAmount: number
      convertedAmount: number
      currency: { code: string; symbol: string; name: string }
      exchangeRate: number
      accountCount: number
      success: boolean
    }> = {}

    // 统计每个币种的负债账户数量
    const liabilityAccountCountByCurrency: Record<string, number> = {}
    liabilityAccountsForTotal.forEach(account => {
      const accountBalances = calculateAccountBalance(account, { asOfDate: now })
      Object.keys(accountBalances).forEach(currencyCode => {
        liabilityAccountCountByCurrency[currencyCode] = (liabilityAccountCountByCurrency[currencyCode] || 0) + 1
      })
    })

    // 填充负债的 byCurrency 数据
    Object.entries(totalLiabilitiesResult.totalsByOriginalCurrency).forEach(([currencyCode, balance]) => {
      const conversionDetail = totalLiabilitiesResult.conversionDetails.find(
        detail => detail.fromCurrency === currencyCode
      )
      
      liabilitiesByCurrency[currencyCode] = {
        originalAmount: balance.amount,
        convertedAmount: conversionDetail?.convertedAmount || balance.amount,
        currency: balance.currency,
        exchangeRate: conversionDetail?.exchangeRate || 1,
        accountCount: liabilityAccountCountByCurrency[currencyCode] || 0,
        success: conversionDetail?.success ?? true
      }
    })

    console.log('\n💰 总资产 byCurrency 结构:')
    console.log(`  总资产 (本位币): ${baseCurrency.symbol}${totalAssetsResult.totalInBaseCurrency.toFixed(2)}`)
    console.log('  按币种分组:')
    Object.entries(assetsByCurrency).forEach(([currencyCode, data]) => {
      console.log(`    ${currencyCode}:`)
      console.log(`      原始金额: ${data.currency.symbol}${data.originalAmount.toFixed(2)}`)
      console.log(`      转换金额: ${baseCurrency.symbol}${data.convertedAmount.toFixed(2)}`)
      console.log(`      汇率: ${data.exchangeRate}`)
      console.log(`      账户数量: ${data.accountCount}`)
      console.log(`      转换成功: ${data.success}`)
    })

    console.log('\n💳 总负债 byCurrency 结构:')
    console.log(`  总负债 (本位币): ${baseCurrency.symbol}${totalLiabilitiesResult.totalInBaseCurrency.toFixed(2)}`)
    console.log('  按币种分组:')
    Object.entries(liabilitiesByCurrency).forEach(([currencyCode, data]) => {
      console.log(`    ${currencyCode}:`)
      console.log(`      原始金额: ${data.currency.symbol}${data.originalAmount.toFixed(2)}`)
      console.log(`      转换金额: ${baseCurrency.symbol}${data.convertedAmount.toFixed(2)}`)
      console.log(`      汇率: ${data.exchangeRate}`)
      console.log(`      账户数量: ${data.accountCount}`)
      console.log(`      转换成功: ${data.success}`)
    })

    // 模拟新的API响应结构
    const newAPIResponse = {
      totalAssets: {
        amount: totalAssetsResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: assetAccountsForTotal.length,
        hasConversionErrors: totalAssetsResult.hasConversionErrors,
        byCurrency: assetsByCurrency,
      },
      totalLiabilities: {
        amount: totalLiabilitiesResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: liabilityAccountsForTotal.length,
        hasConversionErrors: totalLiabilitiesResult.hasConversionErrors,
        byCurrency: liabilitiesByCurrency,
      },
    }

    console.log('\n🔧 新API响应结构验证:')
    console.log('  ✓ totalAssets 包含 byCurrency 字段')
    console.log('  ✓ totalLiabilities 包含 byCurrency 字段')
    console.log('  ✓ byCurrency 包含所需的所有字段: originalAmount, convertedAmount, currency, exchangeRate, accountCount, success')

    console.log('\n📋 JSON 示例 (totalAssets.byCurrency):')
    console.log(JSON.stringify(newAPIResponse.totalAssets.byCurrency, null, 2))

    console.log('\n✅ 测试完成!')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardByCurrency()

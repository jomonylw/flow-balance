/**
 * 直接测试API响应结构
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'

const prisma = new PrismaClient()

async function testAPIResponse() {
  try {
    console.log('🔍 测试API响应结构...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    // 获取用户设置和本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })
    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    // 获取所有账户及其交易
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: { currency: true },
          orderBy: [
            { date: 'desc' },
            { updatedAt: 'desc' }
          ]
        }
      }
    })

    // 转换账户数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: account.category,
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency
      }))
    }))

    // 分离存量类账户和流量类账户
    const stockAccounts = accountsForCalculation.filter(account =>
      account.category?.type === 'ASSET' || account.category?.type === 'LIABILITY'
    )

    // 计算净资产（只包含存量类账户）
    const totalBalanceResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccounts,
      baseCurrency
    )

    // 计算总资产和总负债（本位币）
    const assetAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'ASSET')
    const liabilityAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'LIABILITY')

    const totalAssetsResult = await calculateTotalBalanceWithConversion(
      user.id,
      assetAccountsForTotal,
      baseCurrency
    )

    const totalLiabilitiesResult = await calculateTotalBalanceWithConversion(
      user.id,
      liabilityAccountsForTotal,
      baseCurrency
    )

    console.log('📊 API响应数据结构:')
    console.log('=' .repeat(50))

    const apiResponse = {
      netWorth: {
        amount: totalBalanceResult.totalInBaseCurrency,
        currency: baseCurrency,
        byCurrency: totalBalanceResult.totalsByOriginalCurrency,
        hasConversionErrors: totalBalanceResult.hasConversionErrors
      },
      totalAssets: {
        amount: totalAssetsResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: assetAccountsForTotal.length,
        hasConversionErrors: totalAssetsResult.hasConversionErrors
      },
      totalLiabilities: {
        amount: totalLiabilitiesResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: liabilityAccountsForTotal.length,
        hasConversionErrors: totalLiabilitiesResult.hasConversionErrors
      }
    }

    console.log('净资产:')
    console.log(`  金额: ${apiResponse.netWorth.currency.symbol}${apiResponse.netWorth.amount.toFixed(2)}`)
    console.log(`  币种: ${apiResponse.netWorth.currency.code}`)
    console.log(`  转换错误: ${apiResponse.netWorth.hasConversionErrors}`)

    console.log('\n总资产:')
    console.log(`  金额: ${apiResponse.totalAssets.currency.symbol}${apiResponse.totalAssets.amount.toFixed(2)}`)
    console.log(`  账户数量: ${apiResponse.totalAssets.accountCount}`)
    console.log(`  转换错误: ${apiResponse.totalAssets.hasConversionErrors}`)

    console.log('\n总负债:')
    console.log(`  金额: ${apiResponse.totalLiabilities.currency.symbol}${apiResponse.totalLiabilities.amount.toFixed(2)}`)
    console.log(`  账户数量: ${apiResponse.totalLiabilities.accountCount}`)
    console.log(`  转换错误: ${apiResponse.totalLiabilities.hasConversionErrors}`)

    console.log('\n🧮 验证计算:')
    console.log(`  总资产 - 总负债 = ${apiResponse.totalAssets.amount.toFixed(2)} - ${apiResponse.totalLiabilities.amount.toFixed(2)} = ${(apiResponse.totalAssets.amount - apiResponse.totalLiabilities.amount).toFixed(2)}`)
    console.log(`  净资产 = ${apiResponse.netWorth.amount.toFixed(2)}`)
    
    const calculationMatch = Math.abs((apiResponse.totalAssets.amount - apiResponse.totalLiabilities.amount) - apiResponse.netWorth.amount) < 0.01
    console.log(`  计算一致性: ${calculationMatch ? '✅ 正确' : '❌ 错误'}`)

    console.log('\n📋 前端显示预期:')
    console.log(`  总资产: ${apiResponse.totalAssets.currency.symbol}${apiResponse.totalAssets.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`  总负债: ${apiResponse.totalLiabilities.currency.symbol}${apiResponse.totalLiabilities.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`  净资产: ${apiResponse.netWorth.amount >= 0 ? '+' : ''}${apiResponse.netWorth.currency.symbol}${apiResponse.netWorth.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

    console.log('\n✅ 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIResponse()

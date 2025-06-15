/**
 * 测试API响应结构
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'

const prisma = new PrismaClient()

async function testAPIStructure() {
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
          orderBy: { date: 'desc' }
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
    const flowAccounts = accountsForCalculation.filter(account =>
      account.category?.type === 'INCOME' || account.category?.type === 'EXPENSE'
    )

    // 分离资产和负债账户
    const assetAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'ASSET')
    const liabilityAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'LIABILITY')

    // 计算总资产和总负债（本位币）
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

    // 计算净资产 = 总资产 - 总负债
    const netWorthAmount = totalAssetsResult.totalInBaseCurrency - totalLiabilitiesResult.totalInBaseCurrency
    const netWorthHasErrors = totalAssetsResult.hasConversionErrors || totalLiabilitiesResult.hasConversionErrors

    // 构建API响应结构
    const apiResponse = {
      success: true,
      data: {
        netWorth: {
          amount: netWorthAmount,
          currency: baseCurrency,
          hasConversionErrors: netWorthHasErrors
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
    }

    console.log('📊 API响应结构:')
    console.log(JSON.stringify(apiResponse, null, 2))

    console.log('\n🧮 前端应该显示:')
    console.log(`总资产: ${apiResponse.data.totalAssets.currency.symbol}${apiResponse.data.totalAssets.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`总负债: ${apiResponse.data.totalLiabilities.currency.symbol}${apiResponse.data.totalLiabilities.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`净资产: ${apiResponse.data.netWorth.amount >= 0 ? '+' : ''}${apiResponse.data.netWorth.currency.symbol}${apiResponse.data.netWorth.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

    // 检查前端组件逻辑
    console.log('\n🔧 前端组件逻辑检查:')
    
    const summaryData = apiResponse.data
    
    // 模拟前端组件的条件检查
    console.log(`summaryData.totalAssets 存在: ${!!summaryData.totalAssets}`)
    console.log(`summaryData.totalAssets.amount: ${summaryData.totalAssets?.amount}`)
    console.log(`summaryData.totalAssets.currency: ${JSON.stringify(summaryData.totalAssets?.currency)}`)
    
    console.log(`summaryData.totalLiabilities 存在: ${!!summaryData.totalLiabilities}`)
    console.log(`summaryData.totalLiabilities.amount: ${summaryData.totalLiabilities?.amount}`)
    console.log(`summaryData.totalLiabilities.currency: ${JSON.stringify(summaryData.totalLiabilities?.currency)}`)

    // 模拟前端显示逻辑
    if (summaryData.totalAssets) {
      const totalAssetsDisplay = `${summaryData.totalAssets.currency.symbol}${summaryData.totalAssets.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      console.log(`前端总资产显示: ${totalAssetsDisplay}`)
    } else {
      console.log('前端总资产显示: ¥0.00 (因为 totalAssets 不存在)')
    }

    if (summaryData.totalLiabilities) {
      const totalLiabilitiesDisplay = `${summaryData.totalLiabilities.currency.symbol}${summaryData.totalLiabilities.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      console.log(`前端总负债显示: ${totalLiabilitiesDisplay}`)
    } else {
      console.log('前端总负债显示: ¥0.00 (因为 totalLiabilities 不存在)')
    }

    console.log('\n✅ 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIStructure()

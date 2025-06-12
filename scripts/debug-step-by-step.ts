/**
 * 逐步调试账户余额计算
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'

const prisma = new PrismaClient()

async function debugStepByStep() {
  try {
    console.log('🔍 逐步调试账户余额计算...\n')

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

    // 获取一个具体的资产账户进行详细调试
    const testAccount = await prisma.account.findFirst({
      where: { 
        userId: user.id,
        name: 'test'
      },
      include: {
        category: true,
        transactions: {
          include: { currency: true },
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!testAccount) {
      console.log('❌ 未找到test账户')
      return
    }

    console.log('📊 test账户详细信息:')
    console.log(`  账户ID: ${testAccount.id}`)
    console.log(`  账户名称: ${testAccount.name}`)
    console.log(`  账户类型: ${testAccount.category?.type}`)
    console.log(`  账户货币: ${testAccount.currencyCode}`)
    console.log(`  交易数量: ${testAccount.transactions.length}`)

    // 显示所有交易
    console.log('\n📋 所有交易:')
    testAccount.transactions.forEach((t, index) => {
      console.log(`  ${index + 1}. ${t.date.toISOString().split('T')[0]} ${t.type} ${t.currency.symbol}${parseFloat(t.amount.toString()).toFixed(2)} (ID: ${t.id})`)
    })

    // 序列化账户数据（模拟API中的逻辑）
    const serializedAccount = {
      id: testAccount.id,
      name: testAccount.name,
      category: {
        name: testAccount.category?.name || '',
        type: testAccount.category?.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      },
      transactions: testAccount.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency
      }))
    }

    console.log('\n🧮 序列化后的账户数据:')
    console.log(`  账户名称: ${serializedAccount.name}`)
    console.log(`  账户类型: ${serializedAccount.category.type}`)
    console.log(`  交易数量: ${serializedAccount.transactions.length}`)

    // 计算账户余额
    console.log('\n💰 计算账户余额:')
    const balances = calculateAccountBalance(serializedAccount)
    
    console.log(`  余额结果:`)
    if (Object.keys(balances).length === 0) {
      console.log('    ❌ 没有计算出任何余额')
    } else {
      Object.values(balances).forEach(balance => {
        console.log(`    ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
      })
    }

    // 测试 calculateTotalBalanceWithConversion
    console.log('\n🔄 测试汇率转换:')
    const conversionResult = await calculateTotalBalanceWithConversion(
      user.id,
      [serializedAccount],
      baseCurrency
    )

    console.log(`  转换结果:`)
    console.log(`    本位币总额: ${baseCurrency.symbol}${conversionResult.totalInBaseCurrency.toFixed(2)}`)
    console.log(`    转换错误: ${conversionResult.hasConversionErrors}`)
    console.log(`    原币种余额:`)
    Object.values(conversionResult.totalsByOriginalCurrency).forEach(balance => {
      console.log(`      ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
    })

    // 检查汇率转换详情
    if (conversionResult.conversionDetails.length > 0) {
      console.log(`    转换详情:`)
      conversionResult.conversionDetails.forEach(detail => {
        console.log(`      ${detail.fromCurrency} -> ${detail.targetCurrency}: ${detail.originalAmount} * ${detail.exchangeRate} = ${detail.convertedAmount} (成功: ${detail.success})`)
      })
    }

    // 获取所有资产账户进行批量测试
    console.log('\n🏦 批量测试所有资产账户:')
    const assetAccounts = await prisma.account.findMany({
      where: { 
        userId: user.id,
        category: {
          type: 'ASSET'
        }
      },
      include: {
        category: true,
        transactions: {
          include: { currency: true },
          orderBy: { date: 'desc' }
        }
      }
    })

    const serializedAssetAccounts = assetAccounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        name: account.category?.name || '',
        type: account.category?.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      },
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency
      }))
    }))

    console.log(`  资产账户数量: ${serializedAssetAccounts.length}`)

    const totalAssetsResult = await calculateTotalBalanceWithConversion(
      user.id,
      serializedAssetAccounts,
      baseCurrency
    )

    console.log(`  总资产计算结果:`)
    console.log(`    本位币总额: ${baseCurrency.symbol}${totalAssetsResult.totalInBaseCurrency.toFixed(2)}`)
    console.log(`    转换错误: ${totalAssetsResult.hasConversionErrors}`)

    // 逐个检查每个资产账户的余额
    console.log(`\n  各资产账户余额:`)
    for (const account of serializedAssetAccounts) {
      const accountBalances = calculateAccountBalance(account)
      const hasBalance = Object.values(accountBalances).some(balance => Math.abs(balance.amount) > 0.01)
      
      if (hasBalance) {
        console.log(`    ✓ ${account.name}:`)
        Object.values(accountBalances).forEach(balance => {
          console.log(`      ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        })
      } else {
        console.log(`    ❌ ${account.name}: 无余额`)
      }
    }

    console.log('\n✅ 调试完成!')

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugStepByStep()

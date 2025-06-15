/**
 * 测试仪表板计算逻辑
 * 验证存量/流量账户的计算是否正确
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'
import { getStockCategorySummary } from '../src/lib/category-summary/stock-category-service'
import { getFlowCategorySummary } from '../src/lib/category-summary/flow-category-service'

const prisma = new PrismaClient()

async function testDashboardCalculations() {
  try {
    console.log('🔍 开始测试仪表板计算逻辑...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 获取用户设置和本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })
    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }
    console.log(`💰 本位币: ${baseCurrency.code} (${baseCurrency.symbol})`)

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

    console.log(`\n📊 账户总数: ${accounts.length}`)

    // 按账户类型分组
    const accountsByType = {
      ASSET: accounts.filter(acc => acc.category?.type === 'ASSET'),
      LIABILITY: accounts.filter(acc => acc.category?.type === 'LIABILITY'),
      INCOME: accounts.filter(acc => acc.category?.type === 'INCOME'),
      EXPENSE: accounts.filter(acc => acc.category?.type === 'EXPENSE')
    }

    console.log(`  - 资产账户: ${accountsByType.ASSET.length}`)
    console.log(`  - 负债账户: ${accountsByType.LIABILITY.length}`)
    console.log(`  - 收入账户: ${accountsByType.INCOME.length}`)
    console.log(`  - 支出账户: ${accountsByType.EXPENSE.length}`)

    // 测试存量类账户计算
    console.log('\n🏦 测试存量类账户计算:')
    const stockAccounts = [...accountsByType.ASSET, ...accountsByType.LIABILITY]
    
    for (const account of stockAccounts.slice(0, 3)) { // 只测试前3个账户
      console.log(`\n  📈 账户: ${account.name} (${account.category?.type})`)
      console.log(`     交易数量: ${account.transactions.length}`)
      
      if (account.transactions.length > 0) {
        // 序列化账户数据
        const serializedAccount = {
          id: account.id,
          name: account.name,
          category: {
            name: account.category?.name || '',
            type: account.category?.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
          },
          transactions: account.transactions.map(t => ({
            type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
            amount: parseFloat(t.amount.toString()),
            date: t.date.toISOString(),
            currency: t.currency
          }))
        }

        const balances = calculateAccountBalance(serializedAccount)
        console.log(`     当前余额:`)
        Object.values(balances).forEach(balance => {
          console.log(`       ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        })

        // 显示最近的几笔交易
        console.log(`     最近交易:`)
        account.transactions.slice(0, 3).forEach(t => {
          console.log(`       ${t.date.toISOString().split('T')[0]} ${t.type} ${t.currency.symbol}${parseFloat(t.amount.toString()).toFixed(2)}`)
        })
      }
    }

    // 测试流量类账户计算
    console.log('\n💸 测试流量类账户计算:')
    const flowAccounts = [...accountsByType.INCOME, ...accountsByType.EXPENSE]
    
    for (const account of flowAccounts.slice(0, 3)) { // 只测试前3个账户
      console.log(`\n  📊 账户: ${account.name} (${account.category?.type})`)
      console.log(`     交易数量: ${account.transactions.length}`)
      
      if (account.transactions.length > 0) {
        // 序列化账户数据
        const serializedAccount = {
          id: account.id,
          name: account.name,
          category: {
            name: account.category?.name || '',
            type: account.category?.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
          },
          transactions: account.transactions.map(t => ({
            type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
            amount: parseFloat(t.amount.toString()),
            date: t.date.toISOString(),
            currency: t.currency
          }))
        }

        const balances = calculateAccountBalance(serializedAccount)
        console.log(`     累计金额:`)
        Object.values(balances).forEach(balance => {
          console.log(`       ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        })

        // 显示最近的几笔交易
        console.log(`     最近交易:`)
        account.transactions.slice(0, 3).forEach(t => {
          console.log(`       ${t.date.toISOString().split('T')[0]} ${t.type} ${t.currency.symbol}${parseFloat(t.amount.toString()).toFixed(2)}`)
        })
      }
    }

    // 测试总体计算
    console.log('\n🧮 测试总体计算:')

    // 计算净资产（只包含存量类账户）
    const stockAccountsForCalculation = stockAccounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        name: account.category?.name || '',
        type: account.category?.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      },
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency
      }))
    }))

    const netWorthResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccountsForCalculation,
      baseCurrency
    )

    console.log(`  净资产 (本位币): ${baseCurrency.symbol}${netWorthResult.totalInBaseCurrency.toFixed(2)}`)
    console.log(`  按原币种分组:`)
    Object.values(netWorthResult.totalsByOriginalCurrency).forEach(balance => {
      console.log(`    ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
    })

    if (netWorthResult.hasConversionErrors) {
      console.log(`  ⚠️  存在汇率转换错误`)
    }

    // 测试分类汇总服务
    console.log('\n📋 测试分类汇总服务:')

    // 获取顶级分类
    const topCategories = await prisma.category.findMany({
      where: {
        userId: user.id,
        parentId: null
      },
      include: {
        children: true
      }
    })

    for (const category of topCategories.slice(0, 2)) { // 只测试前2个分类
      console.log(`\n  📁 分类: ${category.name} (${category.type})`)

      try {
        if (category.type === 'ASSET' || category.type === 'LIABILITY') {
          const stockSummary = await getStockCategorySummary(category.id, user.id)
          console.log(`     存量类汇总 - 月份数量: ${stockSummary.length}`)
          if (stockSummary.length > 0) {
            const latestMonth = stockSummary[0]
            console.log(`     最新月份 (${latestMonth.month}):`)
            console.log(`       子分类数量: ${latestMonth.childCategories.length}`)
            console.log(`       直属账户数量: ${latestMonth.directAccounts.length}`)
          }
        } else if (category.type === 'INCOME' || category.type === 'EXPENSE') {
          const flowSummary = await getFlowCategorySummary(category.id, user.id)
          console.log(`     流量类汇总 - 月份数量: ${flowSummary.length}`)
          if (flowSummary.length > 0) {
            const latestMonth = flowSummary[0]
            console.log(`     最新月份 (${latestMonth.month}):`)
            console.log(`       子分类数量: ${latestMonth.childCategories.length}`)
            console.log(`       直属账户数量: ${latestMonth.directAccounts.length}`)
          }
        }
      } catch (error) {
        console.log(`     ❌ 计算失败: ${error}`)
      }
    }

    console.log('\n✅ 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardCalculations()

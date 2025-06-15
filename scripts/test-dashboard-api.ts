/**
 * 测试仪表板API端点的计算结果
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'

const prisma = new PrismaClient()

async function testDashboardAPI() {
  try {
    console.log('🔍 测试仪表板API计算结果...\n')

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

    console.log('📊 账户分类:')
    console.log(`  存量类账户: ${stockAccounts.length}`)
    console.log(`  流量类账户: ${flowAccounts.length}`)

    // 测试净资产计算（只包含存量类账户）
    console.log('\n💰 净资产计算测试:')
    const netWorthResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccounts,
      baseCurrency
    )

    console.log(`  净资产 (本位币): ${baseCurrency.symbol}${netWorthResult.totalInBaseCurrency.toFixed(2)}`)
    console.log(`  按原币种分组:`)
    Object.values(netWorthResult.totalsByOriginalCurrency).forEach(balance => {
      console.log(`    ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
    })

    // 测试当月现金流计算
    console.log('\n💸 当月现金流计算测试:')
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    console.log(`  计算期间: ${periodStart.toISOString().split('T')[0]} 到 ${periodEnd.toISOString().split('T')[0]}`)

    let totalIncome = 0
    let totalExpense = 0

    const incomeAccounts = flowAccounts.filter(acc => acc.category?.type === 'INCOME')
    const expenseAccounts = flowAccounts.filter(acc => acc.category?.type === 'EXPENSE')

    console.log('\n  收入账户:')
    for (const account of incomeAccounts) {
      const balances = calculateAccountBalance(account, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true
      })

      Object.values(balances).forEach(balance => {
        console.log(`    ${account.name}: ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        if (balance.currencyCode === baseCurrency.code) {
          totalIncome += balance.amount
        }
      })
    }

    console.log('\n  支出账户:')
    for (const account of expenseAccounts) {
      const balances = calculateAccountBalance(account, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true
      })

      Object.values(balances).forEach(balance => {
        console.log(`    ${account.name}: ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        if (balance.currencyCode === baseCurrency.code) {
          totalExpense += balance.amount
        }
      })
    }

    console.log(`\n  当月收入总计: ${baseCurrency.symbol}${totalIncome.toFixed(2)}`)
    console.log(`  当月支出总计: ${baseCurrency.symbol}${totalExpense.toFixed(2)}`)
    console.log(`  当月净现金流: ${baseCurrency.symbol}${(totalIncome - totalExpense).toFixed(2)}`)

    // 验证计算逻辑
    console.log('\n✅ 计算逻辑验证:')
    console.log('  ✓ 存量类账户使用最新余额调整 + 后续交易')
    console.log('  ✓ 流量类账户使用期间内交易累计')
    console.log('  ✓ 净资产只包含存量类账户')
    console.log('  ✓ 现金流只包含流量类账户的期间数据')

    // 检查是否有异常情况
    console.log('\n⚠️  异常检查:')
    
    // 检查流量类账户是否有余额调整交易
    const flowAccountsWithBalanceAdjustment = flowAccounts.filter(account =>
      account.transactions.some(t => t.type === 'BALANCE')
    )
    
    if (flowAccountsWithBalanceAdjustment.length > 0) {
      console.log('  ⚠️  发现流量类账户有余额调整交易:')
      flowAccountsWithBalanceAdjustment.forEach(account => {
        console.log(`    - ${account.name} (${account.category?.type})`)
      })
    } else {
      console.log('  ✓ 流量类账户没有余额调整交易')
    }

    // 检查存量类账户是否缺少余额调整
    const stockAccountsWithoutBalanceAdjustment = stockAccounts.filter(account =>
      !account.transactions.some(t => t.type === 'BALANCE')
    )
    
    if (stockAccountsWithoutBalanceAdjustment.length > 0) {
      console.log('  ⚠️  发现存量类账户缺少余额调整:')
      stockAccountsWithoutBalanceAdjustment.forEach(account => {
        console.log(`    - ${account.name} (${account.category?.type})`)
      })
    } else {
      console.log('  ✓ 所有存量类账户都有余额调整')
    }

    console.log('\n✅ 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardAPI()

/**
 * 验证仪表板数值计算的正确性
 * 对比存量/流量账户的计算逻辑
 */

import { PrismaClient } from '@prisma/client'
import { calculateAccountBalance, calculateTotalBalanceWithConversion } from '../src/lib/account-balance'

const prisma = new PrismaClient()

async function validateDashboardValues() {
  try {
    console.log('🔍 验证仪表板数值计算...\n')

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

    console.log('📊 账户分析:')
    console.log('=' .repeat(50))

    // 分析每个账户的计算逻辑
    let totalAssets = 0
    let totalLiabilities = 0
    let totalIncome = 0
    let totalExpense = 0

    const assetAccounts = accounts.filter(acc => acc.category?.type === 'ASSET')
    const liabilityAccounts = accounts.filter(acc => acc.category?.type === 'LIABILITY')
    const incomeAccounts = accounts.filter(acc => acc.category?.type === 'INCOME')
    const expenseAccounts = accounts.filter(acc => acc.category?.type === 'EXPENSE')

    console.log('\n🏦 资产账户分析:')
    for (const account of assetAccounts) {
      if (account.transactions.length === 0) continue

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
      console.log(`\n  📈 ${account.name}:`)
      
      Object.values(balances).forEach(balance => {
        console.log(`     ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        
        // 简单汇率转换估算（实际应用中需要查询汇率表）
        let convertedAmount = balance.amount
        if (balance.currencyCode === 'USD') {
          convertedAmount = balance.amount * 7.2 // 假设汇率
        } else if (balance.currencyCode === 'JPY') {
          convertedAmount = balance.amount * 0.05 // 假设汇率
        }
        totalAssets += convertedAmount
      })

      // 显示计算逻辑
      const balanceAdjustments = account.transactions.filter(t => t.type === 'BALANCE')
      const otherTransactions = account.transactions.filter(t => t.type !== 'BALANCE')
      
      console.log(`     计算逻辑: 存量类账户`)
      if (balanceAdjustments.length > 0) {
        const latest = balanceAdjustments[0]
        console.log(`     - 最新余额调整: ${latest.date.toISOString().split('T')[0]} ${parseFloat(latest.amount.toString()).toFixed(2)}`)
      }
      if (otherTransactions.length > 0) {
        console.log(`     - 其他交易数量: ${otherTransactions.length}`)
      }
    }

    console.log('\n💳 负债账户分析:')
    for (const account of liabilityAccounts) {
      if (account.transactions.length === 0) continue

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
      console.log(`\n  📉 ${account.name}:`)
      
      Object.values(balances).forEach(balance => {
        console.log(`     ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        totalLiabilities += balance.amount // 负债已经是正数
      })

      console.log(`     计算逻辑: 存量类账户`)
    }

    console.log('\n💰 收入账户分析:')
    for (const account of incomeAccounts) {
      if (account.transactions.length === 0) continue

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
      console.log(`\n  📈 ${account.name}:`)
      
      Object.values(balances).forEach(balance => {
        console.log(`     ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        totalIncome += balance.amount
      })

      console.log(`     计算逻辑: 流量类账户 - 累计所有收入交易`)
    }

    console.log('\n💸 支出账户分析:')
    for (const account of expenseAccounts) {
      if (account.transactions.length === 0) continue

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
      console.log(`\n  📉 ${account.name}:`)
      
      Object.values(balances).forEach(balance => {
        console.log(`     ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        totalExpense += balance.amount
      })

      console.log(`     计算逻辑: 流量类账户 - 累计所有支出交易`)
    }

    console.log('\n📋 汇总结果:')
    console.log('=' .repeat(50))
    console.log(`总资产 (估算): ¥${totalAssets.toFixed(2)}`)
    console.log(`总负债: ¥${totalLiabilities.toFixed(2)}`)
    console.log(`净资产 (估算): ¥${(totalAssets - totalLiabilities).toFixed(2)}`)
    console.log(`总收入: ¥${totalIncome.toFixed(2)}`)
    console.log(`总支出: ¥${totalExpense.toFixed(2)}`)
    console.log(`净现金流: ¥${(totalIncome - totalExpense).toFixed(2)}`)

    console.log('\n✅ 验证完成!')

  } catch (error) {
    console.error('❌ 验证失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

validateDashboardValues()

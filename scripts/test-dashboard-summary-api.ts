/**
 * 测试仪表板汇总API的返回数据
 */

import { PrismaClient } from '@prisma/client'
import {
  calculateAccountBalance,
  calculateTotalBalanceWithConversion,
} from '../src/lib/services/account.service'
import { AccountType, TransactionType } from '../src/types/core/constants'

const prisma = new PrismaClient()

async function testDashboardSummaryAPI() {
  try {
    console.log('🔍 测试仪表板汇总API数据...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    // 获取用户设置和本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })
    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 获取所有账户及其交易
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: { currency: true },
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
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

    // 分离存量类账户和流量类账户
    const stockAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === 'ASSET' ||
        account.category?.type === 'LIABILITY'
    )
    const flowAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === 'INCOME' ||
        account.category?.type === 'EXPENSE'
    )

    console.log('📊 模拟API计算过程:')
    console.log(`  存量类账户: ${stockAccounts.length}`)
    console.log(`  流量类账户: ${flowAccounts.length}`)

    // 计算净资产（只包含存量类账户）
    const totalBalanceResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccounts,
      baseCurrency
    )

    console.log('\n💰 净资产计算结果:')
    console.log(
      `  净资产 (本位币): ${baseCurrency.symbol}${totalBalanceResult.totalInBaseCurrency.toFixed(2)}`
    )

    // 计算各账户余额（模拟API逻辑）
    const accountBalances = []

    // 计算存量类账户余额（当前时点）
    console.log('\n🏦 存量类账户余额:')
    for (const account of stockAccounts) {
      const balances = calculateAccountBalance(account)

      // 只显示有余额的账户
      const hasBalance = Object.values(balances).some(
        balance => Math.abs(balance.amount) > 0.01
      )
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })

        const accountData = {
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord,
        }

        accountBalances.push(accountData)

        console.log(`  ${account.name} (${account.category?.type}):`)
        Object.entries(balancesRecord).forEach(([currency, amount]) => {
          console.log(`    ${currency}: ${amount.toFixed(2)}`)
        })
      }
    }

    // 计算流量类账户余额（当前月份期间）
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    console.log('\n💸 流量类账户余额 (当月):')
    for (const account of flowAccounts) {
      const balances = calculateAccountBalance(account, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true,
      })

      // 只显示有余额的账户
      const hasBalance = Object.values(balances).some(
        balance => Math.abs(balance.amount) > 0.01
      )
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })

        const accountData = {
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord,
        }

        accountBalances.push(accountData)

        console.log(`  ${account.name} (${account.category?.type}):`)
        Object.entries(balancesRecord).forEach(([currency, amount]) => {
          console.log(`    ${currency}: ${amount.toFixed(2)}`)
        })
      }
    }

    // 模拟前端计算逻辑
    console.log('\n🧮 前端计算逻辑模拟:')

    // 计算总资产
    const assetAccounts = accountBalances.filter(
      (acc: any) => acc.category.type === 'ASSET'
    )
    const totalAssets = assetAccounts.reduce((sum: number, acc: any) => {
      const balance = acc.balances[baseCurrency.code] || 0
      return sum + Math.max(0, balance) // 只计算正余额
    }, 0)

    // 计算总负债
    const liabilityAccounts = accountBalances.filter(
      (acc: any) => acc.category.type === 'LIABILITY'
    )
    const totalLiabilities = liabilityAccounts.reduce(
      (sum: number, acc: any) => {
        const balance = acc.balances[baseCurrency.code] || 0
        return sum + Math.max(0, balance) // 只计算正余额
      },
      0
    )

    console.log(`  资产账户数量: ${assetAccounts.length}`)
    console.log(`  负债账户数量: ${liabilityAccounts.length}`)
    console.log(`  总资产: ${baseCurrency.symbol}${totalAssets.toFixed(2)}`)
    console.log(
      `  总负债: ${baseCurrency.symbol}${totalLiabilities.toFixed(2)}`
    )
    console.log(
      `  净资产: ${baseCurrency.symbol}${(totalAssets - totalLiabilities).toFixed(2)}`
    )

    // 检查问题
    console.log('\n⚠️  问题诊断:')

    if (accountBalances.length === 0) {
      console.log('  ❌ accountBalances 数组为空')
      console.log('  原因可能是：')
      console.log('    1. 所有账户余额都为0')
      console.log('    2. 计算逻辑有问题')
      console.log('    3. 数据过滤条件过于严格')
    } else {
      console.log(`  ✓ accountBalances 包含 ${accountBalances.length} 个账户`)
    }

    if (assetAccounts.length === 0) {
      console.log('  ❌ 没有找到资产账户')
    } else {
      console.log(`  ✓ 找到 ${assetAccounts.length} 个资产账户`)
    }

    if (liabilityAccounts.length === 0) {
      console.log('  ❌ 没有找到负债账户')
    } else {
      console.log(`  ✓ 找到 ${liabilityAccounts.length} 个负债账户`)
    }

    // 检查本位币余额
    const accountsWithBaseCurrency = accountBalances.filter(
      (acc: any) => acc.balances[baseCurrency.code] !== undefined
    )

    if (accountsWithBaseCurrency.length === 0) {
      console.log(`  ❌ 没有账户有 ${baseCurrency.code} 余额`)
      console.log('  这可能是汇率转换问题')
    } else {
      console.log(
        `  ✓ ${accountsWithBaseCurrency.length} 个账户有 ${baseCurrency.code} 余额`
      )
    }

    console.log('\n✅ 测试完成!')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboardSummaryAPI()

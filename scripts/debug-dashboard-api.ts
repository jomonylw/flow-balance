/**
 * 调试仪表板API响应
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugDashboardAPI() {
  try {
    console.log('🔍 调试仪表板API响应...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email} (ID: ${user.id})`)

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

    console.log(`\n📊 数据库中的账户:`)
    console.log(`  总账户数: ${accounts.length}`)

    // 按类型分组
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

    // 检查每个账户的交易数量
    console.log(`\n📋 账户详情:`)
    accounts.forEach(account => {
      console.log(`  ${account.name} (${account.category?.type || 'UNKNOWN'}): ${account.transactions.length} 笔交易`)
      if (account.transactions.length > 0) {
        const latestTransaction = account.transactions[0]
        console.log(`    最新交易: ${latestTransaction.date.toISOString().split('T')[0]} ${latestTransaction.type} ${latestTransaction.currency.symbol}${parseFloat(latestTransaction.amount.toString()).toFixed(2)}`)
      }
    })

    // 检查API端点逻辑
    console.log(`\n🔧 模拟API端点逻辑:`)

    // 转换账户数据格式（模拟API中的逻辑）
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

    console.log(`  存量类账户: ${stockAccounts.length}`)
    console.log(`  流量类账户: ${flowAccounts.length}`)

    // 检查存量类账户的余额计算
    console.log(`\n💰 存量类账户余额计算:`)
    const { calculateAccountBalance } = await import('../src/lib/account-balance')

    let hasStockBalances = false
    for (const account of stockAccounts) {
      // 转换账户数据格式以匹配类型
      const accountForCalculation = {
        ...account,
        transactions: account.transactions.map(t => ({
          ...t,
          type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
          amount: parseFloat(t.amount.toString()),
          date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString()
        }))
      }

      const balances = calculateAccountBalance(accountForCalculation)
      const hasBalance = Object.values(balances).some(balance => Math.abs(balance.amount) > 0.01)

      if (hasBalance) {
        hasStockBalances = true
        console.log(`  ✓ ${account.name}: 有余额`)
        Object.values(balances).forEach(balance => {
          console.log(`    ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        })
      } else {
        console.log(`  ❌ ${account.name}: 无余额`)
      }
    }

    if (!hasStockBalances) {
      console.log(`  ⚠️  所有存量类账户都没有余额！`)
    }

    // 检查流量类账户的余额计算
    console.log(`\n💸 流量类账户余额计算 (当月):`)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    console.log(`  计算期间: ${periodStart.toISOString().split('T')[0]} 到 ${periodEnd.toISOString().split('T')[0]}`)

    let hasFlowBalances = false
    for (const account of flowAccounts) {
      // 转换账户数据格式以匹配类型
      const accountForCalculation = {
        ...account,
        transactions: account.transactions.map(t => ({
          ...t,
          type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
          amount: parseFloat(t.amount.toString()),
          date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString()
        }))
      }

      const balances = calculateAccountBalance(accountForCalculation, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true
      })
      const hasBalance = Object.values(balances).some(balance => Math.abs(balance.amount) > 0.01)

      if (hasBalance) {
        hasFlowBalances = true
        console.log(`  ✓ ${account.name}: 有余额`)
        Object.values(balances).forEach(balance => {
          console.log(`    ${balance.currency.symbol}${balance.amount.toFixed(2)} ${balance.currencyCode}`)
        })
      } else {
        console.log(`  ❌ ${account.name}: 无余额`)
      }
    }

    if (!hasFlowBalances) {
      console.log(`  ⚠️  所有流量类账户在当月都没有余额！`)
    }

    // 检查API返回的accountBalances数组
    console.log(`\n📋 API accountBalances 数组模拟:`)
    const accountBalances = []
    
    // 添加存量类账户
    for (const account of stockAccounts) {
      // 转换账户数据格式以匹配类型
      const accountForCalculation = {
        ...account,
        transactions: account.transactions.map(t => ({
          ...t,
          type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
          amount: parseFloat(t.amount.toString()),
          date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString()
        }))
      }

      const balances = calculateAccountBalance(accountForCalculation)
      const hasBalance = Object.values(balances).some(balance => Math.abs(balance.amount) > 0.01)
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })
        accountBalances.push({
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord
        })
      }
    }

    // 添加流量类账户
    for (const account of flowAccounts) {
      // 转换账户数据格式以匹配类型
      const accountForCalculation = {
        ...account,
        transactions: account.transactions.map(t => ({
          ...t,
          type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
          amount: parseFloat(t.amount.toString()),
          date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString()
        }))
      }

      const balances = calculateAccountBalance(accountForCalculation, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true
      })
      const hasBalance = Object.values(balances).some(balance => Math.abs(balance.amount) > 0.01)
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })
        accountBalances.push({
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord
        })
      }
    }

    console.log(`  accountBalances 数组长度: ${accountBalances.length}`)
    
    if (accountBalances.length === 0) {
      console.log(`  ❌ accountBalances 数组为空！这就是前端显示0的原因！`)
    } else {
      console.log(`  ✓ accountBalances 包含以下账户:`)
      accountBalances.forEach((acc: any) => {
        console.log(`    - ${acc.name} (${acc.category.type}): ${JSON.stringify(acc.balances)}`)
      })
    }

    console.log('\n✅ 调试完成!')

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugDashboardAPI()

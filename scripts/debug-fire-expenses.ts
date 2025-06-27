import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

async function debugFireExpenses() {
  try {
    console.log('🔍 调试 FIRE API 支出计算...')

    // 获取用户
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 获取用户设置和基础货币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    console.log(`💰 基础货币: ${baseCurrency.code}`)

    // 计算日期范围
    const now = new Date()
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

    console.log(
      `📅 查询范围: ${twelveMonthsAgo.toISOString().split('T')[0]} 到 ${now.toISOString().split('T')[0]}`
    )

    // 查询支出交易
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: twelveMonthsAgo,
          lte: now,
        },
        account: {
          category: {
            type: AccountType.EXPENSE,
          },
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    console.log(`📊 找到 ${expenseTransactions.length} 笔支出交易`)

    // 按月份分组统计
    const monthlyExpenses: Record<
      string,
      { count: number; total: number; transactions: any[] }
    > = {}

    expenseTransactions.forEach(transaction => {
      const monthKey = transaction.date.toISOString().substring(0, 7) // YYYY-MM
      if (!monthlyExpenses[monthKey]) {
        monthlyExpenses[monthKey] = { count: 0, total: 0, transactions: [] }
      }
      const amount = parseFloat(transaction.amount.toString())
      monthlyExpenses[monthKey].count++
      monthlyExpenses[monthKey].total += amount
      monthlyExpenses[monthKey].transactions.push({
        date: transaction.date.toISOString().split('T')[0],
        amount,
        currency: transaction.currency.code,
        category: transaction.account?.category?.name,
        account: transaction.account.name,
      })
    })

    // 显示月度统计
    console.log('\n📈 月度支出统计:')
    const sortedMonths = Object.keys(monthlyExpenses).sort().reverse()
    let totalExpenses = 0

    sortedMonths.forEach(month => {
      const data = monthlyExpenses[month]
      totalExpenses += data.total
      console.log(
        `  ${month}: ${data.count} 笔交易, 总计 ¥${data.total.toFixed(2)}`
      )

      // 显示前3笔最大的交易
      const topTransactions = data.transactions
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)

      topTransactions.forEach(t => {
        console.log(
          `    - ${t.date}: ${t.currency}${t.amount.toFixed(2)} (${t.category} - ${t.account})`
        )
      })
    })

    console.log(`\n💰 过去12个月总支出: ¥${totalExpenses.toFixed(2)}`)
    console.log(`📊 月平均支出: ¥${(totalExpenses / 12).toFixed(2)}`)

    // 检查今年的支出
    const thisYear = now.getFullYear()
    const thisYearStart = new Date(thisYear, 0, 1)

    const thisYearTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thisYearStart,
          lte: now,
        },
        account: {
          category: {
            type: AccountType.EXPENSE,
          },
        },
      },
      include: {
        currency: true,
      },
    })

    const thisYearTotal = thisYearTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0
    )
    console.log(
      `\n📅 ${thisYear}年至今支出: ¥${thisYearTotal.toFixed(2)} (${thisYearTransactions.length} 笔交易)`
    )

    // 检查货币分布
    const currencyDistribution: Record<
      string,
      { count: number; total: number }
    > = {}
    expenseTransactions.forEach(transaction => {
      const currency = transaction.currency.code
      if (!currencyDistribution[currency]) {
        currencyDistribution[currency] = { count: 0, total: 0 }
      }
      currencyDistribution[currency].count++
      currencyDistribution[currency].total += parseFloat(
        transaction.amount.toString()
      )
    })

    console.log('\n💱 货币分布:')
    Object.entries(currencyDistribution).forEach(([currency, data]) => {
      console.log(
        `  ${currency}: ${data.count} 笔交易, 总计 ${currency}${data.total.toFixed(2)}`
      )
    })

    // 检查所有交易类型的今年支出
    console.log('\n🔍 检查所有交易类型的今年支出:')
    const allThisYearTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thisYearStart,
          lte: now,
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    console.log(`📊 今年所有交易: ${allThisYearTransactions.length} 笔`)

    // 按类型分组
    const transactionsByType: Record<
      string,
      { count: number; total: number; transactions: any[] }
    > = {}

    allThisYearTransactions.forEach(transaction => {
      const type = transaction.account?.category?.type || 'UNKNOWN'
      if (!transactionsByType[type]) {
        transactionsByType[type] = { count: 0, total: 0, transactions: [] }
      }
      const amount = parseFloat(transaction.amount.toString())
      transactionsByType[type].count++
      transactionsByType[type].total += amount
      transactionsByType[type].transactions.push({
        date: transaction.date.toISOString().split('T')[0],
        amount,
        currency: transaction.currency.code,
        category: transaction.account?.category?.name,
        account: transaction.account.name,
        type: transaction.type,
      })
    })

    console.log('\n📈 今年交易按类型统计:')
    Object.entries(transactionsByType).forEach(([type, data]) => {
      console.log(
        `  ${type}: ${data.count} 笔交易, 总计 ¥${data.total.toFixed(2)}`
      )
    })

    // 检查是否有负债账户的交易（可能被计算为支出）
    console.log('\n🏦 检查负债账户交易:')
    const liabilityTransactions = allThisYearTransactions.filter(
      t => t.account?.category?.type === 'LIABILITY'
    )
    if (liabilityTransactions.length > 0) {
      const liabilityTotal = liabilityTransactions.reduce(
        (sum, t) => sum + parseFloat(t.amount.toString()),
        0
      )
      console.log(
        `  负债账户交易: ${liabilityTransactions.length} 笔, 总计 ¥${liabilityTotal.toFixed(2)}`
      )
    }

    // 比较两种支出计算方式
    console.log('\n🔍 比较两种支出计算方式:')

    // 方式1: 按账户类别类型 (FIRE API 当前使用的方式)
    const expenseByAccountType = allThisYearTransactions.filter(
      t => t.account?.category?.type === 'EXPENSE'
    )
    const expenseByAccountTypeTotal = expenseByAccountType.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0
    )
    console.log(
      `  方式1 - 按账户类别 (AccountType.EXPENSE): ${expenseByAccountType.length} 笔, ¥${expenseByAccountTypeTotal.toFixed(2)}`
    )

    // 方式2: 按交易类型 (Dashboard API 使用的方式)
    const expenseByTransactionType = allThisYearTransactions.filter(
      t => t.type === 'EXPENSE'
    )
    const expenseByTransactionTypeTotal = expenseByTransactionType.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0
    )
    console.log(
      `  方式2 - 按交易类型 (TransactionType.EXPENSE): ${expenseByTransactionType.length} 笔, ¥${expenseByTransactionTypeTotal.toFixed(2)}`
    )

    // 显示差异的交易
    const onlyInAccountType = expenseByAccountType.filter(
      t => t.type !== 'EXPENSE'
    )
    const onlyInTransactionType = expenseByTransactionType.filter(
      t => t.account?.category?.type !== 'EXPENSE'
    )

    if (onlyInAccountType.length > 0) {
      console.log(
        `\n📊 只在账户类别方式中的交易 (${onlyInAccountType.length} 笔):`
      )
      onlyInAccountType.slice(0, 5).forEach(t => {
        console.log(
          `    - ${t.date.toISOString().split('T')[0]}: ${t.currency.code}${parseFloat(t.amount.toString()).toFixed(2)} (${t.type} - ${t.account?.category?.name} - ${t.account.name})`
        )
      })
    }

    if (onlyInTransactionType.length > 0) {
      console.log(
        `\n📊 只在交易类型方式中的交易 (${onlyInTransactionType.length} 笔):`
      )
      onlyInTransactionType.slice(0, 5).forEach(t => {
        console.log(
          `    - ${t.date.toISOString().split('T')[0]}: ${t.currency.code}${parseFloat(t.amount.toString()).toFixed(2)} (${t.type} - ${t.account?.category?.name} - ${t.account.name})`
        )
      })
    }
  } catch (_error) {
    console.error('❌ 调试失败:', _error)
  } finally {
    await prisma.$disconnect()
  }
}

debugFireExpenses()

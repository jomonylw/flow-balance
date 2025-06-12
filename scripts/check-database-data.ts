/**
 * 检查数据库中的实际数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabaseData() {
  try {
    console.log('🔍 检查数据库中的实际数据...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email} (ID: ${user.id})`)

    // 获取test账户的最新数据
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

    if (testAccount) {
      console.log(`\n📊 test账户数据:`)
      console.log(`  账户ID: ${testAccount.id}`)
      console.log(`  账户名称: ${testAccount.name}`)
      console.log(`  账户类型: ${testAccount.category?.type}`)
      console.log(`  交易数量: ${testAccount.transactions.length}`)
      
      console.log(`\n  最近5笔交易:`)
      testAccount.transactions.slice(0, 5).forEach((t, index) => {
        console.log(`    ${index + 1}. ${t.date.toISOString().split('T')[0]} ${t.type} ${t.currency.symbol}${parseFloat(t.amount.toString()).toFixed(2)} (ID: ${t.id})`)
      })
    } else {
      console.log('\n❌ 未找到test账户')
    }

    // 检查所有账户的最新余额调整
    console.log(`\n🏦 所有账户的最新余额调整:`)
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          where: { type: 'BALANCE_ADJUSTMENT' },
          include: { currency: true },
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    })

    accounts.forEach(account => {
      if (account.transactions.length > 0) {
        const latestBalance = account.transactions[0]
        console.log(`  ${account.name} (${account.category?.type}): ${latestBalance.date.toISOString().split('T')[0]} ${latestBalance.currency.symbol}${parseFloat(latestBalance.amount.toString()).toFixed(2)}`)
      } else {
        console.log(`  ${account.name} (${account.category?.type}): 无余额调整`)
      }
    })

    // 检查汇率设置
    console.log(`\n💱 汇率设置:`)
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrency: true,
        toCurrency: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (exchangeRates.length > 0) {
      console.log(`  找到 ${exchangeRates.length} 个汇率设置:`)
      exchangeRates.forEach(rate => {
        console.log(`    ${rate.fromCurrency.code} -> ${rate.toCurrency.code}: ${rate.rate} (${rate.updatedAt.toISOString().split('T')[0]})`)
      })
    } else {
      console.log(`  ❌ 没有设置汇率`)
    }

    // 检查用户设置
    console.log(`\n⚙️  用户设置:`)
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    if (userSettings) {
      console.log(`  本位币: ${userSettings.baseCurrency?.code} (${userSettings.baseCurrency?.symbol})`)
      console.log(`  语言: ${userSettings.language}`)
      console.log(`  主题: ${userSettings.theme}`)
    } else {
      console.log(`  ❌ 没有找到用户设置`)
    }

    console.log('\n✅ 检查完成!')

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseData()

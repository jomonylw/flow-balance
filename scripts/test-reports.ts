import { PrismaClient } from '@prisma/client'
import {
  calculateAccountBalance,
  calculateNetWorth,
  validateAccountTypes,
} from '../src/lib/services/account.service'
import { AccountType, TransactionType } from '../src/types/core/constants'

const prisma = new PrismaClient()

async function testReports() {
  try {
    console.log('测试财务报表功能...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('没有找到用户数据')
      return
    }

    console.log(`用户: ${user.email}`)

    // 获取账户数据
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true,
          },
        },
      },
    })

    console.log(`\n账户数量: ${accounts.length}`)

    // 转换数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        name: account.category.name,
        type: account.category.type as AccountType | undefined,
      },
      transactions: account.transactions.map(t => ({
        type: t.type as TransactionType,
        amount: parseFloat(t.amount.toString()),
        currency: t.currency,
      })),
    }))

    // 验证账户类型
    const validation = validateAccountTypes(accountsForCalculation)
    console.log('\n账户类型验证:')
    console.log(`验证结果: ${validation.isValid ? '通过' : '失败'}`)
    if (validation.issues.length > 0) {
      console.log('问题:')
      validation.issues.forEach(issue => console.log(`  - ${issue}`))
    }
    if (validation.suggestions.length > 0) {
      console.log('建议:')
      validation.suggestions.forEach(suggestion =>
        console.log(`  - ${suggestion}`)
      )
    }

    // 计算净资产
    const netWorth = calculateNetWorth(accountsForCalculation)
    console.log('\n净资产计算:')
    Object.entries(netWorth).forEach(([currency, balance]) => {
      console.log(
        `${currency}: ${balance.currency.symbol}${balance.amount.toFixed(2)}`
      )
    })

    // 显示每个账户的余额
    console.log('\n账户余额明细:')
    accountsForCalculation.forEach(account => {
      console.log(
        `\n账户: ${account.name} (${account.category.name} - ${account.category.type})`
      )
      const balances = calculateAccountBalance(account)
      Object.values(balances).forEach(balance => {
        console.log(
          `  ${balance.currency.code}: ${balance.currency.symbol}${balance.amount.toFixed(2)}`
        )
      })
      console.log(`  交易数量: ${account.transactions.length}`)
    })

    console.log('\n测试完成!')
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testReports()

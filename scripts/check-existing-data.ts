#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 检查现有数据...\n')

    // 检查用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        _count: {
          select: {
            accounts: true,
            recurringTransactions: true,
            loanContracts: true
          }
        }
      }
    })

    console.log('👥 用户列表:')
    users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`)
      console.log(`    账户: ${user._count.accounts}, 定期交易: ${user._count.recurringTransactions}, 贷款合约: ${user._count.loanContracts}`)
    })

    if (users.length === 0) {
      console.log('❌ 没有找到用户')
      return
    }

    // 选择第一个用户进行详细检查
    const user = users[0]
    console.log(`\n🔍 详细检查用户: ${user.email}`)

    // 检查账户
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        currency: true,
        _count: {
          select: {
            transactions: true,
            recurringTransactions: true,
            loanContracts: true,
            paymentLoanContracts: true
          }
        }
      }
    })

    console.log('\n📁 账户列表:')
    accounts.forEach(account => {
      console.log(`  - ${account.name} (${account.category.type})`)
      console.log(`    货币: ${account.currency.code}`)
      console.log(`    交易: ${account._count.transactions}, 定期交易: ${account._count.recurringTransactions}`)
      console.log(`    贷款合约: ${account._count.loanContracts}, 还款合约: ${account._count.paymentLoanContracts}`)
    })

    // 检查定期交易
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      include: {
        account: true
      }
    })

    console.log('\n🔄 定期交易列表:')
    recurringTransactions.forEach(rt => {
      console.log(`  - ${rt.description} (账户: ${rt.account.name})`)
    })

    // 检查贷款合约
    const loanContracts = await prisma.loanContract.findMany({
      where: { userId: user.id },
      include: {
        account: true,
        paymentAccount: true
      }
    })

    console.log('\n💰 贷款合约列表:')
    loanContracts.forEach(lc => {
      console.log(`  - ${lc.contractName}`)
      console.log(`    贷款账户: ${lc.account.name}`)
      console.log(`    还款账户: ${lc.paymentAccount?.name || '未设置'}`)
    })

  } catch (error) {
    console.error('❌ 检查数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(console.error)
}

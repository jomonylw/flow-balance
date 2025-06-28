#!/usr/bin/env tsx

/**
 * 创建测试数据来验证账户删除和货币转换的验证逻辑
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestData() {
  try {
    console.log('🔧 开始创建测试数据...\n')

    // 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: { contains: 'test' }
      }
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户，请先创建测试用户')
      return
    }

    console.log(`📋 使用测试用户: ${testUser.email} (ID: ${testUser.id})`)

    // 获取用户的货币
    const userCurrency = await prisma.userCurrency.findFirst({
      where: {
        userId: testUser.id,
        isActive: true
      },
      include: {
        currency: true
      }
    })

    if (!userCurrency) {
      console.log('❌ 用户没有可用的货币')
      return
    }

    console.log(`💰 使用货币: ${userCurrency.currency.name} (${userCurrency.currency.code})`)

    // 获取用户的分类
    const assetCategory = await prisma.category.findFirst({
      where: {
        userId: testUser.id,
        type: 'ASSET'
      }
    })

    const liabilityCategory = await prisma.category.findFirst({
      where: {
        userId: testUser.id,
        type: 'LIABILITY'
      }
    })

    const expenseCategory = await prisma.category.findFirst({
      where: {
        userId: testUser.id,
        type: 'EXPENSE'
      }
    })

    if (!assetCategory || !liabilityCategory || !expenseCategory) {
      console.log('❌ 缺少必要的账户分类')
      return
    }

    // 1. 创建有定期交易设置的账户
    console.log('📝 创建有定期交易设置的账户...')
    const accountWithRecurring = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: '测试账户-定期交易',
        categoryId: assetCategory.id,
        currencyId: userCurrency.currencyId,
        description: '用于测试定期交易验证的账户'
      }
    })

    // 创建定期交易设置
    await prisma.recurringTransaction.create({
      data: {
        userId: testUser.id,
        accountId: accountWithRecurring.id,
        currencyId: userCurrency.currencyId,
        type: 'INCOME',
        amount: 5000,
        description: '测试定期收入',
        frequency: 'MONTHLY',
        interval: 1,
        startDate: new Date(),
        nextDate: new Date(),
        isActive: true
      }
    })

    console.log(`✅ 创建账户: ${accountWithRecurring.name} (ID: ${accountWithRecurring.id})`)

    // 2. 创建有贷款合约的账户
    console.log('📝 创建有贷款合约的账户...')
    const loanAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: '测试账户-贷款',
        categoryId: liabilityCategory.id,
        currencyId: userCurrency.currencyId,
        description: '用于测试贷款合约验证的账户'
      }
    })

    const paymentAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: '测试账户-还款',
        categoryId: expenseCategory.id,
        currencyId: userCurrency.currencyId,
        description: '用于测试还款账户验证的账户'
      }
    })

    // 创建贷款合约
    await prisma.loanContract.create({
      data: {
        userId: testUser.id,
        accountId: loanAccount.id,
        paymentAccountId: paymentAccount.id,
        currencyId: userCurrency.currencyId,
        contractName: '测试贷款合约',
        loanAmount: 100000,
        interestRate: 0.05,
        totalPeriods: 12,
        repaymentType: 'EQUAL_PAYMENT',
        startDate: new Date(),
        paymentDay: 15,
        isActive: true
      }
    })

    console.log(`✅ 创建贷款账户: ${loanAccount.name} (ID: ${loanAccount.id})`)
    console.log(`✅ 创建还款账户: ${paymentAccount.name} (ID: ${paymentAccount.id})`)

    // 3. 创建有交易记录的账户
    console.log('📝 创建有交易记录的账户...')
    const accountWithTransactions = await prisma.account.create({
      data: {
        userId: testUser.id,
        name: '测试账户-交易记录',
        categoryId: assetCategory.id,
        currencyId: userCurrency.currencyId,
        description: '用于测试交易记录验证的账户'
      }
    })

    // 创建交易记录
    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        accountId: accountWithTransactions.id,
        currencyId: userCurrency.currencyId,
        type: 'BALANCE',
        amount: 10000,
        description: '测试余额调整',
        date: new Date()
      }
    })

    console.log(`✅ 创建有交易记录的账户: ${accountWithTransactions.name} (ID: ${accountWithTransactions.id})`)

    console.log('\n🎉 测试数据创建完成！')
    console.log('\n📋 创建的测试账户:')
    console.log(`1. ${accountWithRecurring.name} - 有定期交易设置`)
    console.log(`2. ${loanAccount.name} - 有贷款合约`)
    console.log(`3. ${paymentAccount.name} - 作为还款账户`)
    console.log(`4. ${accountWithTransactions.name} - 有交易记录`)

    console.log('\n💡 现在可以运行验证测试: npx tsx scripts/test-account-currency-validation.ts')

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await createTestData()
}

if (require.main === module) {
  main().catch(console.error)
}

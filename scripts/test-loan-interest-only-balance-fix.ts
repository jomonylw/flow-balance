/**
 * 测试贷款合约"只还利息"模式的余额更新记录生成
 * 验证修复后的代码是否正确生成余额变更记录
 */

import { PrismaClient } from '@prisma/client'
import { LoanCalculationService } from '../src/lib/services/loan-calculation.service'
import { LoanContractService } from '../src/lib/services/loan-contract.service'
import { RepaymentType } from '../src/types/core'

const prisma = new PrismaClient()

async function testInterestOnlyBalanceGeneration() {
  console.log('🧪 测试"只还利息"模式的余额更新记录生成...\n')

  try {
    // 1. 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: { contains: 'test' },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 找到测试用户: ${testUser.email}`)

    // 2. 查找或创建货币
    let currency = await prisma.currency.findFirst({
      where: {
        code: 'CNY',
        OR: [{ createdBy: testUser.id }, { createdBy: null }],
      },
    })

    if (!currency) {
      currency = await prisma.currency.create({
        data: {
          code: 'CNY',
          name: '人民币',
          symbol: '¥',
          decimalPlaces: 2,
          createdBy: testUser.id,
        },
      })
      console.log('✅ 创建货币: CNY')
    } else {
      console.log('✅ 找到货币: CNY')
    }

    // 3. 查找或创建负债分类
    let liabilityCategory = await prisma.category.findFirst({
      where: {
        userId: testUser.id,
        type: 'LIABILITY',
      },
    })

    if (!liabilityCategory) {
      liabilityCategory = await prisma.category.create({
        data: {
          userId: testUser.id,
          name: '测试负债分类',
          type: 'LIABILITY',
        },
      })
      console.log('✅ 创建负债分类')
    } else {
      console.log('✅ 找到负债分类')
    }

    // 4. 查找或创建支出分类
    let expenseCategory = await prisma.category.findFirst({
      where: {
        userId: testUser.id,
        type: 'EXPENSE',
      },
    })

    if (!expenseCategory) {
      expenseCategory = await prisma.category.create({
        data: {
          userId: testUser.id,
          name: '测试支出分类',
          type: 'EXPENSE',
        },
      })
      console.log('✅ 创建支出分类')
    } else {
      console.log('✅ 找到支出分类')
    }

    // 5. 查找或创建负债账户
    let liabilityAccount = await prisma.account.findFirst({
      where: {
        userId: testUser.id,
        categoryId: liabilityCategory.id,
      },
      include: { category: true, currency: true },
    })

    if (!liabilityAccount) {
      liabilityAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          name: '测试贷款账户',
          categoryId: liabilityCategory.id,
          currencyId: currency.id,
          description: '测试用负债账户',
        },
        include: { category: true, currency: true },
      })
      console.log('✅ 创建负债账户')
    } else {
      console.log(`✅ 找到负债账户: ${liabilityAccount.name}`)
    }

    // 6. 查找或创建支出账户作为还款账户
    let expenseAccount = await prisma.account.findFirst({
      where: {
        userId: testUser.id,
        categoryId: expenseCategory.id,
        currencyId: currency.id,
      },
      include: { category: true },
    })

    if (!expenseAccount) {
      expenseAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          name: '测试还款账户',
          categoryId: expenseCategory.id,
          currencyId: currency.id,
          description: '测试用还款账户',
        },
        include: { category: true },
      })
      console.log('✅ 创建还款账户')
    } else {
      console.log(`✅ 找到还款账户: ${expenseAccount.name}`)
    }

    // 7. 测试"只还利息"计算逻辑
    console.log('\n📊 测试"只还利息"计算逻辑:')
    const loanAmount = 100000
    const annualRate = 0.05 // 5%
    const termMonths = 12 // 12个月

    const calculation = LoanCalculationService.calculateLoan(
      loanAmount,
      annualRate,
      termMonths,
      RepaymentType.INTEREST_ONLY
    )

    console.log(`贷款金额: ${loanAmount.toLocaleString()}`)
    console.log(`年利率: ${(annualRate * 100).toFixed(2)}%`)
    console.log(`期限: ${termMonths}个月`)
    console.log(`月利息: ${calculation.monthlyPayment.toLocaleString()}`)

    console.log('\n还款计划:')
    calculation.schedule.forEach((payment, _index) => {
      console.log(
        `第${payment.period}期: 本金=${payment.principalAmount.toLocaleString()}, 利息=${payment.interestAmount.toLocaleString()}, 剩余=${payment.remainingBalance.toLocaleString()}`
      )
    })

    // 8. 创建测试贷款合约
    console.log('\n🏗️ 创建测试贷款合约...')

    const contractData = {
      accountId: liabilityAccount.id,
      currencyCode: currency.code,
      contractName: '测试只还利息贷款',
      loanAmount,
      interestRate: annualRate,
      totalPeriods: termMonths,
      repaymentType: RepaymentType.INTEREST_ONLY,
      startDate: '2024-01-01',
      paymentDay: 15,
      paymentAccountId: expenseAccount.id,
      transactionDescription: '测试贷款还款-第{期数}期',
      transactionNotes: '测试贷款合约还款',
      transactionTagIds: [],
      isActive: true,
    }

    const loanContract = await LoanContractService.createLoanContract(
      testUser.id,
      contractData
    )
    console.log(`✅ 创建贷款合约成功: ${loanContract.id}`)

    // 6. 检查生成的还款计划
    const payments = await prisma.loanPayment.findMany({
      where: { loanContractId: loanContract.id },
      orderBy: { period: 'asc' },
    })

    console.log(`✅ 生成了 ${payments.length} 期还款计划`)

    // 7. 模拟处理前几期还款（只还利息）
    console.log('\n⚡ 模拟处理前3期还款...')

    for (let i = 0; i < Math.min(3, payments.length); i++) {
      const payment = payments[i]
      console.log(`\n处理第${payment.period}期还款...`)
      console.log(`  本金: ${Number(payment.principalAmount).toLocaleString()}`)
      console.log(`  利息: ${Number(payment.interestAmount).toLocaleString()}`)
      console.log(
        `  剩余余额: ${Number(payment.remainingBalance).toLocaleString()}`
      )

      // 处理还款
      const success = await LoanContractService.processLoanPaymentRecord(
        payment.id
      )

      if (success) {
        console.log(`  ✅ 第${payment.period}期处理成功`)

        // 检查生成的交易记录
        const updatedPayment = await prisma.loanPayment.findUnique({
          where: { id: payment.id },
          include: {
            principalTransaction: true,
            interestTransaction: true,
            balanceTransaction: true,
          },
        })

        if (updatedPayment) {
          console.log('  📝 交易记录:')

          if (updatedPayment.principalTransaction) {
            console.log(
              `    本金交易: ${updatedPayment.principalTransaction.amount} (${updatedPayment.principalTransaction.type})`
            )
          } else {
            console.log('    本金交易: 无 (本金为0)')
          }

          if (updatedPayment.interestTransaction) {
            console.log(
              `    利息交易: ${updatedPayment.interestTransaction.amount} (${updatedPayment.interestTransaction.type})`
            )
          } else {
            console.log('    利息交易: 无')
          }

          if (updatedPayment.balanceTransaction) {
            console.log(
              `    ✅ 余额交易: ${updatedPayment.balanceTransaction.amount} (${updatedPayment.balanceTransaction.type})`
            )
          } else {
            console.log('    ❌ 余额交易: 无 - 这是问题所在！')
          }
        }
      } else {
        console.log(`  ❌ 第${payment.period}期处理失败`)
      }
    }

    // 8. 检查账户余额
    console.log('\n💰 检查账户余额:')
    const updatedLiabilityAccount = await prisma.account.findUnique({
      where: { id: liabilityAccount.id },
    })

    if (updatedLiabilityAccount) {
      console.log(
        `负债账户当前余额: ${Number(updatedLiabilityAccount.currentBalance).toLocaleString()}`
      )
    }

    // 9. 统计生成的交易记录
    console.log('\n📊 交易记录统计:')
    const balanceTransactions = await prisma.transaction.count({
      where: {
        loanContractId: loanContract.id,
        type: 'BALANCE',
      },
    })

    const expenseTransactions = await prisma.transaction.count({
      where: {
        loanContractId: loanContract.id,
        type: 'EXPENSE',
      },
    })

    console.log(`余额更新交易: ${balanceTransactions}`)
    console.log(`支出交易: ${expenseTransactions}`)

    // 10. 清理测试数据
    console.log('\n🧹 清理测试数据...')
    await LoanContractService.deleteLoanContract(loanContract.id, testUser.id)

    // 清理创建的测试账户
    if (liabilityAccount.name === '测试贷款账户') {
      await prisma.account.delete({ where: { id: liabilityAccount.id } })
      console.log('✅ 清理测试负债账户')
    }

    if (expenseAccount.name === '测试还款账户') {
      await prisma.account.delete({ where: { id: expenseAccount.id } })
      console.log('✅ 清理测试还款账户')
    }

    // 清理创建的测试分类
    if (liabilityCategory.name === '测试负债分类') {
      await prisma.category.delete({ where: { id: liabilityCategory.id } })
      console.log('✅ 清理测试负债分类')
    }

    if (expenseCategory.name === '测试支出分类') {
      await prisma.category.delete({ where: { id: expenseCategory.id } })
      console.log('✅ 清理测试支出分类')
    }

    console.log('✅ 测试数据清理完成')

    console.log('\n🎉 测试完成！')

    // 总结
    console.log('\n📋 测试总结:')
    console.log('- 创建了"只还利息"贷款合约')
    console.log('- 处理了前3期还款')
    console.log(`- 生成的余额更新交易数量: ${balanceTransactions}`)

    if (balanceTransactions >= 3) {
      console.log('✅ 修复成功：每期都生成了余额更新记录')
    } else {
      console.log('❌ 修复失败：部分期数没有生成余额更新记录')
    }
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testInterestOnlyBalanceGeneration()

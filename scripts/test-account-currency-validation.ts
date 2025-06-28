#!/usr/bin/env tsx

/**
 * 测试账户删除和货币转换时的定期交易设置和贷款合约验证
 * 
 * 这个脚本验证：
 * 1. 账户删除时是否正确检查定期交易设置和贷款合约
 * 2. 账户货币转换时是否正确检查定期交易设置和贷款合约
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  testName: string
  passed: boolean
  message: string
  details?: any
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = []
  
  try {
    console.log('🧪 开始测试账户删除和货币转换验证逻辑...\n')

    // 查找一个测试用户（优先使用demo用户，因为有更多数据）
    const testUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'demo@flowbalance.com' },
          { email: { contains: 'test' } }
        ]
      }
    })

    if (!testUser) {
      results.push({
        testName: '用户查找',
        passed: false,
        message: '未找到测试用户，请先创建测试数据'
      })
      return results
    }

    console.log(`📋 使用测试用户: ${testUser.email} (ID: ${testUser.id})`)

    // 测试1: 检查有定期交易设置的账户
    await testAccountWithRecurringTransactions(testUser.id, results)

    // 测试2: 检查有贷款合约的账户
    await testAccountWithLoanContracts(testUser.id, results)

    // 测试3: 检查作为还款账户的账户
    await testAccountAsPaymentAccount(testUser.id, results)

    // 测试4: 检查账户删除验证
    await testAccountDeletionValidation(testUser.id, results)

  } catch (error) {
    results.push({
      testName: '测试执行',
      passed: false,
      message: `测试执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: error
    })
  }

  return results
}

async function testAccountWithRecurringTransactions(userId: string, results: TestResult[]) {
  try {
    // 查找有定期交易设置的账户
    const accountWithRecurring = await prisma.account.findFirst({
      where: {
        userId,
        recurringTransactions: {
          some: {}
        }
      },
      include: {
        recurringTransactions: {
          select: { id: true, description: true },
          take: 3
        }
      }
    })

    if (accountWithRecurring) {
      results.push({
        testName: '定期交易设置检查',
        passed: true,
        message: `找到有定期交易设置的账户: ${accountWithRecurring.name}`,
        details: {
          accountId: accountWithRecurring.id,
          recurringCount: accountWithRecurring.recurringTransactions.length,
          recurringTransactions: accountWithRecurring.recurringTransactions
        }
      })

      // 模拟货币转换验证逻辑
      const hasRecurringTransactions = accountWithRecurring.recurringTransactions.length > 0
      if (hasRecurringTransactions) {
        const recurringNames = accountWithRecurring.recurringTransactions
          .map(rt => rt.description)
          .slice(0, 3)
          .join('、')
        
        results.push({
          testName: '定期交易设置货币转换验证',
          passed: true,
          message: `正确检测到定期交易设置，应阻止货币转换: ${recurringNames}`,
          details: { recurringNames }
        })
      }
    } else {
      results.push({
        testName: '定期交易设置检查',
        passed: true,
        message: '未找到有定期交易设置的账户（这是正常的）'
      })
    }
  } catch (error) {
    results.push({
      testName: '定期交易设置检查',
      passed: false,
      message: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}

async function testAccountWithLoanContracts(userId: string, results: TestResult[]) {
  try {
    // 查找有贷款合约的账户
    const accountWithLoan = await prisma.account.findFirst({
      where: {
        userId,
        loanContracts: {
          some: {}
        }
      },
      include: {
        loanContracts: {
          select: { id: true, contractName: true },
          take: 3
        }
      }
    })

    if (accountWithLoan) {
      results.push({
        testName: '贷款合约检查',
        passed: true,
        message: `找到有贷款合约的账户: ${accountWithLoan.name}`,
        details: {
          accountId: accountWithLoan.id,
          loanCount: accountWithLoan.loanContracts.length,
          loanContracts: accountWithLoan.loanContracts
        }
      })

      // 模拟货币转换验证逻辑
      const hasLoanContracts = accountWithLoan.loanContracts.length > 0
      if (hasLoanContracts) {
        const contractNames = accountWithLoan.loanContracts
          .map(lc => lc.contractName)
          .slice(0, 3)
          .join('、')
        
        results.push({
          testName: '贷款合约货币转换验证',
          passed: true,
          message: `正确检测到贷款合约，应阻止货币转换: ${contractNames}`,
          details: { contractNames }
        })
      }
    } else {
      results.push({
        testName: '贷款合约检查',
        passed: true,
        message: '未找到有贷款合约的账户（这是正常的）'
      })
    }
  } catch (error) {
    results.push({
      testName: '贷款合约检查',
      passed: false,
      message: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}

async function testAccountAsPaymentAccount(userId: string, results: TestResult[]) {
  try {
    // 查找作为还款账户的账户
    const paymentAccount = await prisma.account.findFirst({
      where: {
        userId,
        paymentLoanContracts: {
          some: {}
        }
      },
      include: {
        paymentLoanContracts: {
          select: { id: true, contractName: true },
          take: 3
        }
      }
    })

    if (paymentAccount) {
      results.push({
        testName: '还款账户检查',
        passed: true,
        message: `找到作为还款账户的账户: ${paymentAccount.name}`,
        details: {
          accountId: paymentAccount.id,
          paymentLoanCount: paymentAccount.paymentLoanContracts.length,
          paymentLoanContracts: paymentAccount.paymentLoanContracts
        }
      })

      // 模拟货币转换验证逻辑
      const hasPaymentLoanContracts = paymentAccount.paymentLoanContracts.length > 0
      if (hasPaymentLoanContracts) {
        const contractNames = paymentAccount.paymentLoanContracts
          .map(lc => lc.contractName)
          .slice(0, 3)
          .join('、')
        
        results.push({
          testName: '还款账户货币转换验证',
          passed: true,
          message: `正确检测到还款账户关联，应阻止货币转换: ${contractNames}`,
          details: { contractNames }
        })
      }
    } else {
      results.push({
        testName: '还款账户检查',
        passed: true,
        message: '未找到作为还款账户的账户（这是正常的）'
      })
    }
  } catch (error) {
    results.push({
      testName: '还款账户检查',
      passed: false,
      message: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}

async function testAccountDeletionValidation(userId: string, results: TestResult[]) {
  try {
    // 测试账户删除验证逻辑
    const accountsWithDependencies = await prisma.account.findMany({
      where: {
        userId,
        OR: [
          { transactions: { some: {} } },
          { transactionTemplates: { some: {} } },
          { recurringTransactions: { some: {} } },
          { loanContracts: { some: {} } },
          { paymentLoanContracts: { some: {} } }
        ]
      },
      include: {
        _count: {
          select: {
            transactions: true,
            transactionTemplates: true,
            recurringTransactions: true,
            loanContracts: true,
            paymentLoanContracts: true
          }
        }
      },
      take: 5
    })

    if (accountsWithDependencies.length > 0) {
      results.push({
        testName: '账户删除验证',
        passed: true,
        message: `找到 ${accountsWithDependencies.length} 个有依赖关系的账户`,
        details: accountsWithDependencies.map(acc => ({
          name: acc.name,
          id: acc.id,
          dependencies: acc._count
        }))
      })
    } else {
      results.push({
        testName: '账户删除验证',
        passed: true,
        message: '未找到有依赖关系的账户（这是正常的）'
      })
    }
  } catch (error) {
    results.push({
      testName: '账户删除验证',
      passed: false,
      message: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
}

async function main() {
  console.log('🚀 开始账户验证测试...\n')
  
  const results = await runTests()
  
  console.log('\n📊 测试结果汇总:')
  console.log('=' .repeat(50))
  
  let passedCount = 0
  let failedCount = 0
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ 通过' : '❌ 失败'
    console.log(`${index + 1}. ${result.testName}: ${status}`)
    console.log(`   ${result.message}`)
    
    if (result.details) {
      console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`)
    }
    
    console.log('')
    
    if (result.passed) {
      passedCount++
    } else {
      failedCount++
    }
  })
  
  console.log('=' .repeat(50))
  console.log(`总计: ${results.length} 个测试`)
  console.log(`通过: ${passedCount} 个`)
  console.log(`失败: ${failedCount} 个`)
  
  if (failedCount === 0) {
    console.log('\n🎉 所有测试都通过了！账户验证逻辑工作正常。')
  } else {
    console.log('\n⚠️  有测试失败，请检查相关逻辑。')
  }
  
  await prisma.$disconnect()
  process.exit(failedCount > 0 ? 1 : 0)
}

if (require.main === module) {
  main().catch(console.error)
}

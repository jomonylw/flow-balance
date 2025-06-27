/**
 * 测试重构后的功能
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRefactor() {
  try {
    console.log('🔍 测试重构后的功能...\n')

    // 1. 测试交易查询（通过账户关联获取分类）
    console.log('1. 测试交易查询...')
    const transactions = await prisma.transaction.findMany({
      take: 5,
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    console.log(`✅ 找到 ${transactions.length} 条交易记录`)

    if (transactions.length > 0) {
      const firstTransaction = transactions[0]
      console.log('   示例交易:')
      console.log(`   - ID: ${firstTransaction.id}`)
      console.log(`   - 描述: ${firstTransaction.description}`)
      console.log(`   - 金额: ${firstTransaction.amount}`)
      console.log(`   - 账户: ${firstTransaction.account.name}`)
      console.log(`   - 分类: ${firstTransaction.account.category.name}`)
      console.log(`   - 分类类型: ${firstTransaction.account.category.type}`)
    }

    // 2. 测试按分类查询交易
    console.log('\n2. 测试按分类查询交易...')
    const expenseCategory = await prisma.category.findFirst({
      where: {
        type: 'EXPENSE',
      },
    })

    if (expenseCategory) {
      const expenseTransactions = await prisma.transaction.findMany({
        where: {
          account: {
            categoryId: expenseCategory.id,
          },
        },
        include: {
          account: {
            include: {
              category: true,
            },
          },
        },
        take: 3,
      })

      console.log(`✅ 找到 ${expenseTransactions.length} 条支出交易`)
      expenseTransactions.forEach(t => {
        console.log(`   - ${t.description}: ${t.amount} (${t.account.name})`)
      })
    }

    // 3. 测试交易模板查询
    console.log('\n3. 测试交易模板查询...')
    const templates = await prisma.transactionTemplate.findMany({
      take: 3,
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
      },
    })

    console.log(`✅ 找到 ${templates.length} 个交易模板`)
    templates.forEach(t => {
      console.log(
        `   - ${t.name}: ${t.description} (${t.account.name} - ${t.account.category.name})`
      )
    })

    // 4. 验证数据一致性
    console.log('\n4. 验证数据一致性...')
    const allTransactions = await prisma.transaction.findMany({
      include: {
        account: {
          include: {
            category: true,
          },
        },
      },
    })

    let consistencyIssues = 0
    allTransactions.forEach(t => {
      if (!t.account || !t.account.category) {
        console.log(`❌ 交易 ${t.id} 缺少账户或分类信息`)
        consistencyIssues++
      }
    })

    if (consistencyIssues === 0) {
      console.log(
        `✅ 所有 ${allTransactions.length} 条交易的数据一致性检查通过`
      )
    } else {
      console.log(`❌ 发现 ${consistencyIssues} 个数据一致性问题`)
    }

    console.log('\n🎉 重构测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRefactor()

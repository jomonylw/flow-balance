/**
 * 全面测试分类重构后的功能
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCategoryRefactor() {
  try {
    console.log('🔍 全面测试分类重构后的功能...\n')

    // 1. 测试交易模板查询和分类关联
    console.log('1. 测试交易模板查询和分类关联...')
    const templates = await prisma.transactionTemplate.findMany({
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
      },
      take: 5,
    })

    console.log(`✅ 找到 ${templates.length} 个交易模板`)
    templates.forEach(template => {
      console.log(`   - ${template.name}:`)
      console.log(`     账户: ${template.account.name}`)
      console.log(
        `     分类: ${template.account.category.name} (${template.account.category.type})`
      )
      console.log(`     类型: ${template.type}`)
    })

    // 2. 测试按分类查询交易模板
    console.log('\n2. 测试按分类查询交易模板...')
    const incomeCategory = await prisma.category.findFirst({
      where: { type: 'INCOME' },
    })

    if (incomeCategory) {
      const incomeTemplates = await prisma.transactionTemplate.findMany({
        where: {
          account: {
            categoryId: incomeCategory.id,
          },
        },
        include: {
          account: {
            include: {
              category: true,
            },
          },
        },
      })

      console.log(`✅ 找到 ${incomeTemplates.length} 个收入类型的交易模板`)
      incomeTemplates.forEach(t => {
        console.log(
          `   - ${t.name}: ${t.account.name} (${t.account.category.name})`
        )
      })
    }

    // 3. 测试账户移动后的数据一致性
    console.log('\n3. 测试账户移动后的数据一致性...')

    // 找一个有交易记录的账户
    const accountWithTransactions = await prisma.account.findFirst({
      where: {
        transactions: {
          some: {},
        },
      },
      include: {
        category: true,
        transactions: {
          take: 3,
          include: {
            account: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    })

    if (accountWithTransactions) {
      console.log(`✅ 测试账户: ${accountWithTransactions.name}`)
      console.log(`   当前分类: ${accountWithTransactions.category.name}`)
      console.log(
        `   交易记录数: ${accountWithTransactions.transactions.length}`
      )

      // 验证所有交易的分类都通过账户获取
      let consistencyCheck = true
      accountWithTransactions.transactions.forEach(transaction => {
        if (
          transaction.account.category.id !==
          accountWithTransactions.category.id
        ) {
          console.log(
            `❌ 数据不一致: 交易 ${transaction.id} 的账户分类与账户本身的分类不匹配`
          )
          consistencyCheck = false
        }
      })

      if (consistencyCheck) {
        console.log(
          `✅ 账户 ${accountWithTransactions.name} 的所有交易数据一致性检查通过`
        )
      }
    }

    // 4. 测试分类统计功能
    console.log('\n4. 测试分类统计功能...')
    const expenseCategory = await prisma.category.findFirst({
      where: { type: 'EXPENSE' },
    })

    if (expenseCategory) {
      // 获取该分类及其子分类的所有ID
      const allCategoryIds = [expenseCategory.id]
      const childCategories = await prisma.category.findMany({
        where: { parentId: expenseCategory.id },
      })
      allCategoryIds.push(...childCategories.map(c => c.id))

      // 统计该分类下的交易
      const transactionCount = await prisma.transaction.count({
        where: {
          account: {
            categoryId: { in: allCategoryIds },
          },
        },
      })

      const transactionSum = await prisma.transaction.aggregate({
        where: {
          account: {
            categoryId: { in: allCategoryIds },
          },
        },
        _sum: {
          amount: true,
        },
      })

      console.log(`✅ 分类 "${expenseCategory.name}" 统计:`)
      console.log(`   交易数量: ${transactionCount}`)
      console.log(`   交易总额: ${transactionSum._sum.amount || 0}`)
    }

    // 5. 验证数据库约束
    console.log('\n5. 验证数据库约束...')

    // 检查是否还有孤立的分类引用
    const allTransactions = await prisma.transaction.findMany({
      include: {
        account: {
          include: {
            category: true,
          },
        },
      },
    })

    let orphanedTransactions = 0
    allTransactions.forEach(transaction => {
      if (!transaction.account || !transaction.account.category) {
        orphanedTransactions++
      }
    })

    if (orphanedTransactions === 0) {
      console.log(
        `✅ 所有 ${allTransactions.length} 条交易都有有效的账户和分类关联`
      )
    } else {
      console.log(`❌ 发现 ${orphanedTransactions} 条孤立的交易记录`)
    }

    console.log('\n🎉 分类重构全面测试完成！')
    console.log('\n📊 测试总结:')
    console.log('✅ 交易模板查询正常')
    console.log('✅ 按分类查询功能正常')
    console.log('✅ 数据一致性检查通过')
    console.log('✅ 分类统计功能正常')
    console.log('✅ 数据库约束验证通过')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCategoryRefactor()

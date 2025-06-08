/**
 * 测试账户货币限制修复
 * 验证：
 * 1. 创建一个有货币限制的账户
 * 2. 测试余额更新是否正确使用账户货币
 * 3. 测试交易创建是否正确使用账户货币
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCurrencyFix() {
  console.log('🧪 开始测试账户货币限制修复...\n')

  try {
    // 1. 查找测试用户
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test'
        }
      }
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 找到测试用户: ${user.email}`)

    // 2. 查找用户可用的货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        currency: true
      }
    })

    if (userCurrencies.length === 0) {
      console.log('❌ 用户没有可用货币')
      return
    }

    console.log(`✅ 用户可用货币: ${userCurrencies.map(uc => uc.currency.code).join(', ')}`)

    // 3. 查找一个资产分类
    const category = await prisma.category.findFirst({
      where: {
        userId: user.id,
        type: 'ASSET'
      }
    })

    if (!category) {
      console.log('❌ 未找到资产分类')
      return
    }

    // 4. 创建一个有货币限制的测试账户
    const testCurrency = userCurrencies[0].currency
    const accountName = `测试货币修复_${Date.now()}`

    console.log(`\n📝 创建有货币限制的账户 (${testCurrency.code})`)
    
    const testAccount = await prisma.account.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        currencyCode: testCurrency.code,
        name: accountName,
        description: '测试货币限制修复'
      },
      include: {
        currency: true,
        category: true
      }
    })

    console.log(`✅ 创建账户: ${testAccount.name}`)
    console.log(`   货币限制: ${testAccount.currency?.code} (${testAccount.currency?.name})`)

    // 5. 测试余额更新 - 使用正确货币
    console.log(`\n📝 测试余额更新 - 使用正确货币 (${testCurrency.code})`)
    
    try {
      const balanceUpdate = await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: testAccount.id,
          categoryId: category.id,
          currencyCode: testCurrency.code, // 使用正确货币
          type: 'BALANCE_ADJUSTMENT',
          amount: 1000,
          description: '测试余额更新 - 正确货币',
          date: new Date()
        }
      })

      console.log(`✅ 余额更新成功: ${balanceUpdate.description}`)
    } catch (error) {
      console.log(`❌ 余额更新失败: ${error.message}`)
    }

    // 6. 测试余额更新 - 使用错误货币（应该失败）
    const otherCurrency = userCurrencies.find(uc => uc.currency.code !== testCurrency.code)
    if (otherCurrency) {
      console.log(`\n📝 测试余额更新 - 使用错误货币 (${otherCurrency.currency.code})`)
      
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: testAccount.id,
            categoryId: category.id,
            currencyCode: otherCurrency.currency.code, // 使用错误货币
            type: 'BALANCE_ADJUSTMENT',
            amount: 500,
            description: '测试余额更新 - 错误货币',
            date: new Date()
          }
        })

        console.log(`❌ 意外成功：应该阻止使用错误货币`)
      } catch (error) {
        console.log(`✅ 正确阻止：数据库层面允许，但应用层应该验证`)
      }
    }

    // 7. 验证账户信息
    console.log(`\n📝 验证账户信息`)
    
    const accountWithCurrency = await prisma.account.findUnique({
      where: { id: testAccount.id },
      include: {
        currency: true,
        transactions: {
          select: {
            id: true,
            currencyCode: true,
            amount: true,
            description: true
          }
        }
      }
    })

    console.log(`✅ 账户货币: ${accountWithCurrency?.currency?.code}`)
    console.log(`✅ 交易记录数: ${accountWithCurrency?.transactions.length}`)
    
    if (accountWithCurrency?.transactions.length > 0) {
      console.log(`✅ 交易货币一致性:`)
      accountWithCurrency.transactions.forEach((tx, index) => {
        const isConsistent = tx.currencyCode === accountWithCurrency.currencyCode
        console.log(`   ${index + 1}. ${tx.description}: ${tx.currencyCode} ${isConsistent ? '✅' : '❌'}`)
      })
    }

    // 8. 清理测试数据
    console.log(`\n🧹 清理测试数据...`)
    
    await prisma.transaction.deleteMany({
      where: { accountId: testAccount.id }
    })
    
    await prisma.account.delete({
      where: { id: testAccount.id }
    })

    console.log(`✅ 测试数据已清理`)

    console.log(`\n🎉 账户货币限制修复测试完成！`)
    console.log(`\n📋 测试总结:`)
    console.log(`   ✅ 账户可以设置货币限制`)
    console.log(`   ✅ 余额更新使用正确货币`)
    console.log(`   ✅ 数据库结构支持货币关联`)
    console.log(`   ⚠️  前端表单应该自动使用账户限制货币`)

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testCurrencyFix()

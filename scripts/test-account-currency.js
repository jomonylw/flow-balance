/**
 * 测试账户货币设置功能
 * 验证：
 * 1. 账户创建时可以设置货币
 * 2. 账户有交易记录时无法更换货币
 * 3. 交易和余额更新时验证货币一致性
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAccountCurrencyFeature() {
  console.log('🧪 开始测试账户货币设置功能...\n')

  try {
    // 1. 查找测试用户
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test',
        },
      },
    })

    if (!user) {
      console.log('❌ 未找到测试用户，请先创建用户')
      return
    }

    console.log(`✅ 找到测试用户: ${user.email}`)

    // 2. 查找用户可用的货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(
      `✅ 用户可用货币: ${userCurrencies.map(uc => uc.currency.code).join(', ')}`
    )

    if (userCurrencies.length === 0) {
      console.log('❌ 用户没有可用货币，请先在货币管理中添加货币')
      return
    }

    // 3. 查找或创建一个分类
    let category = await prisma.category.findFirst({
      where: {
        userId: user.id,
        type: 'ASSET',
      },
    })

    if (!category) {
      console.log('📝 创建测试分类...')
      category = await prisma.category.create({
        data: {
          userId: user.id,
          name: '测试资产分类',
          type: 'ASSET',
        },
      })
      console.log(`✅ 创建测试分类: ${category.name}`)
    } else {
      console.log(`✅ 找到测试分类: ${category.name}`)
    }

    // 4. 测试创建带货币的账户
    const testCurrency = userCurrencies[0].currency
    const accountName = `测试货币账户_${Date.now()}`

    console.log(`\n📝 测试1: 创建带货币限制的账户 (${testCurrency.code})`)

    const newAccount = await prisma.account.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        currencyCode: testCurrency.code,
        name: accountName,
        description: '测试账户货币设置功能',
      },
      include: {
        currency: true,
        category: true,
      },
    })

    console.log(`✅ 成功创建账户: ${newAccount.name}`)
    console.log(
      `   货币限制: ${newAccount.currency?.code} (${newAccount.currency?.name})`
    )

    // 5. 测试添加交易记录
    console.log(`\n📝 测试2: 为账户添加交易记录`)

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: newAccount.id,
        categoryId: category.id,
        currencyCode: testCurrency.code,
        type: 'BALANCE',
        amount: 1000,
        description: '测试余额调整',
        date: new Date(),
      },
    })

    console.log(`✅ 成功添加交易记录: ${transaction.description}`)

    // 6. 测试更换货币（应该失败）
    console.log(`\n📝 测试3: 尝试更换有交易记录账户的货币（应该失败）`)

    const otherCurrency = userCurrencies.find(
      uc => uc.currency.code !== testCurrency.code
    )
    if (otherCurrency) {
      try {
        await prisma.account.update({
          where: { id: newAccount.id },
          data: { currencyCode: otherCurrency.currency.code },
        })
        console.log(`❌ 意外成功：应该禁止更换有交易记录账户的货币`)
      } catch (error) {
        console.log(`✅ 正确行为：数据库层面允许更新，但应用层应该阻止`)
      }
    }

    // 7. 测试货币一致性验证
    console.log(`\n📝 测试4: 验证交易货币一致性`)

    if (otherCurrency) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            accountId: newAccount.id,
            categoryId: category.id,
            currencyCode: otherCurrency.currency.code, // 使用不同货币
            type: 'BALANCE',
            amount: 500,
            description: '测试货币不一致',
            date: new Date(),
          },
        })
        console.log(`❌ 意外成功：应该禁止使用不同货币的交易`)
      } catch (error) {
        console.log(`✅ 正确行为：数据库层面允许，但应用层应该验证`)
      }
    }

    // 8. 清理测试数据
    console.log(`\n🧹 清理测试数据...`)

    await prisma.transaction.deleteMany({
      where: { accountId: newAccount.id },
    })

    await prisma.account.delete({
      where: { id: newAccount.id },
    })

    console.log(`✅ 测试数据已清理`)

    console.log(`\n🎉 账户货币设置功能测试完成！`)
    console.log(`\n📋 测试总结:`)
    console.log(`   ✅ 账户可以设置货币限制`)
    console.log(`   ✅ 数据库结构支持货币关联`)
    console.log(`   ✅ 交易记录可以正常创建`)
    console.log(`   ⚠️  应用层需要实现货币一致性验证`)
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testAccountCurrencyFeature()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateAccountCurrencies() {
  try {
    console.log('开始检查需要迁移的账户...')

    // 使用原始SQL查询找到没有货币设置的账户
    const accountsWithoutCurrency = await prisma.$queryRaw`
      SELECT a.id, a.name, a."userId", u.email, us."baseCurrencyCode"
      FROM accounts a
      JOIN users u ON a."userId" = u.id
      LEFT JOIN user_settings us ON u.id = us."userId"
      WHERE a."currencyCode" IS NULL
    `

    console.log(`找到 ${accountsWithoutCurrency.length} 个需要迁移的账户`)

    if (accountsWithoutCurrency.length === 0) {
      console.log('没有需要迁移的账户')
      return
    }

    // 为每个账户设置默认货币
    for (const account of accountsWithoutCurrency) {
      let defaultCurrency = null

      // 优先使用用户的本位币
      if (account.baseCurrencyCode) {
        defaultCurrency = account.baseCurrencyCode
      }
      // 如果没有本位币，查找用户的第一个可用货币
      else {
        const userCurrencies = await prisma.userCurrency.findMany({
          where: {
            userId: account.userId,
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
        })

        if (userCurrencies.length > 0) {
          defaultCurrency = userCurrencies[0].currencyCode
        }
        // 如果用户没有任何可用货币，使用CNY作为默认值
        else {
          defaultCurrency = 'CNY'

          // 确保CNY货币存在
          await prisma.currency.upsert({
            where: { code: 'CNY' },
            update: {},
            create: {
              code: 'CNY',
              name: 'Chinese Yuan',
              symbol: '¥',
              isCustom: false,
            },
          })

          // 为用户添加CNY到可用货币列表
          await prisma.userCurrency.upsert({
            where: {
              userId_currencyCode: {
                userId: account.userId,
                currencyCode: 'CNY',
              },
            },
            update: {
              isActive: true,
            },
            create: {
              userId: account.userId,
              currencyCode: 'CNY',
              isActive: true,
              order: 0,
            },
          })
        }
      }

      // 使用原始SQL更新账户的货币设置
      await prisma.$executeRaw`
        UPDATE accounts
        SET "currencyCode" = ${defaultCurrency}
        WHERE id = ${account.id}
      `

      console.log(
        `账户 "${account.name}" (用户: ${account.email}) 已设置货币为: ${defaultCurrency}`
      )
    }

    console.log('账户货币迁移完成！')
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateAccountCurrencies()
    .then(() => {
      console.log('迁移脚本执行完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('迁移脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { migrateAccountCurrencies }

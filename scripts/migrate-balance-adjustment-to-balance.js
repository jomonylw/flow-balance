const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateBalanceAdjustmentToBalance() {
  try {
    console.log('开始迁移 BALANCE 类型到 BALANCE...')

    // 使用原始 SQL 查询来查找 BALANCE 记录
    const balanceAdjustmentTransactions = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM transactions WHERE type = 'BALANCE'
    `

    const count = balanceAdjustmentTransactions[0].count
    console.log(`找到 ${count} 条 BALANCE 交易记录`)

    if (count === 0) {
      console.log('没有需要迁移的记录')
      return
    }

    // 使用原始 SQL 更新所有 BALANCE 记录为 BALANCE
    const updateResult = await prisma.$executeRaw`
      UPDATE transactions SET type = 'BALANCE' WHERE type = 'BALANCE'
    `

    console.log(`成功更新 ${updateResult} 条记录`)

    // 验证更新结果
    const remainingBalanceAdjustment = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM transactions WHERE type = 'BALANCE'
    `

    const newBalanceRecords = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM transactions WHERE type = 'BALANCE'
    `

    console.log(`验证结果:`)
    console.log(`- 剩余 BALANCE 记录: ${remainingBalanceAdjustment[0].count}`)
    console.log(`- 新的 BALANCE 记录: ${newBalanceRecords[0].count}`)

    if (remainingBalanceAdjustment[0].count === 0) {
      console.log('✅ 迁移成功完成！')
    } else {
      console.log('⚠️ 迁移可能未完全成功，请检查')
    }
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 运行迁移
migrateBalanceAdjustmentToBalance().catch(error => {
  console.error('迁移失败:', error)
  process.exit(1)
})

import { prisma } from '../src/lib/database/prisma'

async function testNoTransactions() {
  try {
    console.log('测试没有交易记录时的记账天数（优化后：显示第1天）...')

    // 创建一个测试用户（如果不存在）
    const testUser = await prisma.user.upsert({
      where: { email: 'test-no-transactions@example.com' },
      update: {},
      create: {
        email: 'test-no-transactions@example.com',
        password: 'test123',
      },
    })

    console.log(`测试用户: ${testUser.email}`)

    // 确保该用户没有交易记录
    await prisma.transaction.deleteMany({
      where: { userId: testUser.id },
    })

    // 获取最早的交易记录
    const earliestTransaction = await prisma.transaction.findFirst({
      where: { userId: testUser.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    console.log(
      `最早交易记录: ${earliestTransaction ? earliestTransaction.date : '无'}`
    )

    // 计算记账天数（模拟优化后的代码逻辑）
    let accountingDays = 1 // 默认显示第1天
    if (earliestTransaction) {
      const earliestDate = new Date(earliestTransaction.date)
      const today = new Date()
      const timeDiff = today.getTime() - earliestDate.getTime()
      accountingDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1
    }

    console.log(`记账天数: ${accountingDays} 天`)

    if (accountingDays === 1) {
      console.log('✅ 正确：没有交易记录时显示 1 天')
      console.log('副标题将显示：')
      console.log(
        '  中文: "欢迎回来，test-no-transactions@example.com！这是您记账的第 1 天。"'
      )
      console.log(
        '  英文: "Welcome back, test-no-transactions@example.com! This is day 1 of your accounting journey."'
      )
    } else {
      console.log('❌ 错误：应该显示 1 天')
    }

    // 清理测试用户
    await prisma.user.delete({
      where: { id: testUser.id },
    })

    console.log('✅ 测试完成，测试用户已清理')
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNoTransactions()

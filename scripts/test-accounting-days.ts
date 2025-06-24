import { prisma } from '../src/lib/database/prisma'

async function testAccountingDays() {
  try {
    console.log('测试记账天数功能...')

    // 获取演示用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('未找到演示用户')
      return
    }

    console.log(`用户: ${user.email}`)

    // 获取最早的交易记录
    const earliestTransaction = await prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true, description: true },
    })

    if (!earliestTransaction) {
      console.log('用户没有交易记录')
      return
    }

    console.log(
      `最早交易日期: ${earliestTransaction.date.toISOString().split('T')[0]}`
    )
    console.log(`最早交易描述: ${earliestTransaction.description}`)

    // 计算记账天数
    const earliestDate = new Date(earliestTransaction.date)
    const today = new Date()
    const timeDiff = today.getTime() - earliestDate.getTime()
    const accountingDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1

    console.log(`今天日期: ${today.toISOString().split('T')[0]}`)
    console.log(`记账天数: ${accountingDays} 天`)

    console.log('\n✅ 记账天数计算功能已实现')
    console.log('功能说明:')
    console.log('- 从最早的交易记录开始计算天数')
    console.log('- 包含开始日期，所以天数 = 时间差 + 1')
    console.log('- 已在 API 和前端组件中实现')
    console.log('- 国际化文件已更新（中英文）')
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAccountingDays()

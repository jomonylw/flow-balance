const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function simpleRateCheck() {
  console.log('🔍 简单汇率检查...\n')

  try {
    // 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 使用测试用户: ${testUser.email}`)

    // 查找 AUD 货币
    const audCurrency = await prisma.currency.findFirst({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    // 查找 HKD 货币
    const hkdCurrency = await prisma.currency.findFirst({
      where: {
        code: 'HKD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    console.log(`\n💰 货币记录:`)
    console.log(`  AUD: ${audCurrency ? `ID=${audCurrency.id}` : '未找到'}`)
    console.log(`  HKD: ${hkdCurrency ? `ID=${hkdCurrency.id}` : '未找到'}`)

    if (!audCurrency || !hkdCurrency) {
      console.log('❌ 货币记录不完整')
      return
    }

    // 查找 AUD → HKD 汇率
    const audToHkdRates = await prisma.exchangeRate.findMany({
      where: {
        userId: testUser.id,
        fromCurrencyId: audCurrency.id,
        toCurrencyId: hkdCurrency.id,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    console.log(`\n📈 AUD → HKD 汇率记录 (${audToHkdRates.length} 条):`)
    audToHkdRates.forEach((rate, index) => {
      console.log(`  ${index + 1}. 汇率: ${rate.rate}, 生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}, 类型: ${rate.type}`)
    })

    // 检查今天的日期
    const today = new Date()
    console.log(`\n📅 今天的日期: ${today.toISOString().split('T')[0]}`)

    // 查找今天或之前的最新汇率
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        userId: testUser.id,
        fromCurrencyId: audCurrency.id,
        toCurrencyId: hkdCurrency.id,
        effectiveDate: {
          lte: today,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    console.log(`\n🎯 最新有效汇率:`)
    if (latestRate) {
      console.log(`  ✅ 找到: ${latestRate.rate} (${latestRate.effectiveDate.toISOString().split('T')[0]})`)
    } else {
      console.log(`  ❌ 未找到`)
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleRateCheck()

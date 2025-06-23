const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugGetUserExchangeRate() {
  console.log('🔍 调试 getUserExchangeRate 函数...\n')

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

    // 模拟 getUserExchangeRate 函数的逻辑
    const fromCurrency = 'AUD'
    const toCurrency = 'HKD'
    const targetDate = new Date()

    console.log(`\n🎯 查找汇率: ${fromCurrency} → ${toCurrency}`)
    console.log(`📅 目标日期: ${targetDate.toISOString()}`)

    // 1. 查找货币记录
    const fromCurrencyRecord = await prisma.currency.findFirst({
      where: {
        code: fromCurrency,
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    const toCurrencyRecord = await prisma.currency.findFirst({
      where: {
        code: toCurrency,
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    console.log(`\n💰 货币记录:`)
    console.log(`  ${fromCurrency}: ${fromCurrencyRecord ? `ID=${fromCurrencyRecord.id}, 创建者=${fromCurrencyRecord.createdBy || '全局'}` : '未找到'}`)
    console.log(`  ${toCurrency}: ${toCurrencyRecord ? `ID=${toCurrencyRecord.id}, 创建者=${toCurrencyRecord.createdBy || '全局'}` : '未找到'}`)

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      console.log('❌ 货币记录不完整')
      return
    }

    // 2. 检查是否是同一货币
    if (fromCurrencyRecord.id === toCurrencyRecord.id) {
      console.log('✅ 同一货币，应返回 1:1 汇率')
      return
    }

    // 3. 查找汇率记录
    console.log(`\n📈 查找汇率记录...`)
    console.log(`  fromCurrencyId: ${fromCurrencyRecord.id}`)
    console.log(`  toCurrencyId: ${toCurrencyRecord.id}`)
    console.log(`  effectiveDate <= ${targetDate.toISOString()}`)

    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        userId: testUser.id,
        fromCurrencyId: fromCurrencyRecord.id,
        toCurrencyId: toCurrencyRecord.id,
        effectiveDate: {
          lte: targetDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    console.log(`\n📊 查找结果:`)
    if (exchangeRate) {
      console.log(`  ✅ 找到汇率: ${exchangeRate.rate}`)
      console.log(`  📅 生效日期: ${exchangeRate.effectiveDate.toISOString()}`)
      console.log(`  🏷️  类型: ${exchangeRate.type}`)
      console.log(`  📝 备注: ${exchangeRate.notes || '无'}`)
    } else {
      console.log(`  ❌ 未找到汇率`)
    }

    // 4. 查找所有相关汇率记录（不限制日期）
    console.log(`\n🔍 所有相关汇率记录:`)
    const allRates = await prisma.exchangeRate.findMany({
      where: {
        userId: testUser.id,
        fromCurrencyId: fromCurrencyRecord.id,
        toCurrencyId: toCurrencyRecord.id,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    console.log(`  总共 ${allRates.length} 条记录:`)
    allRates.forEach((rate, index) => {
      const isValid = rate.effectiveDate <= targetDate
      console.log(`    ${index + 1}. 汇率: ${rate.rate}, 生效日期: ${rate.effectiveDate.toISOString()}, 类型: ${rate.type} ${isValid ? '✅' : '❌'}`)
    })

    // 5. 检查日期比较
    if (allRates.length > 0) {
      const latestRate = allRates[0]
      console.log(`\n📅 日期比较:`)
      console.log(`  最新汇率日期: ${latestRate.effectiveDate.toISOString()}`)
      console.log(`  目标日期: ${targetDate.toISOString()}`)
      console.log(`  汇率日期 <= 目标日期: ${latestRate.effectiveDate <= targetDate}`)
      console.log(`  汇率日期时间戳: ${latestRate.effectiveDate.getTime()}`)
      console.log(`  目标日期时间戳: ${targetDate.getTime()}`)
    }

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugGetUserExchangeRate()

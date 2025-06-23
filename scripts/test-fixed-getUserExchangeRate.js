const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// 复制修复后的 findUserActiveCurrency 函数逻辑
async function findUserActiveCurrency(userId, currencyCode) {
  // 首先查找用户在 userCurrency 表中选择的货币
  const userCurrency = await prisma.userCurrency.findFirst({
    where: {
      userId,
      isActive: true,
      currency: {
        code: currencyCode,
      },
    },
    include: {
      currency: true,
    },
  })

  if (userCurrency) {
    return userCurrency.currency
  }

  // 如果用户没有在 userCurrency 表中选择该货币，则回退到默认查找逻辑
  return await prisma.currency.findFirst({
    where: {
      code: currencyCode,
      OR: [
        { createdBy: userId }, // 用户自定义货币
        { createdBy: null }, // 全局货币
      ],
    },
    orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
  })
}

async function testFixedGetUserExchangeRate() {
  console.log('🔍 测试修复后的 getUserExchangeRate 函数...\n')

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

    // 测试 AUD → HKD 汇率查找
    const fromCurrency = 'AUD'
    const toCurrency = 'HKD'
    const targetDate = new Date()

    console.log(`\n🎯 查找汇率: ${fromCurrency} → ${toCurrency}`)
    console.log(`📅 目标日期: ${targetDate.toISOString()}`)

    // 使用修复后的逻辑查找货币记录
    const fromCurrencyRecord = await findUserActiveCurrency(testUser.id, fromCurrency)
    const toCurrencyRecord = await findUserActiveCurrency(testUser.id, toCurrency)

    console.log(`\n💰 修复后的货币记录:`)
    console.log(`  ${fromCurrency}: ${fromCurrencyRecord ? `ID=${fromCurrencyRecord.id}, 创建者=${fromCurrencyRecord.createdBy || '全局'}` : '未找到'}`)
    console.log(`  ${toCurrency}: ${toCurrencyRecord ? `ID=${toCurrencyRecord.id}, 创建者=${toCurrencyRecord.createdBy || '全局'}` : '未找到'}`)

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      console.log('❌ 货币记录不完整')
      return
    }

    // 检查是否是同一货币
    if (fromCurrencyRecord.id === toCurrencyRecord.id) {
      console.log('✅ 同一货币，应返回 1:1 汇率')
      return
    }

    // 查找汇率记录
    console.log(`\n📈 查找汇率记录...`)
    console.log(`  fromCurrencyId: ${fromCurrencyRecord.id}`)
    console.log(`  toCurrencyId: ${toCurrencyRecord.id}`)

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

    // 对比旧逻辑和新逻辑的差异
    console.log(`\n🔄 对比旧逻辑和新逻辑:`)
    
    // 旧逻辑
    const oldFromCurrency = await prisma.currency.findFirst({
      where: {
        code: fromCurrency,
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    console.log(`  旧逻辑 ${fromCurrency}: ${oldFromCurrency ? `ID=${oldFromCurrency.id}` : '未找到'}`)
    console.log(`  新逻辑 ${fromCurrency}: ${fromCurrencyRecord ? `ID=${fromCurrencyRecord.id}` : '未找到'}`)
    console.log(`  是否相同: ${oldFromCurrency?.id === fromCurrencyRecord?.id ? '✅' : '❌'}`)

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFixedGetUserExchangeRate()

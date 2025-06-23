const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDuplicateCurrencies() {
  console.log('🔍 检查重复货币记录...\n')

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

    // 查找所有 AUD 货币记录
    const audCurrencies = await prisma.currency.findMany({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    console.log(`\n💰 所有 AUD 货币记录 (${audCurrencies.length} 条):`)
    audCurrencies.forEach((currency, index) => {
      console.log(`  ${index + 1}. ID: ${currency.id}`)
      console.log(`      代码: ${currency.code}`)
      console.log(`      名称: ${currency.name}`)
      console.log(`      创建者: ${currency.createdBy || '全局'}`)
      console.log(`      自定义: ${currency.isCustom}`)
      console.log('')
    })

    // 查找用户货币设置
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
        currency: {
          code: 'AUD',
        },
      },
      include: {
        currency: true,
      },
    })

    console.log(`📋 用户 AUD 货币设置 (${userCurrencies.length} 条):`)
    userCurrencies.forEach((uc, index) => {
      console.log(`  ${index + 1}. 货币ID: ${uc.currencyId}`)
      console.log(`      代码: ${uc.currency.code}`)
      console.log(`      名称: ${uc.currency.name}`)
      console.log(`      创建者: ${uc.currency.createdBy || '全局'}`)
      console.log('')
    })

    // 检查所有 AUD 相关的汇率记录
    console.log(`📈 所有 AUD 相关汇率记录:`)
    for (const audCurrency of audCurrencies) {
      const rates = await prisma.exchangeRate.findMany({
        where: {
          userId: testUser.id,
          OR: [
            { fromCurrencyId: audCurrency.id },
            { toCurrencyId: audCurrency.id },
          ],
        },
        include: {
          fromCurrencyRef: true,
          toCurrencyRef: true,
        },
      })

      console.log(`\n  AUD (ID: ${audCurrency.id}) 相关汇率 (${rates.length} 条):`)
      rates.forEach((rate, index) => {
        console.log(`    ${index + 1}. ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
        console.log(`        生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
        console.log(`        类型: ${rate.type}`)
      })
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDuplicateCurrencies()

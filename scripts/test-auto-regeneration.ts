/**
 * 测试汇率自动重新生成功能
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAutoRegeneration() {
  try {
    console.log('🧪 测试汇率自动重新生成功能...\n')

    // 获取或创建用户数据
    let user = await prisma.user.findFirst()
    if (!user) {
      console.log('📝 创建测试用户...')
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'test-password',
        },
      })
      console.log('  ✅ 创建测试用户成功')
    }

    console.log(`👤 用户: ${user.email}`)

    // 清理现有数据
    await prisma.exchangeRate.deleteMany({
      where: { userId: user.id },
    })
    console.log('🧹 清理现有汇率数据')

    // 创建初始用户汇率
    // 获取货币
    const cnyCurrency = await prisma.currency.findFirst({
      where: { code: 'CNY', createdBy: null },
    })
    const usdCurrency = await prisma.currency.findFirst({
      where: { code: 'USD', createdBy: null },
    })
    const eurCurrency = await prisma.currency.findFirst({
      where: { code: 'EUR', createdBy: null },
    })

    if (!cnyCurrency || !usdCurrency || !eurCurrency) {
      console.log('❌ 缺少必要的货币数据')
      return
    }

    console.log('\n📝 创建初始用户汇率...')
    await prisma.exchangeRate.create({
      data: {
        userId: user.id,
        fromCurrencyId: cnyCurrency.id,
        toCurrencyId: usdCurrency.id,
        rate: 0.14,
        effectiveDate: new Date(),
        type: 'USER',
        notes: '初始汇率',
      },
    })
    console.log('  ✅ 创建 CNY → USD = 0.14')

    // 模拟 API 调用：保存汇率后自动生成
    console.log('\n🔄 模拟保存汇率后的自动重新生成...')

    // 删除所有自动生成的汇率
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`  🗑️  删除了 ${deleteResult.count} 条自动生成的汇率`)

    // 重新生成所有自动汇率
    const { generateAutoExchangeRates } = await import(
      '../src/lib/services/exchange-rate-auto-generation.service'
    )
    const result = await generateAutoExchangeRates(user.id)
    console.log(`  ✨ 重新生成了 ${result.generatedCount} 条汇率`)

    // 查看结果
    const allRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    console.log('\n📋 当前汇率状态:')
    const userRates = allRates.filter(rate => rate.type === 'USER')
    const autoRates = allRates.filter(rate => rate.type === 'AUTO')

    console.log(`\n👤 用户输入汇率 (${userRates.length} 条):`)
    userRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`\n🤖 自动生成汇率 (${autoRates.length} 条):`)
    autoRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    // 测试添加第二个汇率
    console.log('\n📝 添加第二个用户汇率...')
    await prisma.exchangeRate.create({
      data: {
        userId: user.id,
        fromCurrencyId: eurCurrency.id,
        toCurrencyId: usdCurrency.id,
        rate: 1.08,
        effectiveDate: new Date(),
        type: 'USER',
        notes: '第二个汇率',
      },
    })
    console.log('  ✅ 创建 EUR → USD = 1.08')

    // 再次自动重新生成
    console.log('\n🔄 再次自动重新生成...')

    const deleteResult2 = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`  🗑️  删除了 ${deleteResult2.count} 条自动生成的汇率`)

    const result2 = await generateAutoExchangeRates(user.id)
    console.log(`  ✨ 重新生成了 ${result2.generatedCount} 条汇率`)

    // 最终结果
    const finalRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    console.log('\n📋 最终汇率状态:')
    const finalUserRates = finalRates.filter(rate => rate.type === 'USER')
    const finalAutoRates = finalRates.filter(rate => rate.type === 'AUTO')

    console.log(`\n👤 用户输入汇率 (${finalUserRates.length} 条):`)
    finalUserRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`\n🤖 自动生成汇率 (${finalAutoRates.length} 条):`)
    finalAutoRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log('\n✅ 自动重新生成功能测试完成！')
    console.log(
      `📊 汇率覆盖率: ${finalUserRates.length} 用户汇率 → ${finalRates.length} 总汇率`
    )
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testAutoRegeneration()

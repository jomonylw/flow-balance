/**
 * 测试汇率自动重新生成功能
 * 验证各种汇率操作是否正确触发AUTO类型汇率的重新生成
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 开始测试汇率自动重新生成功能...\n')

  // 查找测试用户
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'test' } },
  })

  if (!user) {
    console.log('❌ 未找到测试用户')
    return
  }

  console.log(`👤 使用测试用户: ${user.email} (${user.id})`)

  // 清理现有汇率数据
  console.log('\n🧹 清理现有汇率数据...')
  await prisma.exchangeRate.deleteMany({
    where: { userId: user.id },
  })

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

  // 测试1: 手动创建汇率 (模拟 POST /api/exchange-rates)
  console.log('\n📝 测试1: 手动创建汇率...')
  
  // 创建用户汇率
  const userRate1 = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: cnyCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 0.14,
      effectiveDate: new Date(),
      type: 'USER',
      notes: '测试汇率1',
    },
  })
  console.log(`  ✅ 创建用户汇率: CNY → USD = 0.14`)

  // 模拟API调用后的自动重新生成逻辑
  console.log('  🔄 模拟API调用后的自动重新生成...')
  await prisma.exchangeRate.deleteMany({
    where: {
      userId: user.id,
      type: 'AUTO',
    },
  })

  const { generateAutoExchangeRates } = await import(
    '../src/lib/services/exchange-rate-auto-generation.service'
  )
  const result1 = await generateAutoExchangeRates(user.id)
  console.log(`  ✨ 生成了 ${result1.generatedCount} 条自动汇率`)

  // 检查结果
  const ratesAfterCreate = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: { type: 'asc' },
  })

  console.log(`  📊 当前汇率总数: ${ratesAfterCreate.length}`)
  const userRates = ratesAfterCreate.filter(r => r.type === 'USER')
  const autoRates = ratesAfterCreate.filter(r => r.type === 'AUTO')
  console.log(`    - USER类型: ${userRates.length} 条`)
  console.log(`    - AUTO类型: ${autoRates.length} 条`)

  autoRates.forEach(rate => {
    console.log(`      ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  // 测试2: 批量创建汇率 (模拟 PUT /api/exchange-rates)
  console.log('\n📝 测试2: 批量创建汇率...')
  
  const userRate2 = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: eurCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 1.08,
      effectiveDate: new Date(),
      type: 'USER',
      notes: '测试汇率2',
    },
  })
  console.log(`  ✅ 创建用户汇率: EUR → USD = 1.08`)

  // 模拟批量API调用后的自动重新生成逻辑
  console.log('  🔄 模拟批量API调用后的自动重新生成...')
  await prisma.exchangeRate.deleteMany({
    where: {
      userId: user.id,
      type: 'AUTO',
    },
  })

  const result2 = await generateAutoExchangeRates(user.id)
  console.log(`  ✨ 重新生成了 ${result2.generatedCount} 条自动汇率`)

  // 检查结果
  const ratesAfterBatch = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  console.log(`  📊 当前汇率总数: ${ratesAfterBatch.length}`)
  const userRates2 = ratesAfterBatch.filter(r => r.type === 'USER')
  const autoRates2 = ratesAfterBatch.filter(r => r.type === 'AUTO')
  console.log(`    - USER类型: ${userRates2.length} 条`)
  console.log(`    - AUTO类型: ${autoRates2.length} 条`)

  // 测试3: 更新汇率 (模拟 PUT /api/exchange-rates/[id])
  console.log('\n📝 测试3: 更新用户汇率...')
  
  const updatedRate = await prisma.exchangeRate.update({
    where: { id: userRate1.id },
    data: { rate: 0.15 },
  })
  console.log(`  ✅ 更新汇率: CNY → USD = 0.15`)

  // 模拟更新API调用后的自动重新生成逻辑（仅当是USER类型时）
  if (updatedRate.type === 'USER') {
    console.log('  🔄 模拟更新API调用后的自动重新生成...')
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })

    const result3 = await generateAutoExchangeRates(user.id)
    console.log(`  ✨ 重新生成了 ${result3.generatedCount} 条自动汇率`)
  }

  // 测试4: 删除汇率 (模拟 DELETE /api/exchange-rates/[id])
  console.log('\n📝 测试4: 删除用户汇率...')
  
  const rateToDelete = await prisma.exchangeRate.findFirst({
    where: { id: userRate2.id },
  })

  if (rateToDelete) {
    await prisma.exchangeRate.delete({
      where: { id: userRate2.id },
    })
    console.log(`  ✅ 删除汇率: EUR → USD`)

    // 模拟删除API调用后的自动重新生成逻辑（仅当是USER类型时）
    if (rateToDelete.type === 'USER') {
      console.log('  🔄 模拟删除API调用后的自动重新生成...')
      await prisma.exchangeRate.deleteMany({
        where: {
          userId: user.id,
          type: 'AUTO',
        },
      })

      const result4 = await generateAutoExchangeRates(user.id)
      console.log(`  ✨ 重新生成了 ${result4.generatedCount} 条自动汇率`)
    }
  }

  // 最终检查
  console.log('\n📊 最终汇率状态:')
  const finalRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  console.log(`总计: ${finalRates.length} 条汇率`)
  const finalUserRates = finalRates.filter(r => r.type === 'USER')
  const finalAutoRates = finalRates.filter(r => r.type === 'AUTO')
  
  console.log(`\n👤 USER类型汇率 (${finalUserRates.length} 条):`)
  finalUserRates.forEach(rate => {
    console.log(`  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log(`\n🤖 AUTO类型汇率 (${finalAutoRates.length} 条):`)
  finalAutoRates.forEach(rate => {
    console.log(`  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log('\n✅ 测试完成!')
}

main()
  .catch(e => {
    console.error('❌ 测试失败:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

/**
 * 测试用户增删改 USER类型/API类型 汇率记录时，AUTO记录是否会全部删除后重新生成
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAutoRatesGeneration(userId: string, testName: string) {
  const rates = await prisma.exchangeRate.findMany({
    where: { userId },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  const userRates = rates.filter(r => r.type === 'USER')
  const apiRates = rates.filter(r => r.type === 'API')
  const autoRates = rates.filter(r => r.type === 'AUTO')

  console.log(`\n📊 ${testName}:`)
  console.log(`  总计: ${rates.length} 条`)
  console.log(`  USER: ${userRates.length} 条, API: ${apiRates.length} 条, AUTO: ${autoRates.length} 条`)

  if (userRates.length > 0) {
    console.log(`  👤 USER汇率:`)
    userRates.forEach(rate => {
      console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
    })
  }

  if (apiRates.length > 0) {
    console.log(`  🌐 API汇率:`)
    apiRates.forEach(rate => {
      console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
    })
  }

  if (autoRates.length > 0) {
    console.log(`  🤖 AUTO汇率:`)
    autoRates.forEach(rate => {
      console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
    })
  } else {
    console.log(`  ⚠️  没有AUTO汇率！`)
  }

  return { userRates, apiRates, autoRates }
}

async function testUserApiRateOperations() {
  console.log('🧪 测试用户增删改 USER类型/API类型 汇率记录时的AUTO汇率处理...\n')

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
  const gbpCurrency = await prisma.currency.findFirst({
    where: { code: 'GBP', createdBy: null },
  })

  if (!cnyCurrency || !usdCurrency || !eurCurrency || !gbpCurrency) {
    console.log('❌ 缺少必要的货币数据')
    return
  }

  await checkAutoRatesGeneration(user.id, '初始状态')

  // 测试1: 创建USER类型汇率
  console.log('\n📝 测试1: 创建USER类型汇率...')
  
  const userRate1 = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: cnyCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 0.14,
      effectiveDate: new Date(),
      type: 'USER',
      notes: 'USER类型测试汇率1',
    },
  })
  console.log('✅ 创建USER汇率: CNY → USD = 0.14')

  await checkAutoRatesGeneration(user.id, '创建USER汇率后')

  // 模拟POST API的AUTO汇率重新生成逻辑
  console.log('\n🔄 模拟POST API的AUTO汇率重新生成逻辑...')
  try {
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, 'POST API重新生成后')

  // 测试2: 创建API类型汇率
  console.log('\n📝 测试2: 创建API类型汇率...')
  
  const apiRate1 = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: eurCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 1.08,
      effectiveDate: new Date(),
      type: 'API',
      notes: 'API类型测试汇率1',
    },
  })
  console.log('✅ 创建API汇率: EUR → USD = 1.08')

  await checkAutoRatesGeneration(user.id, '创建API汇率后')

  // 检查AUTO汇率生成服务是否包含API类型汇率
  console.log('\n🔍 检查AUTO汇率生成服务是否包含API类型汇率...')
  
  try {
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  const { userRates: currentUserRates, apiRates: currentApiRates, autoRates: currentAutoRates } = 
    await checkAutoRatesGeneration(user.id, '包含API汇率的重新生成后')

  // 分析期望结果
  console.log('\n🔍 分析期望结果:')
  console.log(`  当前有 ${currentUserRates.length} 条USER汇率 + ${currentApiRates.length} 条API汇率`)
  console.log('  基于这些汇率，应该生成的AUTO汇率:')
  
  if (currentUserRates.length > 0) {
    console.log('  基于USER汇率:')
    currentUserRates.forEach(rate => {
      console.log(`    - ${rate.toCurrencyRef.code} → ${rate.fromCurrencyRef.code} (反向汇率)`)
    })
  }
  
  if (currentApiRates.length > 0) {
    console.log('  基于API汇率:')
    currentApiRates.forEach(rate => {
      console.log(`    - ${rate.toCurrencyRef.code} → ${rate.fromCurrencyRef.code} (反向汇率)`)
    })
  }

  // 测试3: 更新USER类型汇率
  console.log('\n📝 测试3: 更新USER类型汇率...')
  
  await prisma.exchangeRate.update({
    where: { id: userRate1.id },
    data: { rate: 0.15 },
  })
  console.log('✅ 更新USER汇率: CNY → USD = 0.15')

  await checkAutoRatesGeneration(user.id, '更新USER汇率后')

  // 模拟PUT API的AUTO汇率重新生成逻辑（仅当是USER类型时）
  console.log('\n🔄 模拟PUT API的AUTO汇率重新生成逻辑（仅USER类型）...')
  try {
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, 'PUT USER汇率重新生成后')

  // 测试4: 更新API类型汇率
  console.log('\n📝 测试4: 更新API类型汇率...')
  
  await prisma.exchangeRate.update({
    where: { id: apiRate1.id },
    data: { rate: 1.10 },
  })
  console.log('✅ 更新API汇率: EUR → USD = 1.10')

  await checkAutoRatesGeneration(user.id, '更新API汇率后')

  // 检查：更新API类型汇率是否会触发AUTO汇率重新生成
  console.log('\n❓ 问题：更新API类型汇率是否会触发AUTO汇率重新生成？')
  console.log('   根据当前代码，PUT /api/exchange-rates/[id] 只在 existingRate.type === "USER" 时才重新生成')
  console.log('   这意味着更新API类型汇率不会触发AUTO汇率重新生成')

  // 测试5: 删除USER类型汇率
  console.log('\n📝 测试5: 删除USER类型汇率...')
  
  await prisma.exchangeRate.delete({
    where: { id: userRate1.id },
  })
  console.log('✅ 删除USER汇率: CNY → USD')

  await checkAutoRatesGeneration(user.id, '删除USER汇率后')

  // 模拟DELETE API的AUTO汇率重新生成逻辑（仅当是USER类型时）
  console.log('\n🔄 模拟DELETE API的AUTO汇率重新生成逻辑（仅USER类型）...')
  try {
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, 'DELETE USER汇率重新生成后')

  // 测试6: 删除API类型汇率
  console.log('\n📝 测试6: 删除API类型汇率...')
  
  await prisma.exchangeRate.delete({
    where: { id: apiRate1.id },
  })
  console.log('✅ 删除API汇率: EUR → USD')

  await checkAutoRatesGeneration(user.id, '删除API汇率后')

  console.log('\n❓ 问题：删除API类型汇率是否会触发AUTO汇率重新生成？')
  console.log('   根据当前代码，DELETE /api/exchange-rates/[id] 只在 existingRate.type === "USER" 时才重新生成')
  console.log('   这意味着删除API类型汇率不会触发AUTO汇率重新生成')

  // 总结问题
  console.log('\n📋 总结发现的问题:')
  console.log('1. ✅ POST /api/exchange-rates - 创建汇率后会重新生成AUTO汇率')
  console.log('2. ✅ PUT /api/exchange-rates - 批量创建汇率后会重新生成AUTO汇率')
  console.log('3. ❌ PUT /api/exchange-rates/[id] - 只有USER类型汇率更新才会重新生成AUTO汇率')
  console.log('4. ❌ DELETE /api/exchange-rates/[id] - 只有USER类型汇率删除才会重新生成AUTO汇率')
  console.log('5. ❓ generateAutoExchangeRates服务 - 需要检查是否包含API类型汇率')

  console.log('\n🔍 关键问题:')
  console.log('- API类型汇率的更新/删除不会触发AUTO汇率重新生成')
  console.log('- 这可能导致AUTO汇率与实际的API汇率不一致')
  console.log('- generateAutoExchangeRates服务可能只考虑USER类型汇率，忽略API类型汇率')
}

async function main() {
  try {
    await testUserApiRateOperations()
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

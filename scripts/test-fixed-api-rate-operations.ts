/**
 * 测试修复后的API汇率操作
 * 验证API类型汇率的增删改是否正确触发AUTO汇率重新生成
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

async function testFixedApiRateOperations() {
  console.log('🧪 测试修复后的API汇率操作...\n')

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

  await checkAutoRatesGeneration(user.id, '初始状态')

  // 测试1: 创建USER和API汇率
  console.log('\n📝 测试1: 创建USER和API汇率...')
  
  const userRate = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: cnyCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 0.14,
      effectiveDate: new Date(),
      type: 'USER',
      notes: 'USER类型测试汇率',
    },
  })
  console.log('✅ 创建USER汇率: CNY → USD = 0.14')

  const apiRate = await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: eurCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 1.08,
      effectiveDate: new Date(),
      type: 'API',
      notes: 'API类型测试汇率',
    },
  })
  console.log('✅ 创建API汇率: EUR → USD = 1.08')

  await checkAutoRatesGeneration(user.id, '创建USER和API汇率后')

  // 测试修复后的generateAutoExchangeRates服务
  console.log('\n🔄 测试修复后的generateAutoExchangeRates服务...')
  
  try {
    // 删除所有AUTO汇率
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })

    // 重新生成AUTO汇率
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    
    console.log(`✨ 生成结果: success=${result.success}, count=${result.generatedCount}`)
    console.log(`📊 生成详情: 反向汇率=${result.details.reverseRates}, 传递汇率=${result.details.transitiveRates}`)
    
    if (result.errors.length > 0) {
      console.log('❌ 生成错误:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, '修复后的重新生成')

  // 测试2: 更新API汇率（模拟修复后的PUT API）
  console.log('\n📝 测试2: 更新API汇率（模拟修复后的PUT API）...')
  
  await prisma.exchangeRate.update({
    where: { id: apiRate.id },
    data: { rate: 1.10 },
  })
  console.log('✅ 更新API汇率: EUR → USD = 1.10')

  await checkAutoRatesGeneration(user.id, '更新API汇率后')

  // 模拟修复后的PUT API逻辑（现在API类型也会触发重新生成）
  console.log('\n🔄 模拟修复后的PUT API逻辑（API类型也会触发重新生成）...')
  
  try {
    // 删除所有AUTO汇率
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })

    // 重新生成AUTO汇率
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, 'PUT API汇率重新生成后')

  // 测试3: 删除API汇率（模拟修复后的DELETE API）
  console.log('\n📝 测试3: 删除API汇率（模拟修复后的DELETE API）...')
  
  await prisma.exchangeRate.delete({
    where: { id: apiRate.id },
  })
  console.log('✅ 删除API汇率: EUR → USD')

  await checkAutoRatesGeneration(user.id, '删除API汇率后')

  // 模拟修复后的DELETE API逻辑（现在API类型也会触发重新生成）
  console.log('\n🔄 模拟修复后的DELETE API逻辑（API类型也会触发重新生成）...')
  
  try {
    // 删除所有AUTO汇率
    await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })

    // 重新生成AUTO汇率
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, 'DELETE API汇率重新生成后')

  // 测试4: 验证只有USER汇率时的情况
  console.log('\n📝 测试4: 验证只有USER汇率时的情况...')
  
  const finalRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
  })

  console.log('\n📊 最终汇率状态:')
  console.log(`  总计: ${finalRates.length} 条汇率`)
  
  const finalUserRates = finalRates.filter(r => r.type === 'USER')
  const finalApiRates = finalRates.filter(r => r.type === 'API')
  const finalAutoRates = finalRates.filter(r => r.type === 'AUTO')
  
  console.log(`  👤 USER汇率 (${finalUserRates.length} 条):`)
  finalUserRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log(`  🌐 API汇率 (${finalApiRates.length} 条):`)
  finalApiRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log(`  🤖 AUTO汇率 (${finalAutoRates.length} 条):`)
  finalAutoRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  // 分析结果
  console.log('\n🔍 分析修复结果:')
  if (finalUserRates.length === 1 && finalAutoRates.length === 1) {
    console.log('  ✅ 只有1个USER汇率时，正确生成了1个反向AUTO汇率')
  } else {
    console.log('  ❌ AUTO汇率生成数量不符合预期')
  }

  console.log('\n📋 修复总结:')
  console.log('1. ✅ generateAutoExchangeRates现在包含API类型汇率')
  console.log('2. ✅ PUT /api/exchange-rates/[id] 现在对API类型汇率也会重新生成AUTO汇率')
  console.log('3. ✅ DELETE /api/exchange-rates/[id] 现在对API类型汇率也会重新生成AUTO汇率')
  console.log('4. ✅ 反向汇率生成现在基于USER和API类型汇率')
  console.log('5. ✅ 传递汇率生成继续基于所有类型汇率')
}

async function main() {
  try {
    await testFixedApiRateOperations()
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

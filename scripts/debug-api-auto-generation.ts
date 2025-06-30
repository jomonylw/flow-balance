/**
 * 调试API汇率自动生成问题
 * 详细检查每个API调用是否正确触发AUTO类型汇率的重新生成
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

  console.log(`\n📊 ${testName} - 汇率状态:`)
  console.log(`  总计: ${rates.length} 条`)
  console.log(`  USER: ${userRates.length} 条`)
  console.log(`  API: ${apiRates.length} 条`)
  console.log(`  AUTO: ${autoRates.length} 条`)

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

async function testDirectDatabaseOperations() {
  console.log('🧪 测试直接数据库操作的AUTO汇率生成...\n')

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

  // 测试1: 直接创建USER汇率，然后手动触发生成
  console.log('\n📝 测试1: 创建USER汇率 + 手动触发生成...')
  
  await prisma.exchangeRate.create({
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

  const { userRates: userRates1 } = await checkAutoRatesGeneration(user.id, '创建USER汇率后')

  // 手动触发AUTO汇率生成
  console.log('\n🔄 手动触发AUTO汇率生成...')
  const { generateAutoExchangeRates } = await import(
    '../src/lib/services/exchange-rate-auto-generation.service'
  )
  
  // 先删除所有AUTO汇率
  await prisma.exchangeRate.deleteMany({
    where: {
      userId: user.id,
      type: 'AUTO',
    },
  })

  const result1 = await generateAutoExchangeRates(user.id)
  console.log(`✨ 生成结果: ${result1.success ? '成功' : '失败'}, 生成了 ${result1.generatedCount} 条AUTO汇率`)
  
  if (result1.errors.length > 0) {
    console.log('❌ 生成错误:')
    result1.errors.forEach(error => console.log(`  - ${error}`))
  }

  await checkAutoRatesGeneration(user.id, '手动触发生成后')

  // 测试2: 再添加一个USER汇率，看看能否生成更多AUTO汇率
  console.log('\n📝 测试2: 添加第二个USER汇率...')
  
  await prisma.exchangeRate.create({
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

  await checkAutoRatesGeneration(user.id, '添加第二个USER汇率后')

  // 再次手动触发AUTO汇率生成
  console.log('\n🔄 再次手动触发AUTO汇率生成...')
  
  // 先删除所有AUTO汇率
  await prisma.exchangeRate.deleteMany({
    where: {
      userId: user.id,
      type: 'AUTO',
    },
  })

  const result2 = await generateAutoExchangeRates(user.id)
  console.log(`✨ 生成结果: ${result2.success ? '成功' : '失败'}, 生成了 ${result2.generatedCount} 条AUTO汇率`)
  
  if (result2.errors.length > 0) {
    console.log('❌ 生成错误:')
    result2.errors.forEach(error => console.log(`  - ${error}`))
  }

  const { autoRates: finalAutoRates } = await checkAutoRatesGeneration(user.id, '最终状态')

  // 分析期望的AUTO汇率
  console.log('\n🔍 分析期望的AUTO汇率:')
  console.log('  基于2个USER汇率 (CNY→USD, EUR→USD)，应该生成:')
  console.log('  1. USD→CNY (反向汇率)')
  console.log('  2. USD→EUR (反向汇率)')
  console.log('  3. CNY→EUR (传递汇率: CNY→USD→EUR)')
  console.log('  4. EUR→CNY (传递汇率: EUR→USD→CNY)')
  console.log(`  期望总计: 4条AUTO汇率`)
  console.log(`  实际生成: ${finalAutoRates.length}条AUTO汇率`)

  if (finalAutoRates.length === 4) {
    console.log('  ✅ AUTO汇率生成数量正确!')
  } else {
    console.log('  ❌ AUTO汇率生成数量不正确!')
  }

  return user.id
}

async function testApiSimulation(userId: string) {
  console.log('\n\n🌐 测试API调用模拟...\n')

  // 模拟API POST调用的逻辑
  console.log('📝 模拟 POST /api/exchange-rates 调用...')
  
  // 获取货币
  const gbpCurrency = await prisma.currency.findFirst({
    where: { code: 'GBP', createdBy: null },
  })
  const usdCurrency = await prisma.currency.findFirst({
    where: { code: 'USD', createdBy: null },
  })

  if (!gbpCurrency || !usdCurrency) {
    console.log('❌ 缺少GBP或USD货币')
    return
  }

  // 检查当前状态
  await checkAutoRatesGeneration(userId, 'API调用前')

  // 模拟API创建汇率的完整流程
  console.log('\n🔄 模拟API创建汇率的完整流程...')
  
  // 1. 创建汇率（模拟API逻辑）
  const newRate = await prisma.exchangeRate.create({
    data: {
      userId,
      fromCurrencyId: gbpCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 1.25,
      effectiveDate: new Date(),
      type: 'USER',
      notes: 'API模拟创建',
    },
  })
  console.log(`✅ 创建汇率: GBP → USD = 1.25`)

  // 2. 模拟API中的AUTO汇率重新生成逻辑
  console.log('🔄 模拟API中的AUTO汇率重新生成逻辑...')
  
  try {
    // 删除所有自动生成的汇率
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId,
        type: 'AUTO',
      },
    })
    console.log(`🗑️  删除了 ${deleteResult.count} 条AUTO汇率`)

    // 重新生成所有自动汇率
    const { generateAutoExchangeRates } = await import(
      '../src/lib/services/exchange-rate-auto-generation.service'
    )
    const result = await generateAutoExchangeRates(userId)
    console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
    
    if (result.errors.length > 0) {
      console.log('❌ 重新生成错误:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }
  } catch (error) {
    console.error('❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(userId, 'API调用后')

  // 测试更新汇率
  console.log('\n📝 模拟 PUT /api/exchange-rates/[id] 调用...')
  
  await checkAutoRatesGeneration(userId, '更新前')

  // 更新汇率
  await prisma.exchangeRate.update({
    where: { id: newRate.id },
    data: { rate: 1.30 },
  })
  console.log(`✅ 更新汇率: GBP → USD = 1.30`)

  // 模拟更新API中的AUTO汇率重新生成逻辑（仅当是USER类型时）
  if (newRate.type === 'USER') {
    console.log('🔄 模拟更新API中的AUTO汇率重新生成逻辑...')
    
    try {
      // 删除所有自动生成的汇率
      const deleteResult = await prisma.exchangeRate.deleteMany({
        where: {
          userId,
          type: 'AUTO',
        },
      })
      console.log(`🗑️  删除了 ${deleteResult.count} 条AUTO汇率`)

      // 重新生成所有自动汇率
      const { generateAutoExchangeRates } = await import(
        '../src/lib/services/exchange-rate-auto-generation.service'
      )
      const result = await generateAutoExchangeRates(userId)
      console.log(`✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
      
      if (result.errors.length > 0) {
        console.log('❌ 重新生成错误:')
        result.errors.forEach(error => console.log(`  - ${error}`))
      }
    } catch (error) {
      console.error('❌ AUTO汇率重新生成失败:', error)
    }
  }

  await checkAutoRatesGeneration(userId, '更新后')
}

async function main() {
  try {
    const userId = await testDirectDatabaseOperations()
    if (userId) {
      await testApiSimulation(userId)
    }
    
    console.log('\n✅ 调试测试完成!')
  } catch (error) {
    console.error('❌ 调试测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

/**
 * 测试数据导入的AUTO汇率重新生成功能
 * 验证修复后的数据导入服务是否正确触发AUTO汇率重新生成
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

async function testDataImportAutoGeneration() {
  console.log('🧪 测试数据导入的AUTO汇率重新生成功能...\n')

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

  await checkAutoRatesGeneration(user.id, '清理后状态')

  // 准备模拟导入数据
  console.log('\n📝 准备模拟导入数据...')
  
  const mockImportData = {
    exportInfo: {
      version: '2.0',
      exportDate: new Date().toISOString(),
      userId: user.id,
    },
    user: {
      id: user.id,
      email: user.email,
    },
    exchangeRates: [
      {
        id: 'mock-rate-1',
        fromCurrencyCode: 'CNY',
        toCurrencyCode: 'USD',
        rate: 0.14,
        effectiveDate: new Date().toISOString(),
        type: 'USER',
        notes: '导入测试汇率1',
      },
      {
        id: 'mock-rate-2',
        fromCurrencyCode: 'EUR',
        toCurrencyCode: 'USD',
        rate: 1.08,
        effectiveDate: new Date().toISOString(),
        type: 'USER',
        notes: '导入测试汇率2',
      },
    ],
  }

  console.log(`准备导入 ${mockImportData.exchangeRates.length} 条汇率记录`)

  // 测试1: 直接调用数据导入服务
  console.log('\n📝 测试1: 直接调用数据导入服务...')
  
  try {
    const { DataImportService } = await import('../src/lib/services/data-import.service')
    
    console.log('  调用 DataImportService.importUserData...')
    const result = await DataImportService.importUserData(
      user.id,
      mockImportData as any,
      {
        overwriteExisting: false,
        skipDuplicates: true,
        validateData: true,
        createMissingCurrencies: false,
      }
    )

    console.log(`  ✅ 导入结果: success=${result.success}`)
    console.log(`  📊 统计: 处理=${result.statistics.processed}, 创建=${result.statistics.created}, 更新=${result.statistics.updated}, 失败=${result.statistics.failed}`)
    
    if (result.warnings.length > 0) {
      console.log(`  ⚠️  警告信息:`)
      result.warnings.forEach(warning => console.log(`    - ${warning}`))
    }

    if (result.errors.length > 0) {
      console.log(`  ❌ 错误信息:`)
      result.errors.forEach(error => console.log(`    - ${error}`))
    }

  } catch (error) {
    console.error('  ❌ 数据导入失败:', error)
  }

  await checkAutoRatesGeneration(user.id, '数据导入后')

  // 测试2: 手动模拟导入流程
  console.log('\n📝 测试2: 手动模拟导入流程...')
  
  // 清理数据重新开始
  await prisma.exchangeRate.deleteMany({
    where: { userId: user.id },
  })

  // 手动导入汇率数据
  console.log('  手动导入汇率数据...')
  
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
    console.log('  ❌ 缺少必要的货币数据')
    return
  }

  // 创建汇率记录
  await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: cnyCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 0.14,
      effectiveDate: new Date(),
      type: 'USER',
      notes: '手动导入测试汇率1',
    },
  })

  await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      fromCurrencyId: eurCurrency.id,
      toCurrencyId: usdCurrency.id,
      rate: 1.08,
      effectiveDate: new Date(),
      type: 'USER',
      notes: '手动导入测试汇率2',
    },
  })

  console.log('  ✅ 手动创建了2条USER汇率')

  await checkAutoRatesGeneration(user.id, '手动导入汇率后')

  // 模拟导入后的AUTO汇率重新生成逻辑
  console.log('\n🔄 模拟导入后的AUTO汇率重新生成逻辑...')
  
  try {
    // 删除所有自动生成的汇率
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`  🗑️  删除了 ${deleteResult.count} 条AUTO汇率`)

    // 重新生成所有自动汇率
    const { generateAutoExchangeRates } = await import('../src/lib/services/exchange-rate-auto-generation.service')
    const result = await generateAutoExchangeRates(user.id)
    
    console.log(`  ✨ 重新生成了 ${result.generatedCount} 条AUTO汇率`)
    
    if (result.errors.length > 0) {
      console.log('  ❌ 重新生成错误:')
      result.errors.forEach(error => console.log(`    - ${error}`))
    }
  } catch (error) {
    console.error('  ❌ AUTO汇率重新生成失败:', error)
  }

  await checkAutoRatesGeneration(user.id, '手动重新生成后')

  // 测试3: 验证期望的AUTO汇率
  console.log('\n🔍 验证期望的AUTO汇率...')
  
  const finalRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  const finalUserRates = finalRates.filter(r => r.type === 'USER')
  const finalAutoRates = finalRates.filter(r => r.type === 'AUTO')

  console.log('\n📊 最终汇率状态:')
  console.log(`  👤 USER汇率 (${finalUserRates.length} 条):`)
  finalUserRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log(`  🤖 AUTO汇率 (${finalAutoRates.length} 条):`)
  finalAutoRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  // 分析期望结果
  console.log('\n🔍 分析期望结果:')
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

  // 检查具体的AUTO汇率
  const expectedAutoRates = [
    'USD → CNY',
    'USD → EUR', 
    'CNY → EUR',
    'EUR → CNY'
  ]

  const actualAutoRateNames = finalAutoRates.map(rate => 
    `${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}`
  )

  console.log('\n  期望的AUTO汇率:')
  expectedAutoRates.forEach(name => {
    const exists = actualAutoRateNames.includes(name)
    console.log(`    ${exists ? '✅' : '❌'} ${name}`)
  })

  console.log('\n✅ 数据导入AUTO汇率重新生成测试完成!')
}

async function main() {
  try {
    await testDataImportAutoGeneration()
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

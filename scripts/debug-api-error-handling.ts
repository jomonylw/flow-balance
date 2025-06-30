/**
 * 调试API错误处理
 * 检查API调用中的错误处理是否导致AUTO汇率重新生成被跳过
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
  const autoRates = rates.filter(r => r.type === 'AUTO')

  console.log(`\n📊 ${testName}:`)
  console.log(`  USER: ${userRates.length} 条, AUTO: ${autoRates.length} 条`)

  return { userRates, autoRates }
}

async function testApiErrorHandling() {
  console.log('🔧 测试API错误处理...\n')

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

  if (!cnyCurrency || !usdCurrency) {
    console.log('❌ 缺少必要的货币数据')
    return
  }

  // 测试1: 模拟完整的POST API流程
  console.log('\n📝 测试1: 模拟完整的POST API流程...')

  const effectiveDate = new Date()
  const rateValue = 0.14

  // 1. 检查是否已存在相同的汇率（模拟API逻辑）
  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      userId: user.id,
      fromCurrencyId: cnyCurrency.id,
      toCurrencyId: usdCurrency.id,
      effectiveDate: {
        gte: new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate()),
        lt: new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate() + 1),
      },
    },
  })

  console.log(`现有汇率检查: ${existingRate ? '找到现有汇率' : '未找到现有汇率'}`)

  // 2. 创建或更新汇率
  let exchangeRate
  if (existingRate) {
    exchangeRate = await prisma.exchangeRate.update({
      where: { id: existingRate.id },
      data: {
        rate: rateValue,
        notes: 'API测试更新',
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })
    console.log('✅ 更新现有汇率')
  } else {
    exchangeRate = await prisma.exchangeRate.create({
      data: {
        userId: user.id,
        fromCurrencyId: cnyCurrency.id,
        toCurrencyId: usdCurrency.id,
        rate: rateValue,
        effectiveDate: effectiveDate,
        type: 'USER',
        notes: 'API测试创建',
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })
    console.log('✅ 创建新汇率')
  }

  await checkAutoRatesGeneration(user.id, '创建/更新汇率后')

  // 3. 模拟API中的AUTO汇率重新生成逻辑（带详细错误处理）
  console.log('\n🔄 模拟API中的AUTO汇率重新生成逻辑...')
  
  try {
    console.log('  步骤1: 删除所有AUTO汇率...')
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`  ✅ 删除了 ${deleteResult.count} 条AUTO汇率`)

    console.log('  步骤2: 重新生成AUTO汇率...')
    const { generateAutoExchangeRates } = await import(
      '../src/lib/services/exchange-rate-auto-generation.service'
    )
    
    console.log('  步骤3: 调用generateAutoExchangeRates...')
    const result = await generateAutoExchangeRates(user.id, effectiveDate)
    
    console.log(`  ✅ 生成结果: success=${result.success}, count=${result.generatedCount}`)
    
    if (result.errors.length > 0) {
      console.log('  ❌ 生成过程中的错误:')
      result.errors.forEach(error => console.log(`    - ${error}`))
    }

    if (result.details) {
      console.log(`  📊 生成详情:`)
      console.log(`    - 反向汇率: ${result.details.reverseRates} 条`)
      console.log(`    - 传递汇率: ${result.details.transitiveRates} 条`)
    }

  } catch (error) {
    console.error('  ❌ AUTO汇率重新生成失败:', error)
    console.error('  错误详情:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }

  await checkAutoRatesGeneration(user.id, '重新生成后')

  // 测试2: 测试可能导致错误的情况
  console.log('\n📝 测试2: 测试可能导致错误的情况...')

  // 创建一个无效的汇率记录来测试错误处理
  console.log('  创建第二个汇率以测试传递汇率生成...')
  
  const eurCurrency = await prisma.currency.findFirst({
    where: { code: 'EUR', createdBy: null },
  })

  if (eurCurrency) {
    await prisma.exchangeRate.create({
      data: {
        userId: user.id,
        fromCurrencyId: eurCurrency.id,
        toCurrencyId: usdCurrency.id,
        rate: 1.08,
        effectiveDate: effectiveDate,
        type: 'USER',
        notes: '第二个测试汇率',
      },
    })
    console.log('  ✅ 创建EUR→USD汇率')

    await checkAutoRatesGeneration(user.id, '创建第二个汇率后')

    // 再次测试重新生成
    console.log('\n🔄 再次测试AUTO汇率重新生成...')
    
    try {
      console.log('  删除所有AUTO汇率...')
      const deleteResult = await prisma.exchangeRate.deleteMany({
        where: {
          userId: user.id,
          type: 'AUTO',
        },
      })
      console.log(`  ✅ 删除了 ${deleteResult.count} 条AUTO汇率`)

      console.log('  重新生成AUTO汇率...')
      const { generateAutoExchangeRates } = await import(
        '../src/lib/services/exchange-rate-auto-generation.service'
      )
      
      const result = await generateAutoExchangeRates(user.id, effectiveDate)
      
      console.log(`  ✅ 生成结果: success=${result.success}, count=${result.generatedCount}`)
      
      if (result.errors.length > 0) {
        console.log('  ❌ 生成过程中的错误:')
        result.errors.forEach(error => console.log(`    - ${error}`))
      }

    } catch (error) {
      console.error('  ❌ AUTO汇率重新生成失败:', error)
    }

    await checkAutoRatesGeneration(user.id, '第二次重新生成后')
  }

  // 测试3: 检查国际化函数是否可能导致问题
  console.log('\n📝 测试3: 检查国际化函数...')
  
  try {
    const { createServerTranslator } = await import('../src/lib/utils/server-i18n')
    const t = createServerTranslator()
    
    const testMessage = t('exchange.rate.auto.generate.failed')
    console.log(`  ✅ 国际化函数正常: "${testMessage}"`)
  } catch (error) {
    console.error('  ❌ 国际化函数错误:', error)
  }

  console.log('\n✅ API错误处理测试完成!')
  
  // 最终状态检查
  const finalRates = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    include: {
      fromCurrencyRef: true,
      toCurrencyRef: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  console.log('\n📊 最终汇率状态:')
  console.log(`  总计: ${finalRates.length} 条汇率`)
  
  const finalUserRates = finalRates.filter(r => r.type === 'USER')
  const finalAutoRates = finalRates.filter(r => r.type === 'AUTO')
  
  console.log(`  👤 USER汇率 (${finalUserRates.length} 条):`)
  finalUserRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  console.log(`  🤖 AUTO汇率 (${finalAutoRates.length} 条):`)
  finalAutoRates.forEach(rate => {
    console.log(`    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
  })

  // 分析结果
  console.log('\n🔍 分析结果:')
  if (finalUserRates.length > 0 && finalAutoRates.length === 0) {
    console.log('  ❌ 有USER汇率但没有AUTO汇率，可能存在问题')
  } else if (finalUserRates.length > 0 && finalAutoRates.length > 0) {
    console.log('  ✅ USER汇率和AUTO汇率都存在，逻辑正常')
  } else {
    console.log('  ⚠️  没有USER汇率，无法判断AUTO汇率生成是否正常')
  }
}

async function main() {
  try {
    await testApiErrorHandling()
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

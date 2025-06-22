/**
 * 调试汇率生成问题
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugExchangeRateGeneration() {
  try {
    console.log('🔍 调试汇率生成问题...\n')

    // 获取演示用户
    const user = await prisma.user.findUnique({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到演示用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 查看当前汇率状态
    console.log('\n📊 当前汇率状态:')
    const currentRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    const userRates = currentRates.filter(rate => rate.type === 'USER')
    const autoRates = currentRates.filter(rate => rate.type === 'AUTO')

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

    // 查看用户可用货币
    console.log('\n💱 用户可用货币:')
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: { order: 'asc' },
      include: {
        currency: true,
      },
    })

    userCurrencies.forEach(uc => {
      console.log(`  ${uc.currency.code} (顺序: ${uc.order})`)
    })

    // 手动测试自动生成逻辑
    console.log('\n🔄 手动测试自动生成逻辑...')

    // 清理现有自动汇率
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`🗑️  删除了 ${deleteResult.count} 条自动生成的汇率`)

    // 重新生成
    const { generateAutoExchangeRates } = await import(
      '../src/lib/services/exchange-rate-auto-generation.service'
    )
    const result = await generateAutoExchangeRates(user.id)

    console.log('\n📊 生成结果:')
    console.log(`  成功: ${result.success}`)
    console.log(`  总计生成: ${result.generatedCount} 条`)
    console.log(`  反向汇率: ${result.details.reverseRates} 条`)
    console.log(`  传递汇率: ${result.details.transitiveRates} 条`)

    if (result.errors.length > 0) {
      console.log('\n⚠️  错误信息:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }

    // 查看生成后的汇率
    const finalRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    const finalUserRates = finalRates.filter(rate => rate.type === 'USER')
    const finalAutoRates = finalRates.filter(rate => rate.type === 'AUTO')

    console.log('\n📋 最终汇率状态:')
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

    // 分析应该生成的汇率
    console.log('\n🧮 理论分析:')
    const currencies = userCurrencies.map(uc => uc.currency.code)
    console.log(`  可用货币: ${currencies.join(', ')}`)

    const totalPossiblePairs = currencies.length * (currencies.length - 1)
    console.log(`  理论最大汇率对数: ${totalPossiblePairs}`)
    console.log(`  当前用户汇率: ${finalUserRates.length}`)
    console.log(`  当前自动汇率: ${finalAutoRates.length}`)
    console.log(`  总计: ${finalUserRates.length + finalAutoRates.length}`)

    // 列出缺失的汇率对
    console.log('\n❓ 缺失的汇率对:')
    const existingPairs = new Set()
    finalRates.forEach(rate => {
      existingPairs.add(
        `${rate.fromCurrencyRef.code}-${rate.toCurrencyRef.code}`
      )
    })

    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const pairKey = `${from}-${to}`
          if (!existingPairs.has(pairKey)) {
            console.log(`  缺失: ${from} → ${to}`)
          }
        }
      }
    }

    console.log('\n✅ 调试完成！')
  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行调试
debugExchangeRateGeneration()

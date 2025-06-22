/**
 * 测试修复后的汇率生成功能
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFixedGeneration() {
  try {
    console.log('🧪 测试修复后的汇率生成功能...\n')

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
    console.log('\n📊 修复前汇率状态:')
    const beforeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    const beforeUserRates = beforeRates.filter(rate => rate.type === 'USER')
    const beforeAutoRates = beforeRates.filter(rate => rate.type === 'AUTO')

    console.log(`  👤 用户输入汇率: ${beforeUserRates.length} 条`)
    beforeUserRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`  🤖 自动生成汇率: ${beforeAutoRates.length} 条`)
    beforeAutoRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    // 清理现有自动汇率
    console.log('\n🗑️  清理现有自动汇率...')
    const deleteResult = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`  删除了 ${deleteResult.count} 条自动生成的汇率`)

    // 使用修复后的算法重新生成
    console.log('\n🔄 使用修复后的算法重新生成...')
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

    // 查看修复后的汇率状态
    console.log('\n📊 修复后汇率状态:')
    const afterRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    const afterUserRates = afterRates.filter(rate => rate.type === 'USER')
    const afterAutoRates = afterRates.filter(rate => rate.type === 'AUTO')

    console.log(`  👤 用户输入汇率: ${afterUserRates.length} 条`)
    afterUserRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`  🤖 自动生成汇率: ${afterAutoRates.length} 条`)
    afterAutoRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.notes})`
      )
    })

    // 验证完整性
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    const currencies = userCurrencies.map(uc => uc.currency.code)
    const totalPossible = currencies.length * (currencies.length - 1)
    const actualTotal = afterRates.length

    console.log('\n📈 完整性验证:')
    console.log(`  可用货币: ${currencies.join(', ')}`)
    console.log(`  理论最大汇率对: ${totalPossible}`)
    console.log(`  实际汇率对: ${actualTotal}`)
    console.log(
      `  覆盖率: ${((actualTotal / totalPossible) * 100).toFixed(1)}%`
    )

    // 列出缺失的汇率对
    const existingPairs = new Set()
    afterRates.forEach(rate => {
      existingPairs.add(
        `${rate.fromCurrencyRef.code}-${rate.toCurrencyRef.code}`
      )
    })

    const missingPairs = []
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const pairKey = `${from}-${to}`
          if (!existingPairs.has(pairKey)) {
            missingPairs.push(pairKey)
          }
        }
      }
    }

    if (missingPairs.length > 0) {
      console.log(`\n❓ 仍然缺失的汇率对 (${missingPairs.length} 个):`)
      missingPairs.forEach(pair => console.log(`  ${pair}`))
    } else {
      console.log('\n🎉 所有汇率对都已生成！')
    }

    console.log('\n✅ 测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testFixedGeneration()

/**
 * 测试汇率自动生成功能
 */

import { PrismaClient } from '@prisma/client'
import { generateAutoExchangeRates } from '../src/lib/services/exchange-rate-auto-generation.service'

const prisma = new PrismaClient()

async function testAutoExchangeRates() {
  try {
    console.log('🧪 测试汇率自动生成功能...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 检查现有汇率
    const existingRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`💱 现有汇率: ${existingRates.length} 条`)
    existingRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type || 'USER'})`
      )
    })

    // 如果没有用户输入的汇率，先创建一些测试数据
    const userRates = existingRates.filter(
      rate => (rate.type || 'USER') === 'USER'
    )

    if (userRates.length === 0) {
      console.log('\n📝 创建测试汇率数据...')

      // 创建一些基础汇率
      const testRates = [
        { from: 'CNY', to: 'USD', rate: 0.14 },
        { from: 'JPY', to: 'USD', rate: 0.0067 },
        { from: 'EUR', to: 'USD', rate: 1.08 },
      ]

      for (const testRate of testRates) {
        try {
          // 获取货币ID
          const fromCurrency = await prisma.currency.findFirst({
            where: { code: testRate.from, createdBy: null },
          })
          const toCurrency = await prisma.currency.findFirst({
            where: { code: testRate.to, createdBy: null },
          })

          if (fromCurrency && toCurrency) {
            await prisma.exchangeRate.create({
              data: {
                userId: user.id,
                fromCurrencyId: fromCurrency.id,
                toCurrencyId: toCurrency.id,
                rate: testRate.rate,
                effectiveDate: new Date(),
                type: 'USER',
                notes: '测试数据',
              },
            })
            console.log(
              `  ✅ 创建汇率: ${testRate.from} → ${testRate.to} = ${testRate.rate}`
            )
          }
        } catch {
          console.log(`  ⚠️  汇率可能已存在: ${testRate.from} → ${testRate.to}`)
        }
      }
    }

    console.log('\n🔄 执行自动生成汇率...')

    // 执行自动生成
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
    const allRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    console.log('\n📋 所有汇率列表:')

    const userInputRates = allRates.filter(
      rate => (rate.type || 'USER') === 'USER'
    )
    const autoRates = allRates.filter(rate => rate.type === 'AUTO')

    console.log(`\n👤 用户输入汇率 (${userInputRates.length} 条):`)
    userInputRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`\n🤖 自动生成汇率 (${autoRates.length} 条):`)
    autoRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} ${rate.notes ? `(${rate.notes})` : ''}`
      )
    })

    console.log('\n✨ 测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testAutoExchangeRates()

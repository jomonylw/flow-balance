/**
 * 添加基本汇率设置
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addExchangeRates() {
  try {
    console.log('🔍 添加基本汇率设置...\n')

    // 获取用户数据
    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('❌ 未找到用户数据')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 获取货币数据
    const currencies = await prisma.currency.findMany()
    console.log(`💰 找到 ${currencies.length} 种货币`)

    const cny = currencies.find(c => c.code === 'CNY')
    const usd = currencies.find(c => c.code === 'USD')
    const jpy = currencies.find(c => c.code === 'JPY')

    if (!cny || !usd || !jpy) {
      console.log('❌ 缺少必要的货币数据')
      return
    }

    // 检查现有汇率
    const existingRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`📊 现有汇率: ${existingRates.length} 个`)

    // 获取货币
    const usdCurrency = await prisma.currency.findFirst({
      where: { code: 'USD', createdBy: null },
    })
    const cnyCurrency = await prisma.currency.findFirst({
      where: { code: 'CNY', createdBy: null },
    })
    const jpyCurrency = await prisma.currency.findFirst({
      where: { code: 'JPY', createdBy: null },
    })

    if (!usdCurrency || !cnyCurrency || !jpyCurrency) {
      console.log('❌ 缺少必要的货币数据')
      return
    }

    // 添加USD到CNY的汇率
    const usdToCnyExists = existingRates.some(
      rate =>
        rate.fromCurrencyRef.code === 'USD' && rate.toCurrencyRef.code === 'CNY'
    )

    const now = new Date()

    if (!usdToCnyExists) {
      await prisma.exchangeRate.create({
        data: {
          userId: user.id,
          fromCurrencyId: usdCurrency.id,
          toCurrencyId: cnyCurrency.id,
          rate: 7.2, // 假设汇率
          effectiveDate: now,
        },
      })
      console.log('✅ 添加了 USD -> CNY 汇率: 7.2')
    } else {
      console.log('ℹ️  USD -> CNY 汇率已存在')
    }

    // 添加JPY到CNY的汇率
    const jpyToCnyExists = existingRates.some(
      rate =>
        rate.fromCurrencyRef.code === 'JPY' && rate.toCurrencyRef.code === 'CNY'
    )

    if (!jpyToCnyExists) {
      await prisma.exchangeRate.create({
        data: {
          userId: user.id,
          fromCurrencyId: jpyCurrency.id,
          toCurrencyId: cnyCurrency.id,
          rate: 0.05, // 假设汇率
          effectiveDate: now,
        },
      })
      console.log('✅ 添加了 JPY -> CNY 汇率: 0.05')
    } else {
      console.log('ℹ️  JPY -> CNY 汇率已存在')
    }

    // 添加CNY到USD的汇率（反向）
    const cnyToUsdExists = existingRates.some(
      rate =>
        rate.fromCurrencyRef.code === 'CNY' && rate.toCurrencyRef.code === 'USD'
    )

    if (!cnyToUsdExists) {
      await prisma.exchangeRate.create({
        data: {
          userId: user.id,
          fromCurrencyId: cnyCurrency.id,
          toCurrencyId: usdCurrency.id,
          rate: 0.139, // 1/7.2
          effectiveDate: now,
        },
      })
      console.log('✅ 添加了 CNY -> USD 汇率: 0.139')
    } else {
      console.log('ℹ️  CNY -> USD 汇率已存在')
    }

    // 验证汇率设置
    const finalRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`\n📋 最终汇率设置 (${finalRates.length} 个):`)
    finalRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} -> ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log('\n✅ 汇率设置完成!')
  } catch (error) {
    console.error('❌ 设置失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addExchangeRates()

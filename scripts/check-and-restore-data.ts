/**
 * 检查并恢复基础数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndRestoreData() {
  try {
    console.log('🔍 检查数据库状态...\n')

    // 检查用户数据
    const userCount = await prisma.user.count()
    console.log(`👤 用户数量: ${userCount}`)

    // 检查货币数据
    const currencyCount = await prisma.currency.count()
    console.log(`💱 货币数量: ${currencyCount}`)

    // 检查汇率数据
    const exchangeRateCount = await prisma.exchangeRate.count()
    console.log(`📊 汇率数量: ${exchangeRateCount}`)

    if (currencyCount === 0) {
      console.log('\n📝 创建基础货币数据...')

      const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
        { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
        {
          code: 'AUD',
          name: 'Australian Dollar',
          symbol: 'A$',
          decimalPlaces: 2,
        },
        {
          code: 'CAD',
          name: 'Canadian Dollar',
          symbol: 'C$',
          decimalPlaces: 2,
        },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2 },
        {
          code: 'HKD',
          name: 'Hong Kong Dollar',
          symbol: 'HK$',
          decimalPlaces: 2,
        },
        {
          code: 'SGD',
          name: 'Singapore Dollar',
          symbol: 'S$',
          decimalPlaces: 2,
        },
      ]

      for (const currency of currencies) {
        await prisma.currency.create({ data: currency })
        console.log(`  ✅ 创建货币: ${currency.code} - ${currency.name}`)
      }
    }

    if (userCount === 0) {
      console.log('\n📝 创建演示用户...')

      const demoUser = await prisma.user.create({
        data: {
          email: 'demo@flowbalance.com',
          name: 'Demo User',
          password: '$2a$10$demo.password.hash.for.testing.purposes.only',
        },
      })

      console.log(`  ✅ 创建用户: ${demoUser.email}`)

      // 创建用户设置
      // 获取CNY货币ID
      const cnyCurrency = await prisma.currency.findFirst({
        where: { code: 'CNY', createdBy: null },
      })

      await prisma.userSettings.create({
        data: {
          userId: demoUser.id,
          baseCurrencyId: cnyCurrency?.id,
          language: 'zh',
          theme: 'system',
        },
      })
      console.log('  ✅ 创建用户设置')

      // 添加用户可用货币
      const userCurrencies = ['CNY', 'USD', 'EUR', 'JPY']
      for (let i = 0; i < userCurrencies.length; i++) {
        const currency = await prisma.currency.findFirst({
          where: { code: userCurrencies[i], createdBy: null },
        })
        if (currency) {
          await prisma.userCurrency.create({
            data: {
              userId: demoUser.id,
              currencyId: currency.id,
              isActive: true,
              order: i,
            },
          })
          console.log(`  ✅ 添加用户货币: ${userCurrencies[i]}`)
        }
      }

      // 创建一些基础汇率
      console.log('\n📝 创建基础汇率...')
      const baseRates = [
        { from: 'CNY', to: 'USD', rate: 0.14 },
        { from: 'EUR', to: 'USD', rate: 1.08 },
        { from: 'JPY', to: 'USD', rate: 0.0067 },
      ]

      for (const rate of baseRates) {
        const fromCurrency = await prisma.currency.findFirst({
          where: { code: rate.from, createdBy: null },
        })
        const toCurrency = await prisma.currency.findFirst({
          where: { code: rate.to, createdBy: null },
        })

        if (fromCurrency && toCurrency) {
          await prisma.exchangeRate.create({
            data: {
              userId: demoUser.id,
              fromCurrencyId: fromCurrency.id,
              toCurrencyId: toCurrency.id,
              rate: rate.rate,
              effectiveDate: new Date(),
              type: 'USER',
              notes: '演示数据',
            },
          })
          console.log(`  ✅ 创建汇率: ${rate.from} → ${rate.to} = ${rate.rate}`)
        }
      }
    }

    console.log('\n✅ 数据库检查和恢复完成！')

    // 显示最终状态
    const finalUserCount = await prisma.user.count()
    const finalCurrencyCount = await prisma.currency.count()
    const finalExchangeRateCount = await prisma.exchangeRate.count()

    console.log('\n📊 最终数据统计:')
    console.log(`  👤 用户: ${finalUserCount}`)
    console.log(`  💱 货币: ${finalCurrencyCount}`)
    console.log(`  📊 汇率: ${finalExchangeRateCount}`)
  } catch (error) {
    console.error('❌ 检查和恢复失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查和恢复
checkAndRestoreData()

/**
 * 验证货币数据脚本
 * 检查数据库中的货币数据是否正确
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyCurrencyData() {
  try {
    console.log('🔍 验证货币数据...\n')

    // 获取所有全局货币
    const currencies = await prisma.currency.findMany({
      where: { createdBy: null },
      orderBy: { code: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true,
        decimalPlaces: true,
      },
    })

    console.log(`📦 数据库中共有 ${currencies.length} 种全局货币\n`)

    // 按小数位分组显示
    const currenciesByDecimal = currencies.reduce((acc, currency) => {
      const key = currency.decimalPlaces.toString()
      if (!acc[key]) acc[key] = []
      acc[key].push(currency)
      return acc
    }, {} as Record<string, typeof currencies>)

    Object.keys(currenciesByDecimal)
      .sort()
      .forEach(decimalPlaces => {
        const currencyList = currenciesByDecimal[decimalPlaces]
        console.log(`💰 ${decimalPlaces} 位小数 (${currencyList.length} 种货币):`)
        currencyList.forEach(currency => {
          console.log(`  ${currency.code}: ${currency.symbol} - ${currency.name}`)
        })
        console.log()
      })

    // 检查特定货币的符号是否正确
    const symbolChecks = [
      { code: 'USD', expectedSymbol: '$' },
      { code: 'EUR', expectedSymbol: '€' },
      { code: 'CNY', expectedSymbol: '¥' },
      { code: 'JPY', expectedSymbol: '¥' },
      { code: 'GBP', expectedSymbol: '£' },
      { code: 'CHF', expectedSymbol: 'Fr.' },
      { code: 'DKK', expectedSymbol: 'kr.' },
      { code: 'BGN', expectedSymbol: 'лв' },
      { code: 'TRY', expectedSymbol: '₺' },
      { code: 'ZAR', expectedSymbol: 'R' },
    ]

    console.log('🔍 符号验证:')
    let symbolErrors = 0
    for (const check of symbolChecks) {
      const currency = currencies.find(c => c.code === check.code)
      if (!currency) {
        console.log(`  ❌ ${check.code}: 货币不存在`)
        symbolErrors++
      } else if (currency.symbol !== check.expectedSymbol) {
        console.log(`  ❌ ${check.code}: 期望 "${check.expectedSymbol}", 实际 "${currency.symbol}"`)
        symbolErrors++
      } else {
        console.log(`  ✅ ${check.code}: ${currency.symbol}`)
      }
    }

    // 检查小数位精度
    console.log('\n🔍 小数位精度验证:')
    const precisionChecks = [
      { code: 'JPY', expectedDecimal: 0 },
      { code: 'KRW', expectedDecimal: 0 },
      { code: 'IDR', expectedDecimal: 0 },
      { code: 'VND', expectedDecimal: 0 },
      { code: 'USD', expectedDecimal: 2 },
      { code: 'EUR', expectedDecimal: 2 },
      { code: 'CNY', expectedDecimal: 2 },
    ]

    let precisionErrors = 0
    for (const check of precisionChecks) {
      const currency = currencies.find(c => c.code === check.code)
      if (!currency) {
        console.log(`  ❌ ${check.code}: 货币不存在`)
        precisionErrors++
      } else if (currency.decimalPlaces !== check.expectedDecimal) {
        console.log(`  ❌ ${check.code}: 期望 ${check.expectedDecimal} 位, 实际 ${currency.decimalPlaces} 位`)
        precisionErrors++
      } else {
        console.log(`  ✅ ${check.code}: ${currency.decimalPlaces} 位小数`)
      }
    }

    console.log('\n📊 验证结果:')
    console.log(`  总货币数: ${currencies.length}`)
    console.log(`  符号错误: ${symbolErrors}`)
    console.log(`  精度错误: ${precisionErrors}`)

    if (symbolErrors === 0 && precisionErrors === 0) {
      console.log('\n🎉 所有货币数据验证通过!')
    } else {
      console.log('\n⚠️  发现数据问题，请检查上述错误')
    }

  } catch (error) {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行验证
verifyCurrencyData()

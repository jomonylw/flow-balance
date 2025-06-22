/**
 * 更新货币数据脚本
 * 将完整的货币列表（包含符号和小数位精度）更新到数据库
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 完整的货币数据（基于用户提供的列表）
const CURRENCY_DATA = [
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalPlaces: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2 },
  { code: 'CNY', name: 'Chinese Renminbi Yuan', symbol: '¥', decimalPlaces: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalPlaces: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr.', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 0 },
  { code: 'ILS', name: 'Israeli New Sheqel', symbol: '₪', decimalPlaces: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimalPlaces: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalPlaces: 0 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2 },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2 },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', decimalPlaces: 2 },
  { code: 'USD', name: 'United States Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimalPlaces: 0 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
] as const

async function updateCurrencyData() {
  try {
    console.log('🚀 开始更新货币数据...\n')

    let createdCount = 0
    let updatedCount = 0

    for (const currency of CURRENCY_DATA) {
      console.log(`处理货币: ${currency.code} (${currency.name})`)

      // 先查找是否存在
      const existingCurrency = await prisma.currency.findFirst({
        where: {
          code: currency.code,
          createdBy: null,
        },
      })

      if (existingCurrency) {
        // 更新现有货币
        await prisma.currency.update({
          where: { id: existingCurrency.id },
          data: {
            name: currency.name,
            symbol: currency.symbol,
            decimalPlaces: currency.decimalPlaces,
          },
        })
        updatedCount++
        console.log('  ✅ 已更新')
      } else {
        // 创建新货币
        await prisma.currency.create({
          data: {
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimalPlaces: currency.decimalPlaces,
            createdBy: null,
          },
        })
        createdCount++
        console.log('  🆕 已创建')
      }


    }

    console.log('\n📊 更新统计:')
    console.log(`  🆕 新创建: ${createdCount} 种货币`)
    console.log(`  ✅ 已更新: ${updatedCount} 种货币`)
    console.log(`  📦 总计: ${CURRENCY_DATA.length} 种货币`)

    // 验证更新结果
    console.log('\n🔍 验证更新结果...')
    const allCurrencies = await prisma.currency.findMany({
      where: { createdBy: null },
      orderBy: { code: 'asc' },
      select: {
        code: true,
        name: true,
        symbol: true,
        decimalPlaces: true,
      },
    })

    console.log(`✅ 数据库中共有 ${allCurrencies.length} 种全局货币`)

    // 显示特殊精度的货币
    const specialPrecisionCurrencies = allCurrencies.filter(c => c.decimalPlaces !== 2)
    if (specialPrecisionCurrencies.length > 0) {
      console.log('\n💰 特殊精度货币:')
      specialPrecisionCurrencies.forEach(currency => {
        console.log(`  ${currency.code}: ${currency.decimalPlaces} 位小数 (${currency.symbol})`)
      })
    }

    console.log('\n🎉 货币数据更新完成!')

  } catch (error) {
    console.error('❌ 更新货币数据失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行更新
updateCurrencyData()

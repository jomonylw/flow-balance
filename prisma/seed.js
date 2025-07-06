/**
 * Flow Balance 种子数据
 * 仅导入全局货币信息，不包含任何用户数据
 * JavaScript 版本，兼容 Docker 生产环境
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始填充种子数据...')

  // 创建全局货币数据（基于国际标准）
  console.log('💰 创建全局货币数据...')

  // 完整的货币数据（参考 dev-files-backup-20250706_132812/update-currency-data.ts）
  const currencyData = [
    { code: 'AUD', name: 'Australian Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalPlaces: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2 },
    {
      code: 'CNY',
      name: 'Chinese Renminbi Yuan',
      symbol: '¥',
      decimalPlaces: 2,
    },
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
    {
      code: 'NZD',
      name: 'New Zealand Dollar',
      symbol: 'NZ$',
      decimalPlaces: 2,
    },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2 },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2 },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2 },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', decimalPlaces: 2 },
    {
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      decimalPlaces: 2,
    },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimalPlaces: 0 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
  ]

  // 批量创建或更新货币数据
  let createdCount = 0
  let updatedCount = 0

  for (const currency of currencyData) {
    // 先查找是否存在全局货币
    const existingCurrency = await prisma.currency.findFirst({
      where: {
        code: currency.code,
        createdBy: null, // 全局货币
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
    } else {
      // 创建新的全局货币
      await prisma.currency.create({
        data: {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
          createdBy: null, // 全局货币，不属于任何用户
          isCustom: false, // 非自定义货币
        },
      })
      createdCount++
    }
  }

  console.log(`✅ 货币数据处理完成:`)
  console.log(`  🆕 新创建: ${createdCount} 种货币`)
  console.log(`  ✅ 已更新: ${updatedCount} 种货币`)
  console.log(`  📦 总计: ${currencyData.length} 种全局货币`)

  // 验证结果
  const totalCurrencies = await prisma.currency.count({
    where: { createdBy: null },
  })
  console.log(`📊 数据库中共有 ${totalCurrencies} 种全局货币`)

  // 显示特殊精度的货币
  const specialPrecisionCurrencies = await prisma.currency.findMany({
    where: {
      createdBy: null,
      decimalPlaces: { not: 2 },
    },
    select: {
      code: true,
      symbol: true,
      decimalPlaces: true,
    },
  })

  if (specialPrecisionCurrencies.length > 0) {
    console.log('💰 特殊精度货币:')
    specialPrecisionCurrencies.forEach(currency => {
      console.log(
        `  ${currency.code}: ${currency.decimalPlaces} 位小数 (${currency.symbol})`
      )
    })
  }

  console.log('')
  console.log('✅ 种子数据填充完成!')
  console.log('📊 货币精度配置:')
  console.log('  - JPY, KRW, IDR, VND: 0 位小数（整数货币）')
  console.log('  - 其他货币: 2 位小数（标准精度）')
  console.log('')
  console.log('🎯 下一步: 用户注册后可在设置中选择基础货币')
}

main()
  .catch(e => {
    console.error('❌ 种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

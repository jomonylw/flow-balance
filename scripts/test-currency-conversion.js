/**
 * 测试货币转换功能的脚本
 * 验证汇率设置和转换逻辑是否正常工作
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCurrencyConversion() {
  try {
    console.log('🧪 开始测试货币转换功能...\n')

    // 1. 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' }
    })

    if (!user) {
      console.error('❌ 未找到测试用户')
      return
    }

    console.log(`👤 测试用户: ${user.email}`)

    // 2. 检查用户的汇率设置
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true
      }
    })

    console.log(`\n💱 用户汇率设置 (${exchangeRates.length} 条):`)
    exchangeRates.forEach(rate => {
      console.log(`  ${rate.fromCurrency} → ${rate.toCurrency}: ${rate.rate}`)
    })

    // 3. 检查用户的多货币交易
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        currency: true,
        account: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    console.log(`\n💰 用户交易记录 (${transactions.length} 条):`)
    const currencyGroups = {}
    transactions.forEach(transaction => {
      const currency = transaction.currency.code
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = []
      }
      currencyGroups[currency].push(transaction)
    })

    Object.entries(currencyGroups).forEach(([currency, txs]) => {
      console.log(`  ${currency}: ${txs.length} 条交易`)
      txs.forEach(tx => {
        console.log(`    ${tx.type} ${tx.amount} ${currency} - ${tx.description}`)
      })
    })

    // 4. 测试货币转换逻辑
    console.log('\n🔄 测试货币转换逻辑:')
    
    // 模拟转换测试
    const testConversions = [
      { amount: 100, from: 'EUR', to: 'USD' },
      { amount: 1000, from: 'CNY', to: 'USD' },
      { amount: 10000, from: 'JPY', to: 'USD' }
    ]

    for (const test of testConversions) {
      const rate = exchangeRates.find(r => 
        r.fromCurrency === test.from && r.toCurrency === test.to
      )
      
      if (rate) {
        const converted = test.amount * parseFloat(rate.rate.toString())
        console.log(`  ${test.amount} ${test.from} → ${converted.toFixed(2)} ${test.to} (汇率: ${rate.rate})`)
      } else {
        console.log(`  ❌ 缺少汇率: ${test.from} → ${test.to}`)
      }
    }

    // 5. 检查缺失的汇率
    const userCurrencies = [...new Set(transactions.map(t => t.currency.code))]
    const baseCurrency = 'USD'
    
    console.log(`\n🔍 汇率完整性检查 (本位币: ${baseCurrency}):`)
    console.log(`  用户使用的货币: ${userCurrencies.join(', ')}`)
    
    const missingRates = []
    userCurrencies.forEach(currency => {
      if (currency !== baseCurrency) {
        const hasRate = exchangeRates.some(r => 
          r.fromCurrency === currency && r.toCurrency === baseCurrency
        )
        if (!hasRate) {
          missingRates.push(`${currency} → ${baseCurrency}`)
        }
      }
    })

    if (missingRates.length > 0) {
      console.log(`  ❌ 缺失汇率: ${missingRates.join(', ')}`)
    } else {
      console.log(`  ✅ 所有汇率设置完整`)
    }

    // 6. 计算总资产（模拟转换）
    console.log('\n📊 资产汇总测试:')
    const assetsByCurrency = {}
    
    transactions.forEach(transaction => {
      const currency = transaction.currency.code
      const accountType = transaction.account.category.type
      
      if (accountType === 'ASSET') {
        if (!assetsByCurrency[currency]) {
          assetsByCurrency[currency] = 0
        }

        if (transaction.type === 'INCOME') {
          assetsByCurrency[currency] += parseFloat(transaction.amount.toString())
        } else if (transaction.type === 'EXPENSE') {
          assetsByCurrency[currency] -= parseFloat(transaction.amount.toString())
        }
      }
    })

    let totalAssetsInUSD = 0
    Object.entries(assetsByCurrency).forEach(([currency, amount]) => {
      if (currency === baseCurrency) {
        totalAssetsInUSD += amount
        console.log(`  ${currency}: ${amount.toFixed(2)} (无需转换)`)
      } else {
        const rate = exchangeRates.find(r => 
          r.fromCurrency === currency && r.toCurrency === baseCurrency
        )
        if (rate) {
          const convertedAmount = amount * parseFloat(rate.rate.toString())
          totalAssetsInUSD += convertedAmount
          console.log(`  ${currency}: ${amount.toFixed(2)} → ${convertedAmount.toFixed(2)} ${baseCurrency}`)
        } else {
          console.log(`  ${currency}: ${amount.toFixed(2)} (⚠️ 无汇率，未转换)`)
        }
      }
    })

    console.log(`  总资产 (${baseCurrency}): ${totalAssetsInUSD.toFixed(2)}`)

    console.log('\n✅ 货币转换功能测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testCurrencyConversion()
}

module.exports = { testCurrencyConversion }

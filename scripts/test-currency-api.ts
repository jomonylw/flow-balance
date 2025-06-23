#!/usr/bin/env npx tsx

/**
 * 测试货币API和汇率修复
 */

import { prisma } from '../src/lib/database/prisma'

async function testCurrencyAPI() {
  try {
    console.log('🧪 测试货币API和汇率修复...\n')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 测试用户: ${user.email}`)

    // 1. 测试汇率数据结构
    console.log('\n💱 1. 测试汇率数据结构:')
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      take: 3,
    })

    console.log(`   汇率记录数: ${exchangeRates.length}`)
    exchangeRates.forEach((rate, index) => {
      console.log(`   ${index + 1}. ${rate.fromCurrencyRef.code} -> ${rate.toCurrencyRef.code}`)
      console.log(`      汇率: ${rate.rate}`)
      console.log(`      fromCurrencyId: ${rate.fromCurrencyId}`)
      console.log(`      toCurrencyId: ${rate.toCurrencyId}`)
      console.log(`      fromCurrency: ${rate.fromCurrencyRef.code}`)
      console.log(`      toCurrency: ${rate.toCurrencyRef.code}`)
      console.log('')
    })

    // 2. 测试用户货币
    console.log('\n📋 2. 测试用户货币:')
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(`   用户货币数: ${userCurrencies.length}`)
    userCurrencies.forEach((uc, index) => {
      console.log(`   ${index + 1}. ${uc.currency.code} (ID: ${uc.currency.id})`)
      console.log(`      符号: ${uc.currency.symbol}`)
      console.log(`      小数位数: ${uc.currency.decimalPlaces}`)
      console.log(`      自定义: ${uc.currency.isCustom ? '是' : '否'}`)
      console.log('')
    })

    // 3. 测试本位币设置
    console.log('\n⚙️  3. 测试本位币设置:')
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (userSettings?.baseCurrency) {
      console.log(`   本位币: ${userSettings.baseCurrency.code}`)
      console.log(`   本位币ID: ${userSettings.baseCurrency.id}`)
      console.log(`   本位币符号: ${userSettings.baseCurrency.symbol}`)
      console.log(`   本位币小数位数: ${userSettings.baseCurrency.decimalPlaces}`)
    } else {
      console.log('   ❌ 未设置本位币')
    }

    // 4. 模拟CurrencyConverterPopover逻辑（完整版本）
    console.log('\n🔄 4. 模拟CurrencyConverterPopover逻辑:')
    if (userSettings?.baseCurrency) {
      const baseCurrency = userSettings.baseCurrency
      const otherCurrencies = userCurrencies.filter(uc => uc.currency.id !== baseCurrency.id)

      console.log(`   本位币: ${baseCurrency.code} (ID: ${baseCurrency.id})`)
      console.log('   转换测试:')

      for (const uc of otherCurrencies.slice(0, 3)) { // 只测试前3个
        const currency = uc.currency
        console.log(`\n   - ${currency.code} (ID: ${currency.id})`)

        let rate = null
        let isReverse = false
        let method = ''

        // 1. 使用ID匹配查找直接汇率
        rate = exchangeRates.find(r =>
          r.fromCurrencyId === currency.id && r.toCurrencyId === baseCurrency.id
        )
        if (rate) {
          method = 'ID直接匹配'
        }

        // 2. 如果没有直接汇率，查找反向汇率
        if (!rate) {
          const reverseRate = exchangeRates.find(r =>
            r.fromCurrencyId === baseCurrency.id && r.toCurrencyId === currency.id
          )
          if (reverseRate) {
            rate = {
              ...reverseRate,
              rate: 1 / parseFloat(reverseRate.rate.toString())
            }
            isReverse = true
            method = 'ID反向匹配'
          }
        }

        // 3. 如果仍然没有找到汇率，尝试通过相同货币代码查找
        if (!rate && currency.code === baseCurrency.code && currency.id !== baseCurrency.id) {
          rate = { rate: 1 }
          method = '相同货币代码'
        }

        // 4. 如果还是没有找到汇率，尝试通过货币代码间接查找
        if (!rate) {
          const codeBasedRate = exchangeRates.find(r =>
            r.fromCurrencyRef.code === currency.code && r.toCurrencyRef.code === baseCurrency.code
          )

          if (codeBasedRate) {
            rate = codeBasedRate
            method = '代码直接匹配'
          } else {
            const reverseCodeRate = exchangeRates.find(r =>
              r.fromCurrencyRef.code === baseCurrency.code && r.toCurrencyRef.code === currency.code
            )
            if (reverseCodeRate) {
              rate = {
                ...reverseCodeRate,
                rate: 1 / parseFloat(reverseCodeRate.rate.toString())
              }
              isReverse = true
              method = '代码反向匹配'
            }
          }
        }

        if (rate) {
          const rateValue = typeof rate.rate === 'number' ? rate.rate : parseFloat(rate.rate.toString())
          console.log(`     ✅ ${method}: 1 ${currency.code} = ${rateValue} ${baseCurrency.code}${isReverse ? ' (反向计算)' : ''}`)
        } else {
          console.log(`     ❌ 未找到汇率`)
        }
      }
    }

    console.log('\n🎉 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testCurrencyAPI()

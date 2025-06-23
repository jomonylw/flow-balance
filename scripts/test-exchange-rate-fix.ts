#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getMissingExchangeRates, getUserCurrencyRecords } from '../src/lib/services/currency.service'

const prisma = new PrismaClient()

async function testExchangeRateFix() {
  console.log('🧪 测试汇率检查修复...\n')

  try {
    // 1. 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 使用测试用户: ${testUser.email}`)

    // 2. 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: testUser.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      id: 'default-usd',
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
    }

    console.log(`\n💰 本位币: ${baseCurrency.code} (ID: ${baseCurrency.id})`)

    // 3. 获取用户货币记录
    const userCurrencyRecords = await getUserCurrencyRecords(testUser.id)
    console.log(`\n📋 用户货币记录 (${userCurrencyRecords.length} 个):`)
    userCurrencyRecords.forEach((currency, index) => {
      console.log(`  ${index + 1}. ${currency.code} (ID: ${currency.id}) - ${currency.name}`)
    })

    // 4. 检查是否有相同代码的货币
    const currencyCodeMap = new Map<string, Array<{ id: string; name: string }>>()
    userCurrencyRecords.forEach(currency => {
      if (!currencyCodeMap.has(currency.code)) {
        currencyCodeMap.set(currency.code, [])
      }
      currencyCodeMap.get(currency.code)!.push({ id: currency.id, name: currency.name })
    })

    console.log(`\n🔍 货币代码重复检查:`)
    let hasDuplicates = false
    currencyCodeMap.forEach((currencies, code) => {
      if (currencies.length > 1) {
        hasDuplicates = true
        console.log(`  ⚠️  ${code}: ${currencies.length} 个记录`)
        currencies.forEach((currency, index) => {
          console.log(`    ${index + 1}. ID: ${currency.id} - ${currency.name}`)
        })
      } else {
        console.log(`  ✅ ${code}: 1 个记录`)
      }
    })

    if (!hasDuplicates) {
      console.log('  ✅ 没有发现重复的货币代码')
    }

    // 5. 测试缺失汇率检查
    console.log(`\n💱 测试缺失汇率检查...`)
    const missingRates = await getMissingExchangeRates(testUser.id, baseCurrency.code)
    
    console.log(`\n📊 缺失汇率检查结果:`)
    console.log(`  需要设置汇率的货币对: ${missingRates.length} 个`)
    
    if (missingRates.length > 0) {
      console.log(`  缺失的汇率:`)
      missingRates.forEach((missing, index) => {
        console.log(`    ${index + 1}. ${missing.fromCurrency} → ${missing.toCurrency}`)
      })
    } else {
      console.log(`  ✅ 所有汇率设置完整`)
    }

    // 6. 检查现有汇率
    const existingRates = await prisma.exchangeRate.findMany({
      where: {
        userId: testUser.id,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyRef: { code: 'asc' } },
        { effectiveDate: 'desc' },
      ],
    })

    console.log(`\n📈 现有汇率记录 (${existingRates.length} 条):`)
    if (existingRates.length > 0) {
      existingRates.forEach((rate, index) => {
        console.log(`  ${index + 1}. ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
        console.log(`      fromCurrencyId: ${rate.fromCurrencyId}`)
        console.log(`      toCurrencyId: ${rate.toCurrencyId}`)
        console.log(`      生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
        console.log('')
      })
    } else {
      console.log('  📝 没有汇率记录')
    }

    // 7. 验证修复效果
    console.log(`\n🎯 修复效果验证:`)
    
    // 检查是否有相同货币ID的情况被错误地标记为需要汇率
    const baseCurrencyRecord = userCurrencyRecords.find(c => c.code === baseCurrency.code)
    if (baseCurrencyRecord) {
      const shouldNotNeedRate = missingRates.some(missing => 
        missing.fromCurrency === baseCurrency.code && missing.toCurrency === baseCurrency.code
      )
      
      if (shouldNotNeedRate) {
        console.log(`  ❌ 错误：本位币 ${baseCurrency.code} 被标记为需要设置汇率`)
      } else {
        console.log(`  ✅ 正确：本位币 ${baseCurrency.code} 没有被标记为需要设置汇率`)
      }
    }

    // 检查是否有相同代码但不同ID的货币被正确处理
    if (hasDuplicates) {
      console.log(`  📝 注意：发现重复货币代码，请检查是否正确处理`)
    }

    console.log(`\n✅ 测试完成`)

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testExchangeRateFix()

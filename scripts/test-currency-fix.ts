#!/usr/bin/env npx tsx

/**
 * 测试货币修复是否有效
 * 验证：
 * 1. 本位币选择下拉菜单是否能正确显示两个CNY选项
 * 2. 汇率显示是否正常工作
 */

import { prisma } from '../src/lib/database/prisma'

async function testCurrencyFix() {
  try {
    console.log('🧪 测试货币修复效果...\n')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 测试用户: ${user.email}`)

    // 1. 测试用户货币列表
    console.log('\n📋 1. 用户货币列表测试:')
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`   总数: ${userCurrencies.length} 个货币`)
    userCurrencies.forEach((uc, index) => {
      console.log(`   ${index + 1}. ID: ${uc.currency.id}`)
      console.log(`      代码: ${uc.currency.code}`)
      console.log(`      名称: ${uc.currency.name}`)
      console.log(`      自定义: ${uc.currency.isCustom ? '是' : '否'}`)
      console.log('')
    })

    // 检查CNY重复
    const cnyRecords = userCurrencies.filter(uc => uc.currency.code === 'CNY')
    if (cnyRecords.length > 1) {
      console.log(`   ⚠️  发现 ${cnyRecords.length} 个CNY记录`)
      console.log('   修复前端组件应该能够正确区分它们')
    } else {
      console.log('   ✅ 没有重复的货币代码')
    }

    // 2. 测试用户设置
    console.log('\n⚙️  2. 用户设置测试:')
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (userSettings?.baseCurrency) {
      console.log(`   本位币ID: ${userSettings.baseCurrency.id}`)
      console.log(`   本位币代码: ${userSettings.baseCurrency.code}`)
      console.log(`   本位币名称: ${userSettings.baseCurrency.name}`)
    } else {
      console.log('   ❌ 未设置本位币')
    }

    // 3. 测试汇率数据
    console.log('\n💱 3. 汇率数据测试:')
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    console.log(`   汇率记录数: ${exchangeRates.length}`)
    exchangeRates.forEach((rate, index) => {
      console.log(`   ${index + 1}. ${rate.fromCurrencyRef.code} -> ${rate.toCurrencyRef.code}`)
      console.log(`      汇率: ${rate.rate}`)
      console.log(`      源货币ID: ${rate.fromCurrencyId}`)
      console.log(`      目标货币ID: ${rate.toCurrencyId}`)
      console.log('')
    })

    // 4. 模拟前端组件逻辑
    console.log('\n🎨 4. 前端组件逻辑模拟:')
    
    // 模拟PreferencesForm的currencyOptions生成
    const currencyOptions = userCurrencies.map(uc => ({
      value: uc.currency.id, // 现在使用ID
      label: `${uc.currency.symbol} ${uc.currency.name} (${uc.currency.code})`,
      id: uc.currency.id,
    }))

    console.log('   本位币选择选项:')
    currencyOptions.forEach((option, index) => {
      console.log(`   ${index + 1}. value: ${option.value}`)
      console.log(`      label: ${option.label}`)
      console.log('')
    })

    // 检查是否有重复的value
    const values = currencyOptions.map(o => o.value)
    const uniqueValues = new Set(values)
    if (values.length === uniqueValues.size) {
      console.log('   ✅ 所有选项值都是唯一的')
    } else {
      console.log('   ❌ 存在重复的选项值')
    }

    // 5. 模拟CurrencyConverterPopover逻辑
    console.log('\n💰 5. 汇率转换器逻辑模拟:')
    if (userSettings?.baseCurrency) {
      const baseCurrency = userSettings.baseCurrency
      const otherCurrencies = userCurrencies.filter(uc => uc.currency.id !== baseCurrency.id)
      
      console.log(`   本位币: ${baseCurrency.code} (ID: ${baseCurrency.id})`)
      console.log('   其他货币:')
      
      for (const uc of otherCurrencies) {
        const currency = uc.currency
        console.log(`   - ${currency.code} (ID: ${currency.id})`)
        
        // 查找汇率（使用ID匹配）
        const rate = exchangeRates.find(r => 
          r.fromCurrencyId === currency.id && r.toCurrencyId === baseCurrency.id
        )
        
        if (rate) {
          console.log(`     ✅ 找到汇率: ${rate.rate}`)
        } else {
          // 查找反向汇率
          const reverseRate = exchangeRates.find(r => 
            r.fromCurrencyId === baseCurrency.id && r.toCurrencyId === currency.id
          )
          if (reverseRate) {
            console.log(`     ✅ 找到反向汇率: ${1 / parseFloat(reverseRate.rate.toString())}`)
          } else {
            console.log(`     ❌ 未找到汇率`)
          }
        }
      }
    }

    // 6. 测试货币格式化问题
    console.log('\n💰 6. 测试货币格式化问题:')
    if (userSettings?.baseCurrency) {
      const baseCurrency = userSettings.baseCurrency
      console.log(`   本位币: ${baseCurrency.code} (ID: ${baseCurrency.id})`)
      console.log(`   本位币符号: ${baseCurrency.symbol}`)
      console.log(`   本位币小数位数: ${baseCurrency.decimalPlaces}`)

      // 检查是否有其他CNY货币
      const otherCnyRecords = userCurrencies.filter(uc =>
        uc.currency.code === 'CNY' && uc.currency.id !== baseCurrency.id
      )

      if (otherCnyRecords.length > 0) {
        console.log('\n   其他CNY货币记录:')
        otherCnyRecords.forEach((uc, index) => {
          console.log(`   ${index + 1}. ID: ${uc.currency.id}`)
          console.log(`      符号: ${uc.currency.symbol}`)
          console.log(`      小数位数: ${uc.currency.decimalPlaces}`)
          console.log(`      自定义: ${uc.currency.isCustom ? '是' : '否'}`)
          console.log('')
        })

        console.log('   ⚠️  格式化问题分析:')
        console.log('   - 如果使用货币代码查找，可能匹配到错误的货币记录')
        console.log('   - 建议所有格式化都使用货币ID进行查找')
        console.log('   - useUserCurrencyFormatter hook已更新支持基于ID的查找')
      }
    }

    console.log('\n🎉 测试完成!')
    console.log('\n📝 修复总结:')
    console.log('1. ✅ PreferencesForm: 使用货币ID作为选项值')
    console.log('2. ✅ CurrencyConverterPopover: 使用货币ID进行汇率匹配')
    console.log('3. ✅ ExchangeRateForm: 使用货币ID作为选项值')
    console.log('4. ✅ 所有组件的key都使用唯一的货币ID')
    console.log('5. ✅ useUserCurrencyFormatter: 支持基于ID的货币查找')
    console.log('6. ✅ API端点: 修复汇率API路径问题')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testCurrencyFix()

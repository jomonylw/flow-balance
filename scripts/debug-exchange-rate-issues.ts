import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugExchangeRateIssues() {
  try {
    console.log('🔍 调试汇率更新问题...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
      include: {
        settings: {
          include: { baseCurrency: true },
        },
      },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)
    console.log(`📍 本位币: ${user.settings?.baseCurrency?.code || '未设置'}`)

    // 检查用户的所有货币设置
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
      },
      include: {
        currency: true,
      },
      orderBy: {
        currency: { code: 'asc' },
      },
    })

    console.log(`\n💰 用户货币设置 (${userCurrencies.length} 个):`)
    userCurrencies.forEach(uc => {
      console.log(`  - ${uc.currency.code} (${uc.currency.name}): ${uc.isActive ? '✅ 活跃' : '❌ 非活跃'}`)
    })

    // 检查活跃货币
    const activeCurrencies = userCurrencies.filter(uc => uc.isActive)
    console.log(`\n🔄 活跃货币 (${activeCurrencies.length} 个):`)
    activeCurrencies.forEach(uc => {
      console.log(`  - ${uc.currency.code}: ${uc.currency.name}`)
    })

    // 测试 Frankfurter API
    if (user.settings?.baseCurrency) {
      const baseCurrencyCode = user.settings.baseCurrency.code
      console.log(`\n🌐 测试 Frankfurter API (基于 ${baseCurrencyCode})...`)
      
      try {
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ API 响应成功`)
          console.log(`📅 API 返回日期: ${data.date}`)
          console.log(`💱 可用汇率数量: ${Object.keys(data.rates).length}`)
          
          // 检查用户活跃货币的汇率
          console.log(`\n📊 用户活跃货币汇率检查:`)
          activeCurrencies.forEach(uc => {
            const currencyCode = uc.currency.code
            if (currencyCode === baseCurrencyCode) {
              console.log(`  - ${currencyCode}: 1.0 (本位币)`)
            } else if (data.rates[currencyCode]) {
              console.log(`  - ${currencyCode}: ${data.rates[currencyCode]} ✅`)
            } else {
              console.log(`  - ${currencyCode}: ❌ 未找到汇率`)
            }
          })

          // 特别检查港币
          if (data.rates['HKD']) {
            console.log(`\n🏦 港币汇率: ${baseCurrencyCode} → HKD = ${data.rates['HKD']}`)
          } else {
            console.log(`\n❌ 港币汇率未找到`)
          }
        } else {
          console.log(`❌ API 请求失败: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ API 请求错误:`, error)
      }
    }

    // 检查当前汇率记录
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    const todayRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: currentDate,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyRef: { code: 'asc' } },
        { toCurrencyRef: { code: 'asc' } },
      ],
    })

    console.log(`\n💱 今日汇率记录 (${todayRates.length} 条):`)
    todayRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type}) - ${rate.notes || '无备注'}`)
    })

    // 检查港币相关的汇率记录
    const hkdRates = todayRates.filter(rate => 
      rate.fromCurrencyRef.code === 'HKD' || rate.toCurrencyRef.code === 'HKD'
    )
    console.log(`\n🏦 港币相关汇率记录 (${hkdRates.length} 条):`)
    hkdRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type}) - ${rate.notes || '无备注'}`)
    })

    console.log('\n🎯 问题分析:')
    const hkdUserCurrency = userCurrencies.find(uc => uc.currency.code === 'HKD')
    if (!hkdUserCurrency) {
      console.log('❌ 港币未添加到用户货币列表')
    } else if (!hkdUserCurrency.isActive) {
      console.log('❌ 港币已添加但未激活')
    } else {
      console.log('✅ 港币已正确设置为活跃货币')
    }

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行调试
debugExchangeRateIssues()

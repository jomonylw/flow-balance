import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testExchangeRateAutoUpdate() {
  try {
    console.log('🧪 测试汇率自动更新功能...')

    // 1. 获取测试用户
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

    console.log(`✅ 找到测试用户: ${user.email}`)
    console.log(`📍 本位币: ${user.settings?.baseCurrency?.code || '未设置'}`)

    // 2. 检查用户设置中的汇率自动更新字段
    console.log(`🔄 汇率自动更新: ${user.settings?.autoUpdateExchangeRates ? '已启用' : '已禁用'}`)
    console.log(`⏰ 最后更新时间: ${user.settings?.lastExchangeRateUpdate || '从未更新'}`)

    // 3. 获取用户的活跃货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(`💰 用户活跃货币数量: ${userCurrencies.length}`)
    userCurrencies.forEach(uc => {
      console.log(`  - ${uc.currency.code}: ${uc.currency.name}`)
    })

    // 4. 测试 Frankfurter API
    if (user.settings?.baseCurrency) {
      const baseCurrencyCode = user.settings.baseCurrency.code
      console.log(`\n🌐 测试 Frankfurter API (基于 ${baseCurrencyCode})...`)
      
      try {
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`)
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ API 响应成功`)
          console.log(`📅 数据日期: ${data.date}`)
          console.log(`💱 可用汇率数量: ${Object.keys(data.rates).length}`)
          
          // 显示用户货币的汇率
          console.log(`\n📊 用户货币汇率:`)
          userCurrencies.forEach(uc => {
            const currencyCode = uc.currency.code
            if (currencyCode === baseCurrencyCode) {
              console.log(`  - ${currencyCode}: 1.0 (本位币)`)
            } else if (data.rates[currencyCode]) {
              console.log(`  - ${currencyCode}: ${data.rates[currencyCode]}`)
            } else {
              console.log(`  - ${currencyCode}: ❌ 未找到汇率`)
            }
          })
        } else {
          console.log(`❌ API 请求失败: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ API 请求错误:`, error)
      }
    }

    // 5. 检查现有汇率记录
    const existingRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`\n💱 现有汇率记录数量: ${existingRates.length}`)
    existingRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
    })

    console.log('\n✅ 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testExchangeRateAutoUpdate()

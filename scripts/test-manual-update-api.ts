import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testManualUpdateAPI() {
  try {
    console.log('🧪 测试手动更新汇率 API...')

    // 1. 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 找到测试用户: ${user.email}`)

    // 2. 模拟 API 调用（直接调用服务逻辑）
    console.log('\n🔄 开始手动更新汇率...')

    // 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (!userSettings?.baseCurrency) {
      console.log('❌ 用户未设置本位币')
      return
    }

    const baseCurrencyCode = userSettings.baseCurrency.code
    console.log(`📍 本位币: ${baseCurrencyCode}`)

    // 获取用户的所有活跃货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(`💰 活跃货币数量: ${userCurrencies.length}`)

    // 调用 Frankfurter API
    const frankfurterUrl = `https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`
    console.log(`🌐 调用 API: ${frankfurterUrl}`)

    const response = await fetch(frankfurterUrl)
    if (!response.ok) {
      console.log(`❌ API 调用失败: ${response.status}`)
      return
    }

    const frankfurterData = await response.json()
    console.log(`✅ API 调用成功，数据日期: ${frankfurterData.date}`)

    // 获取当前日期
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    let updatedCount = 0
    const errors: string[] = []

    // 更新汇率
    for (const userCurrency of userCurrencies) {
      const currencyCode = userCurrency.currency.code
      
      // 跳过本位币
      if (currencyCode === baseCurrencyCode) {
        console.log(`⏭️  跳过本位币: ${currencyCode}`)
        continue
      }

      // 检查是否有汇率数据
      if (!frankfurterData.rates[currencyCode]) {
        errors.push(`未找到 ${baseCurrencyCode} 到 ${currencyCode} 的汇率`)
        console.log(`❌ 未找到汇率: ${baseCurrencyCode} → ${currencyCode}`)
        continue
      }

      const rate = frankfurterData.rates[currencyCode]
      console.log(`💱 ${baseCurrencyCode} → ${currencyCode}: ${rate}`)

      try {
        // 查找现有汇率记录
        const existingRate = await prisma.exchangeRate.findFirst({
          where: {
            userId: user.id,
            fromCurrencyId: userSettings.baseCurrency.id,
            toCurrencyId: userCurrency.currency.id,
            effectiveDate: currentDate,
          },
        })

        if (existingRate) {
          // 更新现有汇率
          await prisma.exchangeRate.update({
            where: { id: existingRate.id },
            data: {
              rate: rate,
              type: 'AUTO',
              notes: `自动更新 - ${frankfurterData.date}`,
            },
          })
          console.log(`🔄 更新现有汇率: ${currencyCode}`)
        } else {
          // 创建新汇率记录
          await prisma.exchangeRate.create({
            data: {
              userId: user.id,
              fromCurrencyId: userSettings.baseCurrency.id,
              toCurrencyId: userCurrency.currency.id,
              rate: rate,
              effectiveDate: currentDate,
              type: 'AUTO',
              notes: `自动更新 - ${frankfurterData.date}`,
            },
          })
          console.log(`➕ 创建新汇率: ${currencyCode}`)
        }

        updatedCount++
      } catch (error) {
        console.error(`❌ 更新 ${currencyCode} 汇率失败:`, error)
        errors.push(`更新 ${baseCurrencyCode} 到 ${currencyCode} 汇率失败`)
      }
    }

    // 更新最后更新时间
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        lastExchangeRateUpdate: new Date(),
      },
    })

    console.log(`\n📊 更新结果:`)
    console.log(`✅ 成功更新: ${updatedCount} 个汇率`)
    console.log(`❌ 失败: ${errors.length} 个`)
    if (errors.length > 0) {
      errors.forEach(error => console.log(`  - ${error}`))
    }

    // 验证更新结果
    const updatedRates = await prisma.exchangeRate.findMany({
      where: { 
        userId: user.id,
        effectiveDate: currentDate,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`\n💱 今日汇率记录 (${updatedRates.length} 条):`)
    updatedRates.forEach(rate => {
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
testManualUpdateAPI()

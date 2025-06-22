import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

interface FrankfurterResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

async function debugExchangeRateUpdateProcess() {
  try {
    console.log('🔍 调试汇率更新过程...')

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

    if (!user.settings?.baseCurrency) {
      console.log('❌ 未设置本位币')
      return
    }

    const baseCurrencyCode = user.settings.baseCurrency.code

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

    console.log(`\n💰 用户活跃货币 (${userCurrencies.length} 个):`)
    userCurrencies.forEach(uc => {
      console.log(`  - ${uc.currency.code}: ${uc.currency.name} (ID: ${uc.currency.id})`)
    })

    // 调用 Frankfurter API
    const frankfurterUrl = `https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`
    console.log(`\n🌐 调用 API: ${frankfurterUrl}`)
    
    const response = await fetch(frankfurterUrl)
    const frankfurterData: FrankfurterResponse = await response.json()
    
    console.log(`✅ API 响应成功`)
    console.log(`📅 API 返回日期: ${frankfurterData.date}`)
    console.log(`💱 可用汇率数量: ${Object.keys(frankfurterData.rates).length}`)

    // 使用 API 返回的日期作为生效日期
    const effectiveDate = new Date(frankfurterData.date)
    effectiveDate.setHours(0, 0, 0, 0)
    console.log(`📅 生效日期: ${effectiveDate.toISOString().split('T')[0]}`)

    // 生成更新备注
    const updateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const updateType = '手动更新'
    const notePrefix = `${updateType} - ${updateTime} - API日期: ${frankfurterData.date}`
    console.log(`📝 备注前缀: ${notePrefix}`)

    let updatedCount = 0
    const errors: string[] = []

    console.log(`\n🔄 开始更新汇率...`)

    // 更新用户已选择的货币汇率
    for (const userCurrency of userCurrencies) {
      const currencyCode = userCurrency.currency.code
      
      console.log(`\n处理货币: ${currencyCode}`)
      
      // 跳过本位币（自己对自己的汇率为1）
      if (currencyCode === baseCurrencyCode) {
        console.log(`  ⏭️  跳过本位币: ${currencyCode}`)
        continue
      }

      // 检查 Frankfurter 是否返回了这个货币的汇率
      if (!frankfurterData.rates[currencyCode]) {
        const error = `未找到 ${baseCurrencyCode} 到 ${currencyCode} 的汇率`
        console.log(`  ❌ ${error}`)
        errors.push(error)
        continue
      }

      const rate = frankfurterData.rates[currencyCode]
      console.log(`  💱 ${baseCurrencyCode} → ${currencyCode}: ${rate}`)

      try {
        // 查找现有汇率记录（使用API返回的日期）
        const existingRate = await prisma.exchangeRate.findFirst({
          where: {
            userId: user.id,
            fromCurrencyId: user.settings.baseCurrency.id,
            toCurrencyId: userCurrency.currency.id,
            effectiveDate: effectiveDate,
          },
        })

        if (existingRate) {
          console.log(`  🔄 更新现有汇率记录 (ID: ${existingRate.id})`)
          // 更新现有汇率
          await prisma.exchangeRate.update({
            where: { id: existingRate.id },
            data: {
              rate: new Decimal(rate),
              type: 'AUTO',
              notes: notePrefix,
            },
          })
        } else {
          console.log(`  ➕ 创建新汇率记录`)
          // 创建新汇率记录
          await prisma.exchangeRate.create({
            data: {
              userId: user.id,
              fromCurrencyId: user.settings.baseCurrency.id,
              toCurrencyId: userCurrency.currency.id,
              rate: new Decimal(rate),
              effectiveDate: effectiveDate,
              type: 'AUTO',
              notes: notePrefix,
            },
          })
        }

        console.log(`  ✅ 成功处理 ${currencyCode}`)
        updatedCount++
      } catch (error) {
        console.error(`  ❌ 处理 ${currencyCode} 失败:`, error)
        errors.push(`更新 ${baseCurrencyCode} 到 ${currencyCode} 汇率失败`)
      }
    }

    console.log(`\n📊 更新结果:`)
    console.log(`✅ 成功更新: ${updatedCount} 个汇率`)
    console.log(`❌ 失败: ${errors.length} 个`)
    if (errors.length > 0) {
      errors.forEach(error => console.log(`  - ${error}`))
    }

    // 验证更新结果
    console.log(`\n🔍 验证更新结果...`)
    const updatedRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: effectiveDate,
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

    console.log(`💱 生效日期 ${effectiveDate.toISOString().split('T')[0]} 的汇率记录 (${updatedRates.length} 条):`)
    updatedRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      console.log(`    备注: ${rate.notes || '无备注'}`)
    })

    // 检查港币相关的汇率记录
    const hkdRates = updatedRates.filter(rate => 
      rate.fromCurrencyRef.code === 'HKD' || rate.toCurrencyRef.code === 'HKD'
    )
    console.log(`\n🏦 港币相关汇率记录 (${hkdRates.length} 条):`)
    hkdRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      console.log(`    备注: ${rate.notes || '无备注'}`)
    })

    if (hkdRates.length === 0) {
      console.log(`\n🔍 港币汇率缺失分析:`)
      console.log(`1. 检查港币是否在用户活跃货币列表中...`)
      const hkdUserCurrency = userCurrencies.find(uc => uc.currency.code === 'HKD')
      if (hkdUserCurrency) {
        console.log(`   ✅ 港币在活跃货币列表中 (ID: ${hkdUserCurrency.currency.id})`)
      } else {
        console.log(`   ❌ 港币不在活跃货币列表中`)
      }

      console.log(`2. 检查 Frankfurter API 是否返回港币汇率...`)
      if (frankfurterData.rates['HKD']) {
        console.log(`   ✅ API 返回港币汇率: ${frankfurterData.rates['HKD']}`)
      } else {
        console.log(`   ❌ API 未返回港币汇率`)
      }

      console.log(`3. 检查是否有处理错误...`)
      const hkdErrors = errors.filter(error => error.includes('HKD'))
      if (hkdErrors.length > 0) {
        console.log(`   ❌ 港币处理错误:`)
        hkdErrors.forEach(error => console.log(`     - ${error}`))
      } else {
        console.log(`   ✅ 没有港币相关的处理错误`)
      }
    }

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行调试
debugExchangeRateUpdateProcess()

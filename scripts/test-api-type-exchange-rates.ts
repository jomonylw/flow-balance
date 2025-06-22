import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function testApiTypeExchangeRates() {
  try {
    console.log('🧪 测试 API 类型汇率更新...')

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

    // 删除现有的 API 类型汇率记录
    const deletedCount = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'API',
      },
    })
    console.log(`✅ 删除了 ${deletedCount.count} 条 API 类型汇率记录`)

    // 模拟 API 数据
    const mockApiData = {
      amount: 1,
      base: 'CNY',
      date: '2025-06-20',
      rates: {
        EUR: 0.121,
        HKD: 1.0938,
        JPY: 20.288,
        USD: 0.13933,
      } as Record<string, number>
    }

    console.log(`\n🎭 使用模拟 API 数据:`)
    console.log(`📅 API 返回日期: ${mockApiData.date}`)
    console.log(`💱 可用汇率数量: ${Object.keys(mockApiData.rates).length}`)

    // 使用 API 返回的日期作为生效日期
    const effectiveDate = new Date(mockApiData.date)
    effectiveDate.setHours(0, 0, 0, 0)
    console.log(`📅 生效日期: ${effectiveDate.toISOString().split('T')[0]}`)

    // 生成更新备注
    const updateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const updateType = '手动更新'
    const notePrefix = `${updateType} - ${updateTime} - API日期: ${mockApiData.date}`
    console.log(`📝 备注前缀: ${notePrefix}`)

    let updatedCount = 0
    const errors: string[] = []

    console.log(`\n🔄 开始创建 API 类型汇率...`)

    // 更新用户已选择的货币汇率
    for (const userCurrency of userCurrencies) {
      const currencyCode = userCurrency.currency.code
      
      console.log(`\n处理货币: ${currencyCode}`)
      
      // 跳过本位币（自己对自己的汇率为1）
      if (currencyCode === user.settings.baseCurrency.code) {
        console.log(`  ⏭️  跳过本位币: ${currencyCode}`)
        continue
      }

      // 检查模拟数据是否包含这个货币的汇率
      if (!mockApiData.rates[currencyCode]) {
        const error = `未找到 ${user.settings.baseCurrency.code} 到 ${currencyCode} 的汇率`
        console.log(`  ❌ ${error}`)
        errors.push(error)
        continue
      }

      const rate = mockApiData.rates[currencyCode]
      console.log(`  💱 ${user.settings.baseCurrency.code} → ${currencyCode}: ${rate}`)

      try {
        // 创建新的 API 类型汇率记录
        console.log(`  ➕ 创建新的 API 类型汇率记录`)
        await prisma.exchangeRate.create({
          data: {
            userId: user.id,
            fromCurrencyId: user.settings.baseCurrency.id,
            toCurrencyId: userCurrency.currency.id,
            rate: new Decimal(rate),
            effectiveDate: effectiveDate,
            type: 'API',
            notes: notePrefix,
          },
        })

        console.log(`  ✅ 成功处理 ${currencyCode}`)
        updatedCount++
      } catch (error) {
        console.error(`  ❌ 处理 ${currencyCode} 失败:`, error)
        errors.push(`更新 ${user.settings.baseCurrency.code} 到 ${currencyCode} 汇率失败`)
      }
    }

    console.log(`\n📊 更新结果:`)
    console.log(`✅ 成功创建: ${updatedCount} 个 API 类型汇率`)
    console.log(`❌ 失败: ${errors.length} 个`)
    if (errors.length > 0) {
      errors.forEach(error => console.log(`  - ${error}`))
    }

    // 验证创建结果
    console.log(`\n🔍 验证创建结果...`)
    const allRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { type: 'asc' },
        { effectiveDate: 'desc' },
        { fromCurrencyRef: { code: 'asc' } },
        { toCurrencyRef: { code: 'asc' } },
      ],
    })

    console.log(`💱 所有汇率记录 (${allRates.length} 条):`)
    
    // 按类型分组
    const ratesByType = allRates.reduce((groups, rate) => {
      if (!groups[rate.type]) {
        groups[rate.type] = []
      }
      groups[rate.type].push(rate)
      return groups
    }, {} as Record<string, typeof allRates>)

    Object.keys(ratesByType).sort().forEach(type => {
      const rates = ratesByType[type]
      console.log(`\n📋 ${type} 类型汇率 (${rates.length} 条):`)
      rates.forEach(rate => {
        console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
        console.log(`    日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
        if (rate.notes) {
          console.log(`    备注: ${rate.notes}`)
        }
      })
    })

    // 检查港币相关的汇率记录
    const hkdRates = allRates.filter(rate => 
      rate.fromCurrencyRef.code === 'HKD' || rate.toCurrencyRef.code === 'HKD'
    )
    console.log(`\n🏦 港币相关汇率记录 (${hkdRates.length} 条):`)
    hkdRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      console.log(`    日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      if (rate.notes) {
        console.log(`    备注: ${rate.notes}`)
      }
    })

    console.log('\n🎉 测试完成!')
    console.log('\n📋 验证结果:')
    console.log('1. API 类型汇率是否创建: ', ratesByType['API']?.length > 0 ? '✅ 是' : '❌ 否')
    console.log('2. 港币汇率是否包含: ', hkdRates.some(r => r.type === 'API') ? '✅ 是' : '❌ 否')
    console.log('3. 备注信息是否正确: ', allRates.some(r => r.type === 'API' && r.notes?.includes('手动更新')) ? '✅ 是' : '❌ 否')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testApiTypeExchangeRates()

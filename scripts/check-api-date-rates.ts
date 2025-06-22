import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkApiDateRates() {
  try {
    console.log('🔍 检查API日期的汇率记录...')

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

    // 获取 Frankfurter API 返回的日期
    const baseCurrencyCode = user.settings?.baseCurrency?.code
    if (!baseCurrencyCode) {
      console.log('❌ 未设置本位币')
      return
    }

    const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${baseCurrencyCode}`)
    const data = await response.json()
    console.log(`📅 API 返回日期: ${data.date}`)

    // 使用API返回的日期查询汇率记录
    const apiDate = new Date(data.date)
    apiDate.setHours(0, 0, 0, 0)
    
    console.log(`🔍 查询日期: ${apiDate.toISOString().split('T')[0]}`)

    const apiDateRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: apiDate,
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

    console.log(`\n💱 API日期汇率记录 (${apiDateRates.length} 条):`)
    apiDateRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      console.log(`    备注: ${rate.notes || '无备注'}`)
      console.log(`    生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      console.log('')
    })

    // 检查港币相关的汇率记录
    const hkdRates = apiDateRates.filter(rate => 
      rate.fromCurrencyRef.code === 'HKD' || rate.toCurrencyRef.code === 'HKD'
    )
    console.log(`🏦 港币相关汇率记录 (${hkdRates.length} 条):`)
    hkdRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      console.log(`    备注: ${rate.notes || '无备注'}`)
    })

    // 检查今天的汇率记录
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    console.log(`\n📅 今天日期: ${currentDate.toISOString().split('T')[0]}`)

    const todayRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: currentDate,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`💱 今天汇率记录 (${todayRates.length} 条):`)
    todayRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
    })

    // 检查所有汇率记录
    const allRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: { effectiveDate: 'desc' },
    })

    console.log(`\n📊 所有汇率记录 (${allRates.length} 条):`)
    const dateGroups = allRates.reduce((groups, rate) => {
      const dateKey = rate.effectiveDate.toISOString().split('T')[0]
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(rate)
      return groups
    }, {} as Record<string, typeof allRates>)

    Object.keys(dateGroups).forEach(date => {
      const rates = dateGroups[date]
      console.log(`\n📅 ${date} (${rates.length} 条):`)
      rates.forEach(rate => {
        console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      })
    })

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkApiDateRates()

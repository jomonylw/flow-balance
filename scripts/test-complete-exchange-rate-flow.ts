import { PrismaClient } from '@prisma/client'
import { ExchangeRateAutoUpdateService } from '../src/lib/services/exchange-rate-auto-update.service'

const prisma = new PrismaClient()

async function testCompleteExchangeRateFlow() {
  try {
    console.log('🧪 测试完整的汇率更新流程...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)

    // 清除最后更新时间
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        lastExchangeRateUpdate: null,
      },
    })
    console.log('✅ 最后更新时间已清除')

    // 删除所有现有汇率记录
    const deletedCount = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`✅ 删除了 ${deletedCount.count} 条自动汇率记录`)

    // 调用汇率自动更新服务（强制更新）
    console.log('\n🚀 调用汇率自动更新服务...')
    const result = await ExchangeRateAutoUpdateService.updateExchangeRates(user.id, true)
    
    console.log(`更新成功: ${result.success}`)
    console.log(`更新消息: ${result.message}`)
    
    if (result.data) {
      console.log(`更新数量: ${result.data.updatedCount}`)
      console.log(`错误数量: ${result.data.errors.length}`)
      console.log(`数据源: ${result.data.source}`)
      console.log(`本位币: ${result.data.baseCurrency}`)
      if (result.data.errors.length > 0) {
        console.log('错误详情:')
        result.data.errors.forEach(error => console.log(`  - ${error}`))
      }
    }

    // 等待一下确保所有操作完成
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 检查所有汇率记录
    const allRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { fromCurrencyRef: { code: 'asc' } },
        { toCurrencyRef: { code: 'asc' } },
      ],
    })

    console.log(`\n💱 所有汇率记录 (${allRates.length} 条):`)
    
    // 按日期分组
    const ratesByDate = allRates.reduce((groups, rate) => {
      const dateKey = rate.effectiveDate.toISOString().split('T')[0]
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(rate)
      return groups
    }, {} as Record<string, typeof allRates>)

    Object.keys(ratesByDate).sort().reverse().forEach(date => {
      const rates = ratesByDate[date]
      console.log(`\n📅 ${date} (${rates.length} 条):`)
      rates.forEach(rate => {
        console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
        if (rate.notes && rate.notes.includes('手动更新')) {
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

    // 验证港币汇率的完整性
    console.log(`\n🔍 港币汇率完整性检查:`)
    const currencies = ['CNY', 'EUR', 'HKD', 'JPY', 'USD']
    
    console.log(`港币作为源货币:`)
    currencies.forEach(targetCurrency => {
      if (targetCurrency !== 'HKD') {
        const rate = allRates.find(r => 
          r.fromCurrencyRef.code === 'HKD' && r.toCurrencyRef.code === targetCurrency
        )
        if (rate) {
          console.log(`  ✅ HKD → ${targetCurrency}: ${rate.rate} (${rate.type})`)
        } else {
          console.log(`  ❌ HKD → ${targetCurrency}: 缺失`)
        }
      }
    })

    console.log(`港币作为目标货币:`)
    currencies.forEach(sourceCurrency => {
      if (sourceCurrency !== 'HKD') {
        const rate = allRates.find(r => 
          r.fromCurrencyRef.code === sourceCurrency && r.toCurrencyRef.code === 'HKD'
        )
        if (rate) {
          console.log(`  ✅ ${sourceCurrency} → HKD: ${rate.rate} (${rate.type})`)
        } else {
          console.log(`  ❌ ${sourceCurrency} → HKD: 缺失`)
        }
      }
    })

    // 按类型分组统计
    const ratesByType = allRates.reduce((groups, rate) => {
      if (!groups[rate.type]) {
        groups[rate.type] = []
      }
      groups[rate.type].push(rate)
      return groups
    }, {} as Record<string, typeof allRates>)

    console.log(`\n📊 汇率类型统计:`)
    Object.keys(ratesByType).forEach(type => {
      const rates = ratesByType[type]
      console.log(`  - ${type}: ${rates.length} 条`)
    })

    // 检查用户设置中的最后更新时间
    const updatedSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })
    console.log(`\n⏰ 汇率最后更新时间: ${updatedSettings?.lastExchangeRateUpdate || '未更新'}`)

    console.log('\n🎉 测试完成!')
    console.log('\n📋 问题修正验证:')
    console.log('1. 港币汇率是否更新: ', hkdRates.length > 0 ? '✅ 是' : '❌ 否')
    console.log('2. 生效日期是否使用API日期: ', allRates.some(r => r.notes?.includes('API日期')) ? '✅ 是' : '❌ 否')
    console.log('3. 备注是否包含更新信息: ', allRates.some(r => r.notes?.includes('手动更新')) ? '✅ 是' : '❌ 否')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testCompleteExchangeRateFlow()

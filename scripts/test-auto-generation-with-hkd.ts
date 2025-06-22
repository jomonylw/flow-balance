import { PrismaClient } from '@prisma/client'
import { generateAutoExchangeRates } from '../src/lib/services/exchange-rate-auto-generation.service'

const prisma = new PrismaClient()

async function testAutoGenerationWithHKD() {
  try {
    console.log('🧪 测试包含港币的汇率自动生成...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)

    // 使用API返回的日期
    const effectiveDate = new Date('2025-06-19')
    effectiveDate.setHours(0, 0, 0, 0)
    
    console.log(`📅 生效日期: ${effectiveDate.toISOString().split('T')[0]}`)

    // 检查当前的基础汇率记录
    const baseRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: effectiveDate,
        type: 'AUTO',
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`\n💱 基础汇率记录 (${baseRates.length} 条):`)
    baseRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`)
    })

    // 删除所有自动生成的汇率
    console.log(`\n🗑️  删除所有自动生成的汇率...`)
    const deletedCount = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`✅ 删除了 ${deletedCount.count} 条自动生成的汇率`)

    // 重新生成所有自动汇率
    console.log(`\n🔄 重新生成所有自动汇率...`)
    await generateAutoExchangeRates(user.id, effectiveDate)
    console.log(`✅ 自动汇率生成完成`)

    // 检查生成后的汇率记录
    const allRates = await prisma.exchangeRate.findMany({
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

    console.log(`\n💱 生成后的汇率记录 (${allRates.length} 条):`)
    allRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      if (rate.notes) {
        console.log(`    备注: ${rate.notes}`)
      }
    })

    // 检查港币相关的汇率记录
    const hkdRates = allRates.filter(rate => 
      rate.fromCurrencyRef.code === 'HKD' || rate.toCurrencyRef.code === 'HKD'
    )
    console.log(`\n🏦 港币相关汇率记录 (${hkdRates.length} 条):`)
    hkdRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      if (rate.notes) {
        console.log(`    备注: ${rate.notes}`)
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
          console.log(`  ✅ HKD → ${targetCurrency}: ${rate.rate}`)
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
          console.log(`  ✅ ${sourceCurrency} → HKD: ${rate.rate}`)
        } else {
          console.log(`  ❌ ${sourceCurrency} → HKD: 缺失`)
        }
      }
    })

    console.log('\n🎉 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testAutoGenerationWithHKD()

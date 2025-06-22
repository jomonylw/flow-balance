import { PrismaClient } from '@prisma/client'
import { ExchangeRateAutoUpdateService } from '../src/lib/services/exchange-rate-auto-update.service'

const prisma = new PrismaClient()

async function testExchangeRateServiceDirectly() {
  try {
    console.log('🧪 直接测试汇率自动更新服务...')

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

    // 检查是否需要更新
    console.log('\n🔍 检查是否需要更新...')
    const needsUpdate = await ExchangeRateAutoUpdateService.needsUpdate(user.id)
    console.log(`需要更新: ${needsUpdate}`)

    // 获取更新状态
    const updateStatus = await ExchangeRateAutoUpdateService.getUpdateStatus(user.id)
    console.log(`启用状态: ${updateStatus.enabled}`)
    console.log(`最后更新: ${updateStatus.lastUpdate || '从未更新'}`)
    console.log(`需要更新: ${updateStatus.needsUpdate}`)
    console.log(`距离上次更新小时数: ${updateStatus.hoursSinceLastUpdate || 'N/A'}`)

    // 直接调用更新服务
    console.log('\n🚀 直接调用汇率更新服务...')
    const result = await ExchangeRateAutoUpdateService.updateExchangeRates(user.id, false)
    
    console.log(`更新成功: ${result.success}`)
    console.log(`消息: ${result.message}`)
    
    if (result.data) {
      console.log(`更新数量: ${result.data.updatedCount}`)
      console.log(`错误数量: ${result.data.errors.length}`)
      console.log(`数据源: ${result.data.source}`)
      console.log(`本位币: ${result.data.baseCurrency}`)
      console.log(`跳过: ${result.data.skipped || false}`)
      if (result.data.skipReason) {
        console.log(`跳过原因: ${result.data.skipReason}`)
      }
      if (result.data.errors.length > 0) {
        console.log('错误详情:')
        result.data.errors.forEach(error => console.log(`  - ${error}`))
      }
    }

    // 检查更新后的状态
    console.log('\n📊 检查更新后的状态...')
    const updatedStatus = await ExchangeRateAutoUpdateService.getUpdateStatus(user.id)
    console.log(`最后更新: ${updatedStatus.lastUpdate}`)
    console.log(`需要更新: ${updatedStatus.needsUpdate}`)
    console.log(`距离上次更新小时数: ${updatedStatus.hoursSinceLastUpdate}`)

    // 验证汇率数据
    console.log('\n💱 验证汇率数据...')
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
    })

    console.log(`今日汇率记录: ${todayRates.length} 条`)
    if (todayRates.length > 0) {
      console.log('汇率详情:')
      todayRates.forEach(rate => {
        console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      })
    }

    // 测试24小时限制
    console.log('\n🕐 测试24小时限制...')
    const secondResult = await ExchangeRateAutoUpdateService.updateExchangeRates(user.id, false)
    console.log(`第二次更新成功: ${secondResult.success}`)
    console.log(`第二次更新消息: ${secondResult.message}`)
    if (secondResult.data?.skipped) {
      console.log(`✅ 24小时限制正常工作: ${secondResult.data.skipReason}`)
    }

    // 测试强制更新
    console.log('\n🔄 测试强制更新...')
    const forceResult = await ExchangeRateAutoUpdateService.updateExchangeRates(user.id, true)
    console.log(`强制更新成功: ${forceResult.success}`)
    console.log(`强制更新消息: ${forceResult.message}`)
    if (forceResult.data) {
      console.log(`强制更新数量: ${forceResult.data.updatedCount}`)
    }

    console.log('\n🎉 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testExchangeRateServiceDirectly()

import { PrismaClient } from '@prisma/client'
import { UnifiedSyncService } from '../src/lib/services/unified-sync.service'

const prisma = new PrismaClient()

async function testUnifiedSyncWithFreshData() {
  try {
    console.log('🧪 测试统一同步服务（清除数据后）...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)

    // 清除最后更新时间，确保会触发汇率更新
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        lastExchangeRateUpdate: null,
      },
    })
    console.log('✅ 最后更新时间已清除')

    // 删除今日的汇率记录，确保会创建新记录
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    const deletedCount = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        effectiveDate: currentDate,
      },
    })
    console.log(`✅ 删除了 ${deletedCount.count} 条今日汇率记录`)

    // 触发统一同步
    console.log('\n🚀 触发统一同步服务...')
    const syncResult = await UnifiedSyncService.triggerUserSync(user.id, false)
    
    console.log(`同步结果: ${syncResult.success}`)
    console.log(`同步消息: ${syncResult.message}`)

    if (!syncResult.success) {
      console.log('❌ 同步失败，停止测试')
      return
    }

    // 等待同步完成
    console.log('\n⏳ 等待同步完成...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 获取同步状态
    console.log('\n📊 获取同步状态...')
    const syncSummary = await UnifiedSyncService.getSyncSummary(user.id)
    
    console.log(`同步状态: ${syncSummary.syncStatus.status}`)
    console.log(`最后同步时间: ${syncSummary.syncStatus.lastSyncTime}`)
    console.log(`处理的定期交易: ${syncSummary.syncStatus.processedRecurring || 0}`)
    console.log(`处理的贷款: ${syncSummary.syncStatus.processedLoans || 0}`)
    console.log(`处理的汇率: ${syncSummary.syncStatus.processedExchangeRates || 0}`)
    console.log(`失败数量: ${syncSummary.syncStatus.failedCount || 0}`)

    // 检查最新的处理日志
    if (syncSummary.recentLogs && syncSummary.recentLogs.length > 0) {
      console.log('\n📝 最新处理日志:')
      const latestLog = syncSummary.recentLogs[0]
      console.log(`日志ID: ${latestLog.id}`)
      console.log(`状态: ${latestLog.status}`)
      console.log(`开始时间: ${latestLog.startTime}`)
      console.log(`结束时间: ${latestLog.endTime || '未完成'}`)
      console.log(`处理的定期交易: ${latestLog.processedRecurring}`)
      console.log(`处理的贷款: ${latestLog.processedLoans}`)
      console.log(`处理的汇率: ${latestLog.processedExchangeRates}`)
      console.log(`失败数量: ${latestLog.failedCount}`)
      if (latestLog.errorMessage) {
        console.log(`错误信息: ${latestLog.errorMessage}`)
      }
    }

    // 验证汇率数据
    console.log('\n💱 验证汇率数据...')
    const newTodayRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        effectiveDate: currentDate,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`新的今日汇率记录: ${newTodayRates.length} 条`)
    if (newTodayRates.length > 0) {
      console.log('汇率详情:')
      newTodayRates.forEach(rate => {
        console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
      })
    }

    // 检查用户设置中的最后更新时间
    const updatedSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })
    console.log(`\n⏰ 汇率最后更新时间: ${updatedSettings?.lastExchangeRateUpdate || '未更新'}`)

    // 分析结果
    console.log('\n🔍 结果分析:')
    if (newTodayRates.length > 0 && (syncSummary.syncStatus.processedExchangeRates || 0) === 0) {
      console.log('⚠️  汇率数据已更新，但处理日志中显示为0')
      console.log('可能原因：')
      console.log('1. 同步是异步的，日志记录可能有延迟')
      console.log('2. 汇率更新在同步流程中被跳过')
      console.log('3. 处理日志更新失败')
    } else if (newTodayRates.length > 0 && (syncSummary.syncStatus.processedExchangeRates || 0) > 0) {
      console.log('✅ 汇率数据已更新，处理日志正确记录')
    } else {
      console.log('❌ 汇率数据未更新')
    }

    console.log('\n🎉 测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testUnifiedSyncWithFreshData()

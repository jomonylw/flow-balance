import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkExchangeRateStatus() {
  try {
    console.log('🔍 检查汇率更新状态...')

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
    console.log(`🔄 汇率自动更新: ${user.settings?.autoUpdateExchangeRates ? '已启用' : '已禁用'}`)
    console.log(`⏰ 最后更新时间: ${user.settings?.lastExchangeRateUpdate || '从未更新'}`)

    if (user.settings?.lastExchangeRateUpdate) {
      const lastUpdate = new Date(user.settings.lastExchangeRateUpdate)
      const now = new Date()
      const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
      console.log(`⏱️  距离上次更新: ${Math.round(hoursSinceLastUpdate * 100) / 100} 小时`)
      console.log(`🚦 是否需要更新: ${hoursSinceLastUpdate >= 24 ? '是' : '否'}`)
    }

    // 检查用户货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(`\n💰 用户活跃货币: ${userCurrencies.length} 个`)
    userCurrencies.forEach(uc => {
      console.log(`  - ${uc.currency.code}: ${uc.currency.name}`)
    })

    // 检查今日汇率
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

    console.log(`\n💱 今日汇率记录: ${todayRates.length} 条`)
    todayRates.forEach(rate => {
      console.log(`  - ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.type})`)
    })

    // 强制清除最后更新时间并测试
    console.log('\n🔄 强制清除最后更新时间并测试...')
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        lastExchangeRateUpdate: null,
      },
    })

    console.log('✅ 最后更新时间已清除')
    console.log('现在可以测试汇率自动更新功能')

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkExchangeRateStatus()

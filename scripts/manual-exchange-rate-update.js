/**
 * 手动汇率更新脚本
 * 模拟汇率自动更新过程，确保正向和反向汇率使用相同的日期
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function manualExchangeRateUpdate() {
  try {
    console.log('🔄 开始手动汇率更新...\n')

    // 获取测试用户ID
    const user = await prisma.user.findFirst()
    if (!user) {
      console.error('❌ 未找到测试用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 获取用户设置和本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (!userSettings?.baseCurrency) {
      console.error('❌ 用户未设置本位币')
      return
    }

    const baseCurrency = userSettings.baseCurrency
    console.log(`💰 本位币: ${baseCurrency.code}`)

    // 设置统一的生效日期（今天）
    const effectiveDate = new Date()
    effectiveDate.setUTCHours(0, 0, 0, 0)
    console.log(`📅 统一生效日期: ${effectiveDate.toISOString()}`)

    // 获取用户的活跃货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    console.log(`💱 活跃货币数量: ${userCurrencies.length}`)

    // 模拟汇率数据（实际应用中从API获取）
    const mockRates = {
      USD: 7.16794495018278,
      EUR: 8.37380673254061,
      JPY: 0.048740069210898,
      HKD: 0.913075237399562,
      GBP: 9.76,
    }

    let updatedCount = 0

    // 1. 删除所有自动生成的汇率
    console.log('\n🧹 清理旧的自动生成汇率...')
    const deletedAuto = await prisma.exchangeRate.deleteMany({
      where: {
        userId: user.id,
        type: 'AUTO',
      },
    })
    console.log(`删除了 ${deletedAuto.count} 条自动生成的汇率`)

    // 2. 更新或创建API汇率（从本位币到其他货币）
    console.log('\n📈 更新API汇率...')
    for (const userCurrency of userCurrencies) {
      const currencyCode = userCurrency.currency.code

      // 跳过本位币
      if (currencyCode === baseCurrency.code) {
        continue
      }

      const rate = mockRates[currencyCode]
      if (!rate) {
        console.log(`⏭️  跳过 ${currencyCode}（无模拟汇率数据）`)
        continue
      }

      try {
        // 查找现有汇率记录
        const existingRate = await prisma.exchangeRate.findFirst({
          where: {
            userId: user.id,
            fromCurrencyId: baseCurrency.id,
            toCurrencyId: userCurrency.currency.id,
            effectiveDate: effectiveDate,
          },
        })

        if (existingRate) {
          // 更新现有汇率
          await prisma.exchangeRate.update({
            where: { id: existingRate.id },
            data: {
              rate: rate,
              type: 'API',
              notes: `手动更新测试 - ${new Date().toISOString()}`,
            },
          })
          console.log(`✅ 更新 ${baseCurrency.code} → ${currencyCode}: ${rate}`)
        } else {
          // 创建新汇率记录
          await prisma.exchangeRate.create({
            data: {
              userId: user.id,
              fromCurrencyId: baseCurrency.id,
              toCurrencyId: userCurrency.currency.id,
              rate: rate,
              effectiveDate: effectiveDate,
              type: 'API',
              notes: `手动更新测试 - ${new Date().toISOString()}`,
            },
          })
          console.log(`✅ 创建 ${baseCurrency.code} → ${currencyCode}: ${rate}`)
        }

        updatedCount++
      } catch (error) {
        console.error(
          `❌ 更新 ${baseCurrency.code} → ${currencyCode} 失败:`,
          error
        )
      }
    }

    // 3. 生成反向汇率（使用相同的生效日期）
    console.log('\n🔄 生成反向汇率...')
    let reverseCount = 0

    for (const userCurrency of userCurrencies) {
      const currencyCode = userCurrency.currency.code

      // 跳过本位币
      if (currencyCode === baseCurrency.code) {
        continue
      }

      const directRate = mockRates[currencyCode]
      if (!directRate) {
        continue
      }

      const reverseRate = 1 / directRate

      try {
        // 创建反向汇率记录
        await prisma.exchangeRate.create({
          data: {
            userId: user.id,
            fromCurrencyId: userCurrency.currency.id,
            toCurrencyId: baseCurrency.id,
            rate: reverseRate,
            effectiveDate: effectiveDate, // 使用相同的生效日期
            type: 'AUTO',
            notes: `自动生成反向汇率 - ${new Date().toISOString()}`,
          },
        })
        console.log(
          `✅ 生成 ${currencyCode} → ${baseCurrency.code}: ${reverseRate.toFixed(8)}`
        )
        reverseCount++
      } catch (error) {
        console.error(
          `❌ 生成 ${currencyCode} → ${baseCurrency.code} 反向汇率失败:`,
          error
        )
      }
    }

    console.log(`\n📊 更新汇总:`)
    console.log(`   - API汇率更新: ${updatedCount} 条`)
    console.log(`   - 反向汇率生成: ${reverseCount} 条`)
    console.log(`   - 统一生效日期: ${effectiveDate.toDateString()}`)

    console.log('\n✅ 手动汇率更新完成')
  } catch (error) {
    console.error('❌ 手动汇率更新失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行更新
manualExchangeRateUpdate()

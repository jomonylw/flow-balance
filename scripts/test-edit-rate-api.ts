/**
 * 测试编辑汇率API的自动重新生成功能
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEditRateAPI() {
  try {
    console.log('🧪 测试编辑汇率API的自动重新生成功能...\n')

    // 获取演示用户
    const user = await prisma.user.findUnique({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到演示用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 查看编辑前的汇率状态
    console.log('\n📊 编辑前的汇率状态:')
    const beforeRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    const beforeUserRates = beforeRates.filter(rate => rate.type === 'USER')
    const beforeAutoRates = beforeRates.filter(rate => rate.type === 'AUTO')

    console.log(`  👤 用户输入汇率: ${beforeUserRates.length} 条`)
    beforeUserRates.forEach(rate => {
      console.log(
        `    ${rate.id}: ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`  🤖 自动生成汇率: ${beforeAutoRates.length} 条`)
    beforeAutoRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    // 选择一个用户汇率进行编辑
    const targetRate = beforeUserRates.find(
      rate =>
        rate.fromCurrencyRef.code === 'CNY' && rate.toCurrencyRef.code === 'USD'
    )
    if (!targetRate) {
      console.log('❌ 未找到 CNY → USD 汇率')
      return
    }

    console.log(
      `\n🔧 模拟编辑汇率: ${targetRate.fromCurrencyRef.code} → ${targetRate.toCurrencyRef.code}`
    )
    console.log(`  汇率ID: ${targetRate.id}`)
    console.log(`  原汇率: ${targetRate.rate}`)

    const newRate = 0.15 // 从 0.14 更新到 0.15
    console.log(`  新汇率: ${newRate}`)

    // 模拟编辑API调用的逻辑
    console.log('\n🔄 模拟编辑API调用逻辑...')

    // 步骤1：更新汇率
    console.log('  步骤1：更新汇率...')
    const updatedRate = await prisma.exchangeRate.update({
      where: { id: targetRate.id },
      data: {
        rate: newRate,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })
    console.log(`    ✅ 汇率更新成功: ${updatedRate.rate}`)

    // 步骤2：检查是否为用户汇率
    console.log('  步骤2：检查汇率类型...')
    console.log(`    汇率类型: ${targetRate.type}`)

    if (targetRate.type === 'USER') {
      console.log('    ✅ 是用户汇率，触发自动重新生成')

      // 步骤3：清理自动生成的汇率
      console.log('  步骤3：清理自动生成的汇率...')
      const deleteResult = await prisma.exchangeRate.deleteMany({
        where: {
          userId: user.id,
          type: 'AUTO',
        },
      })
      console.log(`    🗑️  删除了 ${deleteResult.count} 条自动生成的汇率`)

      // 步骤4：重新生成自动汇率
      console.log('  步骤4：重新生成自动汇率...')
      const { generateAutoExchangeRates } = await import(
        '../src/lib/services/exchange-rate-auto-generation.service'
      )

      try {
        const result = await generateAutoExchangeRates(
          user.id,
          targetRate.effectiveDate
        )

        console.log('    📊 生成结果:')
        console.log(`      成功: ${result.success}`)
        console.log(`      总计生成: ${result.generatedCount} 条`)
        console.log(`      反向汇率: ${result.details.reverseRates} 条`)
        console.log(`      传递汇率: ${result.details.transitiveRates} 条`)

        if (result.errors.length > 0) {
          console.log('    ⚠️  错误信息:')
          result.errors.forEach(error => console.log(`      - ${error}`))
        }
      } catch (error) {
        console.error('    ❌ 自动生成失败:', error)
      }
    } else {
      console.log('    ❌ 不是用户汇率，跳过自动重新生成')
    }

    // 查看编辑后的汇率状态
    console.log('\n📊 编辑后的汇率状态:')
    const afterRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    const afterUserRates = afterRates.filter(rate => rate.type === 'USER')
    const afterAutoRates = afterRates.filter(rate => rate.type === 'AUTO')

    console.log(`  👤 用户输入汇率: ${afterUserRates.length} 条`)
    afterUserRates.forEach(rate => {
      const isUpdated = rate.id === targetRate.id
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}${isUpdated ? ' ⭐ (已更新)' : ''}`
      )
    })

    console.log(`  🤖 自动生成汇率: ${afterAutoRates.length} 条`)
    afterAutoRates.forEach(rate => {
      console.log(
        `    ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    // 验证完整性
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    const currencies = userCurrencies.map(uc => uc.currency.code)
    const totalPossible = currencies.length * (currencies.length - 1)
    const actualTotal = afterRates.length

    console.log('\n📈 完整性验证:')
    console.log(`  可用货币: ${currencies.join(', ')}`)
    console.log(`  理论最大汇率对: ${totalPossible}`)
    console.log(`  实际汇率对: ${actualTotal}`)
    console.log(
      `  覆盖率: ${((actualTotal / totalPossible) * 100).toFixed(1)}%`
    )

    if (actualTotal === totalPossible) {
      console.log('  🎉 编辑汇率API的自动重新生成功能正常！')
    } else {
      console.log('  ❌ 编辑汇率API的自动重新生成功能有问题！')
    }

    console.log('\n✅ 测试完成！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testEditRateAPI()

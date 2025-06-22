/**
 * 调试传递汇率生成逻辑
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugTransitiveRates() {
  try {
    console.log('🔍 调试传递汇率生成逻辑...\n')

    // 获取演示用户
    const user = await prisma.user.findUnique({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到演示用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 查看当前汇率状态
    console.log('\n📊 当前汇率状态:')
    const currentRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    const userRates = currentRates.filter(rate => rate.type === 'USER')
    const autoRates = currentRates.filter(rate => rate.type === 'AUTO')

    console.log(`\n👤 用户输入汇率 (${userRates.length} 条):`)
    userRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    console.log(`\n🤖 自动生成汇率 (${autoRates.length} 条):`)
    autoRates.forEach(rate => {
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
    })

    // 获取用户可用货币
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
    console.log(`\n💱 用户可用货币: ${currencies.join(', ')}`)

    // 手动模拟传递汇率生成逻辑
    console.log('\n🧮 手动模拟传递汇率生成逻辑...')

    // 创建汇率映射表
    const rateMap = new Map<
      string,
      { rate: number; id: string; type: string }
    >()

    // 添加所有现有汇率到映射表
    for (const rate of currentRates) {
      const key = `${rate.fromCurrencyRef.code}-${rate.toCurrencyRef.code}`
      rateMap.set(key, {
        rate: parseFloat(rate.rate.toString()),
        id: rate.id,
        type: rate.type,
      })
    }

    console.log('\n📋 现有汇率映射:')
    for (const [key, value] of rateMap.entries()) {
      console.log(`  ${key}: ${value.rate} (${value.type})`)
    }

    // 分析应该生成的传递汇率
    console.log('\n🔄 分析应该生成的传递汇率...')
    let shouldGenerate = 0
    let canGenerate = 0

    for (const fromCurrency of currencies) {
      for (const toCurrency of currencies) {
        if (fromCurrency === toCurrency) continue

        // 检查直接汇率是否已存在
        const directKey = `${fromCurrency}-${toCurrency}`
        if (rateMap.has(directKey)) {
          console.log(`  ✅ 已存在: ${directKey}`)
          continue
        }

        shouldGenerate++
        console.log(`  ❓ 缺失: ${directKey}`)

        // 寻找中间货币进行传递计算
        let found = false
        for (const intermediateCurrency of currencies) {
          if (
            intermediateCurrency === fromCurrency ||
            intermediateCurrency === toCurrency
          )
            continue

          const fromToIntermediate = `${fromCurrency}-${intermediateCurrency}`
          const intermediateToTarget = `${intermediateCurrency}-${toCurrency}`

          if (
            rateMap.has(fromToIntermediate) &&
            rateMap.has(intermediateToTarget)
          ) {
            const rate1 = rateMap.get(fromToIntermediate)!.rate
            const rate2 = rateMap.get(intermediateToTarget)!.rate
            const transitiveRate = rate1 * rate2

            console.log(
              `    🔗 可通过 ${intermediateCurrency} 生成: ${fromCurrency}→${intermediateCurrency}(${rate1}) × ${intermediateCurrency}→${toCurrency}(${rate2}) = ${transitiveRate}`
            )
            canGenerate++
            found = true
            break
          }
        }

        if (!found) {
          console.log(`    ❌ 无法生成: ${directKey} (缺少中间路径)`)
        }
      }
    }

    console.log('\n📊 生成分析结果:')
    console.log(`  应该生成的汇率对: ${shouldGenerate}`)
    console.log(`  可以生成的汇率对: ${canGenerate}`)
    console.log(`  当前自动汇率数量: ${autoRates.length}`)

    // 理论最大汇率数
    const totalPossible = currencies.length * (currencies.length - 1)
    console.log(`  理论最大汇率对: ${totalPossible}`)
    console.log(`  当前总汇率: ${currentRates.length}`)

    // 列出所有可能的汇率对
    console.log('\n📝 所有可能的汇率对:')
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const key = `${from}-${to}`
          const exists = rateMap.has(key)
          const type = exists ? rateMap.get(key)!.type : 'MISSING'
          console.log(`  ${key}: ${exists ? '✅' : '❌'} (${type})`)
        }
      }
    }

    console.log('\n✅ 调试完成！')
  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行调试
debugTransitiveRates()

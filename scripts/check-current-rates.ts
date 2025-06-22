/**
 * 检查当前数据库中的汇率状态
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCurrentRates() {
  try {
    console.log('🔍 检查当前数据库中的汇率状态...\n')

    // 获取演示用户
    const user = await prisma.user.findUnique({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到演示用户')
      return
    }

    console.log(`👤 用户: ${user.email}`)

    // 查看所有汇率
    console.log('\n📊 数据库中的所有汇率:')
    const allRates = await prisma.exchangeRate.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    console.log(`总计: ${allRates.length} 条汇率`)

    const userRates = allRates.filter(rate => rate.type === 'USER')
    const autoRates = allRates.filter(rate => rate.type === 'AUTO')

    console.log(`\n👤 用户输入汇率 (${userRates.length} 条):`)
    userRates.forEach(rate => {
      console.log(`  ID: ${rate.id}`)
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
      console.log(`  日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      console.log(`  创建时间: ${rate.createdAt.toISOString()}`)
      console.log(`  备注: ${rate.notes || '无'}`)
      console.log('  ---')
    })

    console.log(`\n🤖 自动生成汇率 (${autoRates.length} 条):`)
    autoRates.forEach(rate => {
      console.log(`  ID: ${rate.id}`)
      console.log(
        `  ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate}`
      )
      console.log(`  日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      console.log(`  创建时间: ${rate.createdAt.toISOString()}`)
      console.log(`  备注: ${rate.notes || '无'}`)
      console.log('  ---')
    })

    // 检查用户可用货币
    console.log('\n💱 用户可用货币:')
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: { order: 'asc' },
      include: {
        currency: true,
      },
    })

    userCurrencies.forEach(uc => {
      console.log(`  ${uc.currency.code} (顺序: ${uc.order})`)
    })

    // 分析缺失的汇率对
    const currencies = userCurrencies.map(uc => uc.currency.code)
    const existingPairs = new Set()
    allRates.forEach(rate => {
      existingPairs.add(
        `${rate.fromCurrencyRef.code}-${rate.toCurrencyRef.code}`
      )
    })

    console.log('\n📋 汇率对分析:')
    const totalPossible = currencies.length * (currencies.length - 1)
    console.log(`  理论最大汇率对: ${totalPossible}`)
    console.log(`  实际汇率对: ${allRates.length}`)
    console.log(
      `  覆盖率: ${((allRates.length / totalPossible) * 100).toFixed(1)}%`
    )

    const missingPairs = []
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const pairKey = `${from}-${to}`
          if (!existingPairs.has(pairKey)) {
            missingPairs.push(pairKey)
          }
        }
      }
    }

    if (missingPairs.length > 0) {
      console.log(`\n❓ 缺失的汇率对 (${missingPairs.length} 个):`)
      missingPairs.forEach(pair => console.log(`  ${pair}`))
    } else {
      console.log('\n🎉 所有汇率对都已存在！')
    }

    // 模拟前端API调用
    console.log('\n🌐 模拟前端API调用...')
    try {
      const response = await fetch('http://localhost:3002/api/exchange-rates', {
        headers: {
          Cookie: 'demo-session=true', // 模拟登录状态
        },
      })

      if (response.ok) {
        const data = await response.json()
        const apiRates = data.data || []

        console.log(`  API返回汇率数量: ${apiRates.length}`)

        const apiUserRates = apiRates.filter(
          (rate: any) => rate.type !== 'AUTO'
        )
        const apiAutoRates = apiRates.filter(
          (rate: any) => rate.type === 'AUTO'
        )

        console.log(`  API用户汇率: ${apiUserRates.length} 条`)
        console.log(`  API自动汇率: ${apiAutoRates.length} 条`)

        if (apiAutoRates.length !== autoRates.length) {
          console.log('  ⚠️  API返回的自动汇率数量与数据库不一致！')
          console.log(`  数据库: ${autoRates.length} 条`)
          console.log(`  API: ${apiAutoRates.length} 条`)
        }
      } else {
        console.log(`  ❌ API调用失败: ${response.status}`)
      }
    } catch (error) {
      console.log(`  ❌ API调用错误: ${error}`)
    }

    console.log('\n✅ 检查完成！')
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkCurrentRates()

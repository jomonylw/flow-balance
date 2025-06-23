#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getUserExchangeRate } from '../src/lib/services/currency.service'

const prisma = new PrismaClient()

async function debugAudHkdRate() {
  console.log('🔍 调试 AUD → HKD 汇率查找...\n')

  try {
    // 1. 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 使用测试用户: ${testUser.email}`)

    // 2. 查找 AUD 和 HKD 货币记录
    const audCurrency = await prisma.currency.findFirst({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    const hkdCurrency = await prisma.currency.findFirst({
      where: {
        code: 'HKD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    console.log(`\n💰 货币记录:`)
    console.log(`  AUD: ${audCurrency ? `ID=${audCurrency.id}, 创建者=${audCurrency.createdBy || '全局'}` : '未找到'}`)
    console.log(`  HKD: ${hkdCurrency ? `ID=${hkdCurrency.id}, 创建者=${hkdCurrency.createdBy || '全局'}` : '未找到'}`)

    if (!audCurrency || !hkdCurrency) {
      console.log('❌ 货币记录不完整')
      return
    }

    // 3. 查找汇率记录
    const currentDate = new Date()
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        userId: testUser.id,
        fromCurrencyId: audCurrency.id,
        toCurrencyId: hkdCurrency.id,
        effectiveDate: {
          lte: currentDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    console.log(`\n📈 AUD → HKD 汇率记录 (${exchangeRates.length} 条):`)
    if (exchangeRates.length > 0) {
      exchangeRates.forEach((rate, index) => {
        console.log(`  ${index + 1}. 汇率: ${rate.rate}, 生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}, 类型: ${rate.type}`)
      })
    } else {
      console.log('  📝 没有找到汇率记录')
    }

    // 4. 测试 getUserExchangeRate 函数
    console.log(`\n🧪 测试 getUserExchangeRate 函数:`)
    const rate = await getUserExchangeRate(testUser.id, 'AUD', 'HKD')
    
    if (rate) {
      console.log(`  ✅ 找到汇率: ${rate.rate}`)
      console.log(`  📅 生效日期: ${rate.effectiveDate.toISOString().split('T')[0]}`)
      console.log(`  📝 备注: ${rate.notes || '无'}`)
    } else {
      console.log(`  ❌ 未找到汇率`)
    }

    // 5. 检查所有 AUD 相关的汇率
    console.log(`\n📊 所有 AUD 相关汇率:`)
    const allAudRates = await prisma.exchangeRate.findMany({
      where: {
        userId: testUser.id,
        OR: [
          { fromCurrencyId: audCurrency.id },
          { toCurrencyId: audCurrency.id },
        ],
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyRef: { code: 'asc' } },
        { toCurrencyRef: { code: 'asc' } },
        { effectiveDate: 'desc' },
      ],
    })

    allAudRates.forEach((rate, index) => {
      console.log(`  ${index + 1}. ${rate.fromCurrencyRef.code} → ${rate.toCurrencyRef.code}: ${rate.rate} (${rate.effectiveDate.toISOString().split('T')[0]}, ${rate.type})`)
    })

  } catch (error) {
    console.error('❌ 调试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行调试
debugAudHkdRate()

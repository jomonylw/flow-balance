/**
 * 汇率历史清理服务测试
 */

import { prisma } from '@/lib/database/connection-manager'
import {
  cleanupExchangeRateHistory,
  cleanupSpecificCurrencyPairHistory,
} from '../exchange-rate-cleanup.service'

// 测试数据
const testUserId = 'test-user-cleanup'
const testCurrencyUSD = 'test-currency-usd'
const testCurrencyCNY = 'test-currency-cny'

describe('Exchange Rate Cleanup Service', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.exchangeRate.deleteMany({
      where: { userId: testUserId },
    })
    await prisma.currency.deleteMany({
      where: { id: { in: [testCurrencyUSD, testCurrencyCNY] } },
    })
    await prisma.user.deleteMany({
      where: { id: testUserId },
    })

    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test-cleanup@example.com',
        name: 'Test User Cleanup',
        password: 'test-password',
      },
    })

    // 创建测试货币
    await prisma.currency.createMany({
      data: [
        {
          id: testCurrencyUSD,
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          decimalPlaces: 2,
        },
        {
          id: testCurrencyCNY,
          code: 'CNY',
          name: 'Chinese Yuan',
          symbol: '¥',
          decimalPlaces: 2,
        },
      ],
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.exchangeRate.deleteMany({
      where: { userId: testUserId },
    })
    await prisma.currency.deleteMany({
      where: { id: { in: [testCurrencyUSD, testCurrencyCNY] } },
    })
    await prisma.user.deleteMany({
      where: { id: testUserId },
    })
  })

  it('should cleanup old exchange rates and keep only the latest', async () => {
    // 创建多个不同日期的汇率记录
    const dates = [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03'), // 最新的
    ]

    for (let i = 0; i < dates.length; i++) {
      await prisma.exchangeRate.create({
        data: {
          userId: testUserId,
          fromCurrencyId: testCurrencyUSD,
          toCurrencyId: testCurrencyCNY,
          rate: 7.0 + i * 0.1, // 不同的汇率
          effectiveDate: dates[i],
          type: 'USER',
        },
      })
    }

    // 验证创建了3条记录
    const beforeCleanup = await prisma.exchangeRate.count({
      where: {
        userId: testUserId,
        fromCurrencyId: testCurrencyUSD,
        toCurrencyId: testCurrencyCNY,
      },
    })
    expect(beforeCleanup).toBe(3)

    // 执行清理
    const result = await cleanupSpecificCurrencyPairHistory(
      testUserId,
      testCurrencyUSD,
      testCurrencyCNY,
      { clearCache: false }
    )

    // 验证清理结果
    expect(result.success).toBe(true)
    expect(result.data?.cleanedCount).toBe(2) // 删除了2条旧记录

    // 验证只剩下1条最新记录
    const afterCleanup = await prisma.exchangeRate.findMany({
      where: {
        userId: testUserId,
        fromCurrencyId: testCurrencyUSD,
        toCurrencyId: testCurrencyCNY,
      },
      orderBy: { effectiveDate: 'desc' },
    })

    expect(afterCleanup).toHaveLength(1)
    expect(afterCleanup[0].effectiveDate).toEqual(dates[2]) // 最新日期
    expect(parseFloat(afterCleanup[0].rate.toString())).toBe(7.2) // 最新汇率
  })

  it('should cleanup all currency pairs for a user', async () => {
    // 创建多个货币对的历史记录
    const dates = [new Date('2024-01-01'), new Date('2024-01-02')]

    // USD -> CNY 货币对
    for (const date of dates) {
      await prisma.exchangeRate.create({
        data: {
          userId: testUserId,
          fromCurrencyId: testCurrencyUSD,
          toCurrencyId: testCurrencyCNY,
          rate: 7.0,
          effectiveDate: date,
          type: 'USER',
        },
      })
    }

    // CNY -> USD 货币对
    for (const date of dates) {
      await prisma.exchangeRate.create({
        data: {
          userId: testUserId,
          fromCurrencyId: testCurrencyCNY,
          toCurrencyId: testCurrencyUSD,
          rate: 0.14,
          effectiveDate: date,
          type: 'USER',
        },
      })
    }

    // 验证创建了4条记录
    const beforeCleanup = await prisma.exchangeRate.count({
      where: { userId: testUserId },
    })
    expect(beforeCleanup).toBe(4)

    // 执行批量清理
    const result = await cleanupExchangeRateHistory(testUserId, {
      clearCache: false,
    })

    // 验证清理结果
    expect(result.success).toBe(true)
    expect(result.data?.cleanedCount).toBe(2) // 每个货币对删除1条旧记录

    // 验证每个货币对只剩下1条最新记录
    const afterCleanup = await prisma.exchangeRate.count({
      where: { userId: testUserId },
    })
    expect(afterCleanup).toBe(2) // 每个货币对保留1条
  })

  it('should handle single record gracefully', async () => {
    // 创建单条记录
    await prisma.exchangeRate.create({
      data: {
        userId: testUserId,
        fromCurrencyId: testCurrencyUSD,
        toCurrencyId: testCurrencyCNY,
        rate: 7.0,
        effectiveDate: new Date('2024-01-01'),
        type: 'USER',
      },
    })

    // 执行清理
    const result = await cleanupSpecificCurrencyPairHistory(
      testUserId,
      testCurrencyUSD,
      testCurrencyCNY,
      { clearCache: false }
    )

    // 验证没有删除任何记录
    expect(result.success).toBe(true)
    expect(result.data?.cleanedCount).toBe(0)

    // 验证记录仍然存在
    const afterCleanup = await prisma.exchangeRate.count({
      where: {
        userId: testUserId,
        fromCurrencyId: testCurrencyUSD,
        toCurrencyId: testCurrencyCNY,
      },
    })
    expect(afterCleanup).toBe(1)
  })
})

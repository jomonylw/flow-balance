/**
 * 账户趋势API优化测试
 * 验证优化后的接口功能正确性和性能提升
 */

// Jest globals are available globally, no need to import
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounts/[accountId]/trends/route'
// import { prisma } from '@/lib/database/connection-manager'
import {
  createTestUser,
  createTestAccount,
  createTestTransactions,
  cleanupTestData,
} from '@/tests/helpers/test-data'

describe('账户趋势API优化测试', () => {
  let testUserId: string
  let assetAccountId: string
  let incomeAccountId: string
  let _testData: any

  beforeAll(async () => {
    // 创建测试用户
    const user = await createTestUser()
    testUserId = user.id

    // 创建测试账户
    const assetAccount = await createTestAccount(testUserId, 'ASSET', 'CNY')
    const incomeAccount = await createTestAccount(testUserId, 'INCOME', 'CNY')
    assetAccountId = assetAccount.id
    incomeAccountId = incomeAccount.id

    // 创建测试交易数据
    _testData = await createTestTransactions(
      testUserId,
      assetAccountId,
      incomeAccountId
    )
  })

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(testUserId)
  })

  describe('存量账户趋势数据', () => {
    it('应该返回正确的月度趋势数据', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=lastYear&granularity=monthly`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.account.type).toBe('ASSET')
      expect(data.data.granularity).toBe('monthly')
      expect(Array.isArray(data.data.data)).toBe(true)

      // 验证数据结构
      if (data.data.data.length > 0) {
        const firstDataPoint = data.data.data[0]
        expect(firstDataPoint).toHaveProperty('date')
        expect(firstDataPoint).toHaveProperty('originalAmount')
        expect(firstDataPoint).toHaveProperty('originalCurrency')
        expect(firstDataPoint).toHaveProperty('convertedAmount')
        expect(firstDataPoint).toHaveProperty('transactionCount')
        expect(firstDataPoint).toHaveProperty('hasConversionError')
      }
    })

    it('应该返回正确的日度趋势数据', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=lastMonth&granularity=daily`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.granularity).toBe('daily')
      expect(Array.isArray(data.data.data)).toBe(true)
    })
  })

  describe('流量账户趋势数据', () => {
    it('应该返回正确的月度趋势数据', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${incomeAccountId}/trends?range=lastYear&granularity=monthly`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: incomeAccountId }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.account.type).toBe('INCOME')
      expect(data.data.granularity).toBe('monthly')
      expect(Array.isArray(data.data.data)).toBe(true)
    })

    it('应该返回正确的日度趋势数据', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${incomeAccountId}/trends?range=lastMonth&granularity=daily`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: incomeAccountId }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.granularity).toBe('daily')
      expect(Array.isArray(data.data.data)).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该正确处理不存在的账户', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/accounts/non-existent-id/trends'
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: 'non-existent-id' }),
      })

      expect(response.status).toBe(404)
    })

    it('应该正确处理无效的参数', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=invalid&granularity=invalid`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })

      // 应该使用默认值而不是报错
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.data.range).toBe('invalid') // 保持原值
      expect(data.data.granularity).toBe('monthly') // 使用默认值
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内返回结果', async () => {
      const startTime = Date.now()

      const request = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=all&granularity=monthly`
      )

      const response = await GET(request, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      // 优化后的接口应该在2秒内完成（根据实际情况调整）
      expect(duration).toBeLessThan(2000)

      console.log(`趋势数据查询耗时: ${duration}ms`)
    })
  })

  describe('数据一致性', () => {
    it('月度和日度数据应该保持一致性', async () => {
      // 获取月度数据
      const monthlyRequest = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=lastMonth&granularity=monthly`
      )
      const monthlyResponse = await GET(monthlyRequest, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })
      const monthlyData = await monthlyResponse.json()

      // 获取日度数据
      const dailyRequest = new NextRequest(
        `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=lastMonth&granularity=daily`
      )
      const dailyResponse = await GET(dailyRequest, {
        params: Promise.resolve({ accountId: assetAccountId }),
      })
      const dailyData = await dailyResponse.json()

      expect(monthlyResponse.status).toBe(200)
      expect(dailyResponse.status).toBe(200)

      // 验证数据结构一致性
      expect(monthlyData.data.account.id).toBe(dailyData.data.account.id)
      expect(monthlyData.data.baseCurrency).toEqual(dailyData.data.baseCurrency)
    })
  })
})

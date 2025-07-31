/**
 * 趋势API性能对比测试
 * 对比优化前后的性能差异
 */

// Jest globals are available globally, no need to import
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/accounts/[accountId]/trends/route'
import {
  getAccountTrendData,
  getFlowAccountTrendData,
} from '@/lib/database/queries/account.queries'
import {
  createTestUser,
  createTestAccount,
  createPerformanceTestData,
  cleanupTestData,
  measureExecutionTime,
} from '@/tests/helpers/test-data'
import { subMonths, subDays } from 'date-fns'

describe('趋势API性能对比测试', () => {
  let testUserId: string
  let assetAccountId: string
  let incomeAccountId: string

  beforeAll(async () => {
    // 创建测试用户
    const user = await createTestUser()
    testUserId = user.id

    // 创建测试账户
    const assetAccount = await createTestAccount(testUserId, 'ASSET', 'CNY')
    const incomeAccount = await createTestAccount(testUserId, 'INCOME', 'CNY')
    assetAccountId = assetAccount.id
    incomeAccountId = incomeAccount.id

    // 创建大量测试数据用于性能测试
    console.log('创建性能测试数据...')
    await createPerformanceTestData(testUserId, assetAccountId, 5000)
    await createPerformanceTestData(testUserId, incomeAccountId, 5000)
    console.log('性能测试数据创建完成')
  })

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(testUserId)
  })

  describe('存量账户性能测试', () => {
    it('优化后的数据库查询应该比API调用更快', async () => {
      const startDate = subMonths(new Date(), 12)
      const endDate = new Date()

      // 测试优化后的数据库查询
      const { duration: dbDuration } = await measureExecutionTime(async () => {
        return await getAccountTrendData(
          testUserId,
          assetAccountId,
          startDate,
          endDate,
          'monthly'
        )
      })

      // 测试完整的API调用
      const { duration: apiDuration } = await measureExecutionTime(async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/accounts/${assetAccountId}/trends?range=lastYear&granularity=monthly`
        )
        const response = await GET(request, {
          params: Promise.resolve({ accountId: assetAccountId }),
        })
        return await response.json()
      })

      console.log(`存量账户 - 数据库查询耗时: ${dbDuration}ms`)
      console.log(`存量账户 - API调用耗时: ${apiDuration}ms`)

      // 数据库查询应该比完整API调用快（因为API还包含货币转换等步骤）
      expect(dbDuration).toBeLessThan(apiDuration)

      // 优化后的查询应该在合理时间内完成
      expect(dbDuration).toBeLessThan(1000) // 1秒内
      expect(apiDuration).toBeLessThan(3000) // 3秒内
    })

    it('日粒度查询性能测试', async () => {
      const startDate = subDays(new Date(), 30)
      const endDate = new Date()

      const { duration } = await measureExecutionTime(async () => {
        return await getAccountTrendData(
          testUserId,
          assetAccountId,
          startDate,
          endDate,
          'daily'
        )
      })

      console.log(`存量账户日粒度查询耗时: ${duration}ms`)
      expect(duration).toBeLessThan(2000) // 2秒内
    })
  })

  describe('流量账户性能测试', () => {
    it('优化后的数据库查询应该比API调用更快', async () => {
      const startDate = subMonths(new Date(), 12)
      const endDate = new Date()

      // 测试优化后的数据库查询
      const { duration: dbDuration } = await measureExecutionTime(async () => {
        return await getFlowAccountTrendData(
          testUserId,
          incomeAccountId,
          startDate,
          endDate,
          'monthly'
        )
      })

      // 测试完整的API调用
      const { duration: apiDuration } = await measureExecutionTime(async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/accounts/${incomeAccountId}/trends?range=lastYear&granularity=monthly`
        )
        const response = await GET(request, {
          params: Promise.resolve({ accountId: incomeAccountId }),
        })
        return await response.json()
      })

      console.log(`流量账户 - 数据库查询耗时: ${dbDuration}ms`)
      console.log(`流量账户 - API调用耗时: ${apiDuration}ms`)

      // 数据库查询应该比完整API调用快
      expect(dbDuration).toBeLessThan(apiDuration)

      // 优化后的查询应该在合理时间内完成
      expect(dbDuration).toBeLessThan(1000) // 1秒内
      expect(apiDuration).toBeLessThan(3000) // 3秒内
    })

    it('日粒度查询性能测试', async () => {
      const startDate = subDays(new Date(), 30)
      const endDate = new Date()

      const { duration } = await measureExecutionTime(async () => {
        return await getFlowAccountTrendData(
          testUserId,
          incomeAccountId,
          startDate,
          endDate,
          'daily'
        )
      })

      console.log(`流量账户日粒度查询耗时: ${duration}ms`)
      expect(duration).toBeLessThan(2000) // 2秒内
    })
  })

  describe('大数据量性能测试', () => {
    it('处理大量数据时应该保持良好性能', async () => {
      // 创建更多测试数据
      await createPerformanceTestData(testUserId, assetAccountId, 10000)

      const startDate = subMonths(new Date(), 24) // 2年数据
      const endDate = new Date()

      const { result, duration } = await measureExecutionTime(async () => {
        return await getAccountTrendData(
          testUserId,
          assetAccountId,
          startDate,
          endDate,
          'monthly'
        )
      })

      console.log(`大数据量查询耗时: ${duration}ms`)
      console.log(`返回数据点数量: ${result.length}`)

      // 即使是大量数据，也应该在合理时间内完成
      expect(duration).toBeLessThan(5000) // 5秒内
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('并发性能测试', () => {
    it('并发查询应该保持良好性能', async () => {
      const startDate = subMonths(new Date(), 6)
      const endDate = new Date()

      // 创建10个并发查询
      const concurrentQueries = Array.from({ length: 10 }, () =>
        measureExecutionTime(async () => {
          return await getAccountTrendData(
            testUserId,
            assetAccountId,
            startDate,
            endDate,
            'monthly'
          )
        })
      )

      const results = await Promise.all(concurrentQueries)
      const durations = results.map(r => r.duration)
      const avgDuration =
        durations.reduce((sum, d) => sum + d, 0) / durations.length
      const maxDuration = Math.max(...durations)

      console.log(`并发查询平均耗时: ${avgDuration.toFixed(2)}ms`)
      console.log(`并发查询最大耗时: ${maxDuration}ms`)

      // 并发查询的平均时间应该在合理范围内
      expect(avgDuration).toBeLessThan(2000) // 平均2秒内
      expect(maxDuration).toBeLessThan(5000) // 最大5秒内

      // 所有查询都应该返回相同的结果
      const firstResult = results[0].result
      results.forEach(({ result }) => {
        expect(result.length).toBe(firstResult.length)
      })
    })
  })

  describe('内存使用测试', () => {
    it('优化后的查询应该使用更少的内存', async () => {
      const startDate = subMonths(new Date(), 12)
      const endDate = new Date()

      // 获取初始内存使用情况
      const initialMemory = process.memoryUsage()

      // 执行查询
      await getAccountTrendData(
        testUserId,
        assetAccountId,
        startDate,
        endDate,
        'monthly'
      )

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }

      // 获取查询后的内存使用情况
      const finalMemory = process.memoryUsage()

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })
})

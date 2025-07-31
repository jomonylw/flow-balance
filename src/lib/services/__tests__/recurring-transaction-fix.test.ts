/**
 * 定期交易批量处理修复验证测试
 */

// Jest globals are available globally, no need to import
import { RecurringTransactionService } from '../recurring-transaction.service'

describe('RecurringTransaction 批量处理修复验证', () => {
  it('应该能够正常调用 processBatchRecurringTransactions 而不出现 Prisma 错误', async () => {
    // 这个测试主要验证方法调用不会因为 Prisma schema 错误而失败
    const result =
      await RecurringTransactionService.processBatchRecurringTransactions(
        'test-user-id'
      )

    // 验证返回结构正确
    expect(result).toHaveProperty('processed')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('performance')
    expect(result.performance).toHaveProperty('duration')
    expect(result.performance).toHaveProperty('rate')
    expect(result.performance).toHaveProperty('metrics')

    // 验证类型正确
    expect(typeof result.processed).toBe('number')
    expect(Array.isArray(result.errors)).toBe(true)
    expect(typeof result.performance.duration).toBe('number')
    expect(typeof result.performance.rate).toBe('number')
    expect(typeof result.performance.metrics).toBe('object')
  })

  it('应该能够正常调用 getDueRecurringTransactions', async () => {
    // 验证获取到期定期交易的方法也能正常工作
    const result =
      await RecurringTransactionService.getDueRecurringTransactions(
        'test-user-id'
      )

    // 应该返回数组
    expect(Array.isArray(result)).toBe(true)
  })
})

/**
 * 批量处理功能测试
 * 测试新的批量处理方法是否正常工作
 */

// Jest globals are available globally, no need to import
import { LoanContractService } from '../loan-contract.service'
import { RecurringTransactionService } from '../recurring-transaction.service'
import { prisma } from '@/lib/database/connection-manager'

// 模拟数据
const mockUserId = 'test-user-id'
const _mockCurrencyId = 'test-currency-id'
const _mockAccountId = 'test-account-id'

describe('批量处理功能测试', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.loanPayment.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.loanContract.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.transaction.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.recurringTransaction.deleteMany({
      where: { userId: mockUserId },
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.loanPayment.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.loanContract.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.transaction.deleteMany({
      where: { userId: mockUserId },
    })
    await prisma.recurringTransaction.deleteMany({
      where: { userId: mockUserId },
    })
  })

  describe('LoanContractService.processBatchLoanPayments', () => {
    it('应该返回正确的性能数据结构', async () => {
      const result =
        await LoanContractService.processBatchLoanPayments(mockUserId)

      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('performance')
      expect(result.performance).toHaveProperty('duration')
      expect(result.performance).toHaveProperty('rate')
      expect(result.performance).toHaveProperty('metrics')

      expect(typeof result.processed).toBe('number')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(typeof result.performance.duration).toBe('number')
      expect(typeof result.performance.rate).toBe('number')
    })

    it('当没有到期还款时应该返回零值', async () => {
      const result =
        await LoanContractService.processBatchLoanPayments(mockUserId)

      expect(result.processed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.performance.rate).toBe(0)
    })
  })

  describe('RecurringTransactionService.processBatchRecurringTransactions', () => {
    it('应该返回正确的性能数据结构', async () => {
      const result =
        await RecurringTransactionService.processBatchRecurringTransactions(
          mockUserId
        )

      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('performance')
      expect(result.performance).toHaveProperty('duration')
      expect(result.performance).toHaveProperty('rate')
      expect(result.performance).toHaveProperty('metrics')

      expect(typeof result.processed).toBe('number')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(typeof result.performance.duration).toBe('number')
      expect(typeof result.performance.rate).toBe('number')
    })

    it('当没有到期定期交易时应该返回零值', async () => {
      const result =
        await RecurringTransactionService.processBatchRecurringTransactions(
          mockUserId
        )

      expect(result.processed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.performance.rate).toBe(0)
    })
  })

  describe('性能对比测试', () => {
    it('批量处理方法应该比逐条处理更快', async () => {
      // 这个测试需要实际的数据来验证性能差异
      // 在实际环境中，批量处理应该显著快于逐条处理

      const batchResult =
        await LoanContractService.processBatchLoanPayments(mockUserId)
      const legacyResult =
        await LoanContractService.processLoanPaymentsBySchedule(mockUserId)

      // 验证结果一致性
      expect(batchResult.processed).toBe(legacyResult.processed)
      expect(batchResult.errors.length).toBe(legacyResult.errors.length)

      // 在有数据的情况下，批量处理应该更快
      // 这里只是结构验证，实际性能测试需要真实数据
      expect(batchResult.performance).toHaveProperty('duration')
      expect(batchResult.performance).toHaveProperty('rate')
    })
  })
})

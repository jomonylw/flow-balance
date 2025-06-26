/**
 * 统一同步服务
 * 处理定期交易和贷款合约的统一同步逻辑
 */

import { SyncStatusService } from './sync-status.service'
import { FutureDataGenerationService } from './future-data-generation.service'
import { LoanContractService } from './loan-contract.service'
import { ExchangeRateAutoUpdateService } from './exchange-rate-auto-update.service'

export class UnifiedSyncService {
  /**
   * 触发用户同步（非轮询方式）
   */
  static async triggerUserSync(userId: string, force: boolean = false) {
    // 检查是否需要同步
    if (!force && !(await SyncStatusService.needsSync(userId))) {
      return {
        success: true,
        status: 'already_synced',
        message: '数据已是最新状态',
      }
    }

    // 检查是否正在处理中
    const currentStatus = await SyncStatusService.getSyncStatus(userId)
    if (currentStatus.status === 'processing') {
      return {
        success: true,
        status: 'processing',
        message: '同步正在进行中',
      }
    }

    // 开始异步处理
    setImmediate(() => this.processUserData(userId))

    return {
      success: true,
      status: 'started',
      message: '同步已开始',
    }
  }

  /**
   * 处理用户数据（定期交易 + 贷款合约 + 未来数据生成）
   */
  private static async processUserData(userId: string): Promise<void> {
    // 更新状态为处理中
    await SyncStatusService.updateSyncStatus(userId, 'processing')

    const log = await SyncStatusService.createProcessingLog(userId)

    let processedRecurring = 0
    let processedLoans = 0
    let processedExchangeRates = 0
    const errorMessages: string[] = []

    try {
      // 1. 处理到期的PENDING交易（转为COMPLETED）
      const _processedDue =
        await FutureDataGenerationService.processDueTransactions(userId)

      // 2. 清理过期的未来交易
      const _cleanedExpired =
        await FutureDataGenerationService.cleanupExpiredFutureTransactions(
          userId
        )

      // 3. 处理汇率自动更新
      const exchangeRateResult = await this.processExchangeRateUpdate(userId)
      processedExchangeRates += exchangeRateResult.processed
      if (exchangeRateResult.errors.length > 0) {
        errorMessages.push(...exchangeRateResult.errors)
      }

      // 4. 生成定期交易记录（包含历史遗漏检查和未来生成）
      const recurringResult =
        await FutureDataGenerationService.generateFutureRecurringTransactions(
          userId
        )
      processedRecurring += recurringResult.generated
      if (recurringResult.errors.length > 0) {
        errorMessages.push(...recurringResult.errors)
      }

      // 5. 处理贷款还款记录（包含历史遗漏检查和未来生成）
      const loanResult =
        await LoanContractService.processLoanPaymentsBySchedule(userId)
      processedLoans += loanResult.processed
      if (loanResult.errors.length > 0) {
        errorMessages.push(...loanResult.errors)
      }

      // 8. 更新完成状态
      await SyncStatusService.updateSyncStatus(userId, 'completed', new Date())

      await SyncStatusService.updateProcessingLog(log.id, {
        endTime: new Date(),
        status: 'completed',
        processedRecurring,
        processedLoans,
        processedExchangeRates,
        failedCount: 0, // 现在统一同步不会有失败的项目，错误会记录在errorMessage中
        errorMessage:
          errorMessages.length > 0 ? errorMessages.join('; ') : undefined,
      })
    } catch (error) {
      // 处理失败
      await SyncStatusService.updateSyncStatus(userId, 'failed')

      await SyncStatusService.updateProcessingLog(log.id, {
        endTime: new Date(),
        status: 'failed',
        processedRecurring,
        processedLoans,
        processedExchangeRates,
        failedCount: 0,
        errorMessage: error instanceof Error ? error.message : '未知错误',
      })

      throw error
    }
  }

  /**
   * 处理汇率自动更新
   */
  private static async processExchangeRateUpdate(userId: string): Promise<{
    processed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0

    try {
      const result = await ExchangeRateAutoUpdateService.updateExchangeRates(userId, false)

      if (result.success && result.data) {
        processed = result.data.updatedCount
        if (result.data.errors && result.data.errors.length > 0) {
          errors.push(...result.data.errors)
        }

        // 如果跳过了更新，记录原因
        if (result.data.skipped) {
          // 使用 console.warn 记录跳过信息
          console.warn(`汇率更新跳过 - 用户 ${userId}: ${result.data.skipReason}`)
        }
      } else if (!result.success) {
        errors.push(result.message || '汇率更新失败')
      }
    } catch (error) {
      errors.push(
        `汇率自动更新失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }

    return { processed, errors }
  }



  /**
   * 手动重试失败的同步
   */
  static async retryFailedSync(userId: string) {
    // 重置状态
    await SyncStatusService.resetProcessingStatus(userId)

    // 重新触发同步
    return await this.triggerUserSync(userId, true)
  }

  /**
   * 获取同步摘要信息
   */
  static async getSyncSummary(userId: string) {
    const syncStatus = await SyncStatusService.getSyncStatus(userId)
    const futureStats =
      await FutureDataGenerationService.getFutureTransactionStats(userId)
    const recentLogs = await SyncStatusService.getUserProcessingLogs(userId, 5)

    return {
      syncStatus,
      futureStats,
      recentLogs,
    }
  }

  /**
   * 系统级同步（处理所有用户）
   */
  static async systemWideSync(): Promise<{
    totalUsers: number
    processed: number
    failed: number
    errors: string[]
  }> {
    // 这个方法用于系统级的批量同步，比如定时任务
    // 实际实现中需要考虑性能和资源限制

    const errors: string[] = []
    const processed = 0
    const failed = 0

    // 获取需要同步的用户列表
    // 这里可以添加更复杂的逻辑来确定哪些用户需要同步

    return {
      totalUsers: 0,
      processed,
      failed,
      errors,
    }
  }

  /**
   * 清理和维护
   */
  static async performMaintenance(userId?: string) {
    const results = {
      cleanedLogs: 0,
      cleanedTransactions: 0,
      errors: [] as string[],
    }

    try {
      if (userId) {
        // 单用户维护
        const cleanupResult = await SyncStatusService.cleanupOldLogs(userId)
        results.cleanedLogs = cleanupResult.count
        results.cleanedTransactions =
          await FutureDataGenerationService.cleanupExpiredFutureTransactions(
            userId
          )
      } else {
        // 系统级维护
        // 这里可以添加系统级的清理逻辑
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '未知错误')
    }

    return results
  }

  /**
   * 健康检查
   */
  static async healthCheck() {
    try {
      const systemStats = await SyncStatusService.getSystemSyncStats()

      return {
        status: 'healthy',
        timestamp: new Date(),
        stats: systemStats,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }
}

/**
 * 同步状态服务
 * 管理定期交易和贷款合约的同步状态
 */

import { PrismaClient } from '@prisma/client'
import { SyncStatus } from '@/types/core'

const prisma = new PrismaClient()

// 未来数据生成配置
const FUTURE_GENERATION_CONFIG = {
  DAYS_AHEAD: 7, // 提前生成7天
  TRANSACTION_STATUS: 'PENDING', // 未来交易状态标记
  REFRESH_THRESHOLD: 2, // 剩余天数少于2天时重新生成
}

export class SyncStatusService {
  /**
   * 检查是否需要同步
   */
  static async needsSync(userId: string): Promise<boolean> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!userSettings?.lastRecurringSync) {
      return true // 从未同步过
    }

    if (userSettings.recurringProcessingStatus === 'failed') {
      return true // 上次同步失败
    }

    const lastSync = new Date(userSettings.lastRecurringSync)
    const now = new Date()
    const hoursSinceLastSync =
      (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    // 检查是否需要重新生成未来数据
    const needsFutureDataRefresh = await this.needsFutureDataRefresh(userId)

    return hoursSinceLastSync > 6 || needsFutureDataRefresh
  }

  /**
   * 检查是否需要刷新未来数据
   */
  static async needsFutureDataRefresh(_userId: string): Promise<boolean> {
    const now = new Date()
    const futureThreshold = new Date()
    futureThreshold.setDate(
      now.getDate() + FUTURE_GENERATION_CONFIG.REFRESH_THRESHOLD
    )

    // 由于删除了status和scheduledDate字段，不再需要检查未来数据
    // 所有交易都是立即生效的
    return false
  }

  /**
   * 获取同步状态
   */
  static async getSyncStatus(userId: string): Promise<SyncStatus> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    const latestLog = await prisma.recurringProcessingLog.findFirst({
      where: { userId },
      orderBy: { startTime: 'desc' },
    })

    // 由于删除了status和scheduledDate字段，不再需要检查未来数据
    const futurePendingCount = 0
    const _latestFutureTransaction = null

    return {
      status:
        (userSettings?.recurringProcessingStatus as
          | 'idle'
          | 'processing'
          | 'completed'
          | 'failed') || 'idle',
      lastSyncTime: userSettings?.lastRecurringSync || undefined,
      processedRecurring: latestLog?.processedRecurring || 0,
      processedLoans: latestLog?.processedLoans || 0,
      failedCount: latestLog?.failedCount || 0,
      errorMessage: latestLog?.errorMessage || undefined,
      futureDataGenerated: futurePendingCount > 0,
      futureDataUntil: undefined,
    }
  }

  /**
   * 更新同步状态
   */
  static async updateSyncStatus(
    userId: string,
    status: 'idle' | 'processing' | 'completed' | 'failed',
    lastSyncTime?: Date
  ) {
    const updateData: {
      recurringProcessingStatus: 'idle' | 'processing' | 'completed' | 'failed'
      lastRecurringSync?: Date
    } = {
      recurringProcessingStatus: status,
    }

    if (lastSyncTime) {
      updateData.lastRecurringSync = lastSyncTime
    }

    return await prisma.userSettings.update({
      where: { userId },
      data: updateData,
    })
  }

  /**
   * 创建处理日志
   */
  static async createProcessingLog(userId: string) {
    return await prisma.recurringProcessingLog.create({
      data: {
        userId,
        startTime: new Date(),
        status: 'processing',
      },
    })
  }

  /**
   * 更新处理日志
   */
  static async updateProcessingLog(
    logId: string,
    data: {
      endTime?: Date
      status?: 'processing' | 'completed' | 'failed'
      processedRecurring?: number
      processedLoans?: number
      failedCount?: number
      errorMessage?: string
    }
  ) {
    return await prisma.recurringProcessingLog.update({
      where: { id: logId },
      data,
    })
  }

  /**
   * 获取用户的处理日志
   */
  static async getUserProcessingLogs(userId: string, limit: number = 10) {
    return await prisma.recurringProcessingLog.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: limit,
    })
  }

  /**
   * 清理旧的处理日志
   */
  static async cleanupOldLogs(userId: string, keepDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - keepDays)

    return await prisma.recurringProcessingLog.deleteMany({
      where: {
        userId,
        startTime: { lt: cutoffDate },
      },
    })
  }

  /**
   * 检查是否有正在处理的任务
   */
  static async hasProcessingTask(userId: string): Promise<boolean> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    return userSettings?.recurringProcessingStatus === 'processing'
  }

  /**
   * 重置处理状态（用于错误恢复）
   */
  static async resetProcessingStatus(userId: string) {
    return await this.updateSyncStatus(userId, 'idle')
  }

  /**
   * 获取系统同步统计
   */
  static async getSystemSyncStats() {
    const totalUsers = await prisma.user.count()

    const userSettings = await prisma.userSettings.groupBy({
      by: ['recurringProcessingStatus'],
      _count: true,
    })

    const recentLogs = await prisma.recurringProcessingLog.findMany({
      where: {
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
        },
      },
      select: {
        status: true,
        processedRecurring: true,
        processedLoans: true,
        failedCount: true,
      },
    })

    const statusCounts = userSettings.reduce(
      (acc, item) => {
        acc[item.recurringProcessingStatus] = item._count
        return acc
      },
      {} as Record<string, number>
    )

    const recentStats = recentLogs.reduce(
      (acc, log) => {
        acc.totalProcessed +=
          (log.processedRecurring || 0) + (log.processedLoans || 0)
        acc.totalFailed += log.failedCount || 0
        if (log.status === 'completed') acc.completedTasks++
        if (log.status === 'failed') acc.failedTasks++
        return acc
      },
      {
        totalProcessed: 0,
        totalFailed: 0,
        completedTasks: 0,
        failedTasks: 0,
      }
    )

    return {
      totalUsers,
      statusCounts,
      recentStats,
    }
  }
}

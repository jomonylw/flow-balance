/**
 * 未来数据生成服务
 * 负责生成未来7天的定期交易和贷款还款数据
 */

import { RecurringTransactionService } from './recurring-transaction.service'
import { DuplicateCheckService, CheckType } from './duplicate-check.service'
import { prisma } from '@/lib/database/connection-manager'

// import { getUserTranslator } from '@/lib/utils/server-i18n'
// Using shared prisma instance from connection-manager

// 未来数据生成配置
const FUTURE_GENERATION_CONFIG = {
  DEFAULT_DAYS_AHEAD: 7, // 默认提前生成7天
  TRANSACTION_STATUS: 'PENDING', // 未来交易状态标记
  REFRESH_THRESHOLD: 2, // 剩余天数少于2天时重新生成
  DISABLED_DAYS: 0, // 0天表示不生成未来记录
}

export class FutureDataGenerationService {
  /**
   * 生成未来指定天数的定期交易数据
   */
  static async generateFutureRecurringTransactions(userId: string): Promise<{
    generated: number
    errors: string[]
  }> {
    // 获取用户设置中的天数配置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })
    const daysAhead =
      userSettings?.futureDataDays ||
      FUTURE_GENERATION_CONFIG.DEFAULT_DAYS_AHEAD

    const now = new Date()
    let futureEndDate: Date

    if (daysAhead === 0) {
      // 设置为0天：只生成截止到当天的记录（不比较时间，仅比较日期）
      futureEndDate = new Date(now)
      futureEndDate.setUTCHours(23, 59, 59, 999) // 设置为当天的最后一刻（UTC时间）
    } else {
      // 计算未来结束日期：从明天开始计算指定天数
      // 例如：设置1天 = 生成明天的记录，设置7天 = 生成未来7天的记录
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setUTCHours(23, 59, 59, 999) // 设置为明天的最后一刻（UTC时间）

      futureEndDate = new Date(tomorrow)
      futureEndDate.setDate(futureEndDate.getDate() + daysAhead - 1)
    }

    let generated = 0
    const errors: string[] = []

    // 获取所有活跃的定期交易
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
      },
    })

    for (const recurring of recurringTransactions) {
      try {
        // 转换数据结构以匹配函数期望的类型
        const recurringData = {
          ...recurring,
          currencyCode: recurring.currency.code,
          amount: Number(recurring.amount), // 转换 Decimal 为 number
          tagIds: Array.isArray(recurring.tagIds)
            ? recurring.tagIds.filter(
                (id): id is string => typeof id === 'string'
              )
            : undefined, // 转换 JsonValue 为 string[]
          maxOccurrences: recurring.maxOccurrences ?? undefined, // 转换 null 为 undefined
          notes: recurring.notes ?? undefined, // 转换 null 为 undefined
        }

        // 统一生成历史遗漏和未来的记录
        const generatedCount = await this.generateRecurringTransactionsInRange(
          recurringData,
          recurringData.startDate, // 从开始日期检查历史记录
          futureEndDate // 到未来结束日期
        )
        generated += generatedCount
      } catch (error) {
        errors.push(
          `定期交易 ${recurring.id} 生成失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
      }
    }

    return { generated, errors }
  }

  /**
   * 在指定日期范围内生成定期交易记录（包含历史遗漏和未来记录）
   */
  private static async generateRecurringTransactionsInRange(
    recurring: {
      id: string
      userId: string
      accountId: string
      currencyId: string
      currencyCode: string
      type: string
      amount: number
      description: string
      frequency: string
      interval: number
      dayOfMonth?: number | null
      dayOfWeek?: number | null
      monthOfYear?: number | null
      startDate: Date
      endDate?: Date | null
      isActive: boolean
      tagIds?: string[]
      nextDate?: Date
      maxOccurrences?: number
      currentCount?: number
      notes?: string
    },
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let generated = 0

    // 从定期交易的开始日期开始检查，确保时间部分为0（UTC时间）
    let currentDate = new Date(recurring.startDate)
    currentDate.setUTCHours(0, 0, 0, 0)

    // 使用统一的重复检查服务
    const duplicateCheckResult = await DuplicateCheckService.checkDuplicates({
      type: CheckType.RECURRING_TRANSACTION,
      userId: recurring.userId,
      recurringTransactionId: recurring.id,
      dateRange: {
        startDate: currentDate,
        endDate: endDate,
      },
    })

    const existingDatesSet = duplicateCheckResult.existingDates

    const missingTransactions: Array<{
      userId: string
      accountId: string
      currencyId: string
      type: 'INCOME' | 'EXPENSE'
      amount: number
      description: string
      notes: string
      date: Date
      recurringTransactionId: string
    }> = []

    // 标准化结束日期
    const { normalizedEndDate } = DuplicateCheckService.normalizeDateRange(
      endDate,
      endDate
    )

    while (currentDate <= normalizedEndDate) {
      // 检查结束条件
      if (recurring.endDate && currentDate > recurring.endDate) {
        break
      }

      if (
        recurring.maxOccurrences &&
        (recurring.currentCount || 0) + generated >= recurring.maxOccurrences
      ) {
        break
      }

      // 检查该日期是否已存在交易记录
      if (!DuplicateCheckService.isDateExists(currentDate, existingDatesSet)) {
        // 创建交易记录时，确保日期时间为当天的开始时间（UTC时间）
        // 使用与单笔创建交易相同的日期处理方式
        const transactionDate = new Date(currentDate)
        transactionDate.setUTCHours(0, 0, 0, 0)

        missingTransactions.push({
          userId: recurring.userId,
          accountId: recurring.accountId,
          currencyId: recurring.currencyId,
          type: recurring.type as 'INCOME' | 'EXPENSE',
          amount: recurring.amount,
          description: recurring.description,
          notes: recurring.notes || '',
          date: transactionDate,
          recurringTransactionId: recurring.id,
        })
        generated++
      }

      // 计算下次日期
      currentDate = RecurringTransactionService.calculateNextDate(currentDate, {
        frequency: recurring.frequency,
        interval: recurring.interval,
        dayOfMonth: recurring.dayOfMonth,
        dayOfWeek: recurring.dayOfWeek,
        monthOfYear: recurring.monthOfYear,
      })
    }

    // 批量创建遗漏的交易记录
    if (missingTransactions.length > 0) {
      // 使用数据库事务确保原子性，防止并发问题
      await prisma.$transaction(async tx => {
        // 在事务内进行并发检查
        const concurrencyCheck = await DuplicateCheckService.checkConcurrency(
          tx,
          {
            type: CheckType.RECURRING_TRANSACTION,
            userId: recurring.userId,
            recurringTransactionId: recurring.id,
            dateRange: {
              startDate: currentDate,
              endDate: endDate,
            },
          },
          missingTransactions.map(t => t.date)
        )

        if (!concurrencyCheck.isValid) {
          throw new Error(concurrencyCheck.reason || '并发检查失败')
        }

        // 使用统一服务过滤已存在的交易
        const finalTransactionsToCreate =
          DuplicateCheckService.filterExistingDates(
            missingTransactions,
            existingDatesSet
          )

        if (finalTransactionsToCreate.length > 0) {
          await tx.transaction.createMany({
            data: finalTransactionsToCreate,
          })

          // 为新创建的交易添加标签
          if (recurring.tagIds && recurring.tagIds.length > 0) {
            const createdTransactions = await tx.transaction.findMany({
              where: {
                recurringTransactionId: recurring.id,
                date: {
                  in: finalTransactionsToCreate.map(t => t.date),
                },
              },
              select: {
                id: true,
              },
            })

            // 检查已存在的标签关联，避免重复
            const existingTagAssociations = await tx.transactionTag.findMany({
              where: {
                transactionId: {
                  in: createdTransactions.map(t => t.id),
                },
                tagId: {
                  in: recurring.tagIds,
                },
              },
              select: {
                transactionId: true,
                tagId: true,
              },
            })

            const existingAssociationsSet = new Set(
              existingTagAssociations.map(a => `${a.transactionId}-${a.tagId}`)
            )

            const newTransactionTags = []
            for (const transaction of createdTransactions) {
              for (const tagId of recurring.tagIds) {
                const associationKey = `${transaction.id}-${tagId}`
                if (!existingAssociationsSet.has(associationKey)) {
                  newTransactionTags.push({
                    transactionId: transaction.id,
                    tagId: tagId,
                  })
                }
              }
            }

            if (newTransactionTags.length > 0) {
              await tx.transactionTag.createMany({
                data: newTransactionTags,
              })
            }
          }
        }
      })
    }

    return generated
  }

  /**
   * 清理过期的未来交易数据
   */
  static async cleanupExpiredFutureTransactions(
    _userId: string
  ): Promise<number> {
    // 由于删除了status和scheduledDate字段，这个方法现在不需要做任何事情
    // 所有交易都是立即生效的
    return 0
  }

  /**
   * 将到期的PENDING交易转换为COMPLETED
   */
  static async processDueTransactions(_userId: string): Promise<number> {
    // 由于删除了status和scheduledDate字段，这个方法现在不需要做任何事情
    // 所有交易都是立即生效的
    return 0
  }

  /**
   * 获取未来交易统计
   */
  static async getFutureTransactionStats(userId: string) {
    // 获取用户设置中的天数配置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })
    const daysAhead =
      userSettings?.futureDataDays ||
      FUTURE_GENERATION_CONFIG.DEFAULT_DAYS_AHEAD

    const now = new Date()
    // 注意：这里只是用于统计，实际生成逻辑在其他方法中
    const _futureEndDate = new Date(now)
    _futureEndDate.setDate(_futureEndDate.getDate() + daysAhead)

    // 由于删除了status和scheduledDate字段，统计逻辑需要调整
    const recurringTransactions = await prisma.recurringTransaction.count({
      where: {
        userId,
        isActive: true,
      },
    })

    const loanTransactions = await prisma.loanContract.count({
      where: {
        userId,
        isActive: true,
      },
    })

    return {
      totalPending: 0, // 由于删除了status字段，没有pending交易
      recurringCount: recurringTransactions,
      loanCount: loanTransactions,
      latestDate: undefined, // 由于删除了scheduledDate字段，没有未来日期
      daysAhead,
    }
  }

  /**
   * 强制重新生成未来数据
   */
  static async forceRegenerateFutureData(userId: string): Promise<{
    cleaned: number
    generated: number
    errors: string[]
  }> {
    // 清理现有的未来数据
    const cleaned = await this.cleanupAllFutureTransactions(userId)

    // 重新生成定期交易数据
    const recurringResult =
      await this.generateFutureRecurringTransactions(userId)

    // 重新生成贷款还款数据（使用批量处理方法）
    const { LoanContractService } = await import('./loan-contract.service')
    const loanResult =
      await LoanContractService.processBatchLoanPayments(userId)

    return {
      cleaned,
      generated: recurringResult.generated + loanResult.processed,
      errors: [...recurringResult.errors, ...loanResult.errors],
    }
  }

  /**
   * 清理所有未来交易数据
   */
  private static async cleanupAllFutureTransactions(
    _userId: string
  ): Promise<number> {
    // 由于删除了status和scheduledDate字段，不再需要清理未来交易
    // 所有交易都是立即生效的
    return 0
  }
}

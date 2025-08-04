/**
 * 定期交易服务
 * 处理定期交易的创建、更新、执行等操作
 */

import { prisma } from '@/lib/database/connection-manager'
import {
  /* RecurrenceFrequency, */ RecurringTransactionFormData,
} from '@/types/core'
// import { BUSINESS_LIMITS } from '@/lib/constants/app-config'

// Using shared prisma instance from connection-manager

export class RecurringTransactionService {
  /**
   * 创建定期交易
   */
  static async createRecurringTransaction(
    userId: string,
    data: RecurringTransactionFormData
  ) {
    // 获取货币ID
    const currency = await prisma.currency.findFirst({
      where: {
        code: data.currencyCode,
        OR: [{ createdBy: userId }, { createdBy: null }],
      },
    })

    if (!currency) {
      throw new Error('指定的货币不存在')
    }

    const nextDate = new Date(data.startDate)

    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: data.accountId,
        currencyId: currency.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        notes: data.notes,
        tagIds: data.tagIds || [],
        frequency: data.frequency,
        interval: data.interval,
        dayOfMonth: data.dayOfMonth,
        dayOfWeek: data.dayOfWeek,
        monthOfYear: data.monthOfYear,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextDate,
        isActive: data.isActive,
        maxOccurrences: data.maxOccurrences,
        currentCount: 0,
      },
    })

    return recurringTransaction
  }

  /**
   * 更新定期交易
   */
  static async updateRecurringTransaction(
    id: string,
    userId: string,
    data: Partial<RecurringTransactionFormData>
  ) {
    // 如果更新了时间相关字段，重新计算下次执行日期
    let nextDate: Date | undefined
    if (
      data.frequency ||
      data.interval ||
      data.dayOfMonth ||
      data.dayOfWeek ||
      data.monthOfYear
    ) {
      const existing = await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      })

      if (existing) {
        nextDate = this.calculateNextDate(new Date(), {
          frequency: data.frequency || existing.frequency,
          interval: data.interval || existing.interval,
          dayOfMonth: data.dayOfMonth || existing.dayOfMonth,
          dayOfWeek: data.dayOfWeek || existing.dayOfWeek,
          monthOfYear: data.monthOfYear || existing.monthOfYear,
          startDate: existing.startDate,
        })
      }
    }

    // 处理货币更新
    let currencyId: string | undefined
    if (data.currencyCode) {
      const currency = await prisma.currency.findFirst({
        where: {
          code: data.currencyCode,
          OR: [{ createdBy: userId }, { createdBy: null }],
        },
      })

      if (!currency) {
        throw new Error('指定的货币不存在')
      }
      currencyId = currency.id
    }

    // 构建更新数据，排除不能直接更新的字段
    const updateData: Record<string, unknown> = {}

    // 复制允许直接更新的字段
    const allowedFields = [
      'type',
      'amount',
      'description',
      'notes',
      'frequency',
      'interval',
      'dayOfMonth',
      'dayOfWeek',
      'monthOfYear',
      'isActive',
      'maxOccurrences',
    ]

    allowedFields.forEach(field => {
      if (data[field as keyof RecurringTransactionFormData] !== undefined) {
        updateData[field] = data[field as keyof RecurringTransactionFormData]
      }
    })

    // 处理特殊字段
    if (data.accountId !== undefined) {
      updateData.accountId = data.accountId
    }

    if (currencyId !== undefined) {
      updateData.currencyId = currencyId
    }

    // 处理日期字段转换
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }

    if (nextDate) {
      updateData.nextDate = nextDate
    }

    // 处理tagIds更新
    if (data.tagIds !== undefined) {
      updateData.tagIds = data.tagIds
    }

    const recurringTransaction = await prisma.recurringTransaction.update({
      where: { id, userId },
      data: updateData,
    })

    return recurringTransaction
  }

  /**
   * 删除定期交易
   */
  static async deleteRecurringTransaction(id: string, userId: string) {
    return await prisma.recurringTransaction.delete({
      where: { id, userId },
    })
  }

  /**
   * 获取用户的定期交易列表
   */
  static async getUserRecurringTransactions(userId: string) {
    return await prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
      },
      orderBy: { nextDate: 'asc' },
    })
  }

  /**
   * 获取账户的定期交易
   */
  static async getAccountRecurringTransactions(
    userId: string,
    accountId: string
  ) {
    return await prisma.recurringTransaction.findMany({
      where: { userId, accountId },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
      },
      orderBy: { nextDate: 'asc' },
    })
  }

  /**
   * 执行定期交易（生成实际交易记录）
   */
  static async executeRecurringTransaction(
    recurringTransactionId: string
  ): Promise<boolean> {
    const recurringTransaction = await prisma.recurringTransaction.findUnique({
      where: { id: recurringTransactionId },
    })

    if (!recurringTransaction || !recurringTransaction.isActive) {
      return false
    }

    const now = new Date()

    // 检查是否到了执行时间
    if (recurringTransaction.nextDate > now) {
      return false
    }

    // 检查是否已达到最大执行次数
    if (
      recurringTransaction.maxOccurrences &&
      recurringTransaction.currentCount >= recurringTransaction.maxOccurrences
    ) {
      return false
    }

    // 检查是否已过结束日期
    if (recurringTransaction.endDate && now > recurringTransaction.endDate) {
      return false
    }

    try {
      await prisma.$transaction(async tx => {
        // 幂等性检查：检查该定期交易在该日期是否已有交易记录
        const existingTransaction = await tx.transaction.findFirst({
          where: {
            recurringTransactionId: recurringTransaction.id,
            date: recurringTransaction.nextDate,
          },
        })

        if (existingTransaction) {
          // 交易已存在，只更新定期交易状态，不创建新交易
          const nextDate = this.calculateNextDate(
            recurringTransaction.nextDate,
            recurringTransaction
          )

          await tx.recurringTransaction.update({
            where: { id: recurringTransactionId },
            data: {
              currentCount: recurringTransaction.currentCount + 1,
              nextDate,
            },
          })

          return // 直接返回，不创建新交易
        }

        // 获取账户信息来确定分类
        const account = await tx.account.findUnique({
          where: { id: recurringTransaction.accountId },
          include: { category: true },
        })

        if (!account) {
          throw new Error('账户不存在')
        }

        // 验证交易类型与账户类型匹配
        const accountType = account.category.type
        if (
          (recurringTransaction.type === 'INCOME' &&
            accountType !== 'INCOME') ||
          (recurringTransaction.type === 'EXPENSE' && accountType !== 'EXPENSE')
        ) {
          throw new Error(
            `定期交易类型(${recurringTransaction.type})与账户类型(${accountType})不匹配`
          )
        }

        // 警告：存量类账户不适合定期交易
        if (accountType === 'ASSET' || accountType === 'LIABILITY') {
        }

        // 创建交易记录
        const transaction = await tx.transaction.create({
          data: {
            userId: recurringTransaction.userId,
            accountId: recurringTransaction.accountId,
            currencyId: recurringTransaction.currencyId,
            type: recurringTransaction.type,
            amount: recurringTransaction.amount,
            description: recurringTransaction.description,
            notes: recurringTransaction.notes,
            date: recurringTransaction.nextDate,
            recurringTransactionId: recurringTransaction.id,
          },
        })

        // 添加标签关联
        if (
          recurringTransaction.tagIds &&
          Array.isArray(recurringTransaction.tagIds) &&
          recurringTransaction.tagIds.length > 0
        ) {
          await tx.transactionTag.createMany({
            data: (recurringTransaction.tagIds as string[]).map(
              (tagId: string) => ({
                transactionId: transaction.id,
                tagId,
              })
            ),
          })
        }

        // 计算下次执行日期
        const nextDate = this.calculateNextDate(
          recurringTransaction.nextDate,
          recurringTransaction
        )

        // 更新定期交易状态
        await tx.recurringTransaction.update({
          where: { id: recurringTransactionId },
          data: {
            currentCount: recurringTransaction.currentCount + 1,
            nextDate,
          },
        })
      })

      return true
    } catch {
      return false
    }
  }

  /**
   * 计算下次执行日期
   */
  static calculateNextDate(
    currentDate: Date,
    config: {
      frequency: string
      interval: number
      startDate: Date
      dayOfMonth?: number | null
      dayOfWeek?: number | null
      monthOfYear?: number | null
    }
  ): Date {
    const nextDate = new Date(currentDate)

    // 优先使用配置中的dayOfMonth。如果不存在，则回退到使用`startDate`的天数。
    // 这是确保“月末”逻辑一致性的关键。
    const targetDayOfMonth =
      config.dayOfMonth || new Date(config.startDate).getDate()

    switch (config.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + config.interval)
        break

      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + config.interval * 7)
        if (config.dayOfWeek !== null && config.dayOfWeek !== undefined) {
          const currentDay = nextDate.getDay()
          const targetDay = config.dayOfWeek
          const daysToAdd = (targetDay - currentDay + 7) % 7
          nextDate.setDate(nextDate.getDate() + daysToAdd)
        }
        break

      case 'MONTHLY':
      case 'QUARTERLY':
      case 'YEARLY':
        // 1. 先将日期重置为1号，避免溢出
        nextDate.setDate(1)

        // 2. 增加月份/年份
        if (config.frequency === 'MONTHLY') {
          nextDate.setMonth(nextDate.getMonth() + config.interval)
        } else if (config.frequency === 'QUARTERLY') {
          nextDate.setMonth(nextDate.getMonth() + config.interval * 3)
        } else if (config.frequency === 'YEARLY') {
          nextDate.setFullYear(nextDate.getFullYear() + config.interval)
          if (config.monthOfYear !== null && config.monthOfYear !== undefined) {
            nextDate.setMonth(config.monthOfYear - 1) // 月份从0开始
          }
        }

        // 3. 设置最终日期
        const daysInMonth = this.getDaysInMonth(nextDate)
        nextDate.setDate(Math.min(targetDayOfMonth, daysInMonth))
        break

      default:
        throw new Error(`不支持的频率类型: ${config.frequency}`)
    }

    return nextDate
  }

  /**
   * 获取指定月份的天数
   */
  private static getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  /**
   * 获取到期的定期交易
   */
  static async getDueRecurringTransactions(userId?: string) {
    const now = new Date()

    const where: {
      isActive: boolean
      nextDate: { lte: Date }
      userId?: string
    } = {
      isActive: true,
      nextDate: { lte: now },
    }

    if (userId) {
      where.userId = userId
    }

    return await prisma.recurringTransaction.findMany({
      where,
    })
  }

  /**
   * 批量处理到期的定期交易（优化版本）
   * 使用单个数据库事务处理所有到期的定期交易，显著提升性能
   */
  static async processBatchRecurringTransactions(userId?: string): Promise<{
    processed: number
    errors: string[]
    performance: {
      duration: number
      rate: number
      metrics: {
        queryTime: number
        transactionTime: number
        transactionsCreated: number
        recurringUpdated: number
        skippedDueToLimits: number
        skippedDueToExisting: number
        idempotencyChecked: number
      }
    }
  }> {
    const startTime = Date.now()
    const now = new Date()

    const where: {
      isActive: boolean
      nextDate: { lte: Date }
      userId?: string
    } = {
      isActive: true,
      nextDate: { lte: now },
    }

    if (userId) {
      where.userId = userId
    }

    // 一次性获取所有到期的定期交易记录
    const dueRecurringTransactions = await prisma.recurringTransaction.findMany(
      {
        where,
        select: {
          id: true,
          userId: true,
          nextDate: true,
          frequency: true,
          interval: true,
          dayOfMonth: true,
          dayOfWeek: true,
          monthOfYear: true,
          startDate: true,
          // Select other fields needed for processing
          maxOccurrences: true,
          currentCount: true,
          endDate: true,
          accountId: true,
          currencyId: true,
          type: true,
          amount: true,
          description: true,
          notes: true,
          tagIds: true,
        },
        orderBy: [{ userId: 'asc' }, { nextDate: 'asc' }],
      }
    )

    if (dueRecurringTransactions.length === 0) {
      const duration = Date.now() - startTime
      return {
        processed: 0,
        errors: [],
        performance: {
          duration,
          rate: 0,
          metrics: {
            queryTime: 0,
            transactionTime: 0,
            transactionsCreated: 0,
            recurringUpdated: 0,
            skippedDueToLimits: 0,
            skippedDueToExisting: 0,
            idempotencyChecked: 0,
          },
        },
      }
    }

    let processed = 0
    const errors: string[] = []

    // 性能监控数据
    const performanceMetrics = {
      queryTime: 0,
      transactionTime: 0,
      transactionsCreated: 0,
      recurringUpdated: 0,
      skippedDueToLimits: 0,
      skippedDueToExisting: 0,
      idempotencyChecked: 0,
    }

    // 使用扩展事务处理所有定期交易
    try {
      const transactionStartTime = Date.now()

      await prisma.$transaction(
        async tx => {
          // 1. 幂等性检查：查询所有可能重复的交易记录

          const recurringTransactionIds = dueRecurringTransactions.map(
            rt => rt.id
          )
          const existingTransactions = await tx.transaction.findMany({
            where: {
              recurringTransactionId: { in: recurringTransactionIds },
              date: {
                in: dueRecurringTransactions.map(rt => rt.nextDate),
              },
            },
            select: {
              recurringTransactionId: true,
              date: true,
            },
          })

          // 创建快速查找的 Set 结构：recurringTransactionId-date
          const existingTransactionSet = new Set(
            existingTransactions.map(
              t => `${t.recurringTransactionId}-${t.date.toISOString()}`
            )
          )

          performanceMetrics.idempotencyChecked = existingTransactions.length

          // 准备批量创建的交易数据和定期交易更新数据
          const transactionsToCreate: Array<{
            userId: string
            accountId: string
            currencyId: string
            type: any
            amount: number
            description: string
            notes?: string
            date: Date
            recurringTransactionId: string
            tags?: {
              create: Array<{ tagId: string }>
            }
          }> = []

          const recurringUpdates: Array<{
            id: string
            currentCount: number
            nextDate: Date
            reason: 'created' | 'skipped_existing' | 'skipped_limit'
          }> = []

          // 为每个定期交易生成对应的实际交易记录
          for (const recurring of dueRecurringTransactions) {
            try {
              // 检查是否已达到最大执行次数
              if (
                recurring.maxOccurrences &&
                recurring.currentCount >= recurring.maxOccurrences
              ) {
                performanceMetrics.skippedDueToLimits++

                // 即使跳过，也要更新状态以避免重复检查
                const nextDate = this.calculateNextDate(
                  recurring.nextDate,
                  recurring
                )
                recurringUpdates.push({
                  id: recurring.id,
                  currentCount: recurring.currentCount,
                  nextDate,
                  reason: 'skipped_limit',
                })
                continue
              }

              // 检查是否已过结束日期
              if (recurring.endDate && now > recurring.endDate) {
                performanceMetrics.skippedDueToLimits++

                // 即使跳过，也要更新状态以避免重复检查
                const nextDate = this.calculateNextDate(
                  recurring.nextDate,
                  recurring
                )
                recurringUpdates.push({
                  id: recurring.id,
                  currentCount: recurring.currentCount,
                  nextDate,
                  reason: 'skipped_limit',
                })
                continue
              }

              // 2. 幂等性检查：检查该定期交易在该日期是否已有交易记录
              const transactionKey = `${recurring.id}-${recurring.nextDate.toISOString()}`
              const alreadyExists = existingTransactionSet.has(transactionKey)

              // 计算下次执行日期（无论是否创建交易都需要）
              const nextDate = this.calculateNextDate(
                recurring.nextDate,
                recurring
              )

              if (alreadyExists) {
                // 交易已存在，跳过创建，但仍需更新定期交易状态

                recurringUpdates.push({
                  id: recurring.id,
                  currentCount: recurring.currentCount + 1,
                  nextDate,
                  reason: 'skipped_existing',
                })

                performanceMetrics.skippedDueToExisting++
                continue
              }

              // 3. 创建新的交易记录
              const transactionData: any = {
                userId: recurring.userId,
                accountId: recurring.accountId,
                currencyId: recurring.currencyId,
                type: recurring.type,
                amount: Number(recurring.amount),
                description: recurring.description,
                notes: recurring.notes || undefined,
                date: recurring.nextDate,
                recurringTransactionId: recurring.id,
              }

              // 如果有标签，添加标签关系
              if (
                recurring.tagIds &&
                Array.isArray(recurring.tagIds) &&
                recurring.tagIds.length > 0
              ) {
                transactionData.tags = {
                  create: (recurring.tagIds as string[]).map(
                    (tagId: string) => ({
                      tagId,
                    })
                  ),
                }
              }

              transactionsToCreate.push(transactionData)

              // 准备定期交易更新数据
              recurringUpdates.push({
                id: recurring.id,
                currentCount: recurring.currentCount + 1,
                nextDate,
                reason: 'created',
              })

              processed++
            } catch (error) {
              const errorMsg = `Recurring transaction ${recurring.id} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              errors.push(errorMsg)
            }
          }

          // 批量创建所有交易记录
          if (transactionsToCreate.length > 0) {
            // 由于需要处理标签关系，我们需要逐个创建交易
            // 但仍在同一个事务中，比原来的逐条处理要快很多
            for (const transactionData of transactionsToCreate) {
              await tx.transaction.create({
                data: transactionData,
              })
              performanceMetrics.transactionsCreated++
            }
          }

          // 批量更新所有定期交易的状态
          for (const update of recurringUpdates) {
            await tx.recurringTransaction.update({
              where: { id: update.id },
              data: {
                currentCount: update.currentCount,
                nextDate: update.nextDate,
              },
            })
            performanceMetrics.recurringUpdated++
          }
        },
        {
          timeout: 5 * 60 * 1000, // 5分钟超时
          maxWait: 60 * 1000, // 最大等待1分钟
        }
      )

      performanceMetrics.transactionTime = Date.now() - transactionStartTime
    } catch (error) {
      const errorMsg = `Batch recurring transaction processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }

    const duration = Date.now() - startTime
    const rate = processed > 0 ? Math.round(processed / (duration / 1000)) : 0

    return {
      processed,
      errors,
      performance: {
        duration,
        rate,
        metrics: performanceMetrics,
      },
    }
  }
}

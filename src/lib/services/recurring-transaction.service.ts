/**
 * 定期交易服务
 * 处理定期交易的创建、更新、执行等操作
 */

import { PrismaClient } from '@prisma/client'
import {
  /* RecurrenceFrequency, */ RecurringTransactionFormData,
} from '@/types/core'

const prisma = new PrismaClient()

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

    const nextDate = this.calculateNextDate(new Date(data.startDate), {
      frequency: data.frequency,
      interval: data.interval,
      dayOfMonth: data.dayOfMonth,
      dayOfWeek: data.dayOfWeek,
      monthOfYear: data.monthOfYear,
    })

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
        })
      }
    }

    const updateData: Record<string, unknown> = { ...data }

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
      where: { id },
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
          console.warn(
            `定期交易 ${recurringTransaction.description} 使用了存量类账户，这可能不符合预期`
          )
        }

        // 创建交易记录
        const transaction = await tx.transaction.create({
          data: {
            userId: recurringTransaction.userId,
            accountId: recurringTransaction.accountId,
            categoryId: account.categoryId,
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
    } catch (error) {
      console.error('执行定期交易失败:', error)
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
      dayOfMonth?: number | null
      dayOfWeek?: number | null
      monthOfYear?: number | null
    }
  ): Date {
    const nextDate = new Date(currentDate)

    switch (config.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + config.interval)
        break

      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + config.interval * 7)
        if (config.dayOfWeek !== null && config.dayOfWeek !== undefined) {
          // 调整到指定的星期几
          const currentDay = nextDate.getDay()
          const targetDay = config.dayOfWeek
          const daysToAdd = (targetDay - currentDay + 7) % 7
          nextDate.setDate(nextDate.getDate() + daysToAdd)
        }
        break

      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + config.interval)
        if (config.dayOfMonth !== null && config.dayOfMonth !== undefined) {
          // 调整到指定的日期
          nextDate.setDate(
            Math.min(config.dayOfMonth, this.getDaysInMonth(nextDate))
          )
        }
        break

      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + config.interval * 3)
        if (config.dayOfMonth !== null && config.dayOfMonth !== undefined) {
          nextDate.setDate(
            Math.min(config.dayOfMonth, this.getDaysInMonth(nextDate))
          )
        }
        break

      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + config.interval)
        if (config.monthOfYear !== null && config.monthOfYear !== undefined) {
          nextDate.setMonth(config.monthOfYear - 1) // 月份从0开始
        }
        if (config.dayOfMonth !== null && config.dayOfMonth !== undefined) {
          nextDate.setDate(
            Math.min(config.dayOfMonth, this.getDaysInMonth(nextDate))
          )
        }
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
}

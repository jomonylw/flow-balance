/**
 * 定期交易验证增强器
 * 提供定期交易的配置验证、执行逻辑验证和数据完整性检查
 */

import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { TransactionType, AccountType } from '@/types/core/constants'
import type { ValidationResult } from '@/types/core'

const prisma = new PrismaClient()

// ============================================================================
// 定期交易验证 Schema
// ============================================================================

/** 定期交易创建验证 Schema */
export const RecurringTransactionCreateSchema = z.object({
  accountId: z.string().uuid('账户ID格式无效'),
  currencyCode: z.string().length(3, '货币代码必须为3位'),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  amount: z
    .number()
    .positive('金额必须大于0')
    .max(10000000, '金额超出合理范围'),
  description: z.string().min(1, '描述不能为空').max(200, '描述过长'),
  notes: z.string().max(500, '备注过长').optional(),
  tagIds: z.array(z.string().uuid()).optional(),

  // 重复设置
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  interval: z.number().int().min(1, '间隔至少为1').max(365, '间隔不能超过365'),
  dayOfMonth: z
    .number()
    .int()
    .min(1, '月中日期不能小于1')
    .max(31, '月中日期不能大于31')
    .optional(),
  dayOfWeek: z
    .number()
    .int()
    .min(0, '周中日期不能小于0')
    .max(6, '周中日期不能大于6')
    .optional(),
  monthOfYear: z
    .number()
    .int()
    .min(1, '年中月份不能小于1')
    .max(12, '年中月份不能大于12')
    .optional(),

  // 时间范围
  startDate: z.string().datetime('开始日期格式无效'),
  endDate: z.string().datetime('结束日期格式无效').optional(),
  maxOccurrences: z
    .number()
    .int()
    .positive('最大执行次数必须为正数')
    .optional(),
  isActive: z.boolean().default(true),
})

/** 定期交易更新验证 Schema */
export const RecurringTransactionUpdateSchema =
  RecurringTransactionCreateSchema.partial()

// ============================================================================
// 定期交易验证器类
// ============================================================================

export class RecurringTransactionValidator {
  /**
   * 验证定期交易创建数据
   */
  static async validateRecurringTransactionCreation(
    userId: string,
    data: unknown
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 1. Schema 验证
      const validatedData = RecurringTransactionCreateSchema.parse(data)

      // 2. 业务逻辑验证
      const businessValidation = await this.validateBusinessLogic(
        userId,
        validatedData
      )
      errors.push(...businessValidation.errors)
      warnings.push(...businessValidation.warnings)
      suggestions.push(...businessValidation.suggestions)

      // 3. 账户关联验证
      const accountValidation = await this.validateAccountAssociation(
        userId,
        validatedData.accountId,
        validatedData.type
      )
      errors.push(...accountValidation.errors)
      warnings.push(...accountValidation.warnings)

      // 4. 时间设置验证
      const timeValidation = this.validateTimeSettings(validatedData)
      errors.push(...timeValidation.errors)
      warnings.push(...timeValidation.warnings)
      suggestions.push(...timeValidation.suggestions)

      // 5. 重复设置验证
      const frequencyValidation = this.validateFrequencySettings(validatedData)
      errors.push(...frequencyValidation.errors)
      warnings.push(...frequencyValidation.warnings)
      suggestions.push(...frequencyValidation.suggestions)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score: this.calculateValidationScore(errors.length, warnings.length),
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodErrors = error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        )
        return {
          isValid: false,
          errors: zodErrors,
          warnings: [],
          suggestions: ['请检查定期交易数据格式是否正确'],
          score: 0,
        }
      }

      return {
        isValid: false,
        errors: ['验证定期交易数据时发生未知错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证定期交易业务逻辑
   */
  private static async validateBusinessLogic(
    userId: string,
    data: z.infer<typeof RecurringTransactionCreateSchema>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 验证金额合理性
    if (data.amount > 1000000) {
      warnings.push('定期交易金额较大，请确认是否正确')
    }
    if (data.amount < 1) {
      warnings.push('定期交易金额较小，请确认是否正确')
    }

    // 验证货币存在性
    const currency = await prisma.currency.findFirst({
      where: {
        code: data.currencyCode,
        OR: [{ createdBy: userId }, { createdBy: null }],
      },
    })

    if (!currency) {
      errors.push('指定的货币不存在')
    }

    // 验证标签存在性
    if (data.tagIds && data.tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: data.tagIds },
          userId,
        },
      })

      if (tags.length !== data.tagIds.length) {
        const missingCount = data.tagIds.length - tags.length
        warnings.push(`${missingCount}个标签不存在或无权访问`)
      }
    }

    // 验证描述唯一性（建议）
    const existingRecurring = await prisma.recurringTransaction.findFirst({
      where: {
        userId,
        description: data.description,
        isActive: true,
      },
    })

    if (existingRecurring) {
      warnings.push('已存在相同描述的活跃定期交易')
      suggestions.push('建议使用不同的描述以便区分')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证账户关联
   */
  private static async validateAccountAssociation(
    userId: string,
    accountId: string,
    transactionType: TransactionType
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings'>> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
        include: { category: true },
      })

      if (!account) {
        errors.push('指定的账户不存在')
        return { errors, warnings }
      }

      // 验证交易类型与账户类型的匹配
      const accountType = account.category.type
      if (
        (transactionType === TransactionType.INCOME &&
          accountType !== AccountType.INCOME) ||
        (transactionType === TransactionType.EXPENSE &&
          accountType !== AccountType.EXPENSE)
      ) {
        errors.push('交易类型与账户类型不匹配')
      }

      // 检查账户是否适合定期交易
      if (
        accountType === AccountType.ASSET ||
        accountType === AccountType.LIABILITY
      ) {
        warnings.push('存量类账户通常不适合定期交易，建议使用流量类账户')
      }
    } catch {
      errors.push('验证账户关联时发生错误')
    }

    return { errors, warnings }
  }

  /**
   * 验证时间设置
   */
  private static validateTimeSettings(
    data: z.infer<typeof RecurringTransactionCreateSchema>
  ): Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    const startDate = new Date(data.startDate)
    const now = new Date()

    // 验证开始日期
    if (startDate < now) {
      const daysDiff = Math.ceil(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff > 30) {
        warnings.push('开始日期距今超过30天，请确认是否为历史定期交易')
      }
    }

    // 验证结束日期
    if (data.endDate) {
      const endDate = new Date(data.endDate)
      if (endDate <= startDate) {
        errors.push('结束日期必须晚于开始日期')
      }

      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (duration > 3650) {
        // 10年
        warnings.push('定期交易持续时间超过10年，请确认是否合理')
      }
    }

    // 验证最大执行次数
    if (data.maxOccurrences) {
      if (data.maxOccurrences > 1000) {
        warnings.push('最大执行次数较大，请确认是否合理')
      }

      // 如果同时设置了结束日期和最大执行次数，检查一致性
      if (data.endDate) {
        const estimatedOccurrences = this.estimateOccurrences(
          startDate,
          new Date(data.endDate),
          data.frequency,
          data.interval
        )

        if (data.maxOccurrences > estimatedOccurrences * 1.5) {
          warnings.push('最大执行次数可能超过时间范围内的实际执行次数')
        }
      }
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证频率设置
   */
  private static validateFrequencySettings(
    data: z.infer<typeof RecurringTransactionCreateSchema>
  ): Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 验证频率与相关参数的匹配
    switch (data.frequency) {
      case 'DAILY':
        if (data.dayOfMonth || data.dayOfWeek || data.monthOfYear) {
          warnings.push('日频率不需要设置月中日期、周中日期或年中月份')
        }
        if (data.interval > 30) {
          warnings.push('日频率间隔超过30天，建议考虑使用月频率')
        }
        break

      case 'WEEKLY':
        if (data.dayOfMonth || data.monthOfYear) {
          warnings.push('周频率不需要设置月中日期或年中月份')
        }
        if (!data.dayOfWeek && data.dayOfWeek !== 0) {
          suggestions.push('建议为周频率设置周中日期')
        }
        if (data.interval > 52) {
          warnings.push('周频率间隔超过52周，建议考虑使用年频率')
        }
        break

      case 'MONTHLY':
        if (data.dayOfWeek || data.monthOfYear) {
          warnings.push('月频率不需要设置周中日期或年中月份')
        }
        if (data.dayOfMonth && data.dayOfMonth > 28) {
          warnings.push('月中日期大于28可能导致某些月份无法执行')
          suggestions.push('建议将月中日期设置在1-28之间')
        }
        if (data.interval > 12) {
          warnings.push('月频率间隔超过12个月，建议考虑使用年频率')
        }
        break

      case 'QUARTERLY':
        if (data.dayOfWeek) {
          warnings.push('季度频率不需要设置周中日期')
        }
        if (data.dayOfMonth && data.dayOfMonth > 28) {
          warnings.push('月中日期大于28可能导致某些月份无法执行')
        }
        if (data.interval > 4) {
          warnings.push('季度频率间隔超过4个季度，建议考虑使用年频率')
        }
        break

      case 'YEARLY':
        if (data.dayOfWeek) {
          warnings.push('年频率不需要设置周中日期')
        }
        if (
          data.monthOfYear &&
          data.dayOfMonth &&
          data.monthOfYear === 2 &&
          data.dayOfMonth > 28
        ) {
          warnings.push('2月份日期大于28可能导致闰年问题')
        }
        if (data.interval > 10) {
          warnings.push('年频率间隔超过10年，请确认是否合理')
        }
        break
    }

    // 验证间隔合理性
    if (data.interval === 1) {
      // 这是正常情况，不需要警告
    } else if (data.interval > 100) {
      warnings.push('执行间隔较大，请确认是否合理')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证定期交易执行状态
   */
  static async validateRecurringTransactionExecution(
    recurringTransactionId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const recurringTransaction = await prisma.recurringTransaction.findUnique(
        {
          where: { id: recurringTransactionId },
          include: {
            account: { include: { category: true } },
          },
        }
      )

      if (!recurringTransaction) {
        return {
          isValid: false,
          errors: ['定期交易不存在'],
          warnings: [],
          suggestions: [],
          score: 0,
        }
      }

      // 验证执行状态
      if (!recurringTransaction.isActive) {
        warnings.push('定期交易已停用')
        return {
          isValid: true,
          errors,
          warnings,
          suggestions,
          score: 80,
        }
      }

      const now = new Date()

      // 验证下次执行时间
      if (recurringTransaction.nextDate > now) {
        suggestions.push('定期交易尚未到执行时间')
      }

      // 验证最大执行次数
      if (
        recurringTransaction.maxOccurrences &&
        recurringTransaction.currentCount >= recurringTransaction.maxOccurrences
      ) {
        warnings.push('定期交易已达到最大执行次数')
        suggestions.push('建议停用或调整最大执行次数')
      }

      // 验证结束日期
      if (recurringTransaction.endDate && now > recurringTransaction.endDate) {
        warnings.push('定期交易已超过结束日期')
        suggestions.push('建议停用或调整结束日期')
      }

      // 验证账户状态
      if (!recurringTransaction.account) {
        errors.push('关联的账户不存在')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score: this.calculateValidationScore(errors.length, warnings.length),
      }
    } catch {
      return {
        isValid: false,
        errors: ['验证定期交易执行状态时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 估算执行次数
   */
  private static estimateOccurrences(
    startDate: Date,
    endDate: Date,
    frequency: string,
    interval: number
  ): number {
    const duration = endDate.getTime() - startDate.getTime()
    const days = Math.ceil(duration / (1000 * 60 * 60 * 24))

    switch (frequency) {
      case 'DAILY':
        return Math.floor(days / interval)
      case 'WEEKLY':
        return Math.floor(days / (7 * interval))
      case 'MONTHLY':
        return Math.floor(days / (30 * interval))
      case 'QUARTERLY':
        return Math.floor(days / (90 * interval))
      case 'YEARLY':
        return Math.floor(days / (365 * interval))
      default:
        return 0
    }
  }

  /**
   * 计算验证评分
   */
  private static calculateValidationScore(
    errorCount: number,
    warningCount: number
  ): number {
    let score = 100
    score -= errorCount * 15 // 每个错误扣15分
    score -= warningCount * 3 // 每个警告扣3分
    return Math.max(0, score)
  }
}

// ============================================================================
// 导出验证函数
// ============================================================================

export const validateRecurringTransactionData =
  RecurringTransactionValidator.validateRecurringTransactionCreation
export const validateRecurringTransactionExecution =
  RecurringTransactionValidator.validateRecurringTransactionExecution

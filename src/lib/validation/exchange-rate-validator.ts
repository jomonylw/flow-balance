/**
 * 汇率数据完整性验证器
 * 提供汇率数据的质量检查、时效性验证和链条完整性检查
 */

import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { ValidationResult } from '@/types/core'

const prisma = new PrismaClient()

// ============================================================================
// 汇率验证 Schema
// ============================================================================

/** 汇率创建验证 Schema */
export const ExchangeRateCreateSchema = z.object({
  fromCurrencyId: z.string().uuid('源货币ID格式无效'),
  toCurrencyId: z.string().uuid('目标货币ID格式无效'),
  rate: z
    .number()
    .positive('汇率必须大于0')
    .max(1000000, '汇率值过大')
    .refine(
      val => {
        const decimal = new Decimal(val)
        return decimal.decimalPlaces() <= 8
      },
      { message: '汇率精度不能超过8位小数' }
    ),
  effectiveDate: z.string().datetime('生效日期格式无效'),
  type: z.enum(['USER', 'API', 'AUTO'], {
    errorMap: () => ({ message: '汇率类型必须是USER、API或AUTO' }),
  }),
  sourceRateId: z.string().uuid().optional(),
  notes: z.string().max(500, '备注过长').optional(),
})

/** 汇率更新验证 Schema */
export const ExchangeRateUpdateSchema = ExchangeRateCreateSchema.partial()

// ============================================================================
// 汇率验证器类
// ============================================================================

export class ExchangeRateValidator {
  /**
   * 验证汇率数据创建
   */
  static async validateExchangeRateCreation(
    userId: string,
    data: unknown
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 1. Schema 验证
      const validatedData = ExchangeRateCreateSchema.parse(data)

      // 2. 业务逻辑验证
      const businessValidation = await this.validateBusinessLogic(
        userId,
        validatedData
      )
      errors.push(...businessValidation.errors)
      warnings.push(...businessValidation.warnings)
      suggestions.push(...businessValidation.suggestions)

      // 3. 货币存在性验证
      const currencyValidation = await this.validateCurrencyExistence(
        userId,
        validatedData.fromCurrencyId,
        validatedData.toCurrencyId
      )
      errors.push(...currencyValidation.errors)
      warnings.push(...currencyValidation.warnings)

      // 4. 重复汇率检查
      const duplicateValidation = await this.validateDuplicateRate(
        userId,
        validatedData
      )
      errors.push(...duplicateValidation.errors)
      warnings.push(...duplicateValidation.warnings)

      // 5. 汇率链条验证
      const chainValidation = await this.validateRateChain(
        userId,
        validatedData.fromCurrencyId,
        validatedData.toCurrencyId,
        validatedData.rate
      )
      warnings.push(...chainValidation.warnings)
      suggestions.push(...chainValidation.suggestions)

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
          suggestions: ['请检查汇率数据格式是否正确'],
          score: 0,
        }
      }

      return {
        isValid: false,
        errors: ['验证汇率数据时发生未知错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证汇率业务逻辑
   */
  private static async validateBusinessLogic(
    userId: string,
    data: z.infer<typeof ExchangeRateCreateSchema>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 验证相同货币汇率
    if (data.fromCurrencyId === data.toCurrencyId) {
      errors.push('源货币和目标货币不能相同')
    }

    // 验证汇率合理性
    if (data.rate > 1000) {
      warnings.push('汇率值较大，请确认是否正确')
    }
    if (data.rate < 0.001) {
      warnings.push('汇率值较小，请确认是否正确')
    }

    // 验证生效日期
    const effectiveDate = new Date(data.effectiveDate)
    const now = new Date()
    if (effectiveDate > now) {
      errors.push('汇率生效日期不能是未来日期')
    }

    // 验证汇率类型与源汇率的关系
    if (data.type === 'AUTO' && !data.sourceRateId) {
      errors.push('自动生成的汇率必须指定源汇率ID')
    }
    if (data.type !== 'AUTO' && data.sourceRateId) {
      warnings.push('非自动生成的汇率不应该指定源汇率ID')
    }

    // 验证API类型汇率的时效性
    if (data.type === 'API') {
      const daysDiff = Math.ceil(
        (now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff > 7) {
        warnings.push('API汇率数据超过7天，建议更新')
      }
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证货币存在性
   */
  private static async validateCurrencyExistence(
    userId: string,
    fromCurrencyId: string,
    toCurrencyId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings'>> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const currencies = await prisma.currency.findMany({
        where: {
          id: { in: [fromCurrencyId, toCurrencyId] },
          OR: [{ createdBy: userId }, { createdBy: null }],
        },
      })

      const foundIds = currencies.map(c => c.id)

      if (!foundIds.includes(fromCurrencyId)) {
        errors.push('源货币不存在或无权访问')
      }
      if (!foundIds.includes(toCurrencyId)) {
        errors.push('目标货币不存在或无权访问')
      }

      // 检查货币是否为用户自定义货币
      const customCurrencies = currencies.filter(c => c.createdBy === userId)
      if (customCurrencies.length > 0) {
        warnings.push('使用了自定义货币，请确保汇率数据准确')
      }
    } catch {
      errors.push('验证货币存在性时发生错误')
    }

    return { errors, warnings }
  }

  /**
   * 验证重复汇率
   */
  private static async validateDuplicateRate(
    userId: string,
    data: z.infer<typeof ExchangeRateCreateSchema>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings'>> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const effectiveDate = new Date(data.effectiveDate)
      const dateStr = effectiveDate.toISOString().split('T')[0]

      const existingRate = await prisma.exchangeRate.findFirst({
        where: {
          userId,
          fromCurrencyId: data.fromCurrencyId,
          toCurrencyId: data.toCurrencyId,
          effectiveDate: {
            gte: new Date(dateStr + 'T00:00:00.000Z'),
            lt: new Date(dateStr + 'T23:59:59.999Z'),
          },
        },
      })

      if (existingRate) {
        errors.push('该货币对在指定日期已存在汇率记录')
      }
    } catch {
      warnings.push('无法检查重复汇率，请手动确认')
    }

    return { errors, warnings }
  }

  /**
   * 验证汇率链条完整性
   */
  private static async validateRateChain(
    userId: string,
    fromCurrencyId: string,
    toCurrencyId: string,
    rate: number
  ): Promise<Pick<ValidationResult, 'warnings' | 'suggestions'>> {
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 检查反向汇率是否存在
      const reverseRate = await prisma.exchangeRate.findFirst({
        where: {
          userId,
          fromCurrencyId: toCurrencyId,
          toCurrencyId: fromCurrencyId,
        },
        orderBy: { effectiveDate: 'desc' },
      })

      if (reverseRate) {
        const expectedReverseRate = 1 / rate
        const actualReverseRate = Number(reverseRate.rate)
        const diff = Math.abs(expectedReverseRate - actualReverseRate)

        if (diff > 0.0001) {
          warnings.push(
            `反向汇率不一致：期望${expectedReverseRate.toFixed(6)}，实际${actualReverseRate.toFixed(6)}`
          )
        }
      } else {
        suggestions.push('建议创建对应的反向汇率以保持数据完整性')
      }

      // 检查基础货币汇率链条
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: { baseCurrency: true },
      })

      if (userSettings?.baseCurrency) {
        const baseCurrencyId = userSettings.baseCurrency.id

        // 检查到基础货币的汇率路径
        if (
          fromCurrencyId !== baseCurrencyId &&
          toCurrencyId !== baseCurrencyId
        ) {
          const pathValidation = await this.validateRatePath(
            userId,
            fromCurrencyId,
            baseCurrencyId
          )
          if (!pathValidation.hasPath) {
            suggestions.push('建议创建到基础货币的汇率路径以便进行货币转换')
          }
        }
      }
    } catch {
      warnings.push('无法验证汇率链条完整性')
    }

    return { warnings, suggestions }
  }

  /**
   * 验证汇率路径是否存在
   */
  private static async validateRatePath(
    userId: string,
    fromCurrencyId: string,
    toCurrencyId: string
  ): Promise<{ hasPath: boolean }> {
    try {
      // 简单的路径检查：直接汇率或通过一个中间货币
      const directRate = await prisma.exchangeRate.findFirst({
        where: {
          userId,
          fromCurrencyId,
          toCurrencyId,
        },
      })

      if (directRate) {
        return { hasPath: true }
      }

      // 检查是否有通过其他货币的路径（简化版本）
      const fromRates = await prisma.exchangeRate.findMany({
        where: { userId, fromCurrencyId },
      })

      const toRates = await prisma.exchangeRate.findMany({
        where: { userId, toCurrencyId },
      })

      // 检查是否有共同的中间货币
      const fromTargets = fromRates.map(r => r.toCurrencyId)
      const toSources = toRates.map(r => r.fromCurrencyId)
      const commonCurrencies = fromTargets.filter(id => toSources.includes(id))

      return { hasPath: commonCurrencies.length > 0 }
    } catch {
      return { hasPath: false }
    }
  }

  /**
   * 验证用户汇率数据完整性
   */
  static async validateUserExchangeRateIntegrity(
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 获取用户的所有货币和汇率
      const [currencies, exchangeRates] = await Promise.all([
        prisma.currency.findMany({
          where: {
            OR: [{ createdBy: userId }, { createdBy: null }],
          },
        }),
        prisma.exchangeRate.findMany({
          where: { userId },
          include: {
            fromCurrencyRef: true,
            toCurrencyRef: true,
          },
        }),
      ])

      // 检查汇率数据时效性
      const now = new Date()
      const outdatedRates = exchangeRates.filter(rate => {
        const daysDiff = Math.ceil(
          (now.getTime() - rate.effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        return rate.type === 'API' && daysDiff > 7
      })

      if (outdatedRates.length > 0) {
        warnings.push(`${outdatedRates.length}个API汇率数据超过7天未更新`)
        suggestions.push('建议启用汇率自动更新功能')
      }

      // 检查基础货币覆盖率
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: { baseCurrency: true },
      })

      if (userSettings?.baseCurrency && currencies.length > 1) {
        const baseCurrencyId = userSettings.baseCurrency.id
        const otherCurrencies = currencies.filter(c => c.id !== baseCurrencyId)

        const missingRates = otherCurrencies.filter(currency => {
          return !exchangeRates.some(
            rate =>
              (rate.fromCurrencyId === baseCurrencyId &&
                rate.toCurrencyId === currency.id) ||
              (rate.fromCurrencyId === currency.id &&
                rate.toCurrencyId === baseCurrencyId)
          )
        })

        if (missingRates.length > 0) {
          warnings.push(`${missingRates.length}个货币缺少与基础货币的汇率`)
          suggestions.push('建议为所有货币设置与基础货币的汇率')
        }
      }

      // 检查汇率精度一致性
      const precisionIssues = exchangeRates.filter(rate => {
        const decimal = new Decimal(rate.rate)
        return decimal.decimalPlaces() > 8
      })

      if (precisionIssues.length > 0) {
        warnings.push(`${precisionIssues.length}个汇率精度超过8位小数`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        score: this.calculateValidationScore(errors.length, warnings.length),
        details: {
          accountsChecked: 0,
          transactionsChecked: 0,
          categoriesWithoutType: 0,
          invalidTransactions: 0,
          businessLogicViolations: warnings.length,
        },
      }
    } catch {
      return {
        isValid: false,
        errors: ['验证汇率数据完整性时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
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

export const validateExchangeRateData =
  ExchangeRateValidator.validateExchangeRateCreation
export const validateExchangeRateIntegrity =
  ExchangeRateValidator.validateUserExchangeRateIntegrity

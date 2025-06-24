/**
 * 贷款合约数据验证器
 * 提供贷款合约相关的数据质量检查和业务逻辑验证
 */

import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { RepaymentType, AccountType } from '@/types/core/constants'
import type { ValidationResult } from '@/types/core'
import { LoanCalculationService } from '@/lib/services/loan-calculation.service'

const prisma = new PrismaClient()

// ============================================================================
// 贷款合约验证 Schema
// ============================================================================

/** 贷款合约创建验证 Schema */
export const LoanContractCreateSchema = z.object({
  accountId: z.string().uuid('账户ID格式无效'),
  contractName: z.string().min(1, '合约名称不能为空').max(100, '合约名称过长'),
  loanAmount: z
    .number()
    .positive('贷款金额必须大于0')
    .max(100000000, '贷款金额超出合理范围'),
  interestRate: z.number().min(0, '利率不能为负数').max(1, '利率不能超过100%'),
  totalPeriods: z
    .number()
    .int('期数必须为整数')
    .min(1, '期数至少为1期')
    .max(600, '期数不能超过600期'),
  repaymentType: z.enum([
    RepaymentType.EQUAL_PAYMENT,
    RepaymentType.EQUAL_PRINCIPAL,
    RepaymentType.INTEREST_ONLY,
  ]),
  startDate: z.string().datetime('开始日期格式无效'),
  paymentDay: z
    .number()
    .int('还款日必须为整数')
    .min(1, '还款日不能小于1号')
    .max(31, '还款日不能大于31号'),
  paymentAccountId: z.string().uuid('还款账户ID格式无效').optional(),
  transactionDescription: z.string().max(200, '交易描述过长').optional(),
  transactionNotes: z.string().max(500, '交易备注过长').optional(),
  transactionTagIds: z.array(z.string().uuid()).optional(),
})

/** 贷款合约更新验证 Schema */
export const LoanContractUpdateSchema = LoanContractCreateSchema.partial()

// ============================================================================
// 贷款合约验证器类
// ============================================================================

export class LoanContractValidator {
  /**
   * 验证贷款合约创建数据
   */
  static async validateLoanContractCreation(
    userId: string,
    data: unknown
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 1. Schema 验证
      const validatedData = LoanContractCreateSchema.parse(data)

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
        validatedData.paymentAccountId
      )
      errors.push(...accountValidation.errors)
      warnings.push(...accountValidation.warnings)
      suggestions.push(...accountValidation.suggestions)

      // 4. 重复合约检查
      const duplicateValidation = await this.validateDuplicateContract(
        userId,
        validatedData.accountId
      )
      errors.push(...duplicateValidation.errors)
      warnings.push(...duplicateValidation.warnings)

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
          suggestions: ['请检查输入数据格式是否正确'],
          score: 0,
        }
      }

      return {
        isValid: false,
        errors: ['验证过程中发生未知错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证贷款合约业务逻辑
   */
  private static async validateBusinessLogic(
    userId: string,
    data: z.infer<typeof LoanContractCreateSchema>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 验证利率合理性
    if (data.interestRate > 0.3) {
      warnings.push('利率超过30%，请确认是否正确')
    }
    if (data.interestRate < 0.01) {
      warnings.push('利率低于1%，请确认是否为优惠利率')
    }

    // 验证期数合理性
    if (data.totalPeriods > 360) {
      warnings.push('贷款期数超过30年，请确认是否合理')
    }
    if (data.totalPeriods < 12) {
      suggestions.push('短期贷款建议考虑其他融资方式')
    }

    // 验证贷款金额合理性
    if (data.loanAmount > 10000000) {
      warnings.push('贷款金额较大，请确认风险承受能力')
    }

    // 验证开始日期
    const startDate = new Date(data.startDate)
    const now = new Date()
    if (startDate < now) {
      const daysDiff = Math.ceil(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff > 30) {
        warnings.push('贷款开始日期距今超过30天，请确认是否为历史贷款')
      }
    }

    // 验证还款日期合理性
    if (data.paymentDay > 28) {
      warnings.push('还款日设置在月末可能导致某些月份无法正常还款')
      suggestions.push('建议将还款日设置在1-28号之间')
    }

    // 验证还款类型与期数的匹配
    if (
      data.repaymentType === RepaymentType.INTEREST_ONLY &&
      data.totalPeriods > 60
    ) {
      warnings.push('只还利息的贷款期数较长，请确认最终还本计划')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证账户关联
   */
  private static async validateAccountAssociation(
    userId: string,
    loanAccountId: string,
    paymentAccountId?: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // 验证贷款账户
      const loanAccount = await prisma.account.findFirst({
        where: { id: loanAccountId, userId },
        include: { category: true, currency: true },
      })

      if (!loanAccount) {
        errors.push('指定的贷款账户不存在')
        return { errors, warnings, suggestions }
      }

      if (loanAccount.category.type !== AccountType.LIABILITY) {
        errors.push('贷款账户必须是负债类型')
      }

      // 验证还款账户（如果提供）
      if (paymentAccountId) {
        const paymentAccount = await prisma.account.findFirst({
          where: { id: paymentAccountId, userId },
          include: { category: true, currency: true },
        })

        if (!paymentAccount) {
          errors.push('指定的还款账户不存在')
        } else {
          if (paymentAccount.category.type !== AccountType.EXPENSE) {
            errors.push('还款账户必须是支出类型')
          }

          // 验证货币一致性
          if (loanAccount.currencyId !== paymentAccount.currencyId) {
            errors.push('贷款账户和还款账户的货币必须一致')
          }
        }
      } else {
        suggestions.push('建议设置还款账户以便自动生成还款交易')
      }
    } catch {
      errors.push('验证账户关联时发生错误')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * 验证重复合约
   */
  private static async validateDuplicateContract(
    userId: string,
    accountId: string
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings'>> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const existingContract = await prisma.loanContract.findFirst({
        where: {
          userId,
          accountId,
          isActive: true,
        },
      })

      if (existingContract) {
        errors.push('该账户已存在活跃的贷款合约')
      }
    } catch {
      warnings.push('无法检查重复合约，请手动确认')
    }

    return { errors, warnings }
  }

  /**
   * 验证贷款还款计划完整性
   */
  static async validateLoanPaymentSchedule(
    loanContractId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const loanContract = await prisma.loanContract.findUnique({
        where: { id: loanContractId },
        include: { payments: true },
      })

      if (!loanContract) {
        return {
          isValid: false,
          errors: ['贷款合约不存在'],
          warnings: [],
          suggestions: [],
          score: 0,
        }
      }

      // 验证还款计划期数
      const expectedPeriods = loanContract.totalPeriods
      const actualPeriods = loanContract.payments.length

      if (actualPeriods !== expectedPeriods) {
        errors.push(
          `还款计划期数不匹配：期望${expectedPeriods}期，实际${actualPeriods}期`
        )
      }

      // 验证还款计划连续性
      const periods = loanContract.payments
        .map(p => p.period)
        .sort((a, b) => a - b)
      for (let i = 1; i <= expectedPeriods; i++) {
        if (!periods.includes(i)) {
          errors.push(`缺少第${i}期的还款计划`)
        }
      }

      // 验证还款金额计算
      if (loanContract.payments.length > 0) {
        const calculationValidation =
          this.validatePaymentCalculations(loanContract)
        errors.push(...calculationValidation.errors)
        warnings.push(...calculationValidation.warnings)
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
        errors: ['验证还款计划时发生错误'],
        warnings: [],
        suggestions: [],
        score: 0,
      }
    }
  }

  /**
   * 验证还款金额计算准确性
   */
  private static validatePaymentCalculations(loanContract: any): {
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 使用贷款计算服务重新计算还款计划
      const calculationResult = LoanCalculationService.calculateLoan(
        Number(loanContract.loanAmount),
        Number(loanContract.interestRate),
        loanContract.totalPeriods,
        loanContract.repaymentType as any
      )

      // 比较计算结果与数据库记录
      loanContract.payments.forEach((payment: any) => {
        const calculated = calculationResult.schedule.find(
          (c: any) => c.period === payment.period
        )
        if (calculated) {
          const principalDiff = Math.abs(
            Number(payment.principalAmount) - calculated.principalAmount
          )
          const interestDiff = Math.abs(
            Number(payment.interestAmount) - calculated.interestAmount
          )

          // 对于INTEREST_ONLY类型，需要特殊处理本金验证
          if (loanContract.repaymentType === 'INTEREST_ONLY') {
            // 只还利息类型：前面各期本金应该为0，最后一期本金为贷款总额
            if (payment.period < loanContract.totalPeriods) {
              // 非最后一期，本金应该为0
              if (Number(payment.principalAmount) !== 0) {
                errors.push(
                  `第${payment.period}期本金应为0（只还利息类型），实际为${payment.principalAmount}`
                )
              }
            } else {
              // 最后一期，本金应该等于贷款总额
              const expectedPrincipal = Number(loanContract.loanAmount)
              if (principalDiff > 0.01) {
                errors.push(
                  `第${payment.period}期本金金额错误：应为${expectedPrincipal}，实际为${payment.principalAmount}`
                )
              }
            }
          } else {
            // 等额本息和等额本金类型的本金验证
            if (principalDiff > 0.01) {
              errors.push(
                `第${payment.period}期本金金额计算错误：数据库${payment.principalAmount}，计算值${calculated.principalAmount}`
              )
            }
          }

          // 利息验证（所有类型都适用）
          if (interestDiff > 0.01) {
            errors.push(
              `第${payment.period}期利息金额计算错误：数据库${payment.interestAmount}，计算值${calculated.interestAmount}`
            )
          }

          // 剩余本金验证
          const remainingBalanceDiff = Math.abs(
            Number(payment.remainingBalance || 0) - calculated.remainingBalance
          )
          if (remainingBalanceDiff > 0.01) {
            errors.push(
              `第${payment.period}期剩余本金计算错误：数据库${payment.remainingBalance}，计算值${calculated.remainingBalance}`
            )
          }
        }
      })
    } catch {
      warnings.push('无法验证还款金额计算，请手动检查')
    }

    return { errors, warnings }
  }

  /**
   * 计算验证评分
   */
  private static calculateValidationScore(
    errorCount: number,
    warningCount: number
  ): number {
    let score = 100
    score -= errorCount * 20 // 每个错误扣20分
    score -= warningCount * 5 // 每个警告扣5分
    return Math.max(0, score)
  }
}

// ============================================================================
// 导出验证函数
// ============================================================================

export const validateLoanContractData =
  LoanContractValidator.validateLoanContractCreation
export const validateLoanPaymentSchedule =
  LoanContractValidator.validateLoanPaymentSchedule

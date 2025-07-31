/**
 * 贷款合约服务
 * 处理贷款合约的创建、更新、还款处理等操作
 */

import {
  LoanContractFormData,
  RepaymentType,
  PrismaTransaction,
} from '@/types/core'
import { LoanCalculationService } from './loan-calculation.service'
import { calculateLoanPaymentDateForPeriod } from '@/lib/utils/format'
import { DuplicateCheckService, CheckType } from './duplicate-check.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  createServerTranslator,
  getUserTranslator,
} from '@/lib/utils/server-i18n'
// import { BUSINESS_LIMITS } from '@/lib/constants/app-config'

// 创建服务端翻译函数（默认）
const t = createServerTranslator()

/**
 * 处理模板占位符替换
 * 支持中英文占位符
 */
function replaceTemplatePlaceholders(
  template: string,
  variables: {
    period: number
    contractName: string
    remainingBalance: number
  }
): string {
  return template
    .replace('{期数}', variables.period.toString())
    .replace('{period}', variables.period.toString())
    .replace('{contractName}', variables.contractName)
    .replace('{合约名称}', variables.contractName)
    .replace('{remainingBalance}', variables.remainingBalance.toLocaleString())
    .replace('{剩余本金}', variables.remainingBalance.toLocaleString())
}

interface LoanContractUpdateData {
  contractName?: string
  loanAmount?: number
  interestRate?: number
  totalPeriods?: number
  repaymentType?: RepaymentType
  startDate?: Date | string
  paymentDay?: number
  paymentAccountId?: string | null
  transactionDescription?: string
  transactionNotes?: string
  transactionTagIds?: string[]
  isActive?: boolean
}

// 扩展的贷款合约类型，包含所有可能的字段
interface ExtendedLoanContract {
  id: string
  userId: string
  accountId: string
  currencyId: string
  contractName: string
  loanAmount: number
  interestRate: number
  totalPeriods: number
  repaymentType: RepaymentType
  startDate: Date
  paymentDay: number
  paymentAccountId?: string | null
  transactionDescription?: string | null
  transactionNotes?: string | null
  transactionTagIds?: string[] | null
  isActive: boolean
  currentPeriod: number
  nextPaymentDate?: Date | null
  account: {
    categoryId: string
  }
  payments?: Array<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED'
    period: number
  }>
}

// 用于类型断言的辅助类型
type LoanContractWithOptionalFields = {
  paymentAccountId?: string | null
  transactionDescription?: string | null
  transactionNotes?: string | null
  transactionTagIds?: string[] | null
  contractName: string
  paymentDay: number
}

// 贷款支付记录类型（暂时未使用，保留供将来使用）
interface _LoanPaymentRecord {
  id: string
  loanContractId: string
  userId: string
  period: number
  paymentDate: Date
  principalAmount: number | unknown // 允许 Decimal 类型
  interestAmount: number | unknown // 允许 Decimal 类型
  totalAmount: number | unknown // 允许 Decimal 类型
  remainingBalance: number | unknown // 允许 Decimal 类型
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  principalTransactionId?: string | null
  interestTransactionId?: string | null
  balanceTransactionId?: string | null
  processedAt?: Date | null
  loanContract: ExtendedLoanContract
}

interface TransactionData {
  userId: string
  accountId: string
  currencyId: string
  type: 'EXPENSE' | 'BALANCE'
  amount: number | string // 允许 Decimal 类型
  description: string
  date: Date
  loanContractId?: string
  loanPaymentId?: string
  tags?: {
    create: Array<{ tagId: string }>
  }
  notes?: string
}

interface WhereClause {
  isActive?: boolean
  paymentDay?: { lte: number }
  userId?: string
  paymentDate?: { lte: Date }
  status?: string
}

// Using shared prisma instance from connection-manager

export class LoanContractService {
  /**
   * 创建贷款合约
   */
  static async createLoanContract(userId: string, data: LoanContractFormData) {
    // 验证贷款参数
    const validation = LoanCalculationService.validateLoanParameters(
      data.loanAmount,
      data.interestRate,
      data.totalPeriods
    )

    if (!validation.isValid) {
      throw new Error(
        t('loan.contract.validation.failed', {
          errors: validation.errors.join(', '),
        })
      )
    }

    // 验证还款日期
    if (data.paymentDay < 1 || data.paymentDay > 31) {
      throw new Error(t('loan.contract.payment.day.invalid'))
    }

    // 获取货币ID
    const currency = await prisma.currency.findFirst({
      where: {
        code: data.currencyCode,
        OR: [{ createdBy: userId }, { createdBy: null }],
      },
    })

    if (!currency) {
      throw new Error(t('loan.contract.currency.not.found'))
    }

    // 如果指定了还款账户，验证账户类型和货币
    if (data.paymentAccountId) {
      const paymentAccount = await prisma.account.findFirst({
        where: {
          id: data.paymentAccountId,
          userId,
          category: { type: 'EXPENSE' },
          currencyId: currency.id,
        },
        include: { category: true },
      })

      if (!paymentAccount) {
        throw new Error(t('loan.contract.payment.account.invalid'))
      }
    }

    const startDate = new Date(data.startDate)

    // 计算第一次还款日期（第二期的还款日期，使用智能日期调整）
    const firstPaymentDate = calculateLoanPaymentDateForPeriod(
      startDate,
      data.paymentDay,
      2 // 第二期
    )

    const loanContract = await prisma.loanContract.create({
      data: {
        userId,
        accountId: data.accountId,
        currencyId: currency.id,
        contractName: data.contractName,
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        totalPeriods: data.totalPeriods,
        repaymentType: data.repaymentType,
        startDate,
        paymentDay: data.paymentDay,
        paymentAccountId: data.paymentAccountId,
        transactionDescription: data.transactionDescription,
        transactionNotes: data.transactionNotes,
        transactionTagIds: data.transactionTagIds || undefined,
        isActive: data.isActive !== undefined ? data.isActive : true,
        currentPeriod: 0,
        nextPaymentDate: firstPaymentDate,
      },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
      },
    })

    // 创建合约后立即生成所有期的还款计划
    await this.generateLoanPaymentSchedule(loanContract.id, userId)

    return loanContract
  }

  /**
   * 更新贷款合约
   */
  static async updateLoanContract(
    id: string,
    userId: string,
    data: Partial<LoanContractFormData>
  ) {
    return await prisma.$transaction(async tx => {
      const existing = await tx.loanContract.findFirst({
        where: { id, userId },
        include: {
          payments: {
            orderBy: { period: 'desc' },
            take: 1,
          },
          currency: true,
        },
      })

      if (!existing) {
        throw new Error(t('loan.contract.not.found'))
      }

      // 验证还款日期
      if (data.paymentDay && (data.paymentDay < 1 || data.paymentDay > 31)) {
        throw new Error(t('loan.contract.payment.day.invalid'))
      }

      // 如果指定了还款账户，验证账户类型和货币
      if (data.paymentAccountId) {
        // 获取货币ID
        let currencyId = existing.currencyId
        if (data.currencyCode) {
          const currency = await tx.currency.findFirst({
            where: {
              code: data.currencyCode,
              OR: [{ createdBy: userId }, { createdBy: null }],
            },
          })
          if (!currency) {
            throw new Error(t('loan.contract.currency.not.found'))
          }
          currencyId = currency.id
        }

        const paymentAccount = await tx.account.findFirst({
          where: {
            id: data.paymentAccountId,
            userId,
            category: { type: 'EXPENSE' },
            currencyId: currencyId,
          },
          include: { category: true },
        })

        if (!paymentAccount) {
          throw new Error(t('loan.contract.payment.account.invalid'))
        }
      }

      // 过滤掉不能直接更新的字段（外键字段需要通过关系更新）
      const { accountId, currencyCode, ...filteredData } = data

      // 检查是否修改了影响还款计划的关键参数
      const hasKeyParameterChanges = !!(
        data.loanAmount ||
        data.interestRate ||
        data.repaymentType ||
        data.startDate ||
        data.paymentDay ||
        data.totalPeriods ||
        (accountId && accountId !== existing.accountId) ||
        (currencyCode && currencyCode !== existing.currency?.code)
      )

      // 如果更新了关键参数，重新验证
      if (hasKeyParameterChanges) {
        const loanAmount = data.loanAmount || existing.loanAmount
        const interestRate = data.interestRate || existing.interestRate
        const totalPeriods = data.totalPeriods || existing.totalPeriods

        // 如果修改了总期数，验证新期数必须大于已完成的期数
        if (data.totalPeriods && data.totalPeriods !== existing.totalPeriods) {
          // 检查新期数是否大于当前已完成的期数
          const completedPayments = existing.payments || []
          const maxCompletedPeriod =
            completedPayments.length > 0
              ? Math.max(
                  ...completedPayments
                    .filter(
                      p =>
                        (p as unknown as { status: string }).status ===
                        'COMPLETED'
                    )
                    .map(p => p.period)
                )
              : 0

          if (data.totalPeriods <= maxCompletedPeriod) {
            throw new Error(
              t('loan.contract.periods.too.small', {
                maxPeriod: maxCompletedPeriod,
              })
            )
          }
        }

        // 验证参数
        const validation = LoanCalculationService.validateLoanParameters(
          Number(loanAmount),
          Number(interestRate),
          totalPeriods
        )

        if (!validation.isValid) {
          throw new Error(
            t('loan.contract.validation.failed', {
              errors: validation.errors.join(', '),
            })
          )
        }
      }

      const updateData: LoanContractUpdateData = { ...filteredData }

      // 处理账户变更
      if (accountId && accountId !== existing.accountId) {
        // 检查新账户是否存在且为负债账户
        const newAccount = await tx.account.findFirst({
          where: {
            id: accountId,
            userId,
            category: { type: 'LIABILITY' },
          },
          include: { category: true },
        })

        if (!newAccount) {
          throw new Error(t('loan.contract.account.invalid'))
        }

        // 检查是否已有还款记录，如果有则不允许更改账户
        const hasPayments = await tx.loanPayment.count({
          where: { loanContractId: id, status: 'COMPLETED' },
        })

        if (hasPayments > 0) {
          throw new Error(
            t('loan.contract.account.cannot.change.with.payments')
          )
        }
      }

      // 处理货币变更
      if (currencyCode && currencyCode !== existing.currency?.code) {
        // 查找新货币
        const newCurrency = await tx.currency.findFirst({
          where: {
            code: currencyCode,
            OR: [{ createdBy: userId }, { createdBy: null }],
          },
        })

        if (!newCurrency) {
          throw new Error(t('loan.contract.currency.not.found'))
        }

        // 检查是否已有还款记录，如果有则不允许更改货币
        const hasPayments = await tx.loanPayment.count({
          where: { loanContractId: id, status: 'COMPLETED' },
        })

        if (hasPayments > 0) {
          throw new Error(
            t('loan.contract.currency.cannot.change.with.payments')
          )
        }
      }

      if (data.startDate) {
        updateData.startDate = new Date(data.startDate)
      }

      if (data.transactionTagIds !== undefined) {
        updateData.transactionTagIds = data.transactionTagIds
      }

      // 确保 paymentAccountId 字段被正确处理，包括 null 值
      if (data.paymentAccountId !== undefined) {
        updateData.paymentAccountId = data.paymentAccountId
      }

      // 准备更新数据，包括关系更新
      const prismaUpdateData: any = { ...updateData }

      // 处理账户关系更新
      if (accountId && accountId !== existing.accountId) {
        prismaUpdateData.account = {
          connect: { id: accountId },
        }
      }

      // 处理货币关系更新
      if (currencyCode && currencyCode !== existing.currency?.code) {
        const newCurrency = await tx.currency.findFirst({
          where: {
            code: currencyCode,
            OR: [{ createdBy: userId }, { createdBy: null }],
          },
        })
        if (newCurrency) {
          prismaUpdateData.currency = {
            connect: { id: newCurrency.id },
          }
        }
      }

      // 更新贷款合约
      const updatedContract = await tx.loanContract.update({
        where: { id },
        data: prismaUpdateData,
        include: {
          account: {
            include: { category: true, currency: true },
          },
          currency: true,
        },
      })

      // 如果修改了关键参数，重新生成还款计划
      if (hasKeyParameterChanges) {
        await this.regeneratePaymentSchedule(tx, id, userId)
      }

      return updatedContract
    })
  }

  /**
   * 重新生成还款计划（编辑贷款合约后调用）
   */
  static async regeneratePaymentSchedule(
    tx: PrismaTransaction,
    loanContractId: string,
    userId: string
  ) {
    try {
      // 获取贷款合约信息
      const loanContract = await tx.loanContract.findFirst({
        where: { id: loanContractId, userId },
      })

      if (!loanContract) {
        throw new Error(t('loan.contract.not.found'))
      }

      // 获取最后一期已完成的还款记录
      const completedPayments = await tx.loanPayment.findMany({
        where: {
          loanContractId,
          userId,
          status: 'COMPLETED',
        },
        orderBy: { period: 'desc' },
        take: 1,
      })

      const lastCompletedPayment = completedPayments[0]

      // 确定起始期数和剩余本金
      let startPeriod: number
      let remainingPrincipal: number

      if (lastCompletedPayment) {
        // 如果有已完成的还款，从下一期开始
        startPeriod = lastCompletedPayment.period + 1
        remainingPrincipal = Number(lastCompletedPayment.remainingBalance)
      } else {
        // 如果没有已完成的还款，从第一期开始
        startPeriod = 1
        remainingPrincipal = Number(loanContract.loanAmount)
      }

      // 删除所有未完成的还款记录
      await tx.loanPayment.deleteMany({
        where: {
          loanContractId,
          userId,
          status: 'PENDING',
        },
      })

      // 如果所有期数都已完成且没有增加期数，无需重新生成
      if (startPeriod > loanContract.totalPeriods) {
        return
      }

      // 计算剩余期数的还款计划
      const remainingPeriods = loanContract.totalPeriods - startPeriod + 1

      // 使用剩余本金和剩余期数重新计算还款计划
      const calculation = LoanCalculationService.calculateLoan(
        remainingPrincipal,
        Number(loanContract.interestRate),
        remainingPeriods,
        loanContract.repaymentType as RepaymentType
      )

      // 生成新的还款记录
      const newPayments = []
      const contractStartDate = new Date(loanContract.startDate)
      const paymentDay = (loanContract as unknown as { paymentDay: number })
        .paymentDay

      for (let i = 0; i < remainingPeriods; i++) {
        const period = startPeriod + i
        const paymentInfo = calculation.schedule[i]

        // 使用智能日期计算函数计算还款日期
        const paymentDate = calculateLoanPaymentDateForPeriod(
          contractStartDate,
          paymentDay,
          period
        )

        newPayments.push({
          loanContractId: loanContract.id,
          userId: loanContract.userId,
          period,
          paymentDate,
          principalAmount: paymentInfo.principalAmount,
          interestAmount: paymentInfo.interestAmount,
          totalAmount: paymentInfo.totalAmount,
          remainingBalance: paymentInfo.remainingBalance,
          status: 'PENDING',
        })
      }

      // 批量创建新的还款记录
      if (newPayments.length > 0) {
        await tx.loanPayment.createMany({
          data: newPayments,
        })
      }

      // 更新贷款合约的下次还款日期
      if (newPayments.length > 0) {
        const nextPayment = newPayments[0]
        await tx.loanContract.update({
          where: { id: loanContractId },
          data: {
            nextPaymentDate: nextPayment.paymentDate,
          },
        })
      }
    } catch (error) {
      console.error('Error regenerating payment schedule:', error)
      throw error
    }
  }

  /**
   * 重置指定的还款记录
   */
  static async resetLoanPayments(
    loanContractId: string,
    userId: string,
    paymentIds: string[]
  ) {
    return await prisma.$transaction(async tx => {
      // 验证贷款合约存在且属于用户
      const loanContract = await tx.loanContract.findFirst({
        where: { id: loanContractId, userId },
      })

      if (!loanContract) {
        throw new Error(t('loan.contract.not.found'))
      }

      // 获取要重置的还款记录
      const paymentsToReset = await tx.loanPayment.findMany({
        where: {
          id: { in: paymentIds },
          loanContractId,
          userId,
          status: 'COMPLETED' as const, // 只能重置已完成的记录
        },
      })

      if (paymentsToReset.length === 0) {
        throw new Error(t('loan.contract.no.payments.to.reset'))
      }

      // 收集所有相关的交易ID
      const transactionIds: string[] = []

      paymentsToReset.forEach(payment => {
        if (payment.principalTransactionId) {
          transactionIds.push(payment.principalTransactionId)
        }
        if (payment.interestTransactionId) {
          transactionIds.push(payment.interestTransactionId)
        }
        if (payment.balanceTransactionId) {
          transactionIds.push(payment.balanceTransactionId)
        }
      })

      // 删除相关的交易记录
      if (transactionIds.length > 0) {
        // 先删除交易标签关联
        await tx.transactionTag.deleteMany({
          where: {
            transactionId: { in: transactionIds },
          },
        })

        // 删除交易记录
        await tx.transaction.deleteMany({
          where: {
            id: { in: transactionIds },
          },
        })
      }

      // 重置还款记录状态
      await tx.loanPayment.updateMany({
        where: {
          id: { in: paymentIds },
        },
        data: {
          status: 'PENDING' as const,
          principalTransactionId: null,
          interestTransactionId: null,
          balanceTransactionId: null,
          processedAt: null,
        },
      })

      // 更新贷款合约状态
      // 找到最后一期已完成的还款记录
      const lastCompletedPayment = await tx.loanPayment.findFirst({
        where: {
          loanContractId,
          userId,
          status: 'COMPLETED' as const,
        },
        orderBy: { period: 'desc' },
      })

      // 计算下次还款日期
      let nextPaymentDate: Date | null = null
      let currentPeriod = 0
      let isActive = true
      const contractStartDate = new Date(loanContract.startDate)
      const paymentDay = (loanContract as unknown as { paymentDay: number })
        .paymentDay

      if (lastCompletedPayment) {
        currentPeriod = lastCompletedPayment.period

        // 如果还有未完成的期数，计算下次还款日期
        if (currentPeriod < loanContract.totalPeriods) {
          const nextPeriod = currentPeriod + 1
          nextPaymentDate = calculateLoanPaymentDateForPeriod(
            contractStartDate,
            paymentDay,
            nextPeriod
          )
        } else {
          isActive = false
        }
      } else {
        // 如果没有已完成的还款，重置为初始状态（第一期）
        nextPaymentDate = calculateLoanPaymentDateForPeriod(
          contractStartDate,
          paymentDay,
          1
        )
      }

      await tx.loanContract.update({
        where: { id: loanContractId },
        data: {
          currentPeriod,
          isActive,
          nextPaymentDate: nextPaymentDate || undefined,
        },
      })

      return {
        resetCount: paymentsToReset.length,
        deletedTransactions: transactionIds.length,
      }
    })
  }

  /**
   * 重置贷款合约的所有已完成还款记录
   */
  static async resetAllCompletedPayments(
    loanContractId: string,
    userId: string
  ) {
    return await prisma.$transaction(async tx => {
      // 验证贷款合约存在且属于用户
      const loanContract = await tx.loanContract.findFirst({
        where: { id: loanContractId, userId },
      })

      if (!loanContract) {
        throw new Error(t('loan.contract.not.found'))
      }

      // 获取所有已完成的还款记录
      const completedPayments = await tx.loanPayment.findMany({
        where: {
          loanContractId,
          userId,
          status: 'COMPLETED' as const,
        },
      })

      if (completedPayments.length === 0) {
        throw new Error(t('loan.contract.no.completed.payments'))
      }

      // 收集所有相关的交易ID
      const transactionIds: string[] = []

      completedPayments.forEach(payment => {
        if (payment.principalTransactionId) {
          transactionIds.push(payment.principalTransactionId)
        }
        if (payment.interestTransactionId) {
          transactionIds.push(payment.interestTransactionId)
        }
        if (payment.balanceTransactionId) {
          transactionIds.push(payment.balanceTransactionId)
        }
      })

      // 删除相关的交易记录
      if (transactionIds.length > 0) {
        // 先删除交易标签关联
        await tx.transactionTag.deleteMany({
          where: {
            transactionId: { in: transactionIds },
          },
        })

        // 删除交易记录
        await tx.transaction.deleteMany({
          where: {
            id: { in: transactionIds },
          },
        })
      }

      // 重置所有已完成的还款记录
      await tx.loanPayment.updateMany({
        where: {
          loanContractId,
          userId,
          status: 'COMPLETED' as const,
        },
        data: {
          status: 'PENDING' as const,
          principalTransactionId: null,
          interestTransactionId: null,
          balanceTransactionId: null,
          processedAt: null,
        },
      })

      // 重置贷款合约状态为初始状态
      const contractStartDate = new Date(loanContract.startDate)
      const paymentDay = (loanContract as unknown as { paymentDay: number })
        .paymentDay
      const nextPaymentDate = calculateLoanPaymentDateForPeriod(
        contractStartDate,
        paymentDay,
        1 // 第一期
      )

      await tx.loanContract.update({
        where: { id: loanContractId },
        data: {
          currentPeriod: 0,
          isActive: true,
          nextPaymentDate,
        },
      })

      return {
        resetCount: completedPayments.length,
        deletedTransactions: transactionIds.length,
      }
    })
  }

  /**
   * 删除贷款合约
   */
  static async deleteLoanContract(
    id: string,
    userId: string,
    options?: {
      preserveBalanceTransactions?: boolean
      preservePaymentTransactions?: boolean
    }
  ) {
    return await prisma.$transaction(async tx => {
      // 获取贷款合约信息
      console.warn(`Looking for loan contract: id=${id}, userId=${userId}`)

      const loanContract = await tx.loanContract.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          payments: {
            include: {
              principalTransaction: true,
              interestTransaction: true,
              balanceTransaction: true,
            },
          },
          transactions: true,
        },
      })

      console.warn('Found loan contract:', loanContract ? 'YES' : 'NO')

      if (!loanContract) {
        // Let's also check if the contract exists without userId filter
        const contractExists = await tx.loanContract.findFirst({
          where: { id },
          select: { id: true, userId: true },
        })
        console.warn('Contract exists with different userId:', contractExists)
        throw new Error(t('loan.contract.not.found'))
      }

      // 统计相关数据
      const balanceTransactionCount = await tx.transaction.count({
        where: {
          userId,
          loanContractId: id,
          type: 'BALANCE',
        },
      })

      const paymentTransactionCount = await tx.transaction.count({
        where: {
          userId,
          loanContractId: id,
          type: { in: ['INCOME', 'EXPENSE'] },
        },
      })

      // 如果不保留相关交易，删除所有相关交易
      if (
        !options?.preserveBalanceTransactions &&
        !options?.preservePaymentTransactions
      ) {
        // 删除所有相关交易
        await tx.transaction.deleteMany({
          where: { loanContractId: id, userId },
        })
      } else {
        // 根据选项处理交易
        if (!options.preserveBalanceTransactions) {
          // 删除余额调整交易
          await tx.transaction.deleteMany({
            where: {
              loanContractId: id,
              userId,
              type: 'BALANCE',
            },
          })
        }

        if (!options.preservePaymentTransactions) {
          // 删除还款相关交易
          await tx.transaction.deleteMany({
            where: {
              loanContractId: id,
              userId,
              type: { in: ['INCOME', 'EXPENSE'] },
            },
          })
        }

        // 清理保留交易的外键关联
        if (
          options.preserveBalanceTransactions ||
          options.preservePaymentTransactions
        ) {
          await tx.transaction.updateMany({
            where: { loanContractId: id, userId },
            data: {
              loanContractId: null,
              loanPaymentId: null,
            },
          })
        }
      }

      // 清理LoanPayment中的交易关联
      await tx.loanPayment.updateMany({
        where: { loanContractId: id, userId },
        data: {
          principalTransactionId: null,
          interestTransactionId: null,
          balanceTransactionId: null,
        },
      })

      // 删除LoanPayment记录
      await tx.loanPayment.deleteMany({
        where: { loanContractId: id, userId },
      })

      // 最后删除贷款合约
      const deletedContract = await tx.loanContract.delete({
        where: { id, userId },
      })

      return {
        deletedContract,
        stats: {
          balanceTransactionCount,
          paymentTransactionCount,
        },
      }
    })
  }

  /**
   * 获取贷款合约删除统计信息
   */
  static async getLoanContractDeletionStats(id: string, userId: string) {
    const balanceTransactionCount = await prisma.transaction.count({
      where: {
        userId,
        loanContractId: id,
        type: 'BALANCE',
      },
    })

    const paymentTransactionCount = await prisma.transaction.count({
      where: {
        userId,
        loanContractId: id,
        type: { in: ['INCOME', 'EXPENSE'] },
      },
    })

    const loanPaymentCount = await prisma.loanPayment.count({
      where: { loanContractId: id, userId },
    })

    return {
      balanceTransactionCount,
      paymentTransactionCount,
      loanPaymentCount,
    }
  }

  /**
   * 获取单个贷款合约
   */
  static async getLoanContractById(id: string, userId: string) {
    return await prisma.loanContract.findFirst({
      where: { id, userId },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
        payments: {
          orderBy: { period: 'desc' },
        },
      },
    })
  }

  /**
   * 获取用户的贷款合约列表
   */
  static async getUserLoanContracts(userId: string) {
    return await prisma.loanContract.findMany({
      where: { userId },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
        payments: {
          orderBy: { period: 'desc' },
          take: 1, // 只获取最新的还款记录
        },
      },
      orderBy: { startDate: 'desc' },
    })
  }

  /**
   * 获取账户的贷款合约
   */
  static async getAccountLoanContracts(userId: string, accountId: string) {
    return await prisma.loanContract.findMany({
      where: { userId, accountId },
      include: {
        account: {
          include: { category: true, currency: true },
        },
        currency: true,
        paymentAccount: {
          include: { category: true, currency: true },
        },
        payments: {
          orderBy: { period: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    })
  }

  /**
   * 获取到期的贷款合约
   */
  static async getDueLoanContracts(userId?: string) {
    const now = new Date()
    const currentDay = now.getDate()

    const where: WhereClause = {
      isActive: true,
      paymentDay: { lte: currentDay },
    }

    if (userId) {
      where.userId = userId
    }

    return await prisma.loanContract.findMany({
      where,
      include: {
        account: { include: { category: true } },
      },
    })
  }

  /**
   * 获取贷款合约的还款计划
   */
  static async getLoanPaymentSchedule(loanContractId: string, userId: string) {
    const loanContract = await prisma.loanContract.findFirst({
      where: { id: loanContractId, userId },
    })

    if (!loanContract) {
      throw new Error(t('loan.contract.not.found'))
    }

    const calculation = LoanCalculationService.calculateLoan(
      Number(loanContract.loanAmount),
      Number(loanContract.interestRate),
      loanContract.totalPeriods,
      loanContract.repaymentType as RepaymentType
    )

    return calculation.schedule
  }

  /**
   * 生成贷款合约的完整还款计划（LoanPayment记录）
   */
  static async generateLoanPaymentSchedule(
    loanContractId: string,
    userId: string
  ) {
    const loanContract = await prisma.loanContract.findFirst({
      where: { id: loanContractId, userId },
    })

    if (!loanContract) {
      throw new Error(t('loan.contract.not.found'))
    }

    // 计算还款计划
    const calculation = LoanCalculationService.calculateLoan(
      Number(loanContract.loanAmount),
      Number(loanContract.interestRate),
      loanContract.totalPeriods,
      loanContract.repaymentType as RepaymentType
    )

    // 生成所有期的LoanPayment记录
    const loanPayments = []
    const contractStartDate = new Date(loanContract.startDate)
    const paymentDay = (loanContract as unknown as { paymentDay: number })
      .paymentDay

    for (let period = 1; period <= loanContract.totalPeriods; period++) {
      const paymentInfo = calculation.schedule[period - 1]

      // 使用智能日期计算函数计算每期的还款日期
      const paymentDate = calculateLoanPaymentDateForPeriod(
        contractStartDate,
        paymentDay,
        period
      )

      loanPayments.push({
        loanContractId: loanContract.id,
        userId: loanContract.userId,
        period,
        paymentDate,
        principalAmount: paymentInfo.principalAmount,
        interestAmount: paymentInfo.interestAmount,
        totalAmount: paymentInfo.totalAmount,
        remainingBalance: paymentInfo.remainingBalance,
        status: 'PENDING', // 初始状态为待处理
      })
    }

    // 批量创建LoanPayment记录
    await prisma.loanPayment.createMany({
      data: loanPayments,
    })

    return loanPayments.length
  }

  /**
   * 根据LoanPayment记录处理到期还款（包括未来提前生成的记录）
   * @deprecated 使用 processBatchLoanPayments 替代以获得更好的性能
   */
  static async processLoanPaymentsBySchedule(userId?: string): Promise<{
    processed: number
    errors: string[]
  }> {
    const now = new Date()
    // 标准化当前日期，确保时间部分为0（UTC时间）
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    endDate.setUTCHours(0, 0, 0, 0)

    // 如果指定了用户ID，获取用户的未来数据生成设置
    if (userId) {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      const daysAhead = userSettings?.futureDataDays || 0

      if (daysAhead > 0) {
        // 扩大处理范围到未来指定天数
        endDate = new Date(now)
        endDate.setDate(endDate.getDate() + daysAhead)
        // 设置为当天的结束时间，以包含整天（UTC时间）
        endDate.setUTCHours(23, 59, 59, 999)
      } else {
        // 如果不生成未来数据，设置为当天的结束时间（UTC时间）
        endDate.setUTCHours(23, 59, 59, 999)
      }
    } else {
      // 如果没有指定用户ID，设置为当天的结束时间（UTC时间）
      endDate.setUTCHours(23, 59, 59, 999)
    }

    let processed = 0
    const errors: string[] = []

    // 获取到期的待处理还款记录（包括未来的记录）
    const whereClause: WhereClause = {
      paymentDate: { lte: endDate },
      status: 'PENDING',
    }

    if (userId) {
      whereClause.userId = userId
    }

    const duePayments = await prisma.loanPayment.findMany({
      where: {
        ...whereClause,
        loanContract: {
          isActive: true, // 只处理活跃的贷款合约
        },
      },
      include: {
        loanContract: {
          include: {
            account: { include: { category: true } },
          },
        },
      },
    })

    for (const payment of duePayments) {
      try {
        await this.processLoanPaymentRecord(payment.id)
        processed++
      } catch (error) {
        errors.push(
          `Payment record ${payment.id} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return { processed, errors }
  }

  /**
   * 批量处理到期的贷款还款记录（优化版本）
   * 使用单个数据库事务处理所有到期的还款记录，显著提升性能
   */
  static async processBatchLoanPayments(userId?: string): Promise<{
    processed: number
    errors: string[]
    performance: {
      duration: number
      rate: number
      metrics: {
        contractsProcessed: number
        transactionsCreated: number
        paymentsUpdated: number
      }
    }
  }> {
    const startTime = Date.now()
    const now = new Date()

    // 标准化当前日期，确保时间部分为0（UTC时间）
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    endDate.setUTCHours(0, 0, 0, 0)

    // 如果指定了用户ID，获取用户的未来数据生成设置
    if (userId) {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      const daysAhead = userSettings?.futureDataDays || 0

      if (daysAhead > 0) {
        // 扩大处理范围到未来指定天数
        endDate = new Date(now)
        endDate.setDate(endDate.getDate() + daysAhead)
        // 设置为当天的结束时间，以包含整天（UTC时间）
        endDate.setUTCHours(23, 59, 59, 999)
      } else {
        // 如果不生成未来数据，设置为当天的结束时间（UTC时间）
        endDate.setUTCHours(23, 59, 59, 999)
      }
    } else {
      // 如果没有指定用户ID，设置为当天的结束时间（UTC时间）
      endDate.setUTCHours(23, 59, 59, 999)
    }

    let processed = 0
    const errors: string[] = []

    // 获取到期的待处理还款记录（包括未来的记录）
    const whereClause: WhereClause = {
      paymentDate: { lte: endDate },
      status: 'PENDING',
    }

    if (userId) {
      whereClause.userId = userId
    }

    // 一次性获取所有到期的还款记录及其关联数据
    const duePayments = await prisma.loanPayment.findMany({
      where: {
        ...whereClause,
        loanContract: {
          isActive: true, // 只处理活跃的贷款合约
        },
      },
      include: {
        loanContract: {
          include: {
            account: { include: { category: true } },
          },
        },
      },
      orderBy: [{ loanContractId: 'asc' }, { period: 'asc' }],
    })

    if (duePayments.length === 0) {
      const duration = Date.now() - startTime
      return {
        processed: 0,
        errors: [],
        performance: {
          duration,
          rate: 0,
          metrics: {
            contractsProcessed: 0,
            transactionsCreated: 0,
            paymentsUpdated: 0,
          },
        },
      }
    }

    console.log(`🔄 开始批量处理 ${duePayments.length} 条到期贷款还款记录`)

    // 性能监控数据
    const performanceMetrics = {
      queryTime: 0,
      transactionTime: 0,
      contractsProcessed: 0,
      transactionsCreated: 0,
      paymentsUpdated: 0,
    }

    // 使用扩展事务处理所有还款记录
    try {
      const transactionStartTime = Date.now()

      await prisma.$transaction(
        async tx => {
          // 按贷款合约分组处理，以便正确更新合约状态
          const paymentsByContract = new Map<string, typeof duePayments>()

          for (const payment of duePayments) {
            const contractId = payment.loanContractId
            if (!paymentsByContract.has(contractId)) {
              paymentsByContract.set(contractId, [])
            }
            paymentsByContract.get(contractId)!.push(payment)
          }

          performanceMetrics.contractsProcessed = paymentsByContract.size

          // 为每个贷款合约处理其到期的还款记录
          for (const [contractId, contractPayments] of paymentsByContract) {
            try {
              const contractResult =
                await this.processBatchLoanPaymentsForContract(
                  tx,
                  contractPayments
                )
              processed += contractPayments.length
              performanceMetrics.transactionsCreated +=
                contractResult.transactionsCreated
              performanceMetrics.paymentsUpdated += contractPayments.length
            } catch (error) {
              const errorMsg = `Contract ${contractId} batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              errors.push(errorMsg)
              console.error(errorMsg, error)
            }
          }
        },
        {
          timeout: 5 * 60 * 1000, // 5分钟超时
          maxWait: 60 * 1000, // 最大等待1分钟
        }
      )

      performanceMetrics.transactionTime = Date.now() - transactionStartTime
    } catch (error) {
      const errorMsg = `Batch loan payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg, error)
    }

    const duration = Date.now() - startTime
    const rate = processed > 0 ? Math.round(processed / (duration / 1000)) : 0

    // 详细的性能日志
    console.log('✅ 批量贷款还款处理完成:')
    console.log(
      `   📊 处理统计: ${processed} 条还款记录，${performanceMetrics.contractsProcessed} 个合约`
    )
    console.log(
      `   ⏱️  总耗时: ${duration}ms (事务: ${performanceMetrics.transactionTime}ms)`
    )
    console.log(`   🚀 处理速率: ${rate} 条/秒`)
    console.log(
      `   💾 数据操作: 创建 ${performanceMetrics.transactionsCreated} 笔交易，更新 ${performanceMetrics.paymentsUpdated} 条还款记录`
    )

    if (errors.length > 0) {
      console.log(`   ⚠️  错误数量: ${errors.length}`)
    }

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

  /**
   * 批量处理单个贷款合约的所有到期还款记录（在事务内执行）
   * @private
   */
  private static async processBatchLoanPaymentsForContract(
    tx: PrismaTransaction,
    contractPayments: Array<any>
  ): Promise<{ transactionsCreated: number }> {
    if (contractPayments.length === 0) return { transactionsCreated: 0 }

    const firstPayment = contractPayments[0]
    const loanContract = firstPayment.loanContract
    const contractFields =
      loanContract as unknown as LoanContractWithOptionalFields

    // 性能计数器
    let transactionsCreated = 0

    // 获取用户的翻译函数
    const userT = await getUserTranslator(loanContract.userId)

    // 准备批量创建的交易数据
    const transactionsToCreate: TransactionData[] = []
    const paymentUpdates: Array<{
      id: string
      principalTransactionId?: string
      interestTransactionId?: string
      balanceTransactionId?: string
    }> = []

    // 为每个还款记录生成对应的交易
    for (const payment of contractPayments) {
      // 使用统一的并发检查服务
      const concurrencyCheck = await DuplicateCheckService.checkConcurrency(
        tx,
        {
          type: CheckType.LOAN_PAYMENT,
          userId: loanContract.userId,
          loanContractId: loanContract.id,
          loanPaymentId: payment.id,
          dateRange: {
            startDate: payment.paymentDate,
            endDate: payment.paymentDate,
          },
        }
      )

      if (!concurrencyCheck.isValid) {
        throw new Error(concurrencyCheck.reason || '并发检查失败')
      }

      const paymentUpdate: any = { id: payment.id }

      // 创建本金还款交易（从还款账户支出）
      if (
        Number(payment.principalAmount) > 0 &&
        contractFields.paymentAccountId
      ) {
        const principalTransactionData: TransactionData = {
          userId: loanContract.userId,
          accountId: contractFields.paymentAccountId,
          currencyId: loanContract.currencyId,
          type: 'EXPENSE',
          amount: Number(payment.principalAmount),
          description: contractFields.transactionDescription
            ? replaceTemplatePlaceholders(
                contractFields.transactionDescription,
                {
                  period: payment.period,
                  contractName: contractFields.contractName || '',
                  remainingBalance: Number(payment.remainingBalance),
                }
              )
            : userT('loan.contract.template.default.description', {
                contractName: contractFields.contractName,
                period: payment.period,
                type: userT('loan.type.principal'),
              }),
          notes: contractFields.transactionNotes
            ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
                period: payment.period,
                contractName: contractFields.contractName || '',
                remainingBalance: Number(payment.remainingBalance),
              })
            : userT('loan.contract.template.default.notes', {
                contractName: contractFields.contractName,
              }),
          date: payment.paymentDate,
          loanContractId: loanContract.id,
          loanPaymentId: payment.id,
        }

        // 如果有标签，添加标签关系
        if (
          contractFields.transactionTagIds &&
          Array.isArray(contractFields.transactionTagIds) &&
          contractFields.transactionTagIds.length > 0
        ) {
          principalTransactionData.tags = {
            create: contractFields.transactionTagIds.map((tagId: string) => ({
              tagId,
            })),
          }
        }

        transactionsToCreate.push(principalTransactionData)
      }

      // 创建利息支出交易（从还款账户支出）
      if (
        Number(payment.interestAmount) > 0 &&
        contractFields.paymentAccountId
      ) {
        const interestTransactionData: TransactionData = {
          userId: loanContract.userId,
          accountId: contractFields.paymentAccountId,
          currencyId: loanContract.currencyId,
          type: 'EXPENSE',
          amount: Number(payment.interestAmount),
          description: contractFields.transactionDescription
            ? replaceTemplatePlaceholders(
                contractFields.transactionDescription,
                {
                  period: payment.period,
                  contractName: contractFields.contractName || '',
                  remainingBalance: Number(payment.remainingBalance),
                }
              )
            : userT('loan.contract.template.default.description', {
                contractName: contractFields.contractName,
                period: payment.period,
                type: userT('loan.type.interest'),
              }),
          notes: contractFields.transactionNotes
            ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
                period: payment.period,
                contractName: contractFields.contractName || '',
                remainingBalance: Number(payment.remainingBalance),
              })
            : userT('loan.contract.template.default.notes', {
                contractName: contractFields.contractName,
              }),
          date: payment.paymentDate,
          loanContractId: loanContract.id,
          loanPaymentId: payment.id,
        }

        // 如果有标签，添加标签关系
        if (
          contractFields.transactionTagIds &&
          Array.isArray(contractFields.transactionTagIds) &&
          contractFields.transactionTagIds.length > 0
        ) {
          interestTransactionData.tags = {
            create: contractFields.transactionTagIds.map((tagId: string) => ({
              tagId,
            })),
          }
        }

        transactionsToCreate.push(interestTransactionData)
      }

      // 创建负债账户余额更新交易
      const balanceTransactionData: TransactionData = {
        userId: loanContract.userId,
        accountId: loanContract.accountId,
        currencyId: loanContract.currencyId,
        type: 'BALANCE',
        amount: Number(payment.remainingBalance),
        description: contractFields.transactionDescription
          ? replaceTemplatePlaceholders(contractFields.transactionDescription, {
              period: payment.period,
              contractName: contractFields.contractName || '',
              remainingBalance: Number(payment.remainingBalance),
            })
          : userT('loan.contract.template.default.description', {
              contractName: contractFields.contractName,
              period: payment.period,
              type: userT('loan.type.balance.update'),
            }),
        notes: contractFields.transactionNotes
          ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
              period: payment.period,
              contractName: contractFields.contractName || '',
              remainingBalance: Number(payment.remainingBalance),
            })
          : userT('loan.contract.template.balance.notes', {
              contractName: contractFields.contractName,
              remainingBalance: Number(
                payment.remainingBalance
              ).toLocaleString(),
            }),
        date: payment.paymentDate,
        loanContractId: loanContract.id,
        loanPaymentId: payment.id,
      }

      transactionsToCreate.push(balanceTransactionData)
      paymentUpdates.push(paymentUpdate)
    }

    // 批量创建所有交易记录
    if (transactionsToCreate.length > 0) {
      // 由于需要获取创建的交易ID来更新LoanPayment记录，我们需要逐个创建
      // 但仍在同一个事务中，比原来的逐条处理要快很多
      let transactionIndex = 0

      for (let i = 0; i < contractPayments.length; i++) {
        const payment = contractPayments[i]
        const paymentUpdate = paymentUpdates[i]

        // 创建本金交易
        if (
          Number(payment.principalAmount) > 0 &&
          contractFields.paymentAccountId
        ) {
          const principalTransaction = await tx.transaction.create({
            data: transactionsToCreate[transactionIndex++],
          })
          paymentUpdate.principalTransactionId = principalTransaction.id
          transactionsCreated++
        }

        // 创建利息交易
        if (
          Number(payment.interestAmount) > 0 &&
          contractFields.paymentAccountId
        ) {
          const interestTransaction = await tx.transaction.create({
            data: transactionsToCreate[transactionIndex++],
          })
          paymentUpdate.interestTransactionId = interestTransaction.id
          transactionsCreated++
        }

        // 创建余额交易
        const balanceTransaction = await tx.transaction.create({
          data: transactionsToCreate[transactionIndex++],
        })
        paymentUpdate.balanceTransactionId = balanceTransaction.id
        transactionsCreated++
      }
    }

    // 批量更新所有LoanPayment记录的状态
    for (const paymentUpdate of paymentUpdates) {
      await tx.loanPayment.update({
        where: { id: paymentUpdate.id },
        data: {
          status: 'COMPLETED' as const,
          principalTransactionId: paymentUpdate.principalTransactionId,
          interestTransactionId: paymentUpdate.interestTransactionId,
          balanceTransactionId: paymentUpdate.balanceTransactionId,
          processedAt: new Date(),
        },
      })
    }

    // 更新贷款合约状态（使用最后一期的信息）
    const lastPayment = contractPayments[contractPayments.length - 1]
    const isCompleted = lastPayment.period >= loanContract.totalPeriods
    let nextPaymentDate = null

    if (!isCompleted) {
      nextPaymentDate = new Date(loanContract.startDate)
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + lastPayment.period)
      nextPaymentDate.setDate(contractFields.paymentDay)
    }

    const updateData: {
      currentPeriod: number
      isActive?: boolean
      nextPaymentDate?: Date
    } = {
      currentPeriod: lastPayment.period,
    }

    // 只有当合约当前为活跃状态时，才根据完成情况更新isActive
    if (loanContract.isActive) {
      updateData.isActive = !isCompleted
      updateData.nextPaymentDate = nextPaymentDate || undefined
    }

    await tx.loanContract.update({
      where: { id: loanContract.id },
      data: updateData,
    })

    return { transactionsCreated }
  }

  /**
   * 处理单个LoanPayment记录
   */
  static async processLoanPaymentRecord(
    loanPaymentId: string
  ): Promise<boolean> {
    const loanPayment = await prisma.loanPayment.findUnique({
      where: { id: loanPaymentId },
      include: {
        loanContract: {
          include: {
            account: { include: { category: true } },
          },
        },
      },
    })

    if (
      !loanPayment ||
      (loanPayment as unknown as { status: string }).status !== 'PENDING'
    ) {
      return false
    }

    const { loanContract } = loanPayment

    // 检查贷款合约是否处于活跃状态
    if (!loanContract.isActive) {
      console.log(
        `Loan contract ${loanContract.id} is inactive, skipping payment processing`
      )
      return false
    }

    try {
      // 获取用户的翻译函数
      const userT = await getUserTranslator(loanContract.userId)

      await prisma.$transaction(async tx => {
        // 使用统一的并发检查服务
        const concurrencyCheck = await DuplicateCheckService.checkConcurrency(
          tx,
          {
            type: CheckType.LOAN_PAYMENT,
            userId: loanContract.userId,
            loanContractId: loanContract.id,
            loanPaymentId: loanPaymentId,
            dateRange: {
              startDate: loanPayment.paymentDate,
              endDate: loanPayment.paymentDate,
            },
          }
        )

        if (!concurrencyCheck.isValid) {
          throw new Error(concurrencyCheck.reason || '并发检查失败')
        }

        const transactions: Array<{ type: string; id: string }> = []

        // 创建本金还款交易（从还款账户支出）
        const contractFields =
          loanContract as unknown as LoanContractWithOptionalFields
        if (
          Number(loanPayment.principalAmount) > 0 &&
          contractFields.paymentAccountId
        ) {
          const principalTransactionData: TransactionData = {
            userId: loanContract.userId,
            accountId: contractFields.paymentAccountId,
            currencyId: loanContract.currencyId,
            type: 'EXPENSE',
            amount: Number(loanPayment.principalAmount),
            description: contractFields.transactionDescription
              ? replaceTemplatePlaceholders(
                  contractFields.transactionDescription,
                  {
                    period: loanPayment.period,
                    contractName: contractFields.contractName || '',
                    remainingBalance: Number(loanPayment.remainingBalance),
                  }
                )
              : userT('loan.contract.template.default.description', {
                  contractName: contractFields.contractName,
                  period: loanPayment.period,
                  type: userT('loan.type.principal'),
                }),
            notes: contractFields.transactionNotes
              ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
                  period: loanPayment.period,
                  contractName: contractFields.contractName || '',
                  remainingBalance: Number(loanPayment.remainingBalance),
                })
              : userT('loan.contract.template.default.notes', {
                  contractName: contractFields.contractName,
                }),
            date: loanPayment.paymentDate,
            loanContractId: loanContract.id,
            loanPaymentId: loanPayment.id,
          }

          // 如果有标签，添加标签关系
          if (
            contractFields.transactionTagIds &&
            Array.isArray(contractFields.transactionTagIds) &&
            contractFields.transactionTagIds.length > 0
          ) {
            principalTransactionData.tags = {
              create: contractFields.transactionTagIds.map((tagId: string) => ({
                tagId,
              })),
            }
          }

          const principalTransaction = await tx.transaction.create({
            data: principalTransactionData,
          })
          transactions.push({ type: 'principal', id: principalTransaction.id })
        }

        // 创建利息支出交易（从还款账户支出）
        if (
          Number(loanPayment.interestAmount) > 0 &&
          contractFields.paymentAccountId
        ) {
          const interestTransactionData: TransactionData = {
            userId: loanContract.userId,
            accountId: contractFields.paymentAccountId,
            currencyId: loanContract.currencyId,
            type: 'EXPENSE',
            amount: Number(loanPayment.interestAmount),
            description: contractFields.transactionDescription
              ? replaceTemplatePlaceholders(
                  contractFields.transactionDescription,
                  {
                    period: loanPayment.period,
                    contractName: contractFields.contractName || '',
                    remainingBalance: Number(loanPayment.remainingBalance),
                  }
                )
              : userT('loan.contract.template.default.description', {
                  contractName: contractFields.contractName,
                  period: loanPayment.period,
                  type: userT('loan.type.interest'),
                }),
            notes: contractFields.transactionNotes
              ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
                  period: loanPayment.period,
                  contractName: contractFields.contractName || '',
                  remainingBalance: Number(loanPayment.remainingBalance),
                })
              : userT('loan.contract.template.default.notes', {
                  contractName: contractFields.contractName,
                }),
            date: loanPayment.paymentDate,
            loanContractId: loanContract.id,
            loanPaymentId: loanPayment.id,
          }

          // 如果有标签，添加标签关系
          if (
            contractFields.transactionTagIds &&
            Array.isArray(contractFields.transactionTagIds) &&
            contractFields.transactionTagIds.length > 0
          ) {
            interestTransactionData.tags = {
              create: contractFields.transactionTagIds.map((tagId: string) => ({
                tagId,
              })),
            }
          }

          const interestTransaction = await tx.transaction.create({
            data: interestTransactionData,
          })
          transactions.push({ type: 'interest', id: interestTransaction.id })
        }

        // 创建负债账户余额更新交易（更新为剩余本金余额）
        // 注意：无论是否有本金还款，都需要生成余额更新记录以确保账户余额准确
        // 这对于"只还利息"模式特别重要，前面几期虽然本金不变，但仍需要余额记录
        const balanceTransactionData: TransactionData = {
          userId: loanContract.userId,
          accountId: loanContract.accountId,
          currencyId: loanContract.currencyId,
          type: 'BALANCE',
          amount: Number(loanPayment.remainingBalance), // 使用剩余余额作为负债账户的新余额
          description: contractFields.transactionDescription
            ? replaceTemplatePlaceholders(
                contractFields.transactionDescription,
                {
                  period: loanPayment.period,
                  contractName: contractFields.contractName || '',
                  remainingBalance: Number(loanPayment.remainingBalance),
                }
              )
            : userT('loan.contract.template.default.description', {
                contractName: contractFields.contractName,
                period: loanPayment.period,
                type: userT('loan.type.balance.update'),
              }),
          notes: contractFields.transactionNotes
            ? replaceTemplatePlaceholders(contractFields.transactionNotes, {
                period: loanPayment.period,
                contractName: contractFields.contractName || '',
                remainingBalance: Number(loanPayment.remainingBalance),
              })
            : userT('loan.contract.template.balance.notes', {
                contractName: contractFields.contractName,
                remainingBalance: Number(
                  loanPayment.remainingBalance
                ).toLocaleString(),
              }),
          date: loanPayment.paymentDate,
          loanContractId: loanContract.id,
          loanPaymentId: loanPayment.id,
        }

        // 注意：本金变动记录（BALANCE类型交易）不使用设置的标签信息
        // 只有还款支出交易（EXPENSE类型）才保留标签处理

        const balanceTransaction = await tx.transaction.create({
          data: balanceTransactionData,
        })
        transactions.push({ type: 'balance', id: balanceTransaction.id })

        // 更新LoanPayment记录状态和关联交易ID
        await tx.loanPayment.update({
          where: { id: loanPayment.id },
          data: {
            status: 'COMPLETED' as const,
            principalTransactionId: transactions.find(
              t => t.type === 'principal'
            )?.id,
            interestTransactionId: transactions.find(t => t.type === 'interest')
              ?.id,
            balanceTransactionId: transactions.find(t => t.type === 'balance')
              ?.id,
            processedAt: new Date(),
          },
        })

        // 更新贷款合约的当前期数和下次还款日期
        const isCompleted = loanPayment.period >= loanContract.totalPeriods
        let nextPaymentDate = null

        if (!isCompleted) {
          nextPaymentDate = new Date(loanContract.startDate)
          nextPaymentDate.setMonth(
            nextPaymentDate.getMonth() + loanPayment.period
          )
          nextPaymentDate.setDate(contractFields.paymentDay)
        }

        // 只有在贷款合约当前为活跃状态时才更新状态
        // 避免重新激活已被手动设置为失效的合约
        const updateData: {
          currentPeriod: number
          isActive?: boolean
          nextPaymentDate?: Date
        } = {
          currentPeriod: loanPayment.period,
        }

        // 只有当合约当前为活跃状态时，才根据完成情况更新isActive
        if (loanContract.isActive) {
          updateData.isActive = !isCompleted
          updateData.nextPaymentDate = nextPaymentDate || undefined
        }

        await tx.loanContract.update({
          where: { id: loanContract.id },
          data: updateData,
        })
      })

      return true
    } catch (error) {
      console.error('处理贷款还款记录失败:', error)
      return false
    }
  }
}

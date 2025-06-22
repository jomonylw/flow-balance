/**
 * 贷款计算服务
 * 提供各种贷款计算功能，包括等额本息、等额本金、只还利息等
 */

import {
  RepaymentType,
  LoanCalculationResult,
  LoanPaymentSchedule,
} from '@/types/core'

export class LoanCalculationService {
  /**
   * 计算贷款还款计划
   * @param loanAmount 贷款总额
   * @param annualInterestRate 年利率（小数形式，如0.05表示5%）
   * @param loanTermMonths 贷款期限（月数）
   * @param repaymentType 还款类型
   * @returns 贷款计算结果
   */
  static calculateLoan(
    loanAmount: number,
    annualInterestRate: number,
    loanTermMonths: number,
    repaymentType: RepaymentType
  ): LoanCalculationResult {
    const monthlyInterestRate = annualInterestRate / 12

    switch (repaymentType) {
      case RepaymentType.EQUAL_PAYMENT:
        return this.calculateEqualPayment(
          loanAmount,
          monthlyInterestRate,
          loanTermMonths
        )
      case RepaymentType.EQUAL_PRINCIPAL:
        return this.calculateEqualPrincipal(
          loanAmount,
          monthlyInterestRate,
          loanTermMonths
        )
      case RepaymentType.INTEREST_ONLY:
        return this.calculateInterestOnly(
          loanAmount,
          monthlyInterestRate,
          loanTermMonths
        )
      default:
        throw new Error(`不支持的还款类型: ${repaymentType}`)
    }
  }

  /**
   * 等额本息计算
   */
  private static calculateEqualPayment(
    loanAmount: number,
    monthlyRate: number,
    termMonths: number
  ): LoanCalculationResult {
    // 月还款额 = 贷款本金 × [月利率 × (1 + 月利率)^还款月数] / [(1 + 月利率)^还款月数 - 1]
    const monthlyPayment =
      monthlyRate === 0
        ? loanAmount / termMonths
        : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)

    const schedule: LoanPaymentSchedule[] = []
    let remainingBalance = loanAmount
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const interestAmount = remainingBalance * monthlyRate
      const principalAmount = monthlyPayment - interestAmount
      remainingBalance -= principalAmount
      totalInterest += interestAmount

      // 最后一期可能需要调整，避免浮点数精度问题
      if (period === termMonths) {
        remainingBalance = 0
      }

      const paymentDate = new Date()
      paymentDate.setMonth(paymentDate.getMonth() + period)

      schedule.push({
        period,
        paymentDate,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(monthlyPayment * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      })
    }

    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((loanAmount + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 等额本金计算
   */
  private static calculateEqualPrincipal(
    loanAmount: number,
    monthlyRate: number,
    termMonths: number
  ): LoanCalculationResult {
    const monthlyPrincipal = loanAmount / termMonths
    const schedule: LoanPaymentSchedule[] = []
    let remainingBalance = loanAmount
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const interestAmount = remainingBalance * monthlyRate
      const principalAmount = monthlyPrincipal
      const totalAmount = principalAmount + interestAmount
      remainingBalance -= principalAmount
      totalInterest += interestAmount

      // 最后一期调整
      if (period === termMonths) {
        remainingBalance = 0
      }

      const paymentDate = new Date()
      paymentDate.setMonth(paymentDate.getMonth() + period)

      schedule.push({
        period,
        paymentDate,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      })
    }

    return {
      monthlyPayment:
        Math.round((monthlyPrincipal + loanAmount * monthlyRate) * 100) / 100, // 首期还款额
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((loanAmount + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 只还利息计算
   */
  private static calculateInterestOnly(
    loanAmount: number,
    monthlyRate: number,
    termMonths: number
  ): LoanCalculationResult {
    const monthlyInterest = loanAmount * monthlyRate
    const schedule: LoanPaymentSchedule[] = []
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const interestAmount = monthlyInterest
      const principalAmount = period === termMonths ? loanAmount : 0 // 最后一期还本金
      const totalAmount = principalAmount + interestAmount
      const remainingBalance = period === termMonths ? 0 : loanAmount
      totalInterest += interestAmount

      const paymentDate = new Date()
      paymentDate.setMonth(paymentDate.getMonth() + period)

      schedule.push({
        period,
        paymentDate,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      })
    }

    return {
      monthlyPayment: Math.round(monthlyInterest * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((loanAmount + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 计算指定期数的还款信息
   * @param loanAmount 贷款总额
   * @param annualInterestRate 年利率
   * @param loanTermMonths 贷款期限
   * @param repaymentType 还款类型
   * @param period 期数
   * @returns 指定期数的还款信息
   */
  static calculatePaymentForPeriod(
    loanAmount: number,
    annualInterestRate: number,
    loanTermMonths: number,
    repaymentType: RepaymentType,
    period: number
  ): LoanPaymentSchedule | null {
    if (period < 1 || period > loanTermMonths) {
      return null
    }

    const calculation = this.calculateLoan(
      loanAmount,
      annualInterestRate,
      loanTermMonths,
      repaymentType
    )
    return calculation.schedule[period - 1] || null
  }

  /**
   * 计算剩余本金
   * @param loanAmount 贷款总额
   * @param annualInterestRate 年利率
   * @param loanTermMonths 贷款期限
   * @param repaymentType 还款类型
   * @param currentPeriod 当前期数
   * @returns 剩余本金
   */
  static calculateRemainingBalance(
    loanAmount: number,
    annualInterestRate: number,
    loanTermMonths: number,
    repaymentType: RepaymentType,
    currentPeriod: number
  ): number {
    if (currentPeriod >= loanTermMonths) {
      return 0
    }

    const calculation = this.calculateLoan(
      loanAmount,
      annualInterestRate,
      loanTermMonths,
      repaymentType
    )
    const paymentInfo = calculation.schedule[currentPeriod - 1]
    return paymentInfo ? paymentInfo.remainingBalance : loanAmount
  }

  /**
   * 验证贷款参数
   * @param loanAmount 贷款总额
   * @param annualInterestRate 年利率
   * @param loanTermMonths 贷款期限
   * @returns 验证结果
   */
  static validateLoanParameters(
    loanAmount: number,
    annualInterestRate: number,
    loanTermMonths: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!loanAmount || loanAmount <= 0) {
      errors.push('贷款金额必须大于0')
    }

    if (annualInterestRate < 0 || annualInterestRate > 1) {
      errors.push('年利率必须在0-100%之间')
    }

    if (
      !loanTermMonths ||
      loanTermMonths <= 0 ||
      !Number.isInteger(loanTermMonths)
    ) {
      errors.push('贷款期限必须是正整数（月数）')
    }

    if (loanTermMonths > 600) {
      // 50年
      errors.push('贷款期限不能超过50年（600个月）')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

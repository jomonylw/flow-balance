import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'
import {
  getUserTranslator,
  createServerTranslator,
} from '@/lib/utils/server-i18n'
// import { PrismaClient } from '@prisma/client'

// const _prisma = new PrismaClient()

/**
 * 重置指定的还款记录
 * POST /api/loan-contracts/[id]/payments/reset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      const defaultT = createServerTranslator('zh') // 用户未登录时使用默认翻译
      return NextResponse.json(
        { success: false, error: defaultT('loan.payment.reset.unauthorized') },
        { status: 401 }
      )
    }

    // 获取用户语言偏好并创建翻译函数
    const t = await getUserTranslator(user.id)

    const { id: loanContractId } = await params
    const body = await request.json()
    const { paymentIds, resetAll } = body

    // 验证参数
    if (resetAll) {
      // 重置所有已完成的还款记录
      const result = await LoanContractService.resetAllCompletedPayments(
        loanContractId,
        user.id
      )

      return NextResponse.json({
        success: true,
        data: {
          message: t('loan.payment.reset.success.message', {
            resetCount: result.resetCount,
            deletedTransactions: result.deletedTransactions,
          }),
          resetCount: result.resetCount,
          deletedTransactions: result.deletedTransactions,
        },
      })
    } else {
      // 重置指定的还款记录
      if (
        !paymentIds ||
        !Array.isArray(paymentIds) ||
        paymentIds.length === 0
      ) {
        return NextResponse.json(
          { success: false, error: t('loan.payment.reset.select.records') },
          { status: 400 }
        )
      }

      const result = await LoanContractService.resetLoanPayments(
        loanContractId,
        user.id,
        paymentIds
      )

      return NextResponse.json({
        success: true,
        data: {
          message: t('loan.payment.reset.success.message', {
            resetCount: result.resetCount,
            deletedTransactions: result.deletedTransactions,
          }),
          resetCount: result.resetCount,
          deletedTransactions: result.deletedTransactions,
        },
      })
    }
  } catch (error) {
    console.error('Failed to reset payment records:', error)
    const defaultT = createServerTranslator('zh') // 错误情况下使用默认翻译
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : defaultT('loan.payment.reset.failed'),
      },
      { status: 500 }
    )
  }
}

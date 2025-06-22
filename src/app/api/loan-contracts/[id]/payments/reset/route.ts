import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'

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
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

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
          message: `成功重置 ${result.resetCount} 条还款记录，删除 ${result.deletedTransactions} 条交易记录`,
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
          { success: false, error: '请选择要重置的还款记录' },
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
          message: `成功重置 ${result.resetCount} 条还款记录，删除 ${result.deletedTransactions} 条交易记录`,
          resetCount: result.resetCount,
          deletedTransactions: result.deletedTransactions,
        },
      })
    }
  } catch (error) {
    console.error('重置还款记录失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '重置还款记录失败',
      },
      { status: 500 }
    )
  }
}

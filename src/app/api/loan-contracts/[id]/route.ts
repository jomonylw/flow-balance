/**
 * 贷款合约详情API
 * PUT /api/loan-contracts/[id] - 更新贷款合约
 * DELETE /api/loan-contracts/[id] - 删除贷款合约
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'
import { LoanContractFormData } from '@/types/core'
import { createServerTranslator } from '@/lib/utils/server-i18n'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = createServerTranslator()

  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.unauthorized') },
        { status: 401 }
      )
    }

    const data: Partial<LoanContractFormData> = await request.json()

    // 验证数据
    if (data.loanAmount !== undefined && data.loanAmount <= 0) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.amount.invalid') },
        { status: 400 }
      )
    }

    if (
      data.interestRate !== undefined &&
      (data.interestRate < 0 || data.interestRate > 1)
    ) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.rate.invalid') },
        { status: 400 }
      )
    }

    if (
      data.totalPeriods !== undefined &&
      (data.totalPeriods <= 0 || !Number.isInteger(data.totalPeriods))
    ) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.periods.invalid') },
        { status: 400 }
      )
    }

    // 如果修改了总期数，需要额外验证
    if (data.totalPeriods !== undefined) {
      // 获取现有合约信息来验证期数
      const existingContract = await LoanContractService.getLoanContractById(
        id,
        user.id
      )
      if (!existingContract) {
        return NextResponse.json(
          { success: false, error: t('loan.contract.not.exists') },
          { status: 404 }
        )
      }

      // 检查已完成的最大期数
      const completedPayments = existingContract.payments || []
      const maxCompletedPeriod =
        completedPayments.length > 0
          ? Math.max(
              ...completedPayments
                .filter((p: { status: string }) => p.status === 'COMPLETED')
                .map((p: { period: number }) => p.period)
            )
          : 0

      if (data.totalPeriods <= maxCompletedPeriod) {
        return NextResponse.json(
          {
            success: false,
            error: t('loan.contract.periods.too.small', {
              maxPeriod: maxCompletedPeriod.toString(),
            }),
          },
          { status: 400 }
        )
      }
    }

    const loanContract = await LoanContractService.updateLoanContract(
      id,
      user.id,
      data
    )

    return NextResponse.json({
      success: true,
      data: { loanContract },
    })
  } catch (error) {
    console.error('Failed to update loan contract:', error)
    return NextResponse.json(
      {
        success: false,
        error: t('loan.contract.update.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = createServerTranslator()

  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: t('loan.contract.unauthorized') },
        { status: 401 }
      )
    }

    // 解析删除选项
    const body = await request.json().catch(() => ({}))
    const options = {
      preserveBalanceTransactions: body.preserveBalanceTransactions || false,
      preservePaymentTransactions: body.preservePaymentTransactions || false,
    }

    console.warn(
      `API DELETE: contractId=${id}, userId=${user.id}, options=`,
      options
    )
    const result = await LoanContractService.deleteLoanContract(
      id,
      user.id,
      options
    )

    return NextResponse.json({
      success: true,
      message: t('loan.contract.deleted'),
      stats: result.stats,
    })
  } catch (error) {
    console.error('Failed to delete loan contract:', error)
    return NextResponse.json(
      {
        success: false,
        error: t('loan.contract.delete.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}

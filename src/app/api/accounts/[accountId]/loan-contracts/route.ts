/**
 * 账户贷款合约API
 * GET /api/accounts/[accountId]/loan-contracts - 获取指定账户的贷款合约
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'
import {
  getCommonError,
  getLoanContractError,
} from '@/lib/constants/api-messages'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: getCommonError('UNAUTHORIZED') },
        { status: 401 }
      )
    }

    const loanContracts = await LoanContractService.getAccountLoanContracts(
      user.id,
      accountId
    )

    return NextResponse.json({
      success: true,
      data: { loanContracts },
    })
  } catch (error) {
    console.error('获取账户贷款合约失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: getLoanContractError('NOT_FOUND'),
        details:
          error instanceof Error
            ? error.message
            : getCommonError('INTERNAL_ERROR'),
      },
      { status: 500 }
    )
  }
}

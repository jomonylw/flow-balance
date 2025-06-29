/**
 * 账户定期交易API
 * GET /api/accounts/[accountId]/recurring-transactions - 获取指定账户的定期交易
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { RecurringTransactionService } from '@/lib/services/recurring-transaction.service'
import {
  getCommonError,
  getRecurringTransactionError,
} from '@/lib/constants/api-messages'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  let accountId: string | undefined
  let user: { id: string } | null = null

  try {
    const paramsData = await params
    accountId = paramsData.accountId
    user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: getCommonError('UNAUTHORIZED') },
        { status: 401 }
      )
    }

    const recurringTransactions =
      await RecurringTransactionService.getAccountRecurringTransactions(
        user.id,
        accountId
      )

    return NextResponse.json({
      success: true,
      data: { recurringTransactions },
    })
  } catch (error) {
    console.error('获取账户定期交易失败:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      accountId: accountId || 'unknown',
      userId: user?.id || 'unknown',
    })
    return NextResponse.json(
      {
        success: false,
        error: getRecurringTransactionError('NOT_FOUND'),
        details:
          error instanceof Error
            ? error.message
            : getCommonError('INTERNAL_ERROR'),
      },
      { status: 500 }
    )
  }
}

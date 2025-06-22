/**
 * 定期交易API
 * GET /api/recurring-transactions - 获取用户的定期交易列表
 * POST /api/recurring-transactions - 创建新的定期交易
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { RecurringTransactionService } from '@/lib/services/recurring-transaction.service'
import { RecurringTransactionFormData } from '@/types/core'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const recurringTransactions =
      await RecurringTransactionService.getUserRecurringTransactions(user.id)

    return NextResponse.json({
      success: true,
      data: { recurringTransactions },
    })
  } catch (error) {
    console.error('获取定期交易列表失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取定期交易列表失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const data: RecurringTransactionFormData = await request.json()

    // 基础验证
    if (
      !data.accountId ||
      !data.currencyCode ||
      !data.type ||
      !data.amount ||
      !data.description ||
      !data.frequency ||
      !data.startDate
    ) {
      return NextResponse.json(
        { success: false, error: '缺少必要字段' },
        { status: 400 }
      )
    }

    if (data.amount <= 0) {
      return NextResponse.json(
        { success: false, error: '金额必须大于0' },
        { status: 400 }
      )
    }

    const recurringTransaction =
      await RecurringTransactionService.createRecurringTransaction(
        user.id,
        data
      )

    return NextResponse.json({
      success: true,
      data: { recurringTransaction },
    })
  } catch (error) {
    console.error('创建定期交易失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '创建定期交易失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

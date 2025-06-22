/**
 * 定期交易详情API
 * PUT /api/recurring-transactions/[id] - 更新定期交易
 * DELETE /api/recurring-transactions/[id] - 删除定期交易
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { RecurringTransactionService } from '@/lib/services/recurring-transaction.service'
import { RecurringTransactionFormData } from '@/types/core'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const data: Partial<RecurringTransactionFormData> = await request.json()

    // 验证金额
    if (data.amount !== undefined && data.amount <= 0) {
      return NextResponse.json(
        { success: false, error: '金额必须大于0' },
        { status: 400 }
      )
    }

    const recurringTransaction =
      await RecurringTransactionService.updateRecurringTransaction(
        id,
        user.id,
        data
      )

    return NextResponse.json({
      success: true,
      data: { recurringTransaction },
    })
  } catch (error) {
    console.error('更新定期交易失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '更新定期交易失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    await RecurringTransactionService.deleteRecurringTransaction(id, user.id)

    return NextResponse.json({
      success: true,
      message: '定期交易已删除',
    })
  } catch (error) {
    console.error('删除定期交易失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '删除定期交易失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

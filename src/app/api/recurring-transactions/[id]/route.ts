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
    console.log(`[DELETE RECURRING TRANSACTION] 开始删除定期交易，ID: ${id}`)

    const user = await getCurrentUser()
    if (!user) {
      console.log('[DELETE RECURRING TRANSACTION] 用户未授权')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    console.log(`[DELETE RECURRING TRANSACTION] 用户ID: ${user.id}`)

    await RecurringTransactionService.deleteRecurringTransaction(id, user.id)

    console.log(`[DELETE RECURRING TRANSACTION] 定期交易删除成功: ${id}`)
    return NextResponse.json({
      success: true,
      message: '定期交易已删除',
    })
  } catch (error) {
    console.error(
      '[DELETE RECURRING TRANSACTION] 删除定期交易时发生错误:',
      error
    )

    // 提供更详细的错误信息
    let errorMessage = '删除定期交易失败'
    let statusCode = 500

    if (error instanceof Error) {
      console.error('[DELETE RECURRING TRANSACTION] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // 检查是否是特定的业务错误
      if (error.message.includes('不存在')) {
        errorMessage = '定期交易不存在或已被删除'
        statusCode = 404
      } else if (error.message.includes('权限')) {
        errorMessage = '无权限删除此定期交易'
        statusCode = 403
      } else {
        errorMessage = `删除失败：${error.message}`
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: statusCode }
    )
  }
}

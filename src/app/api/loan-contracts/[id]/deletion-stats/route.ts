/**
 * 贷款合约删除统计API
 * GET /api/loan-contracts/[id]/deletion-stats - 获取删除统计信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'

export async function GET(
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

    const stats = await LoanContractService.getLoanContractDeletionStats(
      id,
      user.id
    )

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('获取删除统计信息失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取删除统计信息失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

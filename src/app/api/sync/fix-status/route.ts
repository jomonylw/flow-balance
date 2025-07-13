/**
 * 修复同步状态不一致API
 * POST /api/sync/fix-status - 修复状态不一致问题
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { SyncStatusService } from '@/lib/services/sync-status.service'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const fixed = await SyncStatusService.fixStatusInconsistency(user.id)

    return NextResponse.json({
      success: true,
      data: {
        fixed,
        message: fixed ? '状态不一致问题已修复' : '未发现状态不一致问题',
      },
    })
  } catch (error) {
    console.error('修复同步状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '修复同步状态失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

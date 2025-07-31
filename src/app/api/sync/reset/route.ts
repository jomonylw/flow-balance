/**
 * 强制重置同步状态API
 * POST /api/sync/reset - 强制重置用户同步状态为idle
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

    // 强制重置处理状态为idle（彻底清理）
    await SyncStatusService.forceResetProcessingStatus(user.id)

    return NextResponse.json({
      success: true,
      data: {
        message: '系统更新状态已强制重置',
        status: 'idle',
        resetTime: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('强制重置同步状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '强制重置同步状态失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 同步状态API
 * GET /api/sync/status - 获取用户同步状态
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { SyncStatusService } from '@/lib/services/sync-status.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const syncStatus = await SyncStatusService.getSyncStatus(user.id)

    return NextResponse.json({
      success: true,
      data: syncStatus,
    })
  } catch (error) {
    console.error('获取同步状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取同步状态失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

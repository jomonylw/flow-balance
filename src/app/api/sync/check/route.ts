/**
 * 同步检查API
 * GET /api/sync/check - 检查是否需要同步
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

    const needsSync = await SyncStatusService.needsSync(user.id)

    return NextResponse.json({
      success: true,
      data: { needsSync },
    })
  } catch (error) {
    console.error('检查同步状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '检查同步状态失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

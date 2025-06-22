/**
 * 同步摘要API
 * GET /api/sync/summary - 获取同步摘要信息
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { UnifiedSyncService } from '@/lib/services/unified-sync.service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const summary = await UnifiedSyncService.getSyncSummary(user.id)

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error('获取同步摘要失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取同步摘要失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

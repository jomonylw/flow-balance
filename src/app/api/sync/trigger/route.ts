/**
 * 同步触发API
 * POST /api/sync/trigger - 触发用户数据同步
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { UnifiedSyncService } from '@/lib/services/unified-sync.service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { force = false } = body

    const result = await UnifiedSyncService.triggerUserSync(user.id, force)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('同步触发失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '同步触发失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

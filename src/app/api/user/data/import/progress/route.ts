/**
 * 数据导入进度跟踪API
 * GET /api/user/data/import/progress - 获取导入进度
 * POST /api/user/data/import/progress - 开始带进度跟踪的导入
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { DataImportService } from '@/lib/services/data-import.service'
import { DataIntegrityService } from '@/lib/services/data-integrity.service'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import {
  getUserTranslator,
  getUserTranslatorSafe,
} from '@/lib/utils/server-i18n'
import type {
  ExportedData,
  ImportOptions,
  ImportProgress,
} from '@/types/data-import'

// 内存中的进度跟踪存储（生产环境中应该使用Redis或数据库）
const progressStore = new Map<string, ImportProgress>()

/**
 * 获取导入进度
 */
export async function GET(request: NextRequest) {
  let user: any = null

  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      // 只在需要时获取用户语言设置
      try {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('data.import.session.id.required'))
      } catch {
        return validationErrorResponse('Session ID is required')
      }
    }

    const progress = progressStore.get(`${user.id}_${sessionId}`)

    if (!progress) {
      // 只在需要时获取用户语言设置
      try {
        const t = await getUserTranslator(user.id)
        return NextResponse.json(
          {
            success: false,
            error: t('data.import.session.not.found'),
          },
          { status: 404 }
        )
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Import session not found',
          },
          { status: 404 }
        )
      }
    }

    return successResponse(progress)
  } catch (error) {
    console.error('Failed to get import progress:', error)

    // 避免在错误处理中再次查询数据库
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get import progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * 开始带进度跟踪的数据导入
 */
export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析请求体
    const body = await request.json()
    const { data, options = {}, sessionId } = body

    // 验证必要字段
    if (!data) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.data.required'))
    }

    if (!sessionId) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.session.id.required'))
    }

    // 验证数据格式
    if (!data.exportInfo || !data.user) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.format.invalid'))
    }

    // 检查数据版本
    const supportedVersions = ['1.0', '2.0']
    if (!supportedVersions.includes(data.exportInfo.version)) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(
        t('data.import.version.unsupported', {
          version: data.exportInfo.version,
          supported: supportedVersions.join(', '),
        })
      )
    }

    const progressKey = `${user.id}_${sessionId}`

    // 初始化进度
    const initialProgress: ImportProgress = {
      stage: 'initializing',
      current: 0,
      total: 0,
      percentage: 0,
      message: '正在初始化导入...',
    }
    progressStore.set(progressKey, initialProgress)

    // 设置导入选项，包含进度回调
    const importOptions: ImportOptions = {
      overwriteExisting: options.overwriteExisting || false,
      skipDuplicates: options.skipDuplicates || true,
      validateData: options.validateData !== false,
      createMissingCurrencies: options.createMissingCurrencies || true,
      enableProgressTracking: true,
      onProgress: (progress: ImportProgress) => {
        progressStore.set(progressKey, progress)
      },
      ...options,
    }

    // 异步执行导入，不阻塞响应
    // 使用 Promise 而不是 setImmediate 来更好地处理错误和连接管理
    Promise.resolve().then(async () => {
      try {
        // 更新进度：开始验证
        const t = await getUserTranslatorSafe(user.id)
        progressStore.set(progressKey, {
          stage: 'validating',
          current: 0,
          total: 100,
          percentage: 5,
          message: t('data.import.validating'),
        })

        // 执行数据完整性检查
        const integrityResult =
          await DataIntegrityService.checkExportDataIntegrity(
            data as ExportedData
          )

        if (!integrityResult.isValid) {
          progressStore.set(progressKey, {
            stage: 'failed',
            current: 0,
            total: 100,
            percentage: 0,
            message: t('data.import.integrity.check.failed', {
              error: integrityResult.errors[0]?.message || t('error.unknown'),
            }),
          })
          return
        }

        // 更新进度：开始导入
        progressStore.set(progressKey, {
          stage: 'importing',
          current: 0,
          total: 100,
          percentage: 10,
          message: t('data.import.starting'),
        })

        // 执行数据导入
        const result = await DataImportService.importUserData(
          user.id,
          data as ExportedData,
          importOptions
        )

        // 更新最终进度
        if (result.success) {
          const t = await getUserTranslatorSafe(user.id)
          progressStore.set(progressKey, {
            stage: 'completed',
            current: 100,
            total: 100,
            percentage: 100,
            message: t('data.import.completed', {
              created: result.statistics.created,
              updated: result.statistics.updated,
            }),
          })
        } else {
          const t = await getUserTranslatorSafe(user.id)
          progressStore.set(progressKey, {
            stage: 'failed',
            current: result.statistics.processed,
            total: result.statistics.processed + result.statistics.failed,
            percentage: 90,
            message: t('data.import.failed', { message: result.message }),
          })
        }

        // 2分钟后清理进度数据，给用户足够时间查看结果
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 120000)
      } catch (error) {
        console.error('Error during async import process:', error)
        const t = await getUserTranslatorSafe(user.id)
        progressStore.set(progressKey, {
          stage: 'failed',
          current: 0,
          total: 100,
          percentage: 0,
          message: t('data.import.error', {
            error: error instanceof Error ? error.message : t('error.unknown'),
          }),
        })

        // 2分钟后清理进度数据，给用户足够时间查看结果
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 120000)
      }
    })

    // 立即返回会话ID，客户端可以用来轮询进度
    const t = await getUserTranslator(user.id)
    return successResponse({
      sessionId,
      message: t('data.import.started'),
    })
  } catch (error) {
    console.error('Failed to start import:', error)
    const t = await getUserTranslator(user?.id || '')

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse(t('data.import.json.format.error'))
    }

    return NextResponse.json(
      {
        success: false,
        error: t('data.import.start.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}

/**
 * 取消导入操作
 */
export async function DELETE(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.session.id.required'))
    }

    const progressKey = `${user.id}_${sessionId}`
    const progress = progressStore.get(progressKey)

    if (!progress) {
      const t = await getUserTranslator(user.id)
      return NextResponse.json(
        {
          success: false,
          error: t('data.import.session.not.found'),
        },
        { status: 404 }
      )
    }

    // 如果导入还在进行中，标记为已取消
    if (progress.stage === 'validating' || progress.stage === 'importing') {
      const t = await getUserTranslator(user.id)
      progressStore.set(progressKey, {
        ...progress,
        stage: 'cancelled',
        message: t('data.import.cancelled.by.user'),
      })

      // 5秒后清理进度数据
      setTimeout(() => {
        progressStore.delete(progressKey)
      }, 5000)

      return successResponse({
        message: t('data.import.cancelled'),
      })
    } else {
      const t = await getUserTranslator(user.id)
      return NextResponse.json(
        {
          success: false,
          error: t('data.import.cannot.cancel.completed'),
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Failed to cancel import:', error)
    const t = await getUserTranslator(user?.id || '')
    return NextResponse.json(
      {
        success: false,
        error: t('data.import.cancel.failed'),
        details: error instanceof Error ? error.message : t('error.unknown'),
      },
      { status: 500 }
    )
  }
}

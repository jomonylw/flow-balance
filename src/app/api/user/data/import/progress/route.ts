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
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return validationErrorResponse('缺少会话ID')
    }

    const progress = progressStore.get(`${user.id}_${sessionId}`)

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: '未找到导入会话',
        },
        { status: 404 }
      )
    }

    return successResponse(progress)
  } catch (error) {
    console.error('获取导入进度失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取导入进度失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 开始带进度跟踪的数据导入
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析请求体
    const body = await request.json()
    const { data, options = {}, sessionId } = body

    // 验证必要字段
    if (!data) {
      return validationErrorResponse('缺少导入数据')
    }

    if (!sessionId) {
      return validationErrorResponse('缺少会话ID')
    }

    // 验证数据格式
    if (!data.exportInfo || !data.user) {
      return validationErrorResponse('导入数据格式不正确')
    }

    // 检查数据版本
    const supportedVersions = ['1.0', '2.0']
    if (!supportedVersions.includes(data.exportInfo.version)) {
      return validationErrorResponse(
        `不支持的数据版本: ${data.exportInfo.version}，支持的版本: ${supportedVersions.join(', ')}`
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
      batchSize: options.batchSize || 100,
      enableProgressTracking: true,
      onProgress: (progress: ImportProgress) => {
        progressStore.set(progressKey, progress)
      },
      ...options,
    }

    // 异步执行导入，不阻塞响应
    setImmediate(async () => {
      try {
        // 更新进度：开始验证
        progressStore.set(progressKey, {
          stage: 'validating',
          current: 0,
          total: 100,
          percentage: 5,
          message: '正在验证数据完整性...',
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
            message: `数据完整性检查失败: ${integrityResult.errors[0]?.message || '未知错误'}`,
          })
          return
        }

        // 更新进度：开始导入
        progressStore.set(progressKey, {
          stage: 'importing',
          current: 0,
          total: 100,
          percentage: 10,
          message: '开始导入数据...',
        })

        // 执行数据导入
        const result = await DataImportService.importUserData(
          user.id,
          data as ExportedData,
          importOptions
        )

        // 更新最终进度
        if (result.success) {
          progressStore.set(progressKey, {
            stage: 'completed',
            current: 100,
            total: 100,
            percentage: 100,
            message: `导入完成：创建 ${result.statistics.created} 条记录，更新 ${result.statistics.updated} 条记录`,
          })
        } else {
          progressStore.set(progressKey, {
            stage: 'failed',
            current: result.statistics.processed,
            total: result.statistics.processed + result.statistics.failed,
            percentage: 90,
            message: `导入失败：${result.message}`,
          })
        }

        // 30秒后清理进度数据
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 30000)
      } catch (error) {
        console.error('异步导入过程中发生错误:', error)
        progressStore.set(progressKey, {
          stage: 'failed',
          current: 0,
          total: 100,
          percentage: 0,
          message: `导入过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        })

        // 30秒后清理进度数据
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 30000)
      }
    })

    // 立即返回会话ID，客户端可以用来轮询进度
    return successResponse({
      sessionId,
      message: '导入已开始，请使用会话ID查询进度',
    })
  } catch (error) {
    console.error('启动导入失败:', error)

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse('导入数据格式错误，请确保是有效的JSON格式')
    }

    return NextResponse.json(
      {
        success: false,
        error: '启动导入失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 取消导入操作
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return validationErrorResponse('缺少会话ID')
    }

    const progressKey = `${user.id}_${sessionId}`
    const progress = progressStore.get(progressKey)

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: '未找到导入会话',
        },
        { status: 404 }
      )
    }

    // 如果导入还在进行中，标记为已取消
    if (progress.stage === 'validating' || progress.stage === 'importing') {
      progressStore.set(progressKey, {
        ...progress,
        stage: 'cancelled',
        message: '导入已被用户取消',
      })

      // 5秒后清理进度数据
      setTimeout(() => {
        progressStore.delete(progressKey)
      }, 5000)

      return successResponse({
        message: '导入已取消',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '无法取消已完成或失败的导入',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('取消导入失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '取消导入失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

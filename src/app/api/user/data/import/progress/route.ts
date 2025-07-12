/**
 * 数据导入进度跟踪API
 * GET /api/user/data/import/progress - 获取导入进度
 * POST /api/user/data/import/progress - 开始带进度跟踪的导入
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getCurrentUser } from '@/lib/services/auth.service'
import { DataImportService } from '@/lib/services/data-import.service'
import { DataIntegrityService } from '@/lib/services/data-integrity.service'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { getUserTranslator } from '@/lib/utils/server-i18n'
import type {
  ExportedData,
  ImportOptions,
  ImportProgress,
} from '@/types/data-import'

// 内存中的进度跟踪存储（生产环境中应该使用Redis或数据库）
const progressStore = new Map<string, ImportProgress>()

// 用户会话缓存，避免在进度查询时重复查询数据库
interface CachedUserInfo {
  id: string
  email: string
  name: string
  language: string
}

// 用户类型定义
interface UserForCache {
  id: string
  email: string
  name: string
  settings?: {
    language?: string
  } | null
}

const userSessionCache = new Map<
  string,
  { user: CachedUserInfo; timestamp: number }
>()
const USER_CACHE_TTL = 10 * 60 * 1000 // 10分钟缓存

/**
 * 缓存用户信息，供进度查询使用
 */
function cacheUserForSession(sessionId: string, user: UserForCache): void {
  const cachedUser: CachedUserInfo = {
    id: user.id,
    email: user.email,
    name: user.name,
    language: user.settings?.language || 'zh',
  }

  userSessionCache.set(sessionId, {
    user: cachedUser,
    timestamp: Date.now(),
  })
}

/**
 * 创建轻量级翻译器，避免数据库查询
 */
function createLightweightTranslator(language: string) {
  try {
    const translationPath = path.join(
      process.cwd(),
      'public',
      'locales',
      language,
      'data.json'
    )
    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'))

    return (key: string, params?: Record<string, string | number>) => {
      let text = translations[key] || key

      // 简单的参数替换
      if (params && typeof text === 'string') {
        Object.entries(params).forEach(([paramKey, value]) => {
          text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value))
        })
      }

      return text
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error)
    // 返回一个默认的翻译器
    return (key: string) => key
  }
}

/**
 * 获取缓存的用户信息
 */
function getCachedUserForSession(sessionId: string): CachedUserInfo | null {
  const cached = userSessionCache.get(sessionId)
  const now = Date.now()

  if (cached && now - cached.timestamp < USER_CACHE_TTL) {
    return cached.user
  }

  return null
}

/**
 * 清理过期的用户缓存
 */
function cleanupExpiredUserCache(): void {
  const now = Date.now()
  for (const [sessionId, cached] of userSessionCache.entries()) {
    if (now - cached.timestamp > USER_CACHE_TTL) {
      userSessionCache.delete(sessionId)
    }
  }
}

/**
 * 获取导入进度
 * 优化版本：避免在导入过程中进行数据库查询，防止连接冲突
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return validationErrorResponse('Session ID is required')
  }

  try {
    // 清理过期缓存
    cleanupExpiredUserCache()

    // 首先尝试从缓存获取用户信息
    let cachedUser = getCachedUserForSession(sessionId)

    // 如果缓存中没有用户信息，尝试获取当前用户（但要小心连接冲突）
    if (!cachedUser) {
      try {
        const user = await getCurrentUser()
        if (!user) {
          return unauthorizedResponse()
        }

        // 缓存用户信息
        cacheUserForSession(sessionId, user)
        cachedUser = getCachedUserForSession(sessionId)
      } catch (dbError) {
        // 如果数据库查询失败（可能是连接被占用），尝试从进度存储中推断用户ID
        console.warn(
          'Database query failed during progress check, trying to find progress without user verification:',
          dbError
        )

        // 尝试从所有进度记录中找到匹配的会话
        for (const [key, progress] of progressStore.entries()) {
          if (key.endsWith(`_${sessionId}`)) {
            // 找到了进度记录，直接返回
            return successResponse(progress)
          }
        }

        return NextResponse.json(
          {
            success: false,
            error:
              'Import session not found or database connection unavailable',
          },
          { status: 404 }
        )
      }
    }

    if (!cachedUser) {
      return unauthorizedResponse()
    }

    const progress = progressStore.get(`${cachedUser.id}_${sessionId}`)

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import session not found',
        },
        { status: 404 }
      )
    }

    return successResponse(progress)
  } catch (error) {
    console.error('Failed to get import progress:', error)

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

    // 缓存用户信息，供后续进度查询使用
    cacheUserForSession(sessionId, user)

    const progressKey = `${user.id}_${sessionId}`

    // 获取缓存的用户语言信息
    const cachedUser = getCachedUserForSession(sessionId)
    const userLanguage = cachedUser?.language || 'zh'
    const t = createLightweightTranslator(userLanguage)

    // 初始化进度
    const initialProgress: ImportProgress = {
      stage: 'initializing',
      current: 0,
      total: 0,
      percentage: 0,
      message: t('data.loading'),
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
        // 在异步函数内部创建翻译器
        const t = createLightweightTranslator(userLanguage)

        // 更新进度：开始验证
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
          progressStore.set(progressKey, {
            stage: 'failed',
            current: result.statistics.processed,
            total: result.statistics.processed + result.statistics.failed,
            percentage: 90,
            message: t('data.import.failed', {
              message: result.message,
            }),
          })
        }

        // 2分钟后清理进度数据，给用户足够时间查看结果
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 120000)
      } catch (error) {
        console.error('Error during async import process:', error)
        const t = createLightweightTranslator(userLanguage)
        progressStore.set(progressKey, {
          stage: 'failed',
          current: 0,
          total: 100,
          percentage: 0,
          message:
            t('data.import.error.message') +
            `: ${error instanceof Error ? error.message : t('error.unknown')}`,
        })

        // 2分钟后清理进度数据，给用户足够时间查看结果
        setTimeout(() => {
          progressStore.delete(progressKey)
        }, 120000)
      }
    })

    // 立即返回会话ID，客户端可以用来轮询进度
    return successResponse({
      sessionId,
      message: t('data.import.started'),
    })
  } catch (error) {
    console.error('Failed to start import:', error)

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse('Invalid JSON format in import data')
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * 取消导入操作
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return validationErrorResponse('Session ID is required')
  }

  try {
    // 尝试从缓存获取用户信息
    let cachedUser = getCachedUserForSession(sessionId)

    if (!cachedUser) {
      // 如果缓存中没有，尝试获取当前用户
      try {
        const user = await getCurrentUser()
        if (!user) {
          return unauthorizedResponse()
        }
        cacheUserForSession(sessionId, user)
        cachedUser = getCachedUserForSession(sessionId)
      } catch (dbError) {
        // 如果数据库查询失败，尝试从进度存储中推断
        console.warn('Database query failed during cancel request:', dbError)
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to verify user session',
          },
          { status: 401 }
        )
      }
    }

    if (!cachedUser) {
      return unauthorizedResponse()
    }

    const progressKey = `${cachedUser.id}_${sessionId}`
    const progress = progressStore.get(progressKey)

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import session not found',
        },
        { status: 404 }
      )
    }

    // 如果导入还在进行中，标记为已取消
    if (progress.stage === 'validating' || progress.stage === 'importing') {
      // 获取用户语言并创建翻译器
      const userLanguage = cachedUser.language
      const t = createLightweightTranslator(userLanguage)

      progressStore.set(progressKey, {
        ...progress,
        stage: 'cancelled',
        message: t('data.import.cancelled'),
      })

      // 5秒后清理进度数据
      setTimeout(() => {
        progressStore.delete(progressKey)
      }, 5000)

      return successResponse({
        message: t('data.import.cancel.success'),
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot cancel completed or failed import',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Failed to cancel import:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

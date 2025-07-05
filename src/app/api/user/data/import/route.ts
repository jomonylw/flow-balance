import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { DataImportService } from '@/lib/services/data-import.service'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { ExportedData, ImportOptions } from '@/types/data-import'
import { getUserTranslator } from '@/lib/utils/server-i18n'

/**
 * 用户数据导入API
 * POST /api/user/data/import - 导入用户数据
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
    const { data, options = {} } = body

    // 验证必要字段
    if (!data) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.data.required'))
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

    // 设置默认导入选项
    const importOptions: ImportOptions = {
      overwriteExisting: options.overwriteExisting || false,
      skipDuplicates: options.skipDuplicates || true,
      validateData: options.validateData !== false,
      createMissingCurrencies: options.createMissingCurrencies || true,
      ...options,
    }

    // 执行数据导入
    const result = await DataImportService.importUserData(
      user.id,
      data as ExportedData,
      importOptions
    )

    const t = await getUserTranslator(user.id)

    if (result.success) {
      const message =
        result.message === 'import.success'
          ? t('data.import.success', {
              created: result.statistics.created,
              updated: result.statistics.updated,
            })
          : result.message

      return successResponse(
        {
          statistics: result.statistics,
          warnings: result.warnings,
        },
        message
      )
    } else {
      const errorMessage =
        result.message === 'import.partial.success'
          ? t('data.import.partial.success', {
              failed: result.statistics.failed,
            })
          : result.message

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          data: {
            statistics: result.statistics,
            errors: result.errors,
            warnings: result.warnings,
          },
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Import data error:', error)
    const t = await getUserTranslator(user?.id || '')

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse(t('data.import.json.format.error'))
    }

    return NextResponse.json(
      {
        success: false,
        error: t('data.import.failed'),
        data: {
          details: error instanceof Error ? error.message : t('error.unknown'),
        },
      },
      { status: 500 }
    )
  }
}

/**
 * 验证导入数据API
 * PUT /api/user/data/import - 验证导入数据但不执行导入
 */
export async function PUT(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析请求体
    const body = await request.json()
    const { data } = body

    // 验证必要字段
    if (!data) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.data.required'))
    }

    // 验证数据格式
    if (!data.exportInfo || !data.user) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('data.import.format.invalid'))
    }

    // 执行数据验证
    const validation = await DataImportService.validateImportData(
      data as ExportedData
    )

    return successResponse({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      missingCurrencies: validation.missingCurrencies,
      duplicateNames: validation.duplicateNames,
      dataInfo: {
        version: data.exportInfo.version,
        exportDate: data.exportInfo.exportDate,
        appName: data.exportInfo.appName,
        statistics: data.statistics,
      },
    })
  } catch (error) {
    console.error('Validate import data error:', error)
    const t = await getUserTranslator(user?.id || '')

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse(t('data.import.json.format.error'))
    }

    return NextResponse.json(
      {
        success: false,
        error: t('data.import.validation.failed'),
        data: {
          details: error instanceof Error ? error.message : t('error.unknown'),
        },
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { DataImportService } from '@/lib/services/data-import.service'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { ExportedData, ImportOptions } from '@/types/data-import'

/**
 * 用户数据导入API
 * POST /api/user/data/import - 导入用户数据
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析请求体
    const body = await request.json()
    const { data, options = {} } = body

    // 验证必要字段
    if (!data) {
      return validationErrorResponse('缺少导入数据')
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

    if (result.success) {
      return successResponse(
        {
          statistics: result.statistics,
          warnings: result.warnings,
        },
        result.message
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
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

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse('导入数据格式错误，请确保是有效的JSON格式')
    }

    return NextResponse.json(
      {
        success: false,
        error: '导入数据失败',
        data: {
          details: error instanceof Error ? error.message : '未知错误',
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
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 解析请求体
    const body = await request.json()
    const { data } = body

    // 验证必要字段
    if (!data) {
      return validationErrorResponse('缺少导入数据')
    }

    // 验证数据格式
    if (!data.exportInfo || !data.user) {
      return validationErrorResponse('导入数据格式不正确')
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

    // 处理特定错误类型
    if (error instanceof SyntaxError) {
      return validationErrorResponse('导入数据格式错误，请确保是有效的JSON格式')
    }

    return NextResponse.json(
      {
        success: false,
        error: '验证导入数据失败',
        data: {
          details: error instanceof Error ? error.message : '未知错误',
        },
      },
      { status: 500 }
    )
  }
}

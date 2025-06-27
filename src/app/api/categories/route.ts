import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { CategoryCreateSchema, validateData } from '@/lib/validation/schemas'
import type { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const categories = await prisma.category.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })

    return successResponse(categories)
  } catch (error) {
    console.error('Get categories error:', error)
    return errorResponse('获取分类失败', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error('Category creation failed: No user found')
      return unauthorizedResponse()
    }

    console.log('Category creation - User ID:', user.id)

    const body = await request.json()
    console.log(
      'Category creation request body:',
      JSON.stringify(body, null, 2)
    )

    // 使用 Zod 验证请求数据
    const validationResult = validateData(CategoryCreateSchema, body)
    if (!validationResult.success) {
      console.error('Category creation validation failed:', {
        errors: validationResult.errors,
        body: body,
        userId: user.id,
      })
      return errorResponse(
        `验证失败: ${validationResult.errors.join(', ')}`,
        400
      )
    }

    const { name, parentId, type, order } = validationResult.data
    console.log('Category creation validated data:', {
      name,
      parentId,
      type,
      order,
      userId: user.id,
    })

    // 检查同一父分类下是否已存在同名分类
    console.log('Checking for existing category with:', {
      userId: user.id,
      name,
      parentId: parentId || null,
    })

    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name,
        parentId: parentId || null,
      },
    })

    if (existingCategory) {
      console.error('Category creation failed: Duplicate name found', {
        existingCategory: existingCategory,
        requestData: { name, parentId, type, order },
      })
      return errorResponse('该分类名称已存在', 400)
    }

    console.log('No existing category found, proceeding with creation')

    // 准备创建数据
    const createData: Prisma.CategoryCreateInput = {
      user: {
        connect: { id: user.id },
      },
      name,
      parent: parentId ? { connect: { id: parentId } } : undefined,
      order: order ?? 0, // 使用请求中的排序或默认为0
      // 注意：icon, color, description 字段在当前 schema 中不存在
      // 如果需要这些字段，需要先更新 Prisma schema
    }

    // 设置账户类型
    console.log('Setting account type - parentId:', parentId, 'type:', type)

    if (!parentId && type) {
      // 顶级分类使用请求中的类型
      console.log('Creating top-level category with type:', type)
      createData.type = type
    } else if (parentId) {
      // 如果是子分类，继承父分类的账户类型
      console.log('Creating subcategory, looking for parent:', parentId)

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          userId: user.id,
        },
      })

      console.log('Parent category found:', parentCategory)

      if (!parentCategory) {
        console.error('Parent category not found:', {
          parentId,
          userId: user.id,
        })
        return errorResponse('父分类不存在', 400)
      }

      createData.type = parentCategory.type
      console.log('Inherited type from parent:', parentCategory.type)
    } else {
      // 顶级分类必须指定类型
      console.error('Top-level category missing type:', {
        name,
        parentId,
        type,
      })
      return errorResponse('顶级分类必须指定账户类型', 400)
    }

    console.log('Final createData:', JSON.stringify(createData, null, 2))

    console.log('Attempting to create category in database...')

    const category = await prisma.category.create({
      data: createData,
    })

    console.log('Category created successfully:', category)
    return successResponse(category, '分类创建成功')
  } catch (error) {
    console.error('Create category error details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      createData: createData,
    })

    // 提供更详细的错误信息
    if (error instanceof Error) {
      // 检查是否是数据库约束错误
      if (error.message.includes('Unique constraint')) {
        return errorResponse('分类名称已存在', 400)
      }
      if (error.message.includes('Foreign key constraint')) {
        return errorResponse('父分类不存在或无效', 400)
      }
      return errorResponse(`创建分类失败: ${error.message}`, 500)
    }

    return errorResponse('创建分类失败: 未知错误', 500)
  }
}

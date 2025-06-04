import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const categories = await prisma.category.findMany({
      where: {
        userId: user.id
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
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
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, parentId, order } = body

    if (!name) {
      return errorResponse('分类名称不能为空', 400)
    }

    // 检查同一父分类下是否已存在同名分类
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name,
        parentId: parentId || null
      }
    })

    if (existingCategory) {
      return errorResponse('该分类名称已存在', 400)
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        parentId: parentId || null,
        order: order || 0
      }
    })

    return successResponse(category, '分类创建成功')
  } catch (error) {
    console.error('Create category error:', error)
    return errorResponse('创建分类失败', 500)
  }
}

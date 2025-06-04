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

    const tags = await prisma.tag.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        name: 'asc'
      }
    })

    return successResponse(tags)
  } catch (error) {
    console.error('Get tags error:', error)
    return errorResponse('获取标签失败', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return errorResponse('标签名称不能为空', 400)
    }

    // 检查同一用户下是否已存在同名标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        userId: user.id,
        name
      }
    })

    if (existingTag) {
      return errorResponse('该标签名称已存在', 400)
    }

    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name,
        color: color || null
      }
    })

    return successResponse(tag, '标签创建成功')
  } catch (error) {
    console.error('Create tag error:', error)
    return errorResponse('创建标签失败', 500)
  }
}

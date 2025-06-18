import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const tags = await prisma.tag.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
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

    if (!name || typeof name !== 'string') {
      return errorResponse('标签名称不能为空', 400)
    }

    // 验证标签名称长度
    if (name.trim().length === 0) {
      return errorResponse('标签名称不能为空', 400)
    }

    if (name.length > 50) {
      return errorResponse('标签名称不能超过50个字符', 400)
    }

    // 验证颜色格式（如果提供）
    if (color && typeof color !== 'string') {
      return errorResponse('颜色格式不正确', 400)
    }

    // 检查同一用户下是否已存在同名标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
      },
    })

    if (existingTag) {
      return errorResponse('该标签名称已存在', 400)
    }

    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name: name.trim(),
        color: color || null,
      },
    })

    return successResponse(tag, '标签创建成功')
  } catch (error) {
    console.error('Create tag error:', error)
    return errorResponse('创建标签失败', 500)
  }
}

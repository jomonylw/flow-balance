import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { getUserTranslator } from '@/lib/utils/server-i18n'

export async function GET() {
  let user: any = null
  try {
    user = await getCurrentUser()
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
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('tag.get.failed'), 500)
  }
}

export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, color } = body

    const t = await getUserTranslator(user.id)

    if (!name || typeof name !== 'string') {
      return errorResponse(t('tag.name.required'), 400)
    }

    // 验证标签名称长度
    if (name.trim().length === 0) {
      return errorResponse(t('tag.name.required'), 400)
    }

    if (name.length > 50) {
      return errorResponse(t('tag.name.too.long'), 400)
    }

    // 验证颜色格式（如果提供）
    if (color && typeof color !== 'string') {
      return errorResponse(t('tag.color.format.invalid'), 400)
    }

    // 检查同一用户下是否已存在同名标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
      },
    })

    if (existingTag) {
      return errorResponse(t('tag.name.already.exists'), 400)
    }

    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name: name.trim(),
        color: color || null,
      },
    })

    return successResponse(tag, t('tag.create.success'))
  } catch (error) {
    console.error('Create tag error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('tag.create.failed'), 500)
  }
}

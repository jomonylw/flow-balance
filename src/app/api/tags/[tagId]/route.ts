import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

/**
 * 获取单个标签详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const { tagId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!tag) {
      return notFoundResponse('标签不存在')
    }

    return successResponse(tag)
  } catch (error) {
    console.error('Get tag error:', error)
    return errorResponse('获取标签失败', 500)
  }
}

/**
 * 更新标签
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const { tagId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证标签是否存在且属于当前用户
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: user.id,
      },
    })

    if (!existingTag) {
      return notFoundResponse('标签不存在')
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

    // 检查同一用户下是否已存在同名标签（排除当前标签）
    const duplicateTag = await prisma.tag.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
        id: { not: tagId },
      },
    })

    if (duplicateTag) {
      return errorResponse('该标签名称已存在', 400)
    }

    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: name.trim(),
        color: color || null,
      },
    })

    return successResponse(updatedTag, '标签更新成功')
  } catch (error) {
    console.error('Update tag error:', error)
    return errorResponse('更新标签失败', 500)
  }
}

/**
 * 删除标签
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const { tagId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证标签是否存在且属于当前用户
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId: user.id,
      },
    })

    if (!existingTag) {
      return notFoundResponse('标签不存在')
    }

    // 检查标签是否被交易使用
    const transactionCount = await prisma.transactionTag.count({
      where: {
        tagId: tagId,
      },
    })

    if (transactionCount > 0) {
      return errorResponse(
        `该标签正在被 ${transactionCount} 笔交易使用，无法删除`,
        400,
      )
    }

    // 删除标签
    await prisma.tag.delete({
      where: { id: tagId },
    })

    return successResponse(null, '标签删除成功')
  } catch (error) {
    console.error('Delete tag error:', error)
    return errorResponse('删除标签失败', 500)
  }
}

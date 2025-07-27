import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
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

    // 简单测试：获取用户的账户数量
    const accountCount = await prisma.account.count({
      where: { userId: user.id },
    })

    // 简单测试：获取用户的交易数量
    const transactionCount = await prisma.transaction.count({
      where: { userId: user.id },
    })

    // 简单测试：获取用户的分类数量
    const categoryCount = await prisma.category.count({
      where: { userId: user.id },
    })

    return successResponse({
      message: 'Dashboard test successful',
      data: {
        accountCount,
        transactionCount,
        categoryCount,
        userId: user.id,
      },
    })
  } catch (error) {
    console.error('Test dashboard error:', error)
    return errorResponse('测试失败', 500)
  }
}

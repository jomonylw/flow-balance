import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证账户是否存在且属于当前用户
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      },
      include: {
        category: true
      }
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    // 验证是否为存量类账户
    const accountType = existingAccount.category.type
    if (accountType !== 'ASSET' && accountType !== 'LIABILITY') {
      return errorResponse('只有资产或负债账户可以清空余额历史', 400)
    }

    // 检查是否有非余额调整的交易记录
    const otherTransactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
        type: {
          not: 'BALANCE_ADJUSTMENT'
        }
      }
    })

    if (otherTransactionCount > 0) {
      return errorResponse(`该账户存在 ${otherTransactionCount} 条普通交易记录，请先删除这些交易记录后再清空余额历史`, 400)
    }

    // 删除所有余额调整交易记录
    const deletedCount = await prisma.transaction.deleteMany({
      where: {
        accountId: accountId,
        type: 'BALANCE_ADJUSTMENT'
      }
    })

    return successResponse({
      deletedCount: deletedCount.count,
      message: `已清空 ${existingAccount.name} 的余额历史记录（${deletedCount.count} 条记录）`
    })

  } catch (error) {
    console.error('Clear balance history error:', error)
    return errorResponse('清空余额历史失败', 500)
  }
}

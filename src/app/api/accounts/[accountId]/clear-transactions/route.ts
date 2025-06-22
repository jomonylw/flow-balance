import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

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
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    // 验证是否为流量类账户
    const accountType = existingAccount.category.type
    if (accountType !== 'INCOME' && accountType !== 'EXPENSE') {
      return errorResponse('只有收入或支出账户可以清空交易记录', 400)
    }

    // 删除所有交易记录（流量账户不区分交易类型，删除所有记录）
    const deletedCount = await prisma.transaction.deleteMany({
      where: {
        accountId: accountId,
        userId: user.id,
      },
    })

    return successResponse({
      deletedCount: deletedCount.count,
      message: `已清空 ${existingAccount.name} 的所有交易记录（${deletedCount.count} 条记录）`,
    })
  } catch (error) {
    console.error('Clear transactions error:', error)
    return errorResponse('清空交易记录失败', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { PAGINATION } from '@/lib/constants/app-config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const loanContractId = resolvedParams.id
    const { searchParams } = new URL(request.url)

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(
      searchParams.get('limit') || PAGINATION.DEFAULT_PAGE_SIZE.toString()
    )
    const status = searchParams.get('status') // 可选的状态过滤

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > PAGINATION.MAX_PAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: '分页参数无效' },
        { status: 400 }
      )
    }

    // 验证贷款合约是否属于当前用户
    const loanContract = await prisma.loanContract.findFirst({
      where: {
        id: loanContractId,
        userId: user.id,
      },
    })

    if (!loanContract) {
      return NextResponse.json(
        { success: false, error: '贷款合约不存在或无权访问' },
        { status: 404 }
      )
    }

    // 构建查询条件
    const whereClause: {
      loanContractId: string
      userId: string
      status?: string
    } = {
      loanContractId,
      userId: user.id,
    }

    if (status && ['PENDING', 'COMPLETED', 'FAILED'].includes(status)) {
      whereClause.status = status
    }

    // 获取总数
    const total = await prisma.loanPayment.count({
      where: whereClause,
    })

    // 获取分页数据
    const payments = await prisma.loanPayment.findMany({
      where: whereClause,
      include: {
        principalTransaction: true,
        interestTransaction: true,
        balanceTransaction: true,
      },
      orderBy: [{ period: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // 计算分页信息
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    })
  } catch (error) {
    console.error('获取贷款还款记录失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取贷款还款记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

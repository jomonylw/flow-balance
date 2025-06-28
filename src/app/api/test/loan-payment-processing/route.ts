import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { LoanContractService } from '@/lib/services/loan-contract.service'

/**
 * 测试贷款还款处理API
 * 用于验证修复后的还款处理逻辑是否正常工作
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const { action, loanPaymentId } = await request.json()

    let result: Record<string, unknown> = {}

    switch (action) {
      case 'process_due_payments':
        // 处理到期的还款记录
        result = await LoanContractService.processLoanPaymentsBySchedule(
          user.id
        )
        break

      case 'process_single_payment':
        // 处理单个还款记录
        if (!loanPaymentId) {
          return NextResponse.json(
            { success: false, error: '缺少还款记录ID' },
            { status: 400 }
          )
        }
        const success =
          await LoanContractService.processLoanPaymentRecord(loanPaymentId)
        result = { success, loanPaymentId }
        break

      case 'get_due_payments':
        // 获取到期的还款记录
        const { prisma } = await import('@/lib/database/prisma')
        const now = new Date()
        // 标准化日期，确保只比较日期部分，不包含时间（UTC时间）
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        today.setUTCHours(23, 59, 59, 999) // 设置为当天的结束时间（UTC时间）

        const duePayments = await prisma.loanPayment.findMany({
          where: {
            userId: user.id,
            paymentDate: { lte: today },
            status: 'PENDING',
          },
          include: {
            loanContract: {
              select: {
                id: true,
                contractName: true,
                accountId: true,
                currency: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
          orderBy: { paymentDate: 'asc' },
        })

        result = { duePayments, count: duePayments.length }
        break

      default:
        return NextResponse.json(
          { success: false, error: '无效的操作类型' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('贷款还款处理测试失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '处理失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const { prisma } = await import('@/lib/database/prisma')

    // 获取用户的贷款合约统计信息
    const stats = await prisma.loanContract.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        contractName: true,
        isActive: true,
        currentPeriod: true,
        totalPeriods: true,
        nextPaymentDate: true,
        _count: {
          select: {
            payments: {
              where: { status: 'PENDING' },
            },
          },
        },
      },
    })

    // 获取待处理的还款记录总数
    const pendingPaymentsCount = await prisma.loanPayment.count({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    })

    // 获取今天到期的还款记录数
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const dueTodayCount = await prisma.loanPayment.count({
      where: {
        userId: user.id,
        status: 'PENDING',
        paymentDate: { lte: today },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        loanContracts: stats,
        pendingPaymentsCount,
        dueTodayCount,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('获取贷款统计信息失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取统计信息失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 清理重复的定期交易记录API
 * POST /api/recurring-transactions/cleanup-duplicates - 清理重复的定期交易记录
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'

// import { getUserTranslator } from '@/lib/utils/server-i18n'
// Using shared prisma instance from connection-manager

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    let totalDeleted = 0
    const errors: string[] = []

    // 获取所有活跃的定期交易
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
    })

    for (const recurring of recurringTransactions) {
      try {
        // 查找该定期交易的所有交易记录，按日期分组
        const transactions = await prisma.transaction.findMany({
          where: {
            recurringTransactionId: recurring.id,
          },
          orderBy: [
            { date: 'asc' },
            { createdAt: 'asc' }, // 保留最早创建的记录
          ],
        })

        // 按日期分组
        const transactionsByDate = new Map<string, typeof transactions>()

        for (const transaction of transactions) {
          const dateKey = transaction.date.toISOString().split('T')[0]
          if (!transactionsByDate.has(dateKey)) {
            transactionsByDate.set(dateKey, [])
          }
          transactionsByDate.get(dateKey)?.push(transaction)
        }

        // 删除重复的交易记录（保留每天最早创建的记录）
        for (const [_dateKey, dayTransactions] of transactionsByDate) {
          if (dayTransactions.length > 1) {
            // 保留第一个（最早创建的），删除其余的
            const toDelete = dayTransactions.slice(1)

            for (const transaction of toDelete) {
              // 先删除相关的标签关联
              await prisma.transactionTag.deleteMany({
                where: {
                  transactionId: transaction.id,
                },
              })

              // 删除交易记录
              await prisma.transaction.delete({
                where: {
                  id: transaction.id,
                },
              })

              totalDeleted++
            }
          }
        }
      } catch (error) {
        errors.push(
          `定期交易 ${recurring.id} 清理失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalDeleted,
        errors,
        message:
          totalDeleted > 0
            ? `成功删除 ${totalDeleted} 条重复的交易记录`
            : '没有发现重复的交易记录',
      },
    })
  } catch (error) {
    console.error('清理重复记录失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '清理重复记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { getDaysAgoDateRange } from '@/lib/utils/date-range'
import { getRawIncomeExpenseDataForDebug } from '@/lib/database/queries'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { startDate: periodStart, endDate: periodEnd } =
      getDaysAgoDateRange(30)

    // 检查所有交易
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 50,
    })

    // 检查所有收入支出类型的交易（不限日期）
    const allIncomeExpenseTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: {
          in: ['INCOME', 'EXPENSE'],
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 20,
    })

    // 检查收入支出账户类型的交易（不限日期）
    const incomeExpenseAccountTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        account: {
          category: {
            type: {
              in: ['INCOME', 'EXPENSE'],
            },
          },
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 20,
    })

    // 检查收入支出交易
    const incomeExpenseTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        type: {
          in: ['INCOME', 'EXPENSE'],
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
    })

    // 使用重构后的查询函数
    const rawIncomeExpenseData = await getRawIncomeExpenseDataForDebug(
      user.id,
      periodStart,
      periodEnd
    )

    return successResponse({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      allTransactionsCount: allTransactions.length,
      incomeExpenseTransactionsCount: incomeExpenseTransactions.length,
      allIncomeExpenseTransactionsCount: allIncomeExpenseTransactions.length,
      incomeExpenseAccountTransactionsCount:
        incomeExpenseAccountTransactions.length,
      allTransactions: allTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date.toISOString(),
        currency: t.currency.code,
        account: t.account.name,
        category: t.account.category?.name,
        categoryType: t.account.category?.type,
      })),
      incomeExpenseTransactions: incomeExpenseTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date.toISOString(),
        currency: t.currency.code,
        account: t.account.name,
        category: t.account.category?.name,
        categoryType: t.account.category?.type,
      })),
      allIncomeExpenseTransactions: allIncomeExpenseTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date.toISOString(),
        currency: t.currency.code,
        account: t.account.name,
        category: t.account.category?.name,
        categoryType: t.account.category?.type,
      })),
      incomeExpenseAccountTransactions: incomeExpenseAccountTransactions.map(
        t => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          date: t.date.toISOString(),
          currency: t.currency.code,
          account: t.account.name,
          category: t.account.category?.name,
          categoryType: t.account.category?.type,
        })
      ),
      rawIncomeExpenseData,
    })
  } catch (error) {
    console.error('Debug income expense error:', error)
    return errorResponse('调试失败', 500)
  }
}

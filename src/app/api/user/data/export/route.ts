import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { unauthorizedResponse, errorResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户的所有数据
    const [userSettings, categories, accounts, transactions, tags] =
      await Promise.all([
        prisma.userSettings.findUnique({
          where: { userId: user.id },
          include: { baseCurrency: true },
        }),
        prisma.category.findMany({
          where: { userId: user.id },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        }),
        prisma.account.findMany({
          where: { userId: user.id },
          include: { category: true },
          orderBy: { name: 'asc' },
        }),
        prisma.transaction.findMany({
          where: { userId: user.id },
          include: {
            account: true,
            category: true,
            currency: true,
            tags: {
              include: { tag: true },
            },
          },
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        }),
        prisma.tag.findMany({
          where: { userId: user.id },
          orderBy: { name: 'asc' },
        }),
      ])

    // 构建导出数据
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        appName: 'Flow Balance',
      },
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      userSettings,
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        order: category.order,
        createdAt: category.createdAt,
      })),
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name,
        description: account.description,
        categoryId: account.categoryId,
        categoryName: account.category.name,
        createdAt: account.createdAt,
      })),
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        description: transaction.description,
        notes: transaction.notes,
        date: transaction.date,
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        categoryId: transaction.categoryId,
        categoryName: transaction.category.name,
        tags: transaction.tags.map(tt => ({
          id: tt.tag.id,
          name: tt.tag.name,
        })),
        createdAt: transaction.createdAt,
      })),
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      })),
      statistics: {
        totalCategories: categories.length,
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalTags: tags.length,
      },
    }

    // 返回JSON文件
    const jsonData = JSON.stringify(exportData, null, 2)

    return new Response(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="flow-balance-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export data error:', error)
    return errorResponse('导出数据失败', 500)
  }
}

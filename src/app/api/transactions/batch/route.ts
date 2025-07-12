import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import { TransactionType } from '@/types/core/constants'
import { ConstantsManager } from '@/lib/utils/constants-manager'
import { getCommonError } from '@/lib/constants/api-messages'
import { BUSINESS_LIMITS } from '@/lib/constants/app-config'
import { z } from 'zod'

// 批量交易创建的验证 Schema
const BatchTransactionSchema = z.object({
  transactions: z
    .array(
      z.object({
        accountId: z.string().min(1), // 改为简单的字符串验证，支持CUID格式
        categoryId: z.string().min(1), // 改为简单的字符串验证，支持CUID格式
        currencyCode: z.string().min(3).max(3),
        type: z.enum(ConstantsManager.getZodTransactionTypeEnum()),
        amount: z.number().positive(),
        description: z.string().min(1).max(200),
        notes: z.string().max(1000).optional().nullable(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tagIds: z.array(z.string().min(1)).optional().default([]), // 改为简单的字符串验证，支持CUID格式
      })
    )
    .min(1)
    .max(BUSINESS_LIMITS.BATCH_MAX_SIZE), // 限制批量数量
})

/**
 * 批量创建交易
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: getCommonError('UNAUTHORIZED') },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = BatchTransactionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: getCommonError('INVALID_REQUEST'),
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { transactions } = validationResult.data
    const created: any[] = []
    const errors: any[] = []
    const warnings: string[] = []

    // 使用事务处理批量创建
    await prisma.$transaction(async tx => {
      for (let i = 0; i < transactions.length; i++) {
        const transactionData = transactions[i]

        try {
          // 验证账户存在性和权限
          const account = await tx.account.findFirst({
            where: {
              id: transactionData.accountId,
              userId: user.id,
            },
            include: {
              category: true,
              currency: true,
            },
          })

          if (!account) {
            errors.push({
              index: i,
              field: 'accountId',
              message: '账户不存在或无权访问',
              data: transactionData,
            })
            continue
          }

          // 验证分类存在性和权限
          const category = await tx.category.findFirst({
            where: {
              id: transactionData.categoryId,
              userId: user.id,
            },
          })

          if (!category) {
            errors.push({
              index: i,
              field: 'categoryId',
              message: '分类不存在或无权访问',
              data: transactionData,
            })
            continue
          }

          // 验证货币存在性
          const currency = await tx.currency.findFirst({
            where: {
              code: transactionData.currencyCode,
              OR: [{ createdBy: user.id }, { createdBy: null }],
            },
            orderBy: { createdBy: 'desc' },
          })

          if (!currency) {
            errors.push({
              index: i,
              field: 'currencyCode',
              message: '货币不存在',
              data: transactionData,
            })
            continue
          }

          // 检查账户货币一致性
          if (account.currencyId !== currency.id) {
            warnings.push(
              `第 ${i + 1} 行：账户货币 (${account.currency.code}) 与交易货币 (${currency.code}) 不一致`
            )
          }

          // 验证标签存在性
          if (transactionData.tagIds && transactionData.tagIds.length > 0) {
            const tags = await tx.tag.findMany({
              where: {
                id: { in: transactionData.tagIds },
                userId: user.id,
              },
            })

            if (tags.length !== transactionData.tagIds.length) {
              const missingCount = transactionData.tagIds.length - tags.length
              warnings.push(
                `第 ${i + 1} 行：${missingCount} 个标签不存在或无权访问`
              )
              // 过滤掉不存在的标签
              transactionData.tagIds = tags.map(tag => tag.id)
            }
          }

          // 创建交易
          const transaction = await tx.transaction.create({
            data: {
              userId: user.id,
              accountId: transactionData.accountId,
              currencyId: currency.id,
              type: transactionData.type as TransactionType,
              amount: transactionData.amount,
              description: transactionData.description,
              notes: transactionData.notes || null,
              date: new Date(transactionData.date),
              tags: {
                create: transactionData.tagIds.map((tagId: string) => ({
                  tagId,
                })),
              },
            },
            include: {
              account: {
                include: {
                  category: true,
                },
              },
              currency: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          })

          // 格式化交易数据，确保包含分类信息
          const formattedTransaction = {
            ...transaction,
            // 分类信息现在通过账户获取
            category: {
              id: transaction.account.category.id,
              name: transaction.account.category.name,
              type: transaction.account.category.type,
            },
            tags: transaction.tags.map(tt => ({
              tag: {
                id: tt.tag.id,
                name: tt.tag.name,
              },
            })),
          }
          created.push(formattedTransaction)
        } catch (error) {
          console.error(`Error creating transaction ${i}:`, error)
          errors.push({
            index: i,
            field: 'general',
            message: error instanceof Error ? error.message : '创建交易失败',
            data: transactionData,
          })
        }
      }
    })

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        created,
        errors,
        warnings,
        summary: {
          total: transactions.length,
          created: created.length,
          failed: errors.length,
        },
      },
    })
  } catch (error) {
    console.error('Batch transaction creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getCommonError('INTERNAL_ERROR'),
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * 获取批量操作的限制信息
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: getCommonError('UNAUTHORIZED') },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        maxBatchSize: BUSINESS_LIMITS.BATCH_MAX_SIZE,
        supportedTypes: ConstantsManager.getAllTransactionTypes(),
        supportedFormats: ['json'],
        validationRules: {
          description: { minLength: 1, maxLength: 200 },
          notes: { maxLength: 1000 },
          amount: { min: 0.01 },
          date: { format: 'YYYY-MM-DD' },
        },
      },
    })
  } catch (error) {
    console.error('Get batch limits error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getCommonError('INTERNAL_ERROR'),
      },
      { status: 500 }
    )
  }
}

/**
 * 验证批量交易数据（不实际创建）
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: getCommonError('UNAUTHORIZED') },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = BatchTransactionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: getCommonError('INVALID_REQUEST'),
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { transactions } = validationResult.data
    const validationErrors: any[] = []
    const warnings: string[] = []

    // 验证每个交易数据
    for (let i = 0; i < transactions.length; i++) {
      const transactionData = transactions[i]

      // 验证账户
      const account = await prisma.account.findFirst({
        where: {
          id: transactionData.accountId,
          userId: user.id,
        },
        include: {
          currency: true,
        },
      })

      if (!account) {
        validationErrors.push({
          index: i,
          field: 'accountId',
          message: '账户不存在或无权访问',
        })
      }

      // 验证货币
      const currency = await prisma.currency.findFirst({
        where: {
          code: transactionData.currencyCode,
          OR: [{ createdBy: user.id }, { createdBy: null }],
        },
      })

      if (!currency) {
        validationErrors.push({
          index: i,
          field: 'currencyCode',
          message: '货币不存在',
        })
      }

      // 检查货币一致性
      if (account && currency && account.currencyId !== currency.id) {
        warnings.push(`第 ${i + 1} 行：账户货币与交易货币不一致`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        warnings,
        summary: {
          total: transactions.length,
          valid: transactions.length - validationErrors.length,
          invalid: validationErrors.length,
        },
      },
    })
  } catch (error) {
    console.error('Batch validation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getCommonError('INTERNAL_ERROR'),
      },
      { status: 500 }
    )
  }
}

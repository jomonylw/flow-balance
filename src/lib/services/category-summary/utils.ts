/**
 * 分类汇总工具函数
 */

import type {
  PrismaClient,
  Account,
  Transaction,
  Currency,
} from '@prisma/client'
import {
  getCategoryTreeIds,
  buildCategoryHierarchyMap as buildHierarchyMap,
} from '@/lib/database/raw-queries'

/**
 * 分类层级关系映射接口
 */
export interface CategoryHierarchyMap {
  /** 分类ID到其直接子分类ID列表的映射 */
  childrenMap: Map<string, string[]>
  /** 分类ID到其所有后代分类ID列表的映射（包含自身） */
  descendantsMap: Map<string, string[]>
  /** 所有分类ID的集合 */
  allCategoryIds: Set<string>
}

/**
 * 简化的分类信息接口
 */
export interface SimpleCategoryInfo {
  id: string
  parentId: string | null
}

/**
 * 从交易备注中提取余额变化金额
 * @param notes 交易备注
 * @returns 变化金额，如果无法提取则返回null
 */
export function extractBalanceChangeFromNotes(notes: string): number | null {
  if (!notes) return null

  // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
  // 支持国际化的匹配模式
  const patterns = [
    /变化金额：([+-]?\d+\.?\d*)/, // 中文模式
    /Balance change:\s*([+-]?\d+\.?\d*)/i, // 英文模式
  ]

  let match: RegExpMatchArray | null = null
  for (const pattern of patterns) {
    match = notes.match(pattern)
    if (match) break
  }
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
}

/**
 * 递归获取所有子分类ID - 优化版本，使用统一查询服务
 * @param _prisma Prisma客户端（保留兼容性，实际使用统一查询服务）
 * @param categoryId 分类ID
 * @returns 包含自身和所有子分类的ID数组
 */
export async function getAllCategoryIds(
  _prisma: PrismaClient,
  categoryId: string
): Promise<string[]> {
  try {
    // 使用统一查询服务
    return await getCategoryTreeIds(categoryId)
  } catch (error) {
    console.error(
      'Error in getAllCategoryIds with unified query service, falling back to recursive method:',
      error
    )

    // 如果统一查询服务失败，回退到原来的递归方法
    return getAllCategoryIdsRecursive(_prisma, categoryId)
  }
}

/**
 * 递归获取所有子分类ID - 回退方法（原始实现）
 * @param prisma Prisma客户端
 * @param categoryId 分类ID
 * @returns 包含自身和所有子分类的ID数组
 */
async function getAllCategoryIdsRecursive(
  prisma: PrismaClient,
  categoryId: string
): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { children: true },
  })

  if (!category) return [categoryId]

  let ids = [categoryId]
  for (const child of category.children) {
    const childIds = await getAllCategoryIdsRecursive(prisma, child.id)
    ids = ids.concat(childIds)
  }
  return ids
}

/**
 * 构建分类层级关系图 - 使用统一查询服务
 * 一次性获取所有分类的层级关系，避免循环查询
 *
 * @param _prisma Prisma客户端（保留兼容性，实际使用统一查询服务）
 * @param userId 用户ID
 * @param categoryTypes 可选的分类类型过滤
 * @returns 分类层级关系映射
 */
export async function buildCategoryHierarchyMap(
  _prisma: PrismaClient,
  userId: string,
  categoryTypes?: string[]
): Promise<CategoryHierarchyMap> {
  // 使用统一查询服务
  return await buildHierarchyMap(userId, categoryTypes)
}

/**
 * 从层级关系图中快速获取分类的所有后代ID（包含自身）
 *
 * @param hierarchyMap 分类层级关系映射
 * @param categoryId 分类ID
 * @returns 包含自身和所有后代的ID数组
 */
export function getDescendantsFromHierarchyMap(
  hierarchyMap: CategoryHierarchyMap,
  categoryId: string
): string[] {
  return hierarchyMap.descendantsMap.get(categoryId) || [categoryId]
}

/**
 * 从层级关系图中快速获取分类的直接子分类ID
 *
 * @param hierarchyMap 分类层级关系映射
 * @param categoryId 分类ID
 * @returns 直接子分类ID数组
 */
export function getChildrenFromHierarchyMap(
  hierarchyMap: CategoryHierarchyMap,
  categoryId: string
): string[] {
  return hierarchyMap.childrenMap.get(categoryId) || []
}

/**
 * 序列化账户数据，将 Decimal 转换为 number
 * @param account 原始账户数据
 * @returns 序列化后的账户数据
 */
export function serializeAccountData(
  account: Account & { transactions: Transaction[] }
) {
  return {
    ...account,
    transactions: account.transactions.map((transaction: Transaction) => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      date: transaction.date.toISOString(),
    })),
  }
}

/**
 * 计算子分类的汇总余额
 * @param allAccountSummaries 所有账户汇总数据
 * @param childAccountIds 子分类的账户ID列表
 * @returns 子分类的汇总余额
 */
export function calculateChildCategoryBalances(
  allAccountSummaries: Array<{
    categoryId: string
    balances: Record<string, number>
  }>,
  childAccountIds: string[]
): Record<string, number> {
  const childBalances: Record<string, number> = {}

  const childAccounts = allAccountSummaries.filter(account =>
    childAccountIds.includes(account.categoryId)
  )

  childAccounts.forEach(account => {
    Object.entries(account.balances).forEach(([currencyCode, balance]) => {
      if (!childBalances[currencyCode]) {
        childBalances[currencyCode] = 0
      }
      childBalances[currencyCode] += balance
    })
  })

  return childBalances
}

/**
 * 计算分类总余额
 * @param allAccountSummaries 所有账户汇总数据
 * @returns 分类总余额
 */
export function calculateCategoryTotalBalances(
  allAccountSummaries: Array<{
    balances: Record<string, number>
  }>
): Record<string, number> {
  const categoryBalanceSummary: Record<string, number> = {}

  allAccountSummaries.forEach(account => {
    Object.entries(account.balances).forEach(([currencyCode, balance]) => {
      if (!categoryBalanceSummary[currencyCode]) {
        categoryBalanceSummary[currencyCode] = 0
      }
      categoryBalanceSummary[currencyCode] += balance
    })
  })

  return categoryBalanceSummary
}

/**
 * 获取用户可用的货币列表
 * @param prisma Prisma客户端
 * @param userId 用户ID
 * @returns 货币列表
 */
export async function getUserCurrencies(prisma: PrismaClient, userId: string) {
  const currencies = await prisma.currency.findMany({
    where: {
      OR: [
        { isCustom: false }, // 全局货币
        { isCustom: true, createdBy: userId }, // 用户的自定义货币
      ],
    },
  })

  return currencies.map((currency: Currency) => ({
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
  }))
}

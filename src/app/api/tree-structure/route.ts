import { getCurrentUser } from '@/lib/services/auth.service'

import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import type { CategoryWithChildren, TreeAccountInfo } from '@/types/api'
import { AccountType } from '@/types/core/constants'
import { getCachedTreeStructure } from '@/lib/services/cache.service'
import {
  withApiMonitoring,
  withCacheMonitoring,
} from '@/lib/utils/cache-monitor'

// 包装缓存函数以进行监控
const monitoredGetCachedTreeStructure = withCacheMonitoring(
  getCachedTreeStructure,
  'getCachedTreeStructure'
)

/**
 * 获取完整的分类+账户树状结构
 * 优化侧边栏数据获取，减少API调用次数
 */
export const GET = withApiMonitoring(async () => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 使用带监控的缓存获取分类和账户数据
    const { categories, accounts } = await monitoredGetCachedTreeStructure(
      user.id
    )

    // 构建树状结构
    const categoryMap = new Map<string, CategoryWithChildren>()
    const rootCategories: CategoryWithChildren[] = []

    // 初始化分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        type: category.type as AccountType,
        children: [],
        accounts: [],
      })
    })

    // 构建分类层级关系
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)
      if (!categoryNode) return

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    // 将账户分配到对应的分类
    accounts.forEach(account => {
      const category = categoryMap.get(account.categoryId)
      if (category) {
        const accountInfo: TreeAccountInfo = {
          id: account.id,
          name: account.name,
          description: account.description,
          color: account.color,
          currencyCode: account.currency.code,
          categoryId: account.categoryId,
          category: {
            ...account.category,
            type: account.category.type as AccountType,
          },
        }
        category.accounts.push(accountInfo)
      }
    })

    // 递归排序分类和账户
    const sortTreeNode = (node: CategoryWithChildren) => {
      // 排序子分类
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => a.order - b.order)
        node.children.forEach(sortTreeNode)
      }

      // 排序账户
      if (node.accounts && node.accounts.length > 0) {
        node.accounts.sort((a, b) => a.name.localeCompare(b.name))
      }
    }

    rootCategories.sort((a, b) => a.order - b.order)
    rootCategories.forEach(sortTreeNode)

    // 计算统计信息
    const stats = {
      totalCategories: categories.length,
      totalAccounts: accounts.length,
      rootCategories: rootCategories.length,
    }

    return successResponse({
      treeStructure: rootCategories,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get tree structure error:', error)
    return errorResponse('获取树状结构失败', 500)
  }
}, '/api/tree-structure [GET]')

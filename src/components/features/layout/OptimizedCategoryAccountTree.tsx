'use client'

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react'
import CategoryTreeItem from './CategoryTreeItem'
import AccountTreeItem from './AccountTreeItem'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAllDataListener } from '@/hooks/business/useDataUpdateListener'
import type { SimpleCategory, SimpleAccount, CategoryType } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface EnrichedCategory extends SimpleCategory {
  type: CategoryType
  children?: EnrichedCategory[]
  accounts?: EnrichedAccount[]
}

interface EnrichedAccount extends SimpleAccount {
  // 余额数据将通过props传入
  balances?: Record<
    string,
    {
      amount: number
      currency: {
        code: string
        symbol: string
        name: string
      }
    }
  >
  balanceInBaseCurrency?: number
}

interface OptimizedCategoryAccountTreeProps {
  searchQuery: string
  onNavigate?: () => void
}

export interface OptimizedCategoryAccountTreeRef {
  expandAll: () => void
  collapseAll: () => void
  checkAllExpanded: () => boolean
}

const OptimizedCategoryAccountTree = forwardRef<
  OptimizedCategoryAccountTreeRef,
  OptimizedCategoryAccountTreeProps
>(({ searchQuery, onNavigate }, ref) => {
  // 使用语言上下文
  const { t } = useLanguage()

  // 使用UserDataContext获取基础数据
  const {
    categories,
    accounts,
    isLoading: userDataLoading,
    error: userDataError,
    getBaseCurrency,
    accountBalances,
    isLoadingBalances,
    balancesError,
    fetchBalances,
    refreshBalances,
    refreshAccounts,
    refreshCategories,
  } = useUserData()

  const initialFetchDone = useRef(false)

  // 直接从 localStorage 初始化状态
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          const savedState = localStorage.getItem('categoryTreeExpandedState')
          if (savedState) {
            const expandedIds = JSON.parse(savedState)
            return new Set(expandedIds)
          }
        } catch (error) {
          console.error(
            'Error loading expanded state from localStorage:',
            error
          )
        }
      }
      return new Set()
    }
  )

  // 保存展开状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'categoryTreeExpandedState',
          JSON.stringify([...expandedCategories])
        )
      } catch (error) {
        console.error('Error saving expanded state to localStorage:', error)
      }
    }
  }, [expandedCategories])

  // 初始化时获取余额数据
  useEffect(() => {
    if (
      !userDataLoading &&
      categories.length > 0 &&
      accounts.length > 0 &&
      !initialFetchDone.current
    ) {
      fetchBalances()
      initialFetchDone.current = true
    }
  }, [userDataLoading, categories, accounts, fetchBalances])

  // 使用新的数据更新监听系统
  useAllDataListener(async event => {
    const { type, silent } = event
    console.log(
      '[OptimizedCategoryAccountTree] Received data update event:',
      event
    )

    if (silent) return

    // 根据事件类型决定刷新策略
    switch (type) {
      case 'manual-refresh':
        const refreshType = event.data?.type as
          | 'category'
          | 'account'
          | 'full'
          | undefined
        console.log(
          `[OptimizedCategoryAccountTree] Manual refresh event received, type: ${refreshType}`
        )
        switch (refreshType) {
          case 'category':
            await refreshCategories()
            await refreshAccounts()
            break
          case 'account':
            await refreshAccounts()
            await refreshBalances()
            break
          case 'full':
          default:
            await refreshCategories()
            await refreshAccounts()
            await refreshBalances()
            break
        }
        break

      case 'balance-update':
      case 'transaction-create':
      case 'transaction-update':
      case 'transaction-delete':
        // 余额相关更新：强制刷新余额数据
        console.log(
          '[OptimizedCategoryAccountTree] Refreshing balances for transaction/balance event'
        )
        await refreshBalances()
        break

      case 'account-create':
      case 'account-update':
      case 'account-delete':
        // 账户相关更新：刷新账户数据和余额数据
        console.log(
          '[OptimizedCategoryAccountTree] Refreshing accounts and balances for account event'
        )
        await refreshAccounts()
        await refreshBalances()
        break

      case 'category-create':
      case 'category-update':
      case 'category-delete':
        // 分类相关更新：刷新分类数据和账户数据（账户的分类信息可能变化）
        console.log(
          '[OptimizedCategoryAccountTree] Refreshing categories and accounts for category event'
        )
        await refreshCategories()
        await refreshAccounts()
        break

      default:
        // 其他更新：刷新余额数据
        console.log(
          '[OptimizedCategoryAccountTree] Refreshing balances for unknown event'
        )
        await refreshBalances()
        break
    }
  })

  // 构建树状结构并合并余额数据
  const enrichedTreeData = useMemo(() => {
    if (!categories || !accounts || !accountBalances) return null

    // 构建分类映射
    const categoryMap = new Map()
    const rootCategories: EnrichedCategory[] = []

    // 初始化分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        accounts: [],
      })
    })

    // 构建分类层级关系
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(categoryMap.get(category.id))
        }
      } else {
        rootCategories.push(categoryMap.get(category.id))
      }
    })

    // 将账户分配到对应分类
    accounts.forEach(account => {
      const category = categoryMap.get(account.categoryId)
      if (category) {
        category.accounts.push({
          ...account,
          balances: accountBalances[account.id]?.balances || {},
          balanceInBaseCurrency:
            accountBalances[account.id]?.balanceInBaseCurrency || 0,
        })
      }
    })

    return rootCategories
  }, [categories, accounts, accountBalances])

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!enrichedTreeData) return null
    if (!searchQuery.trim()) {
      return enrichedTreeData
    }

    const query = searchQuery.toLowerCase()

    const filterCategories = (cats: EnrichedCategory[]): EnrichedCategory[] => {
      return cats
        .filter(category => {
          const matchesName = category.name.toLowerCase().includes(query)
          const hasMatchingChildren =
            category.children && filterCategories(category.children).length > 0
          const hasMatchingAccounts = category.accounts?.some(
            account =>
              account.name.toLowerCase().includes(query) ||
              account.description?.toLowerCase().includes(query)
          )

          return matchesName || hasMatchingChildren || hasMatchingAccounts
        })
        .map(category => ({
          ...category,
          children: category.children
            ? filterCategories(category.children)
            : [],
          accounts:
            category.accounts?.filter(
              account =>
                account.name.toLowerCase().includes(query) ||
                account.description?.toLowerCase().includes(query)
            ) || [],
        }))
    }

    return filterCategories(enrichedTreeData)
  }, [enrichedTreeData, searchQuery])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // 获取所有分类ID的递归函数
  const getAllCategoryIds = useCallback(
    (categories: EnrichedCategory[]): string[] => {
      const ids: string[] = []
      categories.forEach(category => {
        ids.push(category.id)
        if (category.children && category.children.length > 0) {
          ids.push(...getAllCategoryIds(category.children))
        }
      })
      return ids
    },
    []
  )

  // 展开所有分类
  const expandAll = useCallback(() => {
    if (filteredData) {
      const allIds = getAllCategoryIds(filteredData)
      setExpandedCategories(new Set(allIds))
    }
  }, [filteredData, getAllCategoryIds])

  // 收起所有分类
  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set())
  }, [])

  // 检查是否所有分类都已展开
  const checkAllExpanded = useCallback(() => {
    if (!filteredData) return false
    const allIds = getAllCategoryIds(filteredData)
    return allIds.every(id => expandedCategories.has(id))
  }, [filteredData, expandedCategories, getAllCategoryIds])

  // 暴露方法给父组件
  useImperativeHandle(
    ref,
    () => ({
      expandAll,
      collapseAll,
      checkAllExpanded,
    }),
    [expandAll, collapseAll, checkAllExpanded]
  )

  const renderCategory = (category: EnrichedCategory, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren =
      (category.children && category.children.length > 0) ||
      (category.accounts && category.accounts.length > 0) ||
      false

    return (
      <div key={category.id}>
        <CategoryTreeItem
          category={category}
          level={level}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => toggleCategory(category.id)}
          baseCurrency={getBaseCurrency() || undefined}
        />

        {isExpanded && (
          <div className='ml-4'>
            {/* 渲染子分类 */}
            {category.children?.map(child => renderCategory(child, level + 1))}

            {/* 渲染该分类下的账户 */}
            {category.accounts?.map(account => (
              <AccountTreeItem
                key={account.id}
                account={account}
                level={level + 1}
                onNavigate={onNavigate}
                baseCurrency={getBaseCurrency() || undefined}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (userDataLoading || isLoadingBalances) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400'></div>
        <span className='ml-2 text-gray-600 dark:text-gray-400'>
          {t('common.loading')}
        </span>
      </div>
    )
  }

  if (userDataError || balancesError) {
    return (
      <div className='text-center py-8'>
        <div className='text-red-600 dark:text-red-400 mb-2'>
          ❌ {userDataError || balancesError}
        </div>
        <button
          onClick={() => {
            // 这里可以同时刷新基础数据和余额
            fetchBalances()
          }}
          className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors duration-200'
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
        {searchQuery ? t('sidebar.search.no.results') : t('common.no.data')}
      </div>
    )
  }

  return (
    <div className='space-y-1'>
      {filteredData.map(category => renderCategory(category))}
    </div>
  )
})

OptimizedCategoryAccountTree.displayName = 'OptimizedCategoryAccountTree'

export default OptimizedCategoryAccountTree

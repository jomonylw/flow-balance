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
import TypeGroupHeader from './TypeGroupHeader'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAllDataListener } from '@/hooks/business/useDataUpdateListener'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { AccountType } from '@/types/core/constants'
import type { SimpleCategory, SimpleAccount, CategoryType } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface EnrichedCategory extends SimpleCategory {
  type: CategoryType
  children?: EnrichedCategory[]
  accounts?: EnrichedAccount[]
}

// 账户类型分组
interface TypeGroup {
  type: CategoryType
  label: string
  categories: EnrichedCategory[]
  totalBalance: number
  currencySymbol: string
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
  viewMode?: 'tree' | 'accounts'
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
>(({ searchQuery, viewMode = 'tree', onNavigate }, ref) => {
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
    isLoadingBalances: _isLoadingBalances,
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
    // 调试信息 - 仅在开发环境输出
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[OptimizedCategoryAccountTree] Received data update event:',
        event
      )
    }

    if (silent) return

    // 根据事件类型决定刷新策略
    switch (type) {
      case 'manual-refresh':
        const refreshType = event.data?.type as
          | 'category'
          | 'account'
          | 'full'
          | undefined
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[OptimizedCategoryAccountTree] Manual refresh event received, type: ${refreshType}`
          )
        }
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
          '[OptimizedCategoryAccountTree] Refreshing balances for transaction/balance event:',
          { type, accountId: event.accountId, categoryId: event.categoryId }
        )
        await refreshBalances()
        break

      case 'system-update':
        // 系统自动更新完成：刷新余额数据
        await refreshBalances()
        break

      case 'loan-payment-reset':
        // 贷款还款记录重置：刷新余额数据
        await refreshBalances()
        break

      case 'account-clear':
        // 账户记录清空：刷新余额数据
        await refreshBalances()
        break

      case 'account-create':
      case 'account-update':
      case 'account-delete':
        // 账户相关更新：刷新账户数据和余额数据
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[OptimizedCategoryAccountTree] Refreshing accounts and balances for account event'
          )
        }
        await refreshAccounts()
        await refreshBalances()
        break

      case 'category-create':
      case 'category-update':
      case 'category-delete':
        // 分类相关更新：刷新分类数据和账户数据（账户的分类信息可能变化）
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[OptimizedCategoryAccountTree] Refreshing categories and accounts for category event'
          )
        }
        await refreshCategories()
        await refreshAccounts()
        break

      default:
        // 其他更新：刷新余额数据
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[OptimizedCategoryAccountTree] Refreshing balances for unknown event'
          )
        }
        await refreshBalances()
        break
    }
  })

  // 计算账户类型汇总余额的函数
  const calculateTypeBalance = useCallback(
    (categories: EnrichedCategory[]): number => {
      let total = 0

      const calculateCategoryBalance = (cat: EnrichedCategory): number => {
        let balance = 0

        // 累加直属账户余额
        if (cat.accounts) {
          cat.accounts.forEach(account => {
            balance += account.balanceInBaseCurrency || 0
          })
        }

        // 递归累加子分类余额
        if (cat.children) {
          cat.children.forEach(child => {
            balance += calculateCategoryBalance(child)
          })
        }

        return balance
      }

      categories.forEach(category => {
        total += calculateCategoryBalance(category)
      })

      return total
    },
    []
  )

  // 构建按类型分组的树状结构
  const groupedTreeData = useMemo(() => {
    // 如果数据正在加载，返回null（显示加载状态）
    if (userDataLoading) {
      return null
    }

    // 如果数据加载完成但为空，返回空数组（显示"没有数据"）
    if (
      !categories ||
      !accounts ||
      categories.length === 0 ||
      accounts.length === 0
    ) {
      return []
    }

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
          balances: accountBalances?.[account.id]?.balances || {},
          balanceInBaseCurrency:
            accountBalances?.[account.id]?.balanceInBaseCurrency || 0,
        })
      }
    })

    // 按账户类型分组
    const typeGroups: TypeGroup[] = []
    const baseCurrency = getBaseCurrency()
    const currencySymbol = baseCurrency?.symbol || '¥'

    // 定义账户类型顺序和标签
    const typeOrder: { type: CategoryType; labelKey: string }[] = [
      { type: AccountType.ASSET, labelKey: 'type.asset' },
      { type: AccountType.LIABILITY, labelKey: 'type.liability' },
      { type: AccountType.INCOME, labelKey: 'type.income' },
      { type: AccountType.EXPENSE, labelKey: 'type.expense' },
    ]

    typeOrder.forEach(({ type, labelKey }) => {
      const categoriesOfType = rootCategories.filter(cat => cat.type === type)
      if (categoriesOfType.length > 0) {
        // 计算该类型的汇总余额
        const totalBalance = calculateTypeBalance(categoriesOfType)

        typeGroups.push({
          type,
          label: t(labelKey),
          categories: categoriesOfType,
          totalBalance,
          currencySymbol,
        })
      }
    })

    return typeGroups
  }, [
    userDataLoading, // 添加这个依赖项，确保加载状态变化时重新计算
    categories,
    accounts,
    accountBalances,
    getBaseCurrency,
    t,
    calculateTypeBalance,
  ])

  // 分组展开状态管理 - 从 localStorage 初始化
  const [expandedTypeGroups, setExpandedTypeGroups] = useState<
    Set<CategoryType>
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('typeGroupExpandedState')
        if (savedState) {
          const expandedTypes = JSON.parse(savedState)
          return new Set(expandedTypes)
        }
      } catch (error) {
        console.error(
          'Error loading type group expanded state from localStorage:',
          error
        )
      }
    }
    // 默认全部展开
    return new Set([
      AccountType.ASSET,
      AccountType.LIABILITY,
      AccountType.INCOME,
      AccountType.EXPENSE,
    ])
  })

  // 客户端挂载状态
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 保存分组展开状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'typeGroupExpandedState',
          JSON.stringify([...expandedTypeGroups])
        )
      } catch (error) {
        console.error(
          'Error saving type group expanded state to localStorage:',
          error
        )
      }
    }
  }, [expandedTypeGroups])

  // 过滤数据
  const filteredData = useMemo(() => {
    if (groupedTreeData === null) return null // 数据正在加载
    if (groupedTreeData.length === 0) return [] // 数据为空
    if (!searchQuery.trim()) {
      return groupedTreeData
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

    const filteredGroups = groupedTreeData
      .map(group => ({
        ...group,
        categories: filterCategories(group.categories),
      }))
      .filter(group => group.categories.length > 0)

    return filteredGroups
  }, [groupedTreeData, searchQuery])

  // 搜索时自动展开有匹配结果的分组和分类（仅在客户端）
  useEffect(() => {
    if (!isMounted || !searchQuery.trim() || !filteredData) return

    const typesToExpand = filteredData.map(group => group.type)
    if (typesToExpand.length > 0) {
      setExpandedTypeGroups(prev => {
        const newSet = new Set(prev)
        typesToExpand.forEach(type => newSet.add(type))
        return newSet
      })
    }

    // 自动展开包含搜索结果的分类
    const categoriesToExpand: string[] = []

    const collectExpandableCategories = (categories: EnrichedCategory[]) => {
      categories.forEach(category => {
        const query = searchQuery.toLowerCase()
        const hasMatchingAccounts = category.accounts?.some(
          account =>
            account.name.toLowerCase().includes(query) ||
            account.description?.toLowerCase().includes(query)
        )
        const hasMatchingChildren =
          category.children && category.children.length > 0

        // 如果分类本身匹配或有匹配的账户，展开它
        if (
          category.name.toLowerCase().includes(query) ||
          hasMatchingAccounts
        ) {
          categoriesToExpand.push(category.id)
        }

        // 如果有子分类，递归检查
        if (hasMatchingChildren) {
          collectExpandableCategories(category.children || [])
          // 如果子分类有匹配结果，也展开父分类
          const hasMatchingDescendants = (category.children || []).some(
            child => {
              const childMatches =
                child.name.toLowerCase().includes(query) ||
                child.accounts?.some(
                  account =>
                    account.name.toLowerCase().includes(query) ||
                    account.description?.toLowerCase().includes(query)
                )
              return childMatches
            }
          )
          if (hasMatchingDescendants) {
            categoriesToExpand.push(category.id)
          }
        }
      })
    }

    filteredData.forEach(group => {
      collectExpandableCategories(group.categories)
    })

    if (categoriesToExpand.length > 0) {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        categoriesToExpand.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }, [searchQuery, filteredData, isMounted])

  // 获取展开分组的背景样式
  const getExpandedGroupStyle = (type: CategoryType) => {
    switch (type) {
      case 'ASSET':
        return 'bg-blue-50/20 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-700/30'
      case 'LIABILITY':
        return 'bg-red-50/20 dark:bg-red-950/15 border-red-200/50 dark:border-red-700/30'
      case 'INCOME':
        return 'bg-green-50/20 dark:bg-green-950/15 border-green-200/50 dark:border-green-700/30'
      case 'EXPENSE':
        return 'bg-orange-50/20 dark:bg-orange-950/15 border-orange-200/50 dark:border-orange-700/30'
      default:
        return 'bg-gray-50/20 dark:bg-gray-950/15 border-gray-200/50 dark:border-gray-700/30'
    }
  }

  // 获取账户模式下的扁平账户列表
  const getAccountsForAccountsView = (group: TypeGroup) => {
    const accounts: EnrichedAccount[] = []

    // 递归收集所有账户的函数
    const collectAccountsFromCategory = (category: EnrichedCategory) => {
      // 添加当前分类下的直接账户
      if (category.accounts) {
        category.accounts.forEach(account => {
          accounts.push(account)
        })
      }

      // 递归处理子分类
      if (category.children) {
        category.children.forEach(childCategory => {
          collectAccountsFromCategory(childCategory)
        })
      }
    }

    // 遍历该分组下的所有顶级分类
    group.categories.forEach(category => {
      collectAccountsFromCategory(category)
    })

    return accounts
  }

  // 切换分组展开状态
  const toggleTypeGroup = (type: CategoryType) => {
    setExpandedTypeGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

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
  const getAllCategoryIds = useCallback((typeGroups: TypeGroup[]): string[] => {
    const ids: string[] = []

    const extractCategoryIds = (categories: EnrichedCategory[]): string[] => {
      const categoryIds: string[] = []
      categories.forEach(category => {
        categoryIds.push(category.id)
        if (category.children && category.children.length > 0) {
          categoryIds.push(...extractCategoryIds(category.children))
        }
      })
      return categoryIds
    }

    typeGroups.forEach(group => {
      ids.push(...extractCategoryIds(group.categories))
    })

    return ids
  }, [])

  // 展开所有分类和分组
  const expandAll = useCallback(() => {
    if (filteredData) {
      // 展开所有分组
      setExpandedTypeGroups(
        new Set([
          AccountType.ASSET,
          AccountType.LIABILITY,
          AccountType.INCOME,
          AccountType.EXPENSE,
        ])
      )
      // 展开所有分类
      const allIds = getAllCategoryIds(filteredData)
      setExpandedCategories(new Set(allIds))
    }
  }, [filteredData, getAllCategoryIds])

  // 收起所有分类和分组
  const collapseAll = useCallback(() => {
    setExpandedTypeGroups(new Set())
    setExpandedCategories(new Set())
  }, [])

  // 检查是否所有分类都已展开
  const checkAllExpanded = useCallback(() => {
    if (!filteredData) return false
    const allTypeGroupsExpanded = [
      AccountType.ASSET,
      AccountType.LIABILITY,
      AccountType.INCOME,
      AccountType.EXPENSE,
    ].every(type => expandedTypeGroups.has(type as CategoryType))
    const allIds = getAllCategoryIds(filteredData)
    const allCategoriesExpanded = allIds.every(id => expandedCategories.has(id))
    return allTypeGroupsExpanded && allCategoriesExpanded
  }, [filteredData, expandedCategories, expandedTypeGroups, getAllCategoryIds])

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

  // 避免 hydration 错误 - 在客户端挂载前显示加载状态
  // 只有在基础数据加载中时才显示加载状态，余额数据可以异步加载
  if (!isMounted || userDataLoading || filteredData === null) {
    return (
      <div className='flex items-center justify-center py-8'>
        <LoadingSpinner size='lg' inline showText text={t('common.loading')} />
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

  if (filteredData.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
        {searchQuery ? t('sidebar.search.no.results') : t('common.no.data')}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {filteredData.map(group => {
        const isExpanded = expandedTypeGroups.has(group.type)
        return (
          <div
            key={group.type}
            className={`
              rounded-lg border transition-all duration-200 mx-1
              ${getExpandedGroupStyle(group.type)}
            `}
          >
            <TypeGroupHeader
              type={group.type}
              label={group.label}
              totalBalance={group.totalBalance}
              currencySymbol={group.currencySymbol}
              isExpanded={isExpanded}
              onToggle={() => toggleTypeGroup(group.type)}
              isWrapped={true}
            />

            {isExpanded && (
              <div className='space-y-1 px-2 pb-2'>
                {viewMode === 'tree'
                  ? // 树状视图：显示分类层级结构
                    group.categories.map(category => renderCategory(category))
                  : // 账户视图：直接显示所有账户
                    getAccountsForAccountsView(group).map(account => (
                      <AccountTreeItem
                        key={account.id}
                        account={account}
                        level={0}
                        onNavigate={onNavigate}
                        baseCurrency={getBaseCurrency() || undefined}
                      />
                    ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

OptimizedCategoryAccountTree.displayName = 'OptimizedCategoryAccountTree'

export default OptimizedCategoryAccountTree

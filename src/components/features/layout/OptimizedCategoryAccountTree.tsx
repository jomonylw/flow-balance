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
  onViewModeChange?: (mode: 'tree' | 'accounts') => void
  onAddTopCategory?: (accountType: CategoryType) => void
}

export interface OptimizedCategoryAccountTreeRef {
  expandAll: () => void
  collapseAll: () => void
  checkAllExpanded: () => boolean
}

const OptimizedCategoryAccountTree = forwardRef<
  OptimizedCategoryAccountTreeRef,
  OptimizedCategoryAccountTreeProps
>(
  (
    {
      searchQuery,
      viewMode = 'tree',
      onNavigate,
      onViewModeChange,
      onAddTopCategory,
    },
    ref
  ) => {
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
        // console.log('[OptimizedCategoryAccountTree] Received data update event:', event)
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
            // console.log(`[OptimizedCategoryAccountTree] Manual refresh event received, type: ${refreshType}`)
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
          // console.log('[OptimizedCategoryAccountTree] Refreshing balances for transaction/balance event:', { type, accountId: event.accountId, categoryId: event.categoryId })
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
            // console.log('[OptimizedCategoryAccountTree] Refreshing accounts and balances for account event')
          }
          await refreshAccounts()
          await refreshBalances()
          break

        case 'category-create':
        case 'category-update':
        case 'category-delete':
          // 分类相关更新：刷新分类数据和账户数据（账户的分类信息可能变化）
          if (process.env.NODE_ENV === 'development') {
            // console.log('[OptimizedCategoryAccountTree] Refreshing categories and accounts for category event')
          }
          await refreshCategories()
          await refreshAccounts()
          break

        default:
          // 其他更新：刷新余额数据
          if (process.env.NODE_ENV === 'development') {
            // console.log('[OptimizedCategoryAccountTree] Refreshing balances for unknown event')
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

      // 如果数据加载完成但分类为空，仍然要显示汇总项
      // 注意：accounts 可以为空，因为新创建的分类下面可能还没有账户
      const safeCategories = categories || []

      // 确保 accounts 数组存在，即使为空
      const safeAccounts = accounts || []

      // 构建分类映射
      const categoryMap = new Map()
      const rootCategories: EnrichedCategory[] = []

      // 初始化分类映射
      safeCategories.forEach(category => {
        categoryMap.set(category.id, {
          ...category,
          children: [],
          accounts: [],
        })
      })

      // 构建分类层级关系
      safeCategories.forEach(category => {
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
      safeAccounts.forEach(account => {
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

        // 计算该类型的汇总余额
        const totalBalance = calculateTypeBalance(categoriesOfType)

        // 即使没有分类也要显示汇总项
        typeGroups.push({
          type,
          label: t(labelKey),
          categories: categoriesOfType,
          totalBalance,
          currencySymbol,
        })
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

      const filterCategories = (
        cats: EnrichedCategory[]
      ): EnrichedCategory[] => {
        return cats
          .filter(category => {
            const matchesName = category.name.toLowerCase().includes(query)
            const hasMatchingChildren =
              category.children &&
              filterCategories(category.children).length > 0
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
          return 'bg-orange-50/20 dark:bg-orange-950/15 border-orange-200/50 dark:border-orange-700/30'
        case 'INCOME':
          return 'bg-green-50/20 dark:bg-green-950/15 border-green-200/50 dark:border-green-700/30'
        case 'EXPENSE':
          return 'bg-red-50/20 dark:bg-red-950/15 border-red-200/50 dark:border-red-700/30'
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
    const getAllCategoryIds = useCallback(
      (typeGroups: TypeGroup[]): string[] => {
        const ids: string[] = []

        const extractCategoryIds = (
          categories: EnrichedCategory[]
        ): string[] => {
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
      },
      []
    )

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
      const allCategoriesExpanded = allIds.every(id =>
        expandedCategories.has(id)
      )
      return allTypeGroupsExpanded && allCategoriesExpanded
    }, [
      filteredData,
      expandedCategories,
      expandedTypeGroups,
      getAllCategoryIds,
    ])

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
              {category.children?.map(child =>
                renderCategory(child, level + 1)
              )}

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
        <div className='space-y-3'>
          {/* 显示类型分组的骨架屏 */}
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className='rounded-lg border border-gray-200 dark:border-gray-700 mx-1'
            >
              {/* 分组标题骨架屏 */}
              <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                    <div className='h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                  </div>
                  <div className='h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                </div>
              </div>
              {/* 分组内容骨架屏 */}
              <div className='space-y-1 px-2 pb-2'>
                {[1, 2, 3].map(j => (
                  <div
                    key={j}
                    className='flex items-center space-x-2 py-2 px-3'
                  >
                    <div className='h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
                    <div className='h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
                    <div className='h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
                  {viewMode === 'tree' ? (
                    // 树状视图：显示分类层级结构
                    group.categories.length > 0 ? (
                      group.categories.map(category => renderCategory(category))
                    ) : (
                      // 没有分类时显示提示和添加按钮
                      <div className='py-4 px-3 text-center'>
                        <div className='text-gray-500 dark:text-gray-400 text-sm mb-3'>
                          <div className='font-medium mb-1'>
                            {t('sidebar.no.categories')}
                          </div>
                          <div className='text-xs leading-relaxed'>
                            {t('sidebar.no.categories.hint')}
                          </div>
                        </div>
                        <button
                          onClick={() => onAddTopCategory?.(group.type)}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors duration-200 border border-blue-200 dark:border-blue-700/50'
                        >
                          <svg
                            className='w-3.5 h-3.5'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              d='M12 4v16m8-8H4'
                            />
                          </svg>
                          {t('sidebar.add.category')}
                        </button>
                      </div>
                    )
                  ) : (
                    // 账户视图：直接显示所有账户
                    (() => {
                      const accounts = getAccountsForAccountsView(group)
                      if (accounts.length === 0) {
                        // 没有账户时显示提示和切换按钮
                        return (
                          <div className='py-4 px-3 text-center'>
                            <div className='text-gray-500 dark:text-gray-400 text-sm mb-3'>
                              <div className='font-medium mb-1'>
                                {t('sidebar.no.accounts')}
                              </div>
                              <div className='text-xs leading-relaxed'>
                                {t('sidebar.no.accounts.hint')}
                              </div>
                            </div>
                            <button
                              onClick={() => onViewModeChange?.('tree')}
                              className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors duration-200 border border-blue-200 dark:border-blue-700/50'
                            >
                              <svg
                                className='w-3.5 h-3.5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
                                />
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  d='M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z'
                                />
                              </svg>
                              {t('sidebar.switch.to.tree')}
                            </button>
                          </div>
                        )
                      }
                      return accounts.map(account => (
                        <AccountTreeItem
                          key={account.id}
                          account={account}
                          level={0}
                          onNavigate={onNavigate}
                          baseCurrency={getBaseCurrency() || undefined}
                        />
                      ))
                    })()
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }
)

OptimizedCategoryAccountTree.displayName = 'OptimizedCategoryAccountTree'

export default OptimizedCategoryAccountTree

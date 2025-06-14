'use client'

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import CategoryTreeItem from './CategoryTreeItem'
import AccountTreeItem from './AccountTreeItem'
import { useUserData } from '@/contexts/UserDataContext'
import { useAllDataListener } from '@/hooks/useDataUpdateListener'

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  parentId: string | null
  order: number
  children?: Category[]
  accounts?: Account[]
}

interface Account {
  id: string
  name: string
  description?: string
  color?: string
  currencyCode: string
  categoryId: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  // 余额数据将通过props传入
  balances?: Record<string, {
    amount: number
    currency: {
      code: string
      symbol: string
      name: string
    }
  }>
  balanceInBaseCurrency?: number
}


interface OptimizedCategoryAccountTreeProps {
  searchQuery: string
  onDataChange: (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => void
  onNavigate?: () => void
}

export interface OptimizedCategoryAccountTreeRef {
  expandAll: () => void
  collapseAll: () => void
  checkAllExpanded: () => boolean
}

const OptimizedCategoryAccountTree = forwardRef<OptimizedCategoryAccountTreeRef, OptimizedCategoryAccountTreeProps>(({
  searchQuery,
  onDataChange,
  onNavigate
}, ref) => {
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
    refreshCategories
  } = useUserData()

  const initialFetchDone = useRef(false)

  // 直接从 localStorage 初始化状态
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('categoryTreeExpandedState')
        if (savedState) {
          const expandedIds = JSON.parse(savedState)
          return new Set(expandedIds)
        }
      } catch (error) {
        console.error('Error loading expanded state from localStorage:', error)
      }
    }
    return new Set()
  })

  // 保存展开状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('categoryTreeExpandedState', JSON.stringify([...expandedCategories]))
      } catch (error) {
        console.error('Error saving expanded state to localStorage:', error)
      }
    }
  }, [expandedCategories])


  // 初始化时获取余额数据
  useEffect(() => {
    if (!userDataLoading && categories.length > 0 && accounts.length > 0 && !initialFetchDone.current) {
      fetchBalances()
      initialFetchDone.current = true
    }
  }, [userDataLoading, categories, accounts, fetchBalances])

  // 使用新的数据更新监听系统
  useAllDataListener(async (event) => {
    const { type, silent } = event
    console.log('[OptimizedCategoryAccountTree] Received data update event:', event)

    if (silent) return

    // 根据事件类型决定刷新策略
    switch (type) {
      case 'balance-update':
      case 'transaction-create':
      case 'transaction-update':
      case 'transaction-delete':
        // 余额相关更新：强制刷新余额数据
        console.log('[OptimizedCategoryAccountTree] Refreshing balances for transaction/balance event')
        await refreshBalances()
        break

      case 'account-create':
      case 'account-update':
      case 'account-delete':
        // 账户相关更新：刷新账户数据和余额数据
        console.log('[OptimizedCategoryAccountTree] Refreshing accounts and balances for account event')
        await refreshAccounts()
        await refreshBalances()
        break

      case 'category-create':
      case 'category-update':
      case 'category-delete':
        // 分类相关更新：刷新分类数据和账户数据（账户的分类信息可能变化）
        console.log('[OptimizedCategoryAccountTree] Refreshing categories and accounts for category event')
        await refreshCategories()
        await refreshAccounts()
        break

      default:
        // 其他更新：刷新余额数据
        console.log('[OptimizedCategoryAccountTree] Refreshing balances for unknown event')
        await refreshBalances()
        break
    }
  })

  // 监听自定义数据变化事件（来自NavigationSidebar的handleDataChange）
  useEffect(() => {
    const handleDataChange = async (event: Event) => {
      const customEvent = event as CustomEvent
      const options = customEvent.detail || {}
      console.log('[OptimizedCategoryAccountTree] Received custom data change event:', options)

      // 如果是静默更新，跳过
      if (options.silent) return

      switch (options.type) {
        case 'category':
          console.log('[OptimizedCategoryAccountTree] Refreshing categories and accounts for custom category event')
          await refreshCategories()
          await refreshAccounts() // 账户的分类信息可能变化
          break
        case 'account':
          console.log('[OptimizedCategoryAccountTree] Refreshing accounts and balances for custom account event')
          await refreshAccounts()
          await refreshBalances()
          break
        case 'full':
        default:
          // 全量刷新
          console.log('[OptimizedCategoryAccountTree] Full refresh for custom event')
          await refreshCategories()
          await refreshAccounts()
          await refreshBalances()
          break
      }
    }

    window.addEventListener('dataChange', handleDataChange)
    return () => {
      window.removeEventListener('dataChange', handleDataChange)
    }
  }, [refreshCategories, refreshAccounts, refreshBalances])

  // 构建树状结构并合并余额数据
  const enrichedTreeData = useMemo(() => {
    if (!categories || !accounts || !accountBalances) return null

    // 构建分类映射
    const categoryMap = new Map()
    const rootCategories: Category[] = []

    // 初始化分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        accounts: []
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
          balanceInBaseCurrency: accountBalances[account.id]?.balanceInBaseCurrency || 0
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
    
    const filterCategories = (cats: Category[]): Category[] => {
      return cats.filter(category => {
        const matchesName = category.name.toLowerCase().includes(query)
        const hasMatchingChildren = category.children && filterCategories(category.children).length > 0
        const hasMatchingAccounts = category.accounts?.some(account => 
          account.name.toLowerCase().includes(query) ||
          account.description?.toLowerCase().includes(query)
        )
        
        return matchesName || hasMatchingChildren || hasMatchingAccounts
      }).map(category => ({
        ...category,
        children: category.children ? filterCategories(category.children) : [],
        accounts: category.accounts?.filter(account =>
          account.name.toLowerCase().includes(query) ||
          account.description?.toLowerCase().includes(query)
        ) || []
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
  const getAllCategoryIds = (categories: Category[]): string[] => {
    const ids: string[] = []
    categories.forEach(category => {
      ids.push(category.id)
      if (category.children && category.children.length > 0) {
        ids.push(...getAllCategoryIds(category.children))
      }
    })
    return ids
  }

  // 展开所有分类
  const expandAll = () => {
    if (filteredData) {
      const allIds = getAllCategoryIds(filteredData)
      setExpandedCategories(new Set(allIds))
    }
  }

  // 收起所有分类
  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  // 检查是否所有分类都已展开
  const checkAllExpanded = () => {
    if (!filteredData) return false
    const allIds = getAllCategoryIds(filteredData)
    return allIds.every(id => expandedCategories.has(id))
  }

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    expandAll,
    collapseAll,
    checkAllExpanded
  }), [filteredData, expandedCategories])

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = (category.children && category.children.length > 0) ||
                       (category.accounts && category.accounts.length > 0) || false

    return (
      <div key={category.id}>
        <CategoryTreeItem
          category={category}
          level={level}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => toggleCategory(category.id)}
          onDataChange={onDataChange}
          baseCurrency={getBaseCurrency() || undefined}
        />
        
        {isExpanded && (
          <div className="ml-4">
            {/* 渲染子分类 */}
            {category.children?.map(child => renderCategory(child, level + 1))}
            
            {/* 渲染该分类下的账户 */}
            {category.accounts?.map(account => (
              <AccountTreeItem
                key={account.id}
                account={account}
                level={level + 1}
                onDataChange={onDataChange}
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    )
  }

  if (userDataError || balancesError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">❌ {userDataError || balancesError}</div>
        <button
          onClick={() => {
            // 这里可以同时刷新基础数据和余额
            fetchBalances()
          }}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          重试
        </button>
      </div>
    )
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? '未找到匹配的分类或账户' : '暂无数据'}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {filteredData.map(category => renderCategory(category))}
    </div>
  )
})

OptimizedCategoryAccountTree.displayName = 'OptimizedCategoryAccountTree'

export default OptimizedCategoryAccountTree

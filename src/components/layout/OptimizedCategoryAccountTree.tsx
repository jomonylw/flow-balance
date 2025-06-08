'use client'

import { useState, useEffect, useMemo } from 'react'
import CategoryTreeItem from './CategoryTreeItem'
import AccountTreeItem from './AccountTreeItem'
import { useUserData } from '@/contexts/UserDataContext'

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  parentId?: string | null
  order: number
  children?: Category[]
  accounts?: Account[]
}

interface Account {
  id: string
  name: string
  description?: string | null
  color?: string | null
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

interface TreeStructure {
  treeStructure: Category[]
  stats: {
    totalCategories: number
    totalAccounts: number
    rootCategories: number
  }
  timestamp: string
}

interface AccountBalances {
  accountBalances: Record<string, {
    id: string
    name: string
    categoryId: string
    accountType: string
    balances: Record<string, {
      amount: number
      currency: {
        code: string
        symbol: string
        name: string
      }
    }>
    balanceInBaseCurrency: number
  }>
  baseCurrency: {
    code: string
    symbol: string
    name: string
  }
  timestamp: string
}

interface OptimizedCategoryAccountTreeProps {
  searchQuery: string
  onDataChange: (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => void
  onNavigate?: () => void
}

export default function OptimizedCategoryAccountTree({
  searchQuery,
  onDataChange,
  onNavigate
}: OptimizedCategoryAccountTreeProps) {
  // 使用UserDataContext获取基础数据
  const {
    categories,
    accounts,
    userSettings,
    isLoading: userDataLoading,
    error: userDataError,
    getBaseCurrency
  } = useUserData()

  const [accountBalances, setAccountBalances] = useState<AccountBalances | null>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)
  const [balancesError, setBalancesError] = useState<string | null>(null)

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

  // 只获取账户余额数据（其他数据从UserDataContext获取）
  const fetchBalances = async () => {
    try {
      setIsLoadingBalances(true)
      setBalancesError(null)

      const balancesResponse = await fetch('/api/accounts/balances')

      if (!balancesResponse.ok) {
        throw new Error('获取账户余额失败')
      }

      const balancesResult = await balancesResponse.json()

      if (!balancesResult.success) {
        throw new Error(balancesResult.message || '获取账户余额失败')
      }

      setAccountBalances(balancesResult.data)
    } catch (err) {
      console.error('Error fetching balance data:', err)
      setBalancesError(err instanceof Error ? err.message : '获取余额数据失败')
    } finally {
      setIsLoadingBalances(false)
    }
  }

  // 初始化时获取余额数据
  useEffect(() => {
    if (!userDataLoading && categories.length > 0 && accounts.length > 0) {
      fetchBalances()
    }
  }, [userDataLoading, categories.length, accounts.length])

  // 监听数据变化事件
  useEffect(() => {
    const handleDataChange = (event: CustomEvent) => {
      const { type, silent } = event.detail || {}
      if (!silent) {
        // 只刷新余额数据，其他数据由UserDataContext管理
        fetchBalances()
      }
    }

    window.addEventListener('dataChange' as any, handleDataChange)
    return () => {
      window.removeEventListener('dataChange' as any, handleDataChange)
    }
  }, [])

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
          balances: accountBalances.accountBalances[account.id]?.balances || {},
          balanceInBaseCurrency: accountBalances.accountBalances[account.id]?.balanceInBaseCurrency || 0
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

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = (category.children && category.children.length > 0) || 
                       (category.accounts && category.accounts.length > 0)

    return (
      <div key={category.id}>
        <CategoryTreeItem
          category={category}
          level={level}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => toggleCategory(category.id)}
          onDataChange={onDataChange}
          baseCurrency={getBaseCurrency()}
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
                baseCurrency={getBaseCurrency()}
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
          onClick={fetchBalances}
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
}

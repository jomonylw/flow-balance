'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import CategoryTreeItem from './CategoryTreeItem'
import AccountTreeItem from './AccountTreeItem'

interface Category {
  id: string
  name: string
  parentId: string | null
  order: number
  children?: Category[]
}

interface Account {
  id: string
  name: string
  categoryId: string
  description?: string
  color?: string
  currencyCode: string
  currency?: {
    code: string
    name: string
    symbol: string
  }
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface CategoryAccountTreeProps {
  categories: Category[]
  accounts: Account[]
  searchQuery: string
  onDataChange: (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => void
  onNavigate?: () => void
}

export default function CategoryAccountTree({
  categories,
  accounts,
  searchQuery,
  onDataChange,
  onNavigate
}: CategoryAccountTreeProps) {
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
        const expandedIds = Array.from(expandedCategories)
        localStorage.setItem('categoryTreeExpandedState', JSON.stringify(expandedIds))
      } catch (error) {
        console.error('Error saving expanded state to localStorage:', error)
      }
    }
  }, [expandedCategories])

  // 构建树状结构
  const categoryTree = useMemo(() => {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // 创建分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // 构建树状结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)!
      
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    // 按 order 排序
    const sortCategories = (cats: Category[]) => {
      cats.sort((a, b) => a.order - b.order)
      cats.forEach(cat => {
        if (cat.children) {
          sortCategories(cat.children)
        }
      })
    }

    sortCategories(rootCategories)
    return rootCategories
  }, [categories])

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories: categoryTree, accounts }
    }

    const query = searchQuery.toLowerCase()
    
    // 过滤分类
    const filterCategories = (cats: Category[]): Category[] => {
      return cats.filter(category => {
        const matchesName = category.name.toLowerCase().includes(query)
        const hasMatchingChildren = category.children && filterCategories(category.children).length > 0
        const hasMatchingAccounts = accounts.some(account => 
          account.categoryId === category.id && 
          account.name.toLowerCase().includes(query)
        )
        
        return matchesName || hasMatchingChildren || hasMatchingAccounts
      }).map(category => ({
        ...category,
        children: category.children ? filterCategories(category.children) : []
      }))
    }

    // 过滤账户
    const filteredAccounts = accounts.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.description?.toLowerCase().includes(query)
    )

    return {
      categories: filterCategories(categoryTree),
      accounts: filteredAccounts
    }
  }, [categoryTree, accounts, searchQuery])

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
    const categoryAccounts = filteredData.accounts.filter(
      account => account.categoryId === category.id
    )
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = (category.children && category.children.length > 0) || categoryAccounts.length > 0

    return (
      <div key={category.id}>
        <CategoryTreeItem
          category={category}
          level={level}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => toggleCategory(category.id)}
          onDataChange={onDataChange}
        />
        
        {isExpanded && (
          <div className="ml-4">
            {/* 渲染子分类 */}
            {category.children?.map(child => renderCategory(child, level + 1))}
            
            {/* 渲染该分类下的账户 */}
            {categoryAccounts.map(account => (
              <AccountTreeItem
                key={account.id}
                account={account}
                level={level + 1}
                onDataChange={onDataChange}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (filteredData.categories.length === 0 && filteredData.accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? '没有找到匹配的结果' : '暂无数据'}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {filteredData.categories.map(category => renderCategory(category))}
    </div>
  )
}

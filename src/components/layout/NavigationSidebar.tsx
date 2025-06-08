'use client'

import { useState, useEffect } from 'react'
import SidebarSearchBox from './SidebarSearchBox'
import SidebarDashboardLink from './SidebarDashboardLink'
import SidebarReportsLink from './SidebarReportsLink'
import CategoryAccountTree from './CategoryAccountTree'
import TopCategoryModal from '@/components/ui/TopCategoryModal'
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  id: string
  email: string
}

interface Category {
  id: string
  name: string
  type: string
  parentId: string | null
  order: number
  [key: string]: any
}

interface Account {
  id: string
  name: string
  categoryId: string
  currency: string
  description?: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  [key: string]: any
}

interface NavigationSidebarProps {
  user: User
  isMobile?: boolean
  onNavigate?: () => void
}

export default function NavigationSidebar({
  user,
  isMobile = false,
  onNavigate
}: NavigationSidebarProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddTopCategoryModal, setShowAddTopCategoryModal] = useState(false)

  // 获取用户的分类和账户数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // 并行获取分类和账户数据
        const [categoriesRes, accountsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts')
        ])

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData.data || [])
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData.data || [])
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddTopCategory = () => {
    setShowAddTopCategoryModal(true)
  }

  // 智能数据更新：支持局部更新和完整刷新
  const handleDataChange = async (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean // 静默更新，不显示加载状态
  }) => {
    const { type = 'full', silent = false } = options || {}

    try {
      if (!silent) {
        setIsLoading(true)
      }

      if (type === 'category' || type === 'full') {
        const categoriesRes = await fetch('/api/categories')
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData.data || [])
        }
      }

      if (type === 'account' || type === 'full') {
        const accountsRes = await fetch('/api/accounts')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData.data || [])
        }
      }
    } catch (error) {
      console.error('Error refreshing sidebar data:', error)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }



  // 乐观更新：立即更新UI，然后同步数据
  const updateCategoryOptimistic = (categoryId: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ))
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'category', silent: true }), 100)
  }

  const updateAccountOptimistic = (accountId: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map(acc =>
      acc.id === accountId ? { ...acc, ...updates } : acc
    ))
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'account', silent: true }), 100)
  }

  const addCategoryOptimistic = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory])
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'category', silent: true }), 100)
  }

  const addAccountOptimistic = (newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount])
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'account', silent: true }), 100)
  }

  const removeCategoryOptimistic = (categoryId: string) => {
    setCategories((prev) => prev.filter(cat => cat.id !== categoryId))
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'category', silent: true }), 100)
  }

  const removeAccountOptimistic = (accountId: string) => {
    setAccounts((prev) => prev.filter(acc => acc.id !== accountId))
    // 静默同步数据以确保一致性
    setTimeout(() => handleDataChange({ type: 'account', silent: true }), 100)
  }

  const handleSaveTopCategory = async (data: { name: string; type: string }) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          parentId: null, // 顶级分类没有父分类
          order: 0
        }),
      })

      if (response.ok) {
        setShowAddTopCategoryModal(false)
        handleDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        throw new Error(error.message || '创建分类失败')
      }
    } catch (error) {
      console.error('Error creating top category:', error)
      throw error
    }
  }

  return (
    <div className={`
      ${isMobile ? 'w-full' : 'w-80'}
      bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full
    `}>
      {/* 移动端顶部间距 */}
      {isMobile && <div className="h-16" />}

      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <SidebarSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 侧边栏内容 */}
      <div className="flex-1 overflow-y-auto overflow-x-visible">
        <div className="p-4 space-y-4">
          {/* Dashboard 链接 */}
          <SidebarDashboardLink onNavigate={onNavigate} />

          {/* 报表链接 */}
          <SidebarReportsLink onNavigate={onNavigate} />

          {/* 分类和账户树 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t('sidebar.categories')}
            </h3>

            <div className="relative">
              {isLoading && categories.length === 0 && (
                <div className="space-y-2 w-full">
                  {/* 加载骨架屏 - 只在初始加载时显示 */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
              {isLoading && categories.length > 0 && (
                <div className="absolute top-0 right-0 z-10">
                  {/* 小型加载指示器 - 在有数据时显示 */}
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs">
                    {t('sidebar.updating')}
                  </div>
                </div>
              )}
              <CategoryAccountTree
                key="category-account-tree" // 确保组件不会被重新挂载
                categories={categories}
                accounts={accounts}
                searchQuery={searchQuery}
                onDataChange={handleDataChange}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部添加按钮 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleAddTopCategory}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('sidebar.add.top.category')}
        </button>
      </div>

      {/* 添加顶级分类模态框 */}
      <TopCategoryModal
        isOpen={showAddTopCategoryModal}
        onClose={() => setShowAddTopCategoryModal(false)}
        onSave={handleSaveTopCategory}
      />
    </div>
  )
}

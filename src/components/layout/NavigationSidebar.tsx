'use client'

import { useState, useEffect } from 'react'
import SidebarSearchBox from './SidebarSearchBox'
import SidebarDashboardLink from './SidebarDashboardLink'
import SidebarReportsLink from './SidebarReportsLink'
import CategoryAccountTree from './CategoryAccountTree'
import TopCategoryModal from '@/components/ui/TopCategoryModal'

interface User {
  id: string
  email: string
}

interface NavigationSidebarProps {
  user: User
}

export default function NavigationSidebar({ user }: NavigationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
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

  const handleDataChange = () => {
    // 重新获取数据
    window.location.reload()
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
        handleDataChange()
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
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-200">
        <SidebarSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 侧边栏内容 */}
      <div className="flex-1 overflow-y-auto overflow-x-visible">
        <div className="p-4 space-y-4">
          {/* Dashboard 链接 */}
          <SidebarDashboardLink />

          {/* 报表链接 */}
          <SidebarReportsLink />

          {/* 分类和账户树 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              账户分类
            </h3>
            
            {isLoading ? (
              <div className="space-y-2">
                {/* 加载骨架屏 */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <CategoryAccountTree 
                categories={categories}
                accounts={accounts}
                searchQuery={searchQuery}
                onDataChange={handleDataChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* 底部添加按钮 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleAddTopCategory}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加顶级分类
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

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import SidebarSearchBox from './SidebarSearchBox'
import SidebarDashboardLink from './SidebarDashboardLink'
import SidebarFireLink from './SidebarFireLink'
import SidebarTransactionsLink from './SidebarTransactionsLink'
import SidebarReportsLink from './SidebarReportsLink'
import OptimizedCategoryAccountTree, { OptimizedCategoryAccountTreeRef } from './OptimizedCategoryAccountTree'
import TopCategoryModal from '@/components/ui/TopCategoryModal'
import TranslationLoader from '@/components/ui/TranslationLoader'
import { useLanguage } from '@/contexts/LanguageContext'


interface NavigationSidebarProps {
  isMobile?: boolean
  onNavigate?: () => void
}

export default function NavigationSidebar({
  isMobile = false,
  onNavigate
}: NavigationSidebarProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddTopCategoryModal, setShowAddTopCategoryModal] = useState(false)
  const [areAllCategoriesExpanded, setAreAllCategoriesExpanded] = useState(false)
  const categoryTreeRef = useRef<OptimizedCategoryAccountTreeRef>(null)

  const handleAddTopCategory = () => {
    setShowAddTopCategoryModal(true)
  }

  const toggleAllCategories = () => {
    if (categoryTreeRef.current) {
      if (areAllCategoriesExpanded) {
        categoryTreeRef.current.collapseAll()
        setAreAllCategoriesExpanded(false)
      } else {
        categoryTreeRef.current.expandAll()
        setAreAllCategoriesExpanded(true)
      }
    }
  }

  // 定期检查展开状态
  useEffect(() => {
    const checkExpandedState = () => {
      if (categoryTreeRef.current) {
        const allExpanded = categoryTreeRef.current.checkAllExpanded()
        setAreAllCategoriesExpanded(allExpanded)
      }
    }

    // 初始检查
    checkExpandedState()

    // 设置定时器定期检查
    const interval = setInterval(checkExpandedState, 1000)

    return () => clearInterval(interval)
  }, [searchQuery]) // 当搜索查询改变时重新检查

  // 简化的数据更新处理 - 现在由OptimizedCategoryAccountTree内部处理
  const handleDataChange = useCallback((options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => {
    // 发送自定义事件通知OptimizedCategoryAccountTree刷新数据
    const event = new CustomEvent('dataChange', { detail: options })
    window.dispatchEvent(event)
  }, [])




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
        handleDataChange({ type: 'category' })
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
    <TranslationLoader
      fallback={
        <div className={`
          ${isMobile ? 'w-full' : 'w-80'}
          bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full
        `}>
          <div className="animate-pulse p-4 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
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

          {/* FIRE 征途链接 */}
          <SidebarFireLink onNavigate={onNavigate} />

          {/* 交易链接 */}
          <SidebarTransactionsLink onNavigate={onNavigate} />

          {/* 报表链接 */}
          <SidebarReportsLink onNavigate={onNavigate} />

          {/* 分类和账户树 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('sidebar.categories')}
              </h3>
              <button
                onClick={toggleAllCategories}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={areAllCategoriesExpanded ? t('sidebar.collapse.categories') : t('sidebar.expand.categories')}
              >
                {areAllCategoriesExpanded ? (
                  // 收起所有 - 箭头指向中心（向内收起）
                  <svg
                    className="w-6 h-6 text-gray-500 dark:text-gray-400 transition-all duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    {/* 中间横线 */}
                    <line x1="5" y1="12" x2="19" y2="12" />
                    {/* 上箭头指向中心 */}
                    <polyline points="8,6 12,10 16,6" />
                    {/* 下箭头指向中心 */}
                    <polyline points="8,18 12,14 16,18" />
                  </svg>
                ) : (
                  // 展开所有 - 箭头指向外侧（向外展开）
                  <svg
                    className="w-6 h-6 text-gray-500 dark:text-gray-400 transition-all duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    {/* 中间横线 */}
                    <line x1="5" y1="12" x2="19" y2="12" />
                    {/* 上箭头指向外侧 */}
                    <polyline points="8,10 12,6 16,10" />
                    {/* 下箭头指向外侧 */}
                    <polyline points="8,14 12,18 16,14" />
                  </svg>
                )}
              </button>
            </div>

            <OptimizedCategoryAccountTree
              ref={categoryTreeRef}
              searchQuery={searchQuery}
              onDataChange={handleDataChange}
              onNavigate={onNavigate}
            />
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
    </TranslationLoader>
  )
}

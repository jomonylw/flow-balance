'use client'

import { useState, useRef, useEffect } from 'react'
import SidebarSearchBox from './SidebarSearchBox'
import SidebarDashboardLink from './SidebarDashboardLink'
import SidebarFireLink from './SidebarFireLink'
import SidebarTransactionsLink from './SidebarTransactionsLink'
import SidebarReportsLink from './SidebarReportsLink'
import OptimizedCategoryAccountTree, { OptimizedCategoryAccountTreeRef } from './OptimizedCategoryAccountTree'
import TopCategoryModal from '@/components/ui/TopCategoryModal'
import TranslationLoader from '@/components/ui/TranslationLoader'
import { useLanguage } from '@/contexts/LanguageContext'
import { publishCategoryCreate } from '@/utils/DataUpdateManager'
import { useSidebarWidth, useSidebarScrollPosition } from '@/hooks/useSidebarWidth'
import { useStableComponentKey, useSmoothTransition } from '@/hooks/useSidebarState'


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
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 侧边栏宽度管理
  const {
    width,
    isDragging,
    startDragging,
    stopDragging,
    handleDrag
  } = useSidebarWidth()

  // 侧边栏滚动位置保持
  const {
    scrollContainerRef,
    handleScroll,
    restoreScrollPosition
  } = useSidebarScrollPosition()

  // 路由变化时恢复滚动位置
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition()
    }, 100) // 延迟恢复，确保内容已渲染

    return () => clearTimeout(timer)
  }, [restoreScrollPosition])

  // 稳定的组件key，防止路由变化时重新挂载
  const stableKey = useStableComponentKey('navigation-sidebar')

  // 平滑过渡效果
  const { transitionRef } = useSmoothTransition()

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

  // 拖拽事件处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect()
        handleDrag(e.clientX, rect)
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        stopDragging()
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleDrag, stopDragging])

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

  // 恢复滚动位置
  useEffect(() => {
    // 延迟恢复滚动位置，确保内容已渲染
    const timer = setTimeout(() => {
      restoreScrollPosition()
    }, 100)

    return () => clearTimeout(timer)
  }, [restoreScrollPosition])

  // 保留此函数用于未来可能的手动刷新功能
  // const handleDataRefresh = useCallback((options?: {
  //   type?: 'category' | 'account' | 'full'
  //   silent?: boolean
  // }) => {
  //   publishDataUpdate({
  //     type: 'manual-refresh',
  //     data: options,
  //     silent: options?.silent
  //   })
  // }, [])




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
        const result = await response.json()
        setShowAddTopCategoryModal(false)

        // 发布分类创建事件
        await publishCategoryCreate(undefined, {
          newCategory: result.data,
          parentCategory: null
        })

        // 分类创建事件已经发布，树会自动更新
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
      key={stableKey}
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
      <div
        ref={(el) => {
          sidebarRef.current = el
          if (transitionRef) {
            transitionRef.current = el
          }
        }}
        className={`
          ${isMobile ? 'w-full' : ''}
          bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full relative
          transition-opacity duration-150 ease-in-out
        `}
        style={!isMobile ? { width: `${width}px` } : undefined}
      >
      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <SidebarSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 侧边栏内容 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-visible sidebar-container"
        onScroll={handleScroll}
      >
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
            {/* 美化的账户分类标题区域 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('sidebar.categories')}
                </h3>
                <button
                  onClick={handleAddTopCategory}
                  className="group/add flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                  title={t('sidebar.add.top.category')}
                >
                  <svg
                    className="w-4 h-4 transition-transform duration-200 group-hover/add:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              <button
                onClick={toggleAllCategories}
                className="group/toggle flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                title={areAllCategoriesExpanded ? t('sidebar.collapse.categories') : t('sidebar.expand.categories')}
              >
                {areAllCategoriesExpanded ? (
                  // 收起所有 - 统一图标大小
                  <svg
                    className="w-4 h-4 transition-all duration-300 group-hover/toggle:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  // 展开所有 - 统一图标大小
                  <svg
                    className="w-4 h-4 transition-all duration-300 group-hover/toggle:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>

            <OptimizedCategoryAccountTree
              key="category-tree-stable"
              ref={categoryTreeRef}
              searchQuery={searchQuery}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>

      {/* 拖拽手柄 - 仅在桌面端显示 */}
      {!isMobile && (
        <div
          className="absolute top-0 right-0 w-3 h-full cursor-col-resize group z-10"
          onMouseDown={startDragging}
          title="拖拽调整侧边栏宽度"
        >
          {/* hover时的右边缘高亮 - 覆盖整个右侧边缘 */}
          <div className="absolute right-0 top-0 w-1 h-full bg-blue-400 dark:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"></div>
        </div>
      )}

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

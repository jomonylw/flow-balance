'use client'

import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  action: string
  icon: React.ReactNode
  className?: string
  disabled?: boolean
  description?: string
  badge?: string
  badgeColor?: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
}

interface BaseContextMenuProps {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
  menuItems: (MenuItem | 'divider')[]
  title?: string
  className?: string
  width?: 'sm' | 'md' | 'lg'
}

export default function BaseContextMenu({
  isOpen,
  onClose,
  onAction,
  menuItems,
  title,
  className = '',
  width = 'md'
}: BaseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])



  // 计算菜单位置，避免超出视口
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const triggerElement = menuRef.current.parentElement
      if (!triggerElement) return

      const triggerRect = triggerElement.getBoundingClientRect()
      const menuWidthMap = { sm: 192, md: 224, lg: 256 } // w-48, w-56, w-64
      const menuWidth = menuWidthMap[width]
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = triggerRect.right + 8 // 默认显示在右侧，8px间距
      let top = triggerRect.top

      // 如果右侧空间不够，显示在左侧
      if (left + menuWidth > viewportWidth - 20) {
        left = triggerRect.left - menuWidth - 8
      }

      // 新增：确保菜单不会在左侧屏幕外
      if (left < 20) {
        left = 20
      }

      // 确保不超出视口顶部和底部
      if (top < 20) {
        top = 20
      } else if (top + 400 > viewportHeight - 20) { // 假设菜单最大高度约400px
        top = Math.max(20, viewportHeight - 420)
      }

      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999
      })
    }
  }, [isOpen, width])

  if (!isOpen) return null

  const widthClass = {
    sm: 'w-48',
    md: 'w-56', 
    lg: 'w-64'
  }[width]

  const getBadgeColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div
      ref={menuRef}
      className={`
        ${widthClass} bg-white dark:bg-gray-800 rounded-xl shadow-xl ring-1 ring-gray-200 dark:ring-gray-700
        focus:outline-none transform transition-all duration-200 ease-out
        ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        ${className}
      `}
      style={{
        ...menuStyle,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      <div className="py-2">
        {/* 标题 */}
        {title && (
          <>
            <div className="px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 mx-2 mb-2"></div>
          </>
        )}

        {/* 菜单项 */}
        <div className="px-2 space-y-1">
          {menuItems.map((item, index) => {
            if (item === 'divider') {
              return <div key={index} className="border-t border-gray-100 dark:border-gray-700 my-2 mx-2" />
            }

            const menuItem = item as MenuItem
            return (
              <button
                key={menuItem.action}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!menuItem.disabled) {
                    onAction(menuItem.action)
                  }
                }}
                disabled={menuItem.disabled}
                className={`
                  group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg
                  transition-all duration-200 text-left
                  ${menuItem.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                  }
                  ${menuItem.className || 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}
                `}
              >
                {/* 图标 */}
                <div className="flex items-center justify-center w-8 h-8 mr-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors duration-200">
                  {menuItem.icon}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{menuItem.label}</span>
                    <div className="flex items-center space-x-2 ml-2">
                      {/* 徽章 */}
                      {menuItem.badge && (
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                          ${getBadgeColor(menuItem.badgeColor || 'gray')}
                        `}>
                          {menuItem.badge}
                        </span>
                      )}

                    </div>
                  </div>
                  {/* 描述 */}
                  {menuItem.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {menuItem.description}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

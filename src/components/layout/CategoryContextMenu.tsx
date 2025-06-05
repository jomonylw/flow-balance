'use client'

import { useEffect, useRef, useState } from 'react'

interface Category {
  id: string
  name: string
  parentId: string | null
}

interface CategoryContextMenuProps {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
  category: Category
}

export default function CategoryContextMenu({
  isOpen,
  onClose,
  onAction,
  category
}: CategoryContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

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
      const menuWidth = 192 // w-48 = 12rem = 192px
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = triggerRect.right + 8 // 默认显示在右侧，8px间距
      let top = triggerRect.top

      // 如果右侧空间不够，显示在左侧
      if (left + menuWidth > viewportWidth - 20) {
        left = triggerRect.left - menuWidth - 8
      }

      // 确保不超出视口顶部和底部
      if (top < 20) {
        top = 20
      } else if (top + 300 > viewportHeight - 20) { // 假设菜单高度约300px
        top = viewportHeight - 320
      }

      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const menuItems = [
    {
      label: '添加子分类',
      action: 'add-subcategory',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      label: '添加账户',
      action: 'add-account',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: '重命名',
      action: 'rename',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: '移动',
      action: 'move',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    },
    {
      label: '设置',
      action: 'settings',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    'divider',
    {
      label: '删除',
      action: 'delete',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      className: 'text-red-700 hover:bg-red-50 hover:text-red-900'
    }
  ]

  return (
    <div
      ref={menuRef}
      className="w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      style={menuStyle}
    >
      <div className="py-1">
        {menuItems.map((item, index) => {
          if (item === 'divider') {
            return <div key={index} className="border-t border-gray-100 my-1" />
          }

          const menuItem = item as any
          return (
            <button
              key={menuItem.action}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAction(menuItem.action)
              }}
              className={`
                flex items-center w-full px-4 py-2 text-sm transition-colors
                ${menuItem.className || 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <span className="mr-3">{menuItem.icon}</span>
              {menuItem.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

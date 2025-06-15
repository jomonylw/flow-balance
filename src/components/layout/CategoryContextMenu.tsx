'use client'

import BaseContextMenu, { MenuItem } from './BaseContextMenu'
import { useLanguage } from '@/contexts/LanguageContext'

interface Category {
  id: string
  name: string
  parentId: string | null
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
}

interface CategoryContextMenuProps {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
  category: Category
}

// 辅助函数：获取账户类型标签
function getAccountTypeLabel(t: (key: string) => string, type?: string): string {
  switch (type) {
    case 'ASSET': return t('menu.type.asset')
    case 'LIABILITY': return t('menu.type.liability')
    case 'INCOME': return t('menu.type.income')
    case 'EXPENSE': return t('menu.type.expense')
    default: return t('menu.type.category')
  }
}

// 辅助函数：获取分类类型颜色
function getCategoryTypeColor(type?: string): string {
  switch (type) {
    case 'ASSET': return 'text-blue-700 dark:text-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 hover:text-blue-800 dark:hover:text-blue-300'
    case 'LIABILITY': return 'text-orange-700 dark:text-orange-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 hover:text-orange-800 dark:hover:text-orange-300'
    case 'INCOME': return 'text-green-700 dark:text-green-400 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/30 dark:hover:to-green-800/30 hover:text-green-800 dark:hover:text-green-300'
    case 'EXPENSE': return 'text-red-700 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 hover:text-red-800 dark:hover:text-red-300'
    default: return 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
  }
}

// 辅助函数：获取数据类型标签
function getDataTypeLabel(t: (key: string) => string, type?: string): string {
  const isStockCategory = type === 'ASSET' || type === 'LIABILITY'
  return isStockCategory ? t('menu.data.type.stock') : t('menu.data.type.flow')
}

// 辅助函数：获取数据类型描述
function getDataTypeDescription(t: (key: string) => string, type?: string): string {
  const isStockCategory = type === 'ASSET' || type === 'LIABILITY'
  return isStockCategory ? t('menu.data.type.stock.description') : t('menu.data.type.flow.description')
}

export default function CategoryContextMenu({
  isOpen,
  onClose,
  onAction,
  category
}: CategoryContextMenuProps) {
  const { t } = useLanguage()

  // 根据分类类型确定菜单项
  const categoryType = category.type
  const isStockCategory = categoryType === 'ASSET' || categoryType === 'LIABILITY'
  const isFlowCategory = categoryType === 'INCOME' || categoryType === 'EXPENSE'

  // 构建菜单项，顶层分类不显示移动选项
  const menuItems: (MenuItem | 'divider')[] = [
    {
      label: t('menu.category.add.subcategory'),
      action: 'add-subcategory',
      description: t('menu.category.add.subcategory.description'),
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      label: t('menu.category.add.account', { type: getAccountTypeLabel(t, categoryType) }),
      action: 'add-account',
      description: t('menu.category.add.account.description', { type: getAccountTypeLabel(t, categoryType) }),
      badge: categoryType ? getDataTypeLabel(t, categoryType) : undefined,
      badgeColor: isStockCategory ? (categoryType === 'ASSET' ? 'blue' : 'yellow') : (categoryType === 'INCOME' ? 'green' : 'red'),
      icon: (
        <svg className="h-4 w-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      className: getCategoryTypeColor(categoryType)
    },
    'divider',
    {
      label: t('menu.category.rename'),
      action: 'rename',
      description: t('menu.category.rename.description'),
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    // 只有子分类才显示移动选项
    ...(category.parentId ? [{
      label: t('menu.category.move'),
      action: 'move',
      description: t('menu.category.move.description'),
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }] : []),
    {
      label: t('menu.category.settings'),
      action: 'settings',
      description: t('menu.category.settings.description'),
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    // 添加分类类型特定的信息项
    ...(categoryType ? [{
      label: `${getAccountTypeLabel(t, categoryType)}${t('menu.type.category')}`,
      action: 'info',
      description: t('menu.category.info.description', {
        dataType: getDataTypeLabel(t, categoryType),
        description: getDataTypeDescription(t, categoryType)
      }),
      badge: getDataTypeLabel(t, categoryType),
      badgeColor: (isStockCategory ? 'blue' : 'green') as 'blue' | 'green' | 'red' | 'yellow' | 'gray',
      icon: (
        <svg className="h-4 w-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      className: `${getCategoryTypeColor(categoryType)} cursor-default`,
      disabled: true
    }] : []),
    'divider',
    {
      label: t('menu.category.delete'),
      action: 'delete',
      description: t('menu.category.delete.description'),
      icon: (
        <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      className: 'text-red-700 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 hover:text-red-800 dark:hover:text-red-300'
    }
  ]

  return (
    <BaseContextMenu
      isOpen={isOpen}
      onClose={onClose}
      onAction={onAction}
      menuItems={menuItems}
      title={`${category.name} • ${getAccountTypeLabel(t, categoryType)}`}
      width="lg"
    />
  )
}

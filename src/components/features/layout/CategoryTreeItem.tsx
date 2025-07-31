'use client'

import React, { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

import CategoryContextMenu from './CategoryContextMenu'
import InputDialog from '@/components/ui/feedback/InputDialog'
import AddAccountModal from '@/components/ui/feedback/AddAccountModal'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import CategorySelector from '@/components/ui/forms/CategorySelector'
import CategorySettingsModal from '@/components/ui/feedback/CategorySettingsModal'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useSidebarNavigation } from '@/hooks/ui/useOptimizedNavigation'
import {
  ACCOUNT_TYPE_COLORS,
  AccountType,
  CURRENCY_SYMBOLS,
} from '@/types/core/constants'
import { hexToRgb } from '@/lib/utils/color'
import {
  publishCategoryCreate,
  publishCategoryDelete,
  publishAccountCreate,
  publishCategoryUpdate,
} from '@/lib/services/data-update.service'
import type { CategoryTreeItemProps } from '@/types/components'
import type { SimpleAccount, SimpleCategory } from '@/types/core'

// 用于余额计算的分类类型
interface CategoryWithBalance {
  id: string
  name: string
  type?: string
  accounts?: Array<{
    id: string
    name: string
    balanceInBaseCurrency?: number
  }>
  children?: CategoryWithBalance[]
}

export default function CategoryTreeItem({
  category,
  level,
  isExpanded,
  hasChildren,
  onToggle,
  onDataChange,
  baseCurrency: propBaseCurrency,
  onNavigate,
}: CategoryTreeItemProps) {
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const pathname = usePathname()
  const { navigateToCategory } = useSidebarNavigation()
  const moreButtonRef = useRef<HTMLButtonElement | null>(null)

  // 使用UserDataContext获取数据
  const { currencies, getBaseCurrency, updateCategory } = useUserData()

  // 使用传入的基础货币或从Context获取
  const baseCurrency = propBaseCurrency ||
    getBaseCurrency() || { symbol: CURRENCY_SYMBOLS.CNY, code: 'CNY' }

  // 模态框状态
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showAddSubcategoryDialog, setShowAddSubcategoryDialog] =
    useState(false)
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const isActive = pathname === `/categories/${category.id}`

  // 计算分类汇总余额（递归计算子分类和账户）
  const calculateCategoryBalance = (cat: CategoryWithBalance): number => {
    let totalBalance = 0

    // 累加直属账户余额
    if (cat.accounts) {
      cat.accounts.forEach(account => {
        totalBalance += account.balanceInBaseCurrency || 0
      })
    }

    // 递归累加子分类余额
    if (cat.children) {
      cat.children.forEach(child => {
        totalBalance += calculateCategoryBalance(child)
      })
    }

    return totalBalance
  }

  const balance = calculateCategoryBalance(category)

  // 数据现在从UserDataContext获取，无需额外的API调用

  // 根据分类类型确定金额颜色
  const getAmountColor = () => {
    const categoryType = category.type
    if (categoryType === 'LIABILITY') {
      return 'text-orange-600'
    } else if (categoryType === 'EXPENSE') {
      return 'text-red-600'
    } else {
      return 'text-green-600'
    }
  }

  // 获取分类类型对应的主题颜色
  const getCategoryThemeColor = () => {
    const categoryType = category.type
    return categoryType
      ? ACCOUNT_TYPE_COLORS[categoryType as AccountType] || '#6b7280'
      : '#6b7280'
  }

  // 获取分类图标的样式
  const getCategoryIconStyle = (): React.CSSProperties => {
    const baseColor = getCategoryThemeColor()
    const rgb = hexToRgb(baseColor)

    if (!rgb) {
      return {
        '--icon-bg-from': 'rgba(248, 250, 252, 0.9)',
        '--icon-bg-to': 'rgba(241, 245, 249, 0.95)',
        '--icon-color': 'rgb(107, 114, 128)',
        '--icon-border': 'rgba(107, 114, 128, 0.15)',
        '--icon-hover-bg-from': 'rgba(241, 245, 249, 0.95)',
        '--icon-hover-bg-to': 'rgba(226, 232, 240, 1)',
        '--icon-hover-color': 'rgb(87, 94, 108)',
      } as React.CSSProperties
    }

    // 为浅色主题优化的颜色
    const lightThemeStyle = {
      '--icon-bg-from': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
      '--icon-bg-to': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
      '--icon-color': `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      '--icon-border': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      '--icon-hover-bg-from': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
      '--icon-hover-bg-to': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
      '--icon-hover-color': `rgb(${Math.max(0, rgb.r - 15)}, ${Math.max(0, rgb.g - 15)}, ${Math.max(0, rgb.b - 15)})`,
    }

    // 为深色主题优化的颜色
    const darkThemeStyle = {
      '--icon-bg-from-dark': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      '--icon-bg-to-dark': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
      '--icon-color-dark': `rgb(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)})`,
      '--icon-border-dark': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      '--icon-hover-bg-from-dark': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
      '--icon-hover-bg-to-dark': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
      '--icon-hover-color-dark': `rgb(${Math.min(255, rgb.r + 60)}, ${Math.min(255, rgb.g + 60)}, ${Math.min(255, rgb.b + 60)})`,
    }

    return {
      ...lightThemeStyle,
      ...darkThemeStyle,
    } as React.CSSProperties
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleMenuAction = (action: string) => {
    setShowContextMenu(false)

    switch (action) {
      case 'add-subcategory':
        setShowAddSubcategoryDialog(true)
        break
      case 'add-account':
        setShowAddAccountDialog(true)
        break
      case 'move':
        setShowCategorySelector(true)
        break
      case 'settings':
        setShowSettingsModal(true)
        break
      case 'delete':
        setShowDeleteConfirm(true)
        break
      default:
        console.warn(`Unknown action: ${action}`)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        showSuccess(
          t('success.deleted'),
          t('category.deleted', { name: category.name })
        )

        // 发布分类删除事件
        await publishCategoryDelete(category.id, {
          deletedCategory: category,
          parentId: category.parentId,
        })

        // 通知父组件数据已更新
        onDataChange?.({ type: 'category' })

        // 分类删除事件已发布，树会自动更新
      } else {
        const error = await response.json()
        console.error('Category deletion failed:', {
          status: response.status,
          statusText: response.statusText,
          error: error,
        })

        // 正确获取错误信息：API返回的是 error.error 而不是 error.message
        const errorMessage = error.error || error.message || t('error.unknown')
        showError(t('error.delete.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showError(t('error.delete.failed'), t('error.network'))
    }
  }

  const handleMoveToCategory = async (newParentId: string) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: category.name,
          parentId: newParentId,
        }),
      })

      if (response.ok) {
        setShowCategorySelector(false)
        showSuccess(t('success.updated'), t('category.moved'))
        await publishCategoryUpdate(category.id, {
          updatedCategory: { ...category, parentId: newParentId },
          originalParentId: category.parentId,
        })

        // 通知父组件数据已更新
        onDataChange?.({ type: 'category' })
      } else {
        const error = await response.json()
        showError(t('error.update.failed'), error.message || t('error.unknown'))
      }
    } catch (error) {
      console.error('Error moving category:', error)
      showError(t('error.update.failed'), t('error.network'))
    }
  }

  const handleAddSubcategory = async (name: string) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          parentId: category.id,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setShowAddSubcategoryDialog(false)
        showSuccess(t('success.created'), t('category.subcategory.added'))

        // 发布分类创建事件
        await publishCategoryCreate(category.id, {
          newCategory: result.data,
          parentCategory: category,
        })

        // 通知父组件数据已更新
        onDataChange?.({ type: 'category' })

        // 分类创建事件已发布，树会自动更新
      } else {
        const error = await response.json()
        showError(
          t('error.create.failed'),
          error.message || t('category.add.subcategory.failed')
        )
      }
    } catch (error) {
      console.error('Error adding subcategory:', error)
      showError(t('error.create.failed'), t('error.network'))
    }
  }

  const handleAddAccount = async (account: SimpleAccount) => {
    try {
      setShowAddAccountDialog(false)
      showSuccess(t('success.created'), t('account.added'))

      // 发布账户创建事件
      await publishAccountCreate(category.id, {
        newAccount: account,
        category: category,
      })

      // 通知父组件数据已更新
      onDataChange?.({ type: 'account' })

      // 账户创建事件已发布，树会自动更新
    } catch (error) {
      console.error('Error adding account:', error)
      showError(t('error.create.failed'), t('error.network'))
    }
  }

  const handleSaveSettings = async (updates: Partial<SimpleCategory>) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: category.name,
          parentId: category.parentId,
          ...updates,
        }),
      })

      if (response.ok) {
        setShowSettingsModal(false)
        showSuccess(t('success.saved'), t('category.settings.saved'))

        // 更新UserDataContext中的分类数据
        const updatedCategory = await response.json()
        if (updatedCategory.data) {
          updateCategory(updatedCategory.data)
        }

        // 发布分类更新事件
        await publishCategoryUpdate(category.id, {
          updatedCategory: updatedCategory.data,
          originalCategory: category,
        })

        // 通知父组件数据已更新
        onDataChange?.({ type: 'category' })
      } else {
        const error = await response.json()
        showError(
          t('error.save.failed'),
          error.message || t('category.settings.save.failed')
        )
      }
    } catch (error) {
      console.error('Error saving category settings:', error)
      showError(t('error.save.failed'), t('error.network'))
    }
  }

  return (
    <div className='relative'>
      <div
        className={`
          flex items-center group rounded-lg transition-all duration-200 cursor-pointer
          mx-1 my-0.5 border border-transparent
          ${
            isActive
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/50 shadow-sm'
              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/30 hover:border-gray-200 dark:hover:border-gray-600/50 hover:shadow-sm'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={e => {
          navigateToCategory(e, category.id)
          onNavigate?.()
        }}
      >
        {/* 展开/折叠图标 */}
        <button
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
          className={`
            mr-2 p-1.5 rounded-lg transition-all duration-200
            ${
              hasChildren
                ? 'hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md visible'
                : 'invisible'
            }
          `}
        >
          <svg
            className={`h-3.5 w-3.5 text-gray-500 dark:text-gray-400 transition-all duration-200 hover:text-gray-700 dark:hover:text-gray-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            strokeWidth={2.5}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M9 5l7 7-7 7'
            />
          </svg>
        </button>

        {/* 分类图标 */}
        <div className='mr-3 flex-shrink-0'>
          <div
            className={`
              category-icon-container p-2 rounded-xl border transition-all duration-300 ease-out
              shadow-sm hover:shadow-lg group-hover:scale-105
              ${
                isActive
                  ? 'category-icon-active scale-105'
                  : 'category-icon-normal hover:category-icon-hover'
              }
            `}
            style={getCategoryIconStyle()}
          >
            {/* 背景光晕效果 */}
            <div
              className={`
              absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300
              ${isActive ? 'opacity-15' : 'group-hover:opacity-8'}
            `}
              style={{
                background: `radial-gradient(circle at center, ${getCategoryThemeColor()}, transparent 70%)`,
              }}
            />

            <svg
              className={`
                relative h-3.5 w-3.5 transition-all duration-300 ease-out
                ${
                  isActive
                    ? 'category-icon-color-active'
                    : 'category-icon-color group-hover:category-icon-color-hover'
                }
              `}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={2.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
              />
            </svg>
          </div>
        </div>

        {/* 分类名称和余额 */}
        <div className='flex-1 py-3 min-w-0'>
          <div
            className={`
              text-sm font-semibold truncate transition-colors duration-200
              ${
                isActive
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'
              }
            `}
          >
            {category.name}
          </div>
          <div
            className={`text-xs mt-1.5 font-semibold transition-colors duration-200 ${getAmountColor()}`}
          >
            {formatCurrency(Math.abs(balance), baseCurrency?.code || 'CNY')}
          </div>
        </div>

        {/* 更多操作按钮 */}
        <button
          ref={moreButtonRef}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            setShowContextMenu(true)
          }}
          onContextMenu={handleContextMenu}
          className='mr-3 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md'
        >
          <svg
            className='h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z'
            />
          </svg>
        </button>
      </div>

      {/* 上下文菜单 */}
      <CategoryContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        onAction={handleMenuAction}
        category={category}
        triggerRef={moreButtonRef}
      />

      {/* 删除确认对话框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('category.delete.title')}
        message={t('category.delete.message', { name: category.name })}
        confirmLabel={t('category.delete.confirm')}
        cancelLabel={t('category.delete.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant='danger'
      />

      {/* 分类选择器 */}
      <CategorySelector
        isOpen={showCategorySelector}
        title={t('category.move.title')}
        currentCategoryId={category.parentId || ''}
        excludeCategoryId={category.id}
        onSelect={handleMoveToCategory}
        onCancel={() => setShowCategorySelector(false)}
      />

      {/* 添加子分类对话框 */}
      <InputDialog
        isOpen={showAddSubcategoryDialog}
        title={t('category.add.subcategory.title')}
        placeholder={t('category.add.subcategory.placeholder')}
        onSubmit={handleAddSubcategory}
        onCancel={() => setShowAddSubcategoryDialog(false)}
        validation={value => {
          if (!value.trim()) return t('category.validation.name.required')
          if (value.length > 50) return t('category.validation.name.too.long')
          return null
        }}
      />

      {/* 添加账户模态框 */}
      <AddAccountModal
        isOpen={showAddAccountDialog}
        onClose={() => setShowAddAccountDialog(false)}
        onSuccess={handleAddAccount}
        category={category}
        currencies={currencies}
      />

      {/* 分类设置模态框 */}
      <CategorySettingsModal
        isOpen={showSettingsModal}
        category={category}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

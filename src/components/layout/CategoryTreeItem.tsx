'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import CategoryContextMenu from './CategoryContextMenu'
import InputDialog from '@/components/ui/InputDialog'
import AddAccountModal from '@/components/ui/AddAccountModal'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import CategorySelector from '@/components/ui/CategorySelector'
import CategorySettingsModal from '@/components/ui/CategorySettingsModal'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { publishCategoryCreate, publishAccountCreate } from '@/utils/DataUpdateManager'

interface Account {
  id: string
  name: string
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

interface Category {
  id: string
  name: string
  parentId: string | null
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  order: number
  children?: Category[]
  accounts?: Account[]
}

interface CategoryTreeItemProps {
  category: Category
  level: number
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  onDataChange: (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => void
  baseCurrency?: {
    code: string
    symbol: string
    name: string
  }
}

export default function CategoryTreeItem({
  category,
  level,
  isExpanded,
  hasChildren,
  onToggle,
  onDataChange,
  baseCurrency: propBaseCurrency
}: CategoryTreeItemProps) {
  const { showSuccess, showError } = useToast()
  const pathname = usePathname()
  const router = useRouter()

  // 使用UserDataContext获取数据
  const { currencies, getBaseCurrency } = useUserData()

  // 使用传入的基础货币或从Context获取
  const baseCurrency = propBaseCurrency || getBaseCurrency() || { symbol: '¥', code: 'CNY' }

  // 模态框状态
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showAddSubcategoryDialog, setShowAddSubcategoryDialog] = useState(false)
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const isActive = pathname === `/categories/${category.id}`

  // 计算分类汇总余额（递归计算子分类和账户）
  const calculateCategoryBalance = (cat: Category): number => {
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
  const currencySymbol = baseCurrency?.symbol || '¥'

  // 数据现在从UserDataContext获取，无需额外的API调用

  // 根据分类类型确定金额颜色
  const getAmountColor = () => {
    const categoryType = category.type
    if (categoryType === 'LIABILITY' || categoryType === 'EXPENSE') {
      return 'text-red-600'
    } else {
      return 'text-green-600'
    }
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
      case 'rename':
        setShowRenameDialog(true)
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
        console.log(`Unknown action: ${action}`)
    }
  }

  const handleRename = async (newName: string) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          parentId: category.parentId
        }),
      })

      if (response.ok) {
        setShowRenameDialog(false)
        showSuccess('重命名成功', `分类已重命名`)
        onDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        showError('重命名失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error renaming category:', error)
      showError('重命名失败', '网络错误，请稍后重试')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        showSuccess('删除成功', `分类"${category.name}"已删除`)
        onDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        showError('删除失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showError('删除失败', '网络错误，请稍后重试')
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
          parentId: newParentId
        }),
      })

      if (response.ok) {
        setShowCategorySelector(false)
        showSuccess('移动成功', `分类已移动`)
        onDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        showError('移动失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error moving category:', error)
      showError('移动失败', '网络错误，请稍后重试')
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
          parentId: category.id
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setShowAddSubcategoryDialog(false)
        showSuccess('添加成功', '子分类已添加')

        // 发布分类创建事件
        await publishCategoryCreate(category.id, {
          newCategory: result.data,
          parentCategory: category
        })

        onDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        showError('添加失败', error.message || '添加子分类失败')
      }
    } catch (error) {
      console.error('Error adding subcategory:', error)
      showError('添加失败', '网络错误，请稍后重试')
    }
  }

  const handleAddAccount = async (account: any) => {
    try {
      setShowAddAccountDialog(false)
      showSuccess('添加成功', '账户已添加')

      // 发布账户创建事件
      await publishAccountCreate(category.id, {
        newAccount: account,
        category: category
      })

      onDataChange({ type: 'account', silent: true })
    } catch (error) {
      console.error('Error adding account:', error)
      showError('添加失败', '网络错误，请稍后重试')
    }
  }

  const handleSaveSettings = async (updates: Partial<Category>) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: category.name,
          parentId: category.parentId,
          ...updates
        }),
      })

      if (response.ok) {
        setShowSettingsModal(false)
        showSuccess('保存成功', '分类设置已保存')
        onDataChange({ type: 'category', silent: true })
      } else {
        const error = await response.json()
        showError('保存失败', error.message || '保存设置失败')
      }
    } catch (error) {
      console.error('Error saving category settings:', error)
      showError('保存失败', '网络错误，请稍后重试')
    }
  }

  return (
    <div className="relative">
      <div
        className={`
          flex items-center group hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer
          ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          router.push(`/categories/${category.id}`)
        }}
      >
        {/* 展开/折叠图标 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
          className={`
            mr-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
            ${hasChildren ? 'visible' : 'invisible'}
          `}
        >
          <svg
            className={`h-3 w-3 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 分类图标 */}
        <div className="mr-2 flex-shrink-0">
          <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        </div>

        {/* 分类名称和余额 */}
        <div className="flex-1 py-2">
          <div
            className={`
              text-sm font-medium truncate block
              ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}
            `}
          >
            {category.name}
          </div>
          <div className={`text-xs mt-1 ${getAmountColor()}`}>
            {currencySymbol}{Math.abs(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 更多操作按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowContextMenu(true)
          }}
          onContextMenu={handleContextMenu}
          className="mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* 上下文菜单 */}
      <CategoryContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        onAction={handleMenuAction}
        category={category}
      />

      {/* 重命名对话框 */}
      <InputDialog
        isOpen={showRenameDialog}
        title="重命名分类"
        placeholder="请输入新的分类名称"
        initialValue={category.name}
        onSubmit={handleRename}
        onCancel={() => setShowRenameDialog(false)}
        validation={(value) => {
          if (!value.trim()) return '分类名称不能为空'
          if (value.length > 50) return '分类名称不能超过50个字符'
          return null
        }}
      />

      {/* 删除确认对话框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="删除分类"
        message={`确定要删除分类"${category.name}"吗？此操作不可撤销。`}
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* 分类选择器 */}
      <CategorySelector
        isOpen={showCategorySelector}
        title="移动分类到其他分类"
        currentCategoryId={category.parentId || ''}
        excludeCategoryId={category.id}
        onSelect={handleMoveToCategory}
        onCancel={() => setShowCategorySelector(false)}
      />

      {/* 添加子分类对话框 */}
      <InputDialog
        isOpen={showAddSubcategoryDialog}
        title="添加子分类"
        placeholder="请输入子分类名称"
        onSubmit={handleAddSubcategory}
        onCancel={() => setShowAddSubcategoryDialog(false)}
        validation={(value) => {
          if (!value.trim()) return '分类名称不能为空'
          if (value.length > 50) return '分类名称不能超过50个字符'
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

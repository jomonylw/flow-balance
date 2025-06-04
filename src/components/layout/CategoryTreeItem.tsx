'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CategoryContextMenu from './CategoryContextMenu'
import InputDialog from '@/components/ui/InputDialog'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import CategorySelector from '@/components/ui/CategorySelector'

interface Category {
  id: string
  name: string
  parentId: string | null
}

interface CategoryTreeItemProps {
  category: Category
  level: number
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  onDataChange: () => void
}

export default function CategoryTreeItem({
  category,
  level,
  isExpanded,
  hasChildren,
  onToggle,
  onDataChange
}: CategoryTreeItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [currencySymbol, setCurrencySymbol] = useState('¥')

  // 模态框状态
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showAddSubcategoryDialog, setShowAddSubcategoryDialog] = useState(false)
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)

  const isActive = pathname === `/categories/${category.id}`

  // 获取分类余额
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/categories/${category.id}/summary`)
        if (response.ok) {
          const result = await response.json()
          const summaryData = result.data

          // 计算总余额（从账户汇总和交易汇总中计算）
          let totalBalance = 0
          let foundCurrency = false

          // 从账户余额计算
          if (summaryData.accounts && summaryData.accounts.length > 0) {
            summaryData.accounts.forEach((account: any) => {
              if (account.balances && account.balances['CNY']) {
                totalBalance += account.balances['CNY']
                foundCurrency = true
              }
            })
          }

          // 如果没有账户余额，从交易汇总计算
          if (!foundCurrency && summaryData.transactionSummary && summaryData.transactionSummary['CNY']) {
            totalBalance = summaryData.transactionSummary['CNY'].net
            foundCurrency = true
          }

          if (foundCurrency) {
            setBalance(totalBalance)
            setCurrencySymbol('¥')
          }
        }
      } catch (error) {
        console.error('Error fetching category balance:', error)
      }
    }

    fetchBalance()
  }, [category.id])

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
        // TODO: 打开分类设置模态框
        console.log('Category settings for:', category.name)
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
        onDataChange()
      } else {
        const error = await response.json()
        alert(error.message || '重命名失败')
      }
    } catch (error) {
      console.error('Error renaming category:', error)
      alert('重命名失败')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        onDataChange()
      } else {
        const error = await response.json()
        alert(error.message || '删除失败')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('删除失败')
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
        onDataChange()
      } else {
        const error = await response.json()
        alert(error.message || '移动失败')
      }
    } catch (error) {
      console.error('Error moving category:', error)
      alert('移动失败')
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
        setShowAddSubcategoryDialog(false)
        onDataChange()
      } else {
        const error = await response.json()
        alert(error.message || '添加子分类失败')
      }
    } catch (error) {
      console.error('Error adding subcategory:', error)
      alert('添加子分类失败')
    }
  }

  const handleAddAccount = async (name: string) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          categoryId: category.id
        }),
      })

      if (response.ok) {
        setShowAddAccountDialog(false)
        onDataChange()
      } else {
        const error = await response.json()
        alert(error.message || '添加账户失败')
      }
    } catch (error) {
      console.error('Error adding account:', error)
      alert('添加账户失败')
    }
  }

  return (
    <div className="relative">
      <div 
        className={`
          flex items-center group hover:bg-gray-100 rounded-md transition-colors
          ${isActive ? 'bg-blue-50 border border-blue-200' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* 展开/折叠图标 */}
        <button
          onClick={onToggle}
          className={`
            mr-1 p-1 rounded hover:bg-gray-200 transition-colors
            ${hasChildren ? 'visible' : 'invisible'}
          `}
        >
          <svg 
            className={`h-3 w-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 分类图标 */}
        <div className="mr-2 flex-shrink-0">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        </div>

        {/* 分类名称和余额 */}
        <div className="flex-1 py-2">
          <Link
            href={`/categories/${category.id}`}
            className={`
              text-sm font-medium truncate block
              ${isActive ? 'text-blue-700' : 'text-gray-700 hover:text-gray-900'}
            `}
          >
            {category.name}
          </Link>
          {balance !== null && (
            <div className={`text-xs mt-1 ${
              balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currencySymbol}{Math.abs(balance).toFixed(2)}
            </div>
          )}
        </div>

        {/* 更多操作按钮 */}
        <button
          onClick={(e) => {
            e.preventDefault()
            setShowContextMenu(true)
          }}
          onContextMenu={handleContextMenu}
          className="mr-2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
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

      {/* 添加账户对话框 */}
      <InputDialog
        isOpen={showAddAccountDialog}
        title="添加账户"
        placeholder="请输入账户名称"
        onSubmit={handleAddAccount}
        onCancel={() => setShowAddAccountDialog(false)}
        validation={(value) => {
          if (!value.trim()) return '账户名称不能为空'
          if (value.length > 50) return '账户名称不能超过50个字符'
          return null
        }}
      />
    </div>
  )
}

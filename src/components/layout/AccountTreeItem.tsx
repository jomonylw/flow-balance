'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AccountContextMenu from './AccountContextMenu'
import InputDialog from '@/components/ui/InputDialog'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import CategorySelector from '@/components/ui/CategorySelector'
import AccountSettingsModal from '@/components/ui/AccountSettingsModal'
import BalanceUpdateModal from '@/components/accounts/BalanceUpdateModal'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'

interface Account {
  id: string
  name: string
  categoryId: string
  description?: string
  color?: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface AccountTreeItemProps {
  account: Account
  level: number
  onDataChange: () => void
  onNavigate?: () => void
}

export default function AccountTreeItem({
  account,
  level,
  onDataChange,
  onNavigate
}: AccountTreeItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [currencySymbol, setCurrencySymbol] = useState('¥')

  // 模态框状态
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showBalanceUpdateModal, setShowBalanceUpdateModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  // 数据状态
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])

  const isActive = pathname === `/accounts/${account.id}`

  // 获取账户余额
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/accounts/${account.id}/details`)
        if (response.ok) {
          const result = await response.json()
          const accountData = result.data

          // 计算余额
          if (accountData.balances && Object.keys(accountData.balances).length > 0) {
            // 优先显示 CNY，如果没有则显示第一个货币
            const cnyBalance = accountData.balances['CNY']
            if (cnyBalance !== undefined) {
              setBalance(cnyBalance.amount)
              setCurrencySymbol(cnyBalance.currency.symbol)
            } else {
              const firstCurrency = Object.keys(accountData.balances)[0]
              const firstBalance = accountData.balances[firstCurrency]
              setBalance(firstBalance.amount)
              setCurrencySymbol(firstBalance.currency.symbol)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching account balance:', error)
      }
    }

    fetchBalance()
  }, [account.id])

  // 获取交易表单所需的数据
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [accountsRes, categoriesRes, currenciesRes, tagsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories'),
          fetch('/api/user/currencies'), // 使用用户可用货币
          fetch('/api/tags')
        ])

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData.data || [])
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData.data || [])
        }

        if (currenciesRes.ok) {
          const currenciesData = await currenciesRes.json()
          setCurrencies(currenciesData.data?.currencies || [])
        }

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setTags(tagsData.data || [])
        }
      } catch (error) {
        console.error('Error fetching form data:', error)
        // 设置默认值以防止错误
        setCurrencies([])
      }
    }

    fetchFormData()
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleMenuAction = (action: string) => {
    setShowContextMenu(false)

    switch (action) {
      case 'view-details':
        router.push(`/accounts/${account.id}`)
        onNavigate?.()
        break
      case 'add-transaction':
        setShowTransactionModal(true)
        break
      case 'update-balance':
        setShowBalanceUpdateModal(true)
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
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          categoryId: account.categoryId,
          description: account.description
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
      console.error('Error renaming account:', error)
      alert('重命名失败')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
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
      console.error('Error deleting account:', error)
      alert('删除失败')
    }
  }

  const handleMoveToCategory = async (newCategoryId: string) => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: account.name,
          categoryId: newCategoryId,
          description: account.description
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
      console.error('Error moving account:', error)
      alert('移动失败')
    }
  }

  const handleBalanceUpdateSuccess = () => {
    onDataChange()
    setShowBalanceUpdateModal(false)
  }

  const handleTransactionSuccess = () => {
    onDataChange()
    setShowTransactionModal(false)
  }

  const handleSaveSettings = async (updates: Partial<Account>) => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name || account.name,
          categoryId: account.categoryId,
          description: updates.description,
          color: updates.color
        }),
      })

      if (response.ok) {
        onDataChange()
      } else {
        const error = await response.json()
        throw new Error(error.message || '保存失败')
      }
    } catch (error) {
      console.error('Error saving account settings:', error)
      throw error
    }
  }

  return (
    <div className="relative">
      <div 
        className={`
          flex items-center group hover:bg-gray-100 rounded-md transition-colors
          ${isActive ? 'bg-blue-50 border border-blue-200' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 24}px` }}
      >
        {/* 账户颜色指示器和图标 */}
        <div className="mr-2 flex-shrink-0 flex items-center space-x-1">
          {account.color && (
            <div
              className="w-3 h-3 rounded-full border border-gray-300"
              style={{ backgroundColor: account.color }}
              title="账户颜色"
            />
          )}
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* 账户名称和余额 */}
        <div className="flex-1 py-2">
          <Link
            href={`/accounts/${account.id}`}
            onClick={onNavigate}
            className={`
              text-sm truncate block
              ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-900'}
            `}
            title={account.description || account.name}
          >
            {account.name}
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
            e.stopPropagation()
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
      <AccountContextMenu
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        onAction={handleMenuAction}
        account={account}
      />

      {/* 重命名对话框 */}
      <InputDialog
        isOpen={showRenameDialog}
        title="重命名账户"
        placeholder="请输入新的账户名称"
        initialValue={account.name}
        onSubmit={handleRename}
        onCancel={() => setShowRenameDialog(false)}
        validation={(value) => {
          if (!value.trim()) return '账户名称不能为空'
          if (value.length > 50) return '账户名称不能超过50个字符'
          return null
        }}
      />

      {/* 删除确认对话框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="删除账户"
        message={`确定要删除账户"${account.name}"吗？此操作不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* 分类选择器 */}
      <CategorySelector
        isOpen={showCategorySelector}
        title="移动账户到其他分类"
        currentCategoryId={account.categoryId}
        filterByAccountType={account.category.type}
        onSelect={handleMoveToCategory}
        onCancel={() => setShowCategorySelector(false)}
      />

      {/* 账户设置模态框 */}
      <AccountSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        account={account}
      />

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={showBalanceUpdateModal}
        onClose={() => setShowBalanceUpdateModal(false)}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={balance || 0}
        currencyCode="CNY"
      />

      {/* 交易表单模态框 */}
      <TransactionFormModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
        accounts={accounts.filter(acc => {
          // 只显示流量类账户
          const accType = acc.category?.type
          return accType === 'INCOME' || accType === 'EXPENSE'
        })}
        categories={categories}
        currencies={currencies}
        tags={tags}
        defaultAccountId={account.id}
        defaultCategoryId={account.categoryId}
      />
    </div>
  )
}

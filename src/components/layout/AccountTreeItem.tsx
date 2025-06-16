'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AccountContextMenu from './AccountContextMenu'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import CategorySelector from '@/components/ui/CategorySelector'
import AccountSettingsModal from '@/components/ui/AccountSettingsModal'
import BalanceUpdateModal from '@/components/accounts/BalanceUpdateModal'
import SimpleFlowTransactionModal from '@/components/transactions/SimpleFlowTransactionModal'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { publishAccountDelete, publishAccountUpdate } from '@/utils/DataUpdateManager'
import CurrencyTag from '@/components/ui/CurrencyTag'

interface Account {
  id: string
  name: string
  categoryId: string
  description?: string
  color?: string
  currencyCode: string
  currency?: {
    code: string
    name: string
    symbol: string
  }
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  // 余额数据（从OptimizedCategoryAccountTree传入）
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

interface AccountTreeItemProps {
  account: Account
  level: number
  onNavigate?: () => void
  baseCurrency?: {
    code: string
    symbol: string
    name: string
  }
}

export default function AccountTreeItem({
  account,
  level,
  onNavigate,
  baseCurrency: propBaseCurrency
}: AccountTreeItemProps) {
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()

  // 使用UserDataContext获取数据
  const {
    currencies,
    tags,
    getBaseCurrency,
    removeAccount,
    updateAccount
  } = useUserData()

  // 移除自动交易检查，改为在后端验证

  // 使用传入的基础货币或从Context获取
  const baseCurrency = propBaseCurrency || getBaseCurrency() || { symbol: '¥', code: 'CNY' }

  // 模态框状态
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showBalanceUpdateModal, setShowBalanceUpdateModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  const isActive = pathname === `/accounts/${account.id}`

  // 使用传入的余额数据
  const balance = account.balanceInBaseCurrency || 0
  const currencySymbol = baseCurrency?.symbol || '¥'

  // 获取账户原始货币的余额（用于余额更新模态框）
  const accountCurrency = account.currencyCode || baseCurrency?.code || 'CNY'
  const accountBalance = account.balances?.[accountCurrency]?.amount || 0

  // 根据账户类型确定金额颜色
  const getAmountColor = () => {
    const accountType = account.category.type
    if (accountType === 'LIABILITY' || accountType === 'EXPENSE') {
      return 'text-red-600'
    } else {
      return 'text-green-600'
    }
  }

  // 数据现在从UserDataContext获取，无需额外的API调用

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



  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 从Context中移除账户
        removeAccount(account.id)
        setShowDeleteConfirm(false)
        showSuccess('删除成功', `账户"${account.name}"已删除`)

        // 发布账户删除事件
        await publishAccountDelete(account.id, account.categoryId, {
          deletedAccount: account
        })

        // 账户删除事件已发布，树会自动更新
      } else {
        const error = await response.json()
        showError('删除失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      showError('删除失败', '网络错误，请稍后重试')
    }
  }

  const handleClearBalanceHistory = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/clear-balance`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess('清空成功', result.message || '余额历史已清空')

        // 清空成功后，直接删除账户
        await handleDelete()
      } else {
        const error = await response.json()
        showError('清空失败', error.message || '清空余额历史失败')
      }
    } catch (error) {
      console.error('Error clearing balance history:', error)
      showError('清空失败', '网络错误，请稍后重试')
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
        await publishAccountUpdate(account.id, newCategoryId, {
          updatedAccount: { ...account, categoryId: newCategoryId },
          originalCategoryId: account.categoryId
        })
      } else {
        const error = await response.json()
        showError('移动失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error moving account:', error)
      showError('移动失败', '网络错误，请稍后重试')
    }
  }

  const handleBalanceUpdateSuccess = () => {
    // BalanceUpdateModal 内部会发布 balance-update 事件
    setShowBalanceUpdateModal(false)
  }

  const handleTransactionSuccess = () => {
    // SimpleFlowTransactionModal 内部会发布 transaction-create/update 事件
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
          color: updates.color,
          currencyCode: updates.currencyCode
        }),
      })

      if (response.ok) {
        // 更新UserDataContext中的账户数据
        const updatedAccount = await response.json()
        if (updatedAccount.data) {
          updateAccount(updatedAccount.data)
        }

        // 发布账户更新事件
        await publishAccountUpdate(account.id, updatedAccount.data.categoryId, {
          updatedAccount: updatedAccount.data,
          originalAccount: account
        })

        showSuccess(t('success.saved'), t('account.settings.saved'))
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
          flex items-center group rounded-lg transition-all duration-200 cursor-pointer
          mx-1 my-0.5 border border-transparent
          ${isActive
            ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/50 shadow-sm'
            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800/50 dark:hover:to-gray-700/30 hover:border-gray-200 dark:hover:border-gray-600/50 hover:shadow-sm'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 20}px` }}
        onClick={() => {
          router.push(`/accounts/${account.id}`)
          onNavigate?.()
        }}
      >


        {/* 货币标签 */}
        <div className="mr-3 flex-shrink-0">
          <CurrencyTag
            currencyCode={account.currencyCode}
            color={account.color}
            size="sm"
          />
        </div>

        {/* 账户名称和余额 */}
        <div className="flex-1 py-3 min-w-0">
          <div
            className={`
              text-sm font-medium truncate transition-colors duration-200
              ${isActive
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'
              }
            `}
            title={account.description || account.name}
          >
            {account.name}
          </div>
          {balance !== null && (
            <div className={`text-xs mt-1.5 font-semibold transition-colors duration-200 ${getAmountColor()}`}>
              {currencySymbol}{Math.abs(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          className="mr-3 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md"
          title="更多操作"
        >
          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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



      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title={t('account.delete.title')}
        itemName={account.name}
        itemType={t('account.delete.item.type')}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        hasRelatedData={account.category?.type === 'ASSET' || account.category?.type === 'LIABILITY'}
        relatedDataMessage="该账户存在余额调整记录，需要先清空相关数据才能删除。"
        onClearRelatedData={handleClearBalanceHistory}
        clearDataLabel="清空余额历史并删除"
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
        currencies={currencies}
      />

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={showBalanceUpdateModal}
        onClose={() => setShowBalanceUpdateModal(false)}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={accountBalance || 0}
        currencyCode={accountCurrency}
      />

      {/* 简化的流量账户交易表单模态框 */}
      <SimpleFlowTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
        account={account}
        currencies={currencies}
        tags={tags}
      />
    </div>
  )
}

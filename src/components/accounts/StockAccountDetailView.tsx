'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BalanceUpdateModal from './BalanceUpdateModal'
import TransactionList from '@/components/transactions/TransactionList'
import StockAccountSummaryCard from './StockAccountSummaryCard'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { calculateAccountBalance } from '@/lib/account-balance'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'


interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY'
}

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  description: string
  notes?: string
  date: string
  category: Category
  currency: Currency
  tags: { tag: Tag }[]
}

interface Account {
  id: string
  name: string
  description?: string
  category: Category
  transactions: Transaction[]
}

interface StockAccountDetailViewProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function StockAccountDetailView({
  account,
  categories,
  currencies,
  tags,
  user
}: StockAccountDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError, showInfo } = useToast()
  const router = useRouter()
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)

  const handleUpdateBalance = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBalanceUpdateSuccess = () => {
    // 重新获取数据，但不重载页面
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 删除成功，返回到主页面
        router.push('/')
      } else {
        const error = await response.json()
        const errorMessage = error.message || t('common.delete.failed')

        // 检查是否是存量账户的余额记录问题
        if (errorMessage.includes('余额调整记录')) {
          // 显示错误信息，用户可以通过删除确认模态框处理
          showError(t('common.delete.failed'), `${errorMessage}。${t('account.use.clear.option')}`)
          return
        }

        showError(t('common.delete.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  const handleClearBalanceHistory = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/clear-balance`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess(t('success.cleared'), result.message || t('account.balance.history.cleared'))

        // 清空成功后，直接删除账户
        await handleDeleteAccount()
      } else {
        const error = await response.json()
        showError(t('error.clear.failed'), error.message || t('account.balance.history.clear.failed'))
      }
    } catch (error) {
      console.error('Error clearing balance history:', error)
      showError(t('error.clear.failed'), t('error.network'))
    }
  }

  const handleDeleteBalanceRecord = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('success.deleted'), t('account.balance.record.deleted'))
        // 重新获取数据，但不重载页面
        router.refresh()
      } else {
        showError(t('common.delete.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Delete balance record error:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction)
    setIsBalanceUpdateModalOpen(true)
  }

  // 批量编辑功能（暂时隐藏）
  const handleBatchEdit = (transactionIds: string[]) => {
    showInfo(t('feature.in.development'), t('batch.edit.development', { count: transactionIds.length }))
    // TODO: 实现批量编辑功能
  }

  const handleBatchDelete = async (transactionIds: string[]) => {
    try {
      const deletePromises = transactionIds.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length

      if (successCount === transactionIds.length) {
        showSuccess(t('success.batch.deleted'), t('batch.delete.success', { count: successCount }))
        router.refresh()
      } else {
        showError(t('error.partial.delete'), t('batch.delete.partial', { success: successCount, total: transactionIds.length }))
        router.refresh()
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      showError(t('error.batch.delete.failed'), t('error.network'))
    }
  }

  // 使用专业的余额计算服务
  const accountBalances = calculateAccountBalance(account)
  const baseCurrencyCode = user.settings?.baseCurrency?.code || 'USD'
  const balance = accountBalances[baseCurrencyCode]?.amount || 0
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 账户类型提示横幅 */}
      <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-l-4 ${
        account.category.type === 'ASSET'
          ? 'bg-blue-50 border-blue-400'
          : 'bg-orange-50 border-orange-400'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              account.category.type === 'ASSET' ? 'text-blue-400' : 'text-orange-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              account.category.type === 'ASSET' ? 'text-blue-800' : 'text-orange-800'
            }`}>
              💡 {t('account.stock.operation.tips')}
            </p>
            <p className={`text-sm ${
              account.category.type === 'ASSET' ? 'text-blue-700' : 'text-orange-700'
            }`}>
              {t('account.stock.operation.description', {
                type: account.category.type === 'ASSET' ? t('type.asset') : t('type.liability')
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 面包屑导航 */}
      <nav className="flex mb-4 sm:mb-6 overflow-x-auto" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 sm:space-x-3 whitespace-nowrap">
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('nav.dashboard')}
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-gray-500 truncate max-w-[150px] sm:max-w-none">
                {account.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 账户标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{account.name}</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            {account.category.name}
            {account.description && ` • ${account.description}`}
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.category.type === 'ASSET'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {account.category.type === 'ASSET' ? t('type.asset.account') : t('type.liability.account')} • {t('type.stock.data')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <button
            onClick={handleUpdateBalance}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('account.update.balance')}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('account.delete')}
          </button>
        </div>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-6 sm:mb-8">
        <StockAccountSummaryCard
          account={account}
          balance={balance}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 余额变化记录 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {t('account.balance.history')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {t('account.balance.history.description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <span className="text-xs sm:text-sm text-gray-500">
                {t('account.total.records', { count: account.transactions.length })}
              </span>
              {account.transactions.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('account.clear.records')}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <TransactionList
          transactions={account.transactions}
          onEdit={handleEditTransaction} // 支持编辑余额记录
          onDelete={handleDeleteBalanceRecord} // 允许删除余额调整记录
          onBatchDelete={handleBatchDelete} // 批量删除
          currencySymbol={currencySymbol}
          showAccount={false}
          readOnly={false} // 允许操作
          allowDeleteBalanceAdjustment={true} // 允许删除余额调整记录
        />
      </div>

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => {
          setIsBalanceUpdateModalOpen(false)
          setEditingTransaction(null)
        }}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={balance}
        currencyCode={user.settings?.baseCurrency?.code || 'USD'}
        editingTransaction={editingTransaction}
      />

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('account.delete')}
        message={t('confirm.delete.account.message', { name: account.name })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* 清空记录确认模态框 */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title={t('account.clear.balance.records')}
        message={t('confirm.clear.balance.records')}
        confirmLabel={t('common.confirm.clear')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setShowClearConfirm(false)
          handleClearBalanceHistory()
        }}
        onCancel={() => setShowClearConfirm(false)}
        variant="warning"
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BalanceUpdateModal from './BalanceUpdateModal'
import TransactionList from '@/components/transactions/TransactionList'
import StockAccountSummaryCard from './StockAccountSummaryCard'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { calculateAccountBalance } from '@/lib/account-balance'

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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE_ADJUSTMENT'
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
  const router = useRouter()
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleUpdateBalance = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBalanceUpdateSuccess = () => {
    // 刷新页面以更新数据
    window.location.reload()
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
        const errorMessage = error.message || '删除失败'

        // 检查是否是存量账户的余额记录问题
        if (errorMessage.includes('余额调整记录')) {
          // 提供清空余额历史的选项
          const shouldClearBalance = confirm(
            `${errorMessage}\n\n是否要清空该账户的余额历史记录？清空后可以删除账户。\n\n注意：此操作将删除所有余额调整记录，不可撤销。`
          )

          if (shouldClearBalance) {
            await handleClearBalanceHistory()
            return
          }
        }

        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('删除失败')
    }
  }

  const handleClearBalanceHistory = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/clear-balance`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || '余额历史已清空')

        // 清空成功后，再次尝试删除账户
        const shouldDeleteAccount = confirm('余额历史已清空，是否继续删除账户？')
        if (shouldDeleteAccount) {
          await handleDeleteAccount()
        }
      } else {
        const error = await response.json()
        alert(error.message || '清空余额历史失败')
      }
    } catch (error) {
      console.error('Error clearing balance history:', error)
      alert('清空余额历史失败')
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
              💡 存量类账户操作提示
            </p>
            <p className={`text-sm ${
              account.category.type === 'ASSET' ? 'text-blue-700' : 'text-orange-700'
            }`}>
              {account.category.type === 'ASSET' ? '资产' : '负债'}账户主要通过"更新余额"来管理，
              记录反映特定时点的账户状况。建议定期核对银行对账单或投资账户余额。
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
              Dashboard
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
              {account.category.type === 'ASSET' ? '资产账户' : '负债账户'} • 存量数据
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
            更新余额
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除账户
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
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              余额变化记录
            </h2>
            <span className="text-xs sm:text-sm text-gray-500">
              共 {account.transactions.length} 笔记录
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            记录账户余额的历史变化，包括余额更新和相关交易
          </p>
        </div>
        
        <TransactionList
          transactions={account.transactions}
          onEdit={() => {}} // 存量类账户不支持编辑交易
          onDelete={undefined} // 存量类账户不支持删除交易
          currencySymbol={currencySymbol}
          showAccount={false}
          readOnly={true} // 只读模式
        />
      </div>

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => setIsBalanceUpdateModalOpen(false)}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={balance}
        currencyCode={user.settings?.baseCurrency?.code || 'USD'}
      />

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="删除账户"
        message={`确定要删除账户"${account.name}"吗？此操作不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

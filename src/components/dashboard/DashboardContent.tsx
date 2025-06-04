'use client'

import { useState } from 'react'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'

interface User {
  id: string
  email: string
}

interface Account {
  id: string
  name: string
  category: {
    name: string
  }
}

interface Category {
  id: string
  name: string
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

interface Stats {
  accountCount: number
  transactionCount: number
  categoryCount: number
}

interface DashboardContentProps {
  user: User
  stats: Stats
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
}

export default function DashboardContent({
  user,
  stats,
  accounts,
  categories,
  currencies,
  tags
}: DashboardContentProps) {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [defaultTransactionType, setDefaultTransactionType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE')

  const handleQuickTransaction = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    setDefaultTransactionType(type)
    setIsTransactionModalOpen(true)
  }

  const handleTransactionSuccess = () => {
    // 刷新页面以更新数据
    window.location.reload()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          欢迎回来，{user.email}！这里是您的财务概览。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 账户数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  账户数量
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.accountCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 交易数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  交易记录
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.transactionCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 分类数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  分类数量
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.categoryCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          快速操作
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => handleQuickTransaction('INCOME')}
            className="flex items-center justify-center px-4 py-3 border border-green-200 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            记收入
          </button>
          <button 
            onClick={() => handleQuickTransaction('EXPENSE')}
            className="flex items-center justify-center px-4 py-3 border border-red-200 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            记支出
          </button>
          <button 
            onClick={() => handleQuickTransaction('TRANSFER')}
            className="flex items-center justify-center px-4 py-3 border border-blue-200 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            转账
          </button>
        </div>
      </div>

      {/* 功能状态 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🎉 交易管理系统开发中！
        </h2>
        <div className="space-y-4 text-gray-600">
          <p>✅ 认证系统 - 登录、注册、登出</p>
          <p>✅ 主界面布局 - 顶部状态栏、侧边导航、主内容区</p>
          <p>✅ 数据库设计 - 完整的 Prisma Schema</p>
          <p>✅ API 路由 - 分类、账户、交易管理</p>
          <p>✅ 交易表单模态框 - 添加/编辑交易</p>
          <p>🚧 账户详情页面 - 开发中</p>
          <p>🚧 分类汇总页面 - 开发中</p>
          <p>🚧 交易列表页面 - 开发中</p>
        </div>
      </div>

      {/* 交易表单模态框 */}
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        accounts={accounts}
        categories={categories}
        currencies={currencies}
        tags={tags}
        defaultType={defaultTransactionType}
      />
    </div>
  )
}

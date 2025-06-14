'use client'

import BaseContextMenu, { MenuItem } from './BaseContextMenu'

interface Account {
  id: string
  name: string
  categoryId: string
  description?: string
  category?: {
    id?: string
    name?: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface AccountContextMenuProps {
  isOpen: boolean
  onClose: () => void
  onAction: (action: string) => void
  account: Account
}

// 辅助函数：获取账户类型标签
function getAccountTypeLabel(type?: string): string {
  switch (type) {
    case 'ASSET': return '资产'
    case 'LIABILITY': return '负债'
    case 'INCOME': return '收入'
    case 'EXPENSE': return '支出'
    default: return '账户'
  }
}

// 辅助函数：获取账户类型颜色
function getAccountTypeColor(type?: string): string {
  switch (type) {
    case 'ASSET': return 'text-blue-700 dark:text-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 hover:text-blue-800 dark:hover:text-blue-300'
    case 'LIABILITY': return 'text-orange-700 dark:text-orange-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 hover:text-orange-800 dark:hover:text-orange-300'
    case 'INCOME': return 'text-green-700 dark:text-green-400 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/30 dark:hover:to-green-800/30 hover:text-green-800 dark:hover:text-green-300'
    case 'EXPENSE': return 'text-red-700 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/30 dark:hover:to-red-800/30 hover:text-red-800 dark:hover:text-red-300'
    default: return 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
  }
}

export default function AccountContextMenu({
  isOpen,
  onClose,
  onAction,
  account
}: AccountContextMenuProps) {
  // 根据账户类型确定菜单项
  const accountType = account.category?.type
  const isStockAccount = accountType === 'ASSET' || accountType === 'LIABILITY'
  const isFlowAccount = accountType === 'INCOME' || accountType === 'EXPENSE'

  const menuItems: (MenuItem | 'divider')[] = [
    {
      label: '查看详情',
      action: 'view-details',
      description: '查看账户详细信息和历史记录',
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    // 根据账户类型显示不同的操作
    ...(isStockAccount ? [{
      label: '更新余额',
      action: 'update-balance',
      description: `调整${getAccountTypeLabel(accountType)}账户余额`,
      badge: '存量',
      badgeColor: (accountType === 'ASSET' ? 'blue' : 'yellow') as 'blue' | 'green' | 'red' | 'yellow' | 'gray',
      icon: (
        <svg className="h-4 w-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      className: getAccountTypeColor(accountType)
    }] : []),
    ...(isFlowAccount ? [{
      label: '添加交易',
      action: 'add-transaction',
      description: `记录${getAccountTypeLabel(accountType)}交易`,
      badge: '流量',
      badgeColor: (accountType === 'INCOME' ? 'green' : 'red') as 'blue' | 'green' | 'red' | 'yellow' | 'gray',
      icon: (
        <svg className="h-4 w-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      className: getAccountTypeColor(accountType)
    }] : []),
    'divider',
    {
      label: '重命名账户',
      action: 'rename',
      description: '修改账户名称和描述',
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: '移动分类',
      action: 'move',
      description: '将账户移动到其他分类',
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    },
    {
      label: '账户设置',
      action: 'settings',
      description: '配置账户属性和权限',
      icon: (
        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    'divider',
    {
      label: '删除账户',
      action: 'delete',
      description: '永久删除此账户及其数据',
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
      title={`${account.name} • ${getAccountTypeLabel(accountType)}`}
      width="lg"
    />
  )
}

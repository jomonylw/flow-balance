'use client'

import { useToast } from '@/contexts/ToastContext'

interface Category {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
}

interface QuickTransactionButtonProps {
  type: 'income' | 'expense'
  accounts: Account[]
  categories: Category[]
}

export default function QuickTransactionButton({
  type,
  accounts,
  categories
}: QuickTransactionButtonProps) {
  const { showInfo } = useToast()

  const handleClick = () => {
    // 这里将来会打开交易表单模态框
    console.log(`Quick ${type} transaction clicked`)
    // 暂时显示提示
    showInfo('功能开发中', `${getTypeLabel(type)}功能即将推出！`)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income': return '记收入'
      case 'expense': return '记支出'
      default: return '记账'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'expense':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )

      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      case 'expense': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'

      default: return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors
        ${getTypeColor(type)}
      `}
    >
      <span className="mr-2">
        {getTypeIcon(type)}
      </span>
      {getTypeLabel(type)}
    </button>
  )
}

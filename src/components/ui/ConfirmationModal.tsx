'use client'

import Modal from './Modal'
import { useLanguage } from '@/contexts/LanguageContext'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmButtonClass?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
  variant?: 'danger' | 'warning' | 'info'
  icon?: React.ReactNode
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmButtonClass,
  onConfirm,
  onCancel,
  children,
  variant = 'danger',
  icon
}: ConfirmationModalProps) {
  const { t } = useLanguage()
  // 根据变体设置默认样式
  const getDefaultButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'
      default:
        return 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white'
    }
  }

  const getDefaultIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-4">
            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'info':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const buttonClass = confirmButtonClass || getDefaultButtonClass()
  const displayIcon = icon || getDefaultIcon()

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="">
      <div className="text-center">
        {displayIcon}

        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>

        <div className="space-y-4 mb-6">
          {children ? children : message && <p className="text-gray-700 dark:text-gray-300 text-sm">{message}</p>}
        </div>

        <div className="flex justify-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${buttonClass}`}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

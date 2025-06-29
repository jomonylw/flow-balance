'use client'

import { useState } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  itemName: string
  itemType: string
  onConfirm: () => void
  onCancel: () => void
  hasRelatedData?: boolean
  relatedDataMessage?: string
  onClearRelatedData?: () => void
  clearDataLabel?: string
  requiresPassword?: boolean
  onPasswordConfirm?: (password: string) => void
  children?: React.ReactNode
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  hasRelatedData = false,
  relatedDataMessage,
  onClearRelatedData,
  clearDataLabel,
  requiresPassword = false,
  onPasswordConfirm,
  children,
}: DeleteConfirmModalProps) {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [showClearDataOption, setShowClearDataOption] = useState(false)

  const handleConfirm = () => {
    if (requiresPassword && onPasswordConfirm) {
      onPasswordConfirm(password)
    } else {
      onConfirm()
    }
  }

  const handleClearData = () => {
    if (onClearRelatedData) {
      onClearRelatedData()
    }
  }

  const handleClose = () => {
    setPassword('')
    setShowClearDataOption(false)
    onCancel()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='' maskClosable={false}>
      <div className='text-center'>
        {/* 危险图标 */}
        <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4'>
          <svg
            className='h-6 w-6 text-red-600 dark:text-red-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>

        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
          {title}
        </h3>

        <div className='space-y-4 mb-6 text-left'>
          <p className='text-gray-700 dark:text-gray-300 text-sm text-center'>
            {t('delete.confirm.message', { itemType, itemName })}
          </p>

          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3'>
            <p className='text-red-800 dark:text-red-400 text-sm'>
              ⚠️ {t('delete.confirm.warning')}
            </p>
          </div>

          {hasRelatedData && relatedDataMessage && (
            <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3'>
              <p className='text-yellow-800 dark:text-yellow-400 text-sm mb-2'>
                {relatedDataMessage}
              </p>
              {onClearRelatedData && (
                <button
                  type='button'
                  onClick={() => setShowClearDataOption(true)}
                  className='text-yellow-700 dark:text-yellow-400 underline text-sm hover:text-yellow-900 dark:hover:text-yellow-300'
                >
                  {clearDataLabel || t('delete.clear.related.data')}
                </button>
              )}
            </div>
          )}

          {showClearDataOption && (
            <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-md p-3'>
              <p className='text-orange-800 dark:text-orange-400 text-sm mb-3'>
                {t('delete.clear.and.delete.warning', { itemType })}
              </p>
              <div className='flex space-x-2'>
                <button
                  type='button'
                  onClick={handleClearData}
                  className='px-3 py-1 text-sm bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600'
                >
                  {t('delete.confirm.clear.and.delete')}
                </button>
                <button
                  type='button'
                  onClick={() => setShowClearDataOption(false)}
                  className='px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500'
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {requiresPassword && (
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('delete.password.prompt')}
              </label>
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('delete.password.placeholder')}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
              />
            </div>
          )}

          {children}
        </div>

        {!showClearDataOption && (
          <div className='flex justify-center space-x-3'>
            <button
              type='button'
              onClick={handleClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400'
            >
              {t('common.cancel')}
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={requiresPassword && !password.trim()}
              className='px-4 py-2 text-sm font-medium bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {t('delete.confirm')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

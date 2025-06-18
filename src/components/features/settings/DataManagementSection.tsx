'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'

export default function DataManagementSection() {
  const { t } = useLanguage()
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [message, setMessage] = useState('')

  const handleExportData = async () => {
    setIsExporting(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/data/export', {
        method: 'GET',
      })

      if (response.ok) {
        // 创建下载链接
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `flow-balance-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setMessage(t('data.export.success'))
      } else {
        const data = await response.json()
        setMessage(
          t('data.export.failed', { error: data.error || t('error.unknown') }),
        )
      }
    } catch (error) {
      console.error('Export data error:', error)
      setMessage(t('data.export.network.error'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError(t('data.delete.password.required'))
      return
    }

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await response.json()

      if (response.ok) {
        // 删除成功，重定向到登录页
        window.location.href = '/login'
      } else {
        setDeleteError(data.error || t('data.delete.failed'))
      }
    } catch (error) {
      console.error('Delete account error:', error)
      setDeleteError(t('data.delete.network.error'))
    }
  }

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    setDeletePassword('')
    setDeleteError('')
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeletePassword('')
    setDeleteError('')
  }

  return (
    <div className='space-y-6'>
      {/* 消息提示 */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg border ${
            message.includes(t('common.success')) ||
            message.includes(t('data.export.success'))
              ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
          }`}
        >
          <div className='flex items-center'>
            {message.includes(t('common.success')) ||
            message.includes(t('data.export.success')) ? (
              <svg
                className='w-5 h-5 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
            ) : (
              <svg
                className='w-5 h-5 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
            )}
            {message}
          </div>
        </div>
      )}

      {/* 数据导出 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='flex items-start space-x-4'>
          <div className='flex-shrink-0'>
            <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-blue-600 dark:text-blue-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
            </div>
          </div>
          <div className='flex-1 min-w-0'>
            <h4 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
              {t('data.export.title')}
            </h4>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {t('data.export.description')}
            </p>
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4'>
              <h5 className='text-sm font-medium text-blue-900 dark:text-blue-200 mb-2'>
                {t('data.export.includes')}：
              </h5>
              <ul className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
                <li>• {t('data.export.accounts')}</li>
                <li>• {t('data.export.transactions')}</li>
                <li>• {t('data.export.categories')}</li>
                <li>• {t('data.export.currencies')}</li>
                <li>• {t('data.export.preferences')}</li>
              </ul>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isExporting ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  {t('data.export.exporting')}
                </span>
              ) : (
                <span className='flex items-center'>
                  <svg
                    className='w-4 h-4 mr-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                  {t('data.export.button')}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 危险操作区域 */}
      <div className='bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-4 sm:p-6'>
        <div className='flex items-start space-x-4'>
          <div className='flex-shrink-0'>
            <div className='w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-red-600 dark:text-red-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                />
              </svg>
            </div>
          </div>
          <div className='flex-1 min-w-0'>
            <h4 className='text-lg font-medium text-red-900 dark:text-red-200 mb-2'>
              {t('data.delete.title')}
            </h4>
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4'>
              <p className='text-sm text-red-800 dark:text-red-200 font-medium mb-2'>
                ⚠️ {t('data.delete.warning')}
              </p>
              <p className='text-sm text-red-700 dark:text-red-300 mb-3'>
                {t('data.delete.includes')}：
              </p>
              <ul className='text-sm text-red-700 dark:text-red-300 space-y-1 mb-3'>
                <li>• {t('data.delete.accounts')}</li>
                <li>• {t('data.delete.transactions')}</li>
                <li>• {t('data.delete.categories')}</li>
                <li>• {t('data.delete.settings')}</li>
              </ul>
              <p className='text-sm text-red-800 dark:text-red-200 font-medium'>
                {t('data.delete.irreversible')}
              </p>
            </div>
            <button
              onClick={openDeleteModal}
              className='w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors'
            >
              <span className='flex items-center justify-center sm:justify-start'>
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
                {t('data.delete.button')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title={t('data.delete.confirm.title')}
        message=''
        confirmLabel={t('data.delete.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteModal}
      >
        <div className='space-y-4'>
          <p className='text-gray-700 dark:text-gray-300'>
            {t('data.delete.confirm.description')}
          </p>
          <p className='text-gray-700 dark:text-gray-300'>
            {t('data.delete.password.prompt')}
          </p>
          <input
            type='password'
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            placeholder={t('data.delete.password.placeholder')}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
          />
          {deleteError && (
            <p className='text-sm text-red-600 dark:text-red-400'>
              {deleteError}
            </p>
          )}
        </div>
      </ConfirmationModal>
    </div>
  )
}

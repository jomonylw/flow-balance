'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'

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
          t('data.export.failed', { error: data.error || t('error.unknown') })
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
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
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
          className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isExporting ? (
            <span className='flex items-center'>
              <LoadingSpinnerSVG
                size='sm'
                color='white'
                className='-ml-1 mr-2'
              />
              {t('data.export.exporting')}
            </span>
          ) : (
            t('data.export.button')
          )}
        </button>
      </div>

      {/* 危险操作区域 */}
      <div>
        <h4 className='text-md font-medium text-red-900 dark:text-red-200 mb-3'>
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
          className='px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors'
        >
          {t('data.delete.button')}
        </button>
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

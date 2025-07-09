'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import DataImportSelector from './DataImportSelector'
import type {
  ExportedData,
  ImportValidationResult,
  ImportDataTypeSelection,
} from '@/types/data-import'

export default function DataManagementSection() {
  const { t } = useLanguage()
  const { showSuccess, showError, showWarning } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 导出相关状态
  const [isExporting, setIsExporting] = useState(false)

  // 导入相关状态
  const [isImporting, setIsImporting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [importData, setImportData] = useState<ExportedData | null>(null)
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false,
    skipDuplicates: true,
    validateData: true,
    createMissingCurrencies: true,
    batchSize: 100,
    enableProgressTracking: true,
  })
  const [selectedDataTypes, setSelectedDataTypes] =
    useState<ImportDataTypeSelection>({
      categories: true,
      accounts: true,
      manualTransactions: true,
      recurringTransactionRecords: true,
      loanTransactionRecords: true,
      tags: true,
      currencies: true,
      exchangeRates: true,
      transactionTemplates: true,
      recurringTransactions: true,
      loanContracts: true,
      loanPayments: true,
    })

  // 进度跟踪相关状态
  const [importSessionId, setImportSessionId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<{
    stage: string
    current: number
    total: number
    percentage: number
    message: string
  } | null>(null)
  const [_showProgressModal, setShowProgressModal] = useState(false)

  // 删除相关状态
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const handleExportData = async () => {
    setIsExporting(true)

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

        showSuccess(t('data.export.success'), t('data.export.success.message'))
      } else {
        const data = await response.json()
        showError(t('data.export.failed'), data.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Export data error:', error)
      showError(t('data.export.failed'), t('error.network'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      showError(
        t('data.import.invalid.file'),
        t('data.import.invalid.file.message')
      )
      return
    }

    setIsValidating(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportedData

      // 验证数据
      const response = await fetch('/api/user/data/import', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      })

      const result = await response.json()

      if (response.ok) {
        setImportData(data)
        setValidationResult(result.data)
        setShowImportModal(true)

        if (result.data.warnings?.length > 0) {
          showWarning(
            t('data.import.validation.complete'),
            t('data.import.validation.warnings.found', {
              count: result.data.warnings.length,
            })
          )
        } else {
          showSuccess(
            t('data.import.validation.success'),
            t('data.import.validation.success.message')
          )
        }
      } else {
        showError(
          t('data.import.validation.failed'),
          result.error || t('error.unknown')
        )
      }
    } catch (error) {
      console.error('File validation error:', error)
      if (error instanceof SyntaxError) {
        showError(
          t('data.import.file.format.error'),
          t('data.import.file.format.error.message')
        )
      } else {
        showError(
          t('data.import.validation.error'),
          t('data.import.validation.error.message')
        )
      }
    } finally {
      setIsValidating(false)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImportData = async () => {
    if (!importData) return

    // 如果启用了进度跟踪，使用新的进度API
    if (importOptions.enableProgressTracking) {
      await handleImportWithProgress()
    } else {
      await handleImportDirect()
    }
  }

  const handleImportDirect = async () => {
    setIsImporting(true)

    try {
      const response = await fetch('/api/user/data/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: importData,
          options: {
            ...importOptions,
            selectedDataTypes,
          },
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const stats = result.data.statistics
        const skippedText =
          stats.skipped > 0
            ? t('data.import.success.skipped', { count: stats.skipped })
            : ''
        showSuccess(
          t('data.import.success'),
          t('data.import.success.message', {
            created: stats.created,
            updated: stats.updated,
            skipped: skippedText,
          })
        )

        if (result.data.warnings?.length > 0) {
          showWarning(
            t('data.import.complete'),
            t('data.import.complete.warnings', {
              count: result.data.warnings.length,
            })
          )
        }

        setShowImportModal(false)
        setImportData(null)
        setValidationResult(null)
      } else {
        showError(t('data.import.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Import data error:', error)
      showError(t('data.import.error'), t('data.import.error.message'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportWithProgress = async () => {
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setImportSessionId(sessionId)
    setShowImportModal(false)
    setShowProgressModal(true)

    try {
      // 启动带进度跟踪的导入
      const response = await fetch('/api/user/data/import/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: importData,
          options: {
            ...importOptions,
            selectedDataTypes,
          },
          sessionId,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 开始轮询进度
        startProgressPolling(sessionId)
      } else {
        showError(
          t('data.import.start.failed'),
          result.error || t('error.unknown')
        )
        setShowProgressModal(false)
      }
    } catch (error) {
      console.error('Start import with progress error:', error)
      showError(t('data.import.start.failed'), t('data.import.start.error'))
      setShowProgressModal(false)
    }
  }

  const startProgressPolling = (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/user/data/import/progress?sessionId=${sessionId}`
        )
        const result = await response.json()

        if (response.ok) {
          setImportProgress(result.data)

          // 检查是否完成
          if (result.data.stage === 'completed') {
            clearInterval(pollInterval)
            showSuccess(t('data.import.success'), result.data.message)
            setShowProgressModal(false)
            setImportData(null)
            setValidationResult(null)
            setImportProgress(null)
            setImportSessionId(null)
          } else if (result.data.stage === 'failed') {
            clearInterval(pollInterval)
            showError(t('data.import.failed'), result.data.message)
            setShowProgressModal(false)
            setImportProgress(null)
            setImportSessionId(null)
          } else if (result.data.stage === 'cancelled') {
            clearInterval(pollInterval)
            showWarning(t('data.import.cancelled'), result.data.message)
            setShowProgressModal(false)
            setImportProgress(null)
            setImportSessionId(null)
          }
        } else {
          clearInterval(pollInterval)
          showError(
            t('data.import.progress.failed'),
            result.error || t('error.unknown')
          )
          setShowProgressModal(false)
          setImportProgress(null)
          setImportSessionId(null)
        }
      } catch (error) {
        console.error('Poll progress error:', error)
        clearInterval(pollInterval)
        showError(t('data.import.progress.failed'), t('error.network'))
        setShowProgressModal(false)
        setImportProgress(null)
        setImportSessionId(null)
      }
    }, 1000) // 每秒轮询一次

    // 设置超时，避免无限轮询
    setTimeout(() => {
      clearInterval(pollInterval)
      if (
        importProgress?.stage !== 'completed' &&
        importProgress?.stage !== 'failed'
      ) {
        showWarning(t('data.import.timeout'), t('data.import.timeout.message'))
        setShowProgressModal(false)
        setImportProgress(null)
        setImportSessionId(null)
      }
    }, 300000) // 5分钟超时
  }

  const _handleCancelImport = async () => {
    if (!importSessionId) return

    try {
      const response = await fetch(
        `/api/user/data/import/progress?sessionId=${importSessionId}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (response.ok) {
        showSuccess(t('data.import.cancel.success'), result.data.message)
      } else {
        showWarning(
          t('data.import.cancel.failed'),
          result.error || t('data.import.cancel.failed.message')
        )
      }
    } catch (error) {
      console.error('Cancel import error:', error)
      showError(t('data.import.cancel.error'), t('error.network'))
    }

    setShowProgressModal(false)
    setImportProgress(null)
    setImportSessionId(null)
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportData(null)
    setValidationResult(null)
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
        showSuccess(t('data.delete.success'), t('data.delete.success.message'))
        // 删除成功，重定向到登录页
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        const errorMessage = data.error || t('data.delete.failed')
        setDeleteError(errorMessage)
        showError(t('data.delete.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Delete account error:', error)
      const errorMessage = t('data.delete.network.error')
      setDeleteError(errorMessage)
      showError(t('data.delete.failed'), errorMessage)
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
            {t('data.export.includes')}
          </h5>
          <ul className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
            <li>• {t('data.export.includes.accounts')}</li>
            <li>• {t('data.export.includes.transactions')}</li>
            <li>• {t('data.export.includes.tags')}</li>
            <li>• {t('data.export.includes.rates')}</li>
            <li>• {t('data.export.includes.recurring')}</li>
            <li>• {t('data.export.includes.preferences')}</li>
          </ul>
        </div>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className='px-4 py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center'
        >
          {isExporting ? (
            <>
              <LoadingSpinnerSVG
                size='sm'
                color='white'
                className='-ml-1 mr-2'
              />
              {t('data.export.exporting')}
            </>
          ) : (
            t('data.export.button')
          )}
        </button>
      </div>

      {/* 数据导入 */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          {t('data.import.title')}
        </h4>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          {t('data.import.description')}
        </p>
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4'>
          <h5 className='text-sm font-medium text-green-900 dark:text-green-200 mb-2'>
            {t('data.import.features')}
          </h5>
          <ul className='text-sm text-green-700 dark:text-green-300 space-y-1'>
            <li>• {t('data.import.features.mapping')}</li>
            <li>• {t('data.import.features.duplicates')}</li>
            <li>• {t('data.import.features.relations')}</li>
            <li>• {t('data.import.features.recovery')}</li>
            <li>• {t('data.import.features.cross')}</li>
          </ul>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='.json'
          onChange={handleFileChange}
          className='hidden'
        />

        <button
          onClick={handleFileSelect}
          disabled={isValidating || isImporting}
          className='px-4 py-2 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center'
        >
          {isValidating ? (
            <>
              <LoadingSpinnerSVG
                size='sm'
                color='white'
                className='-ml-1 mr-2'
              />
              {t('data.import.validating')}
            </>
          ) : (
            t('data.import.button')
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
          className='px-4 py-2 h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors inline-flex items-center justify-center'
        >
          {t('data.delete.button')}
        </button>
      </div>

      {/* 导入确认模态框 */}
      <ConfirmationModal
        isOpen={showImportModal}
        title={t('data.import.confirm.title')}
        message=''
        confirmLabel={
          isImporting
            ? t('data.import.importing')
            : t('data.import.confirm.button')
        }
        cancelLabel={t('common.cancel')}
        onConfirm={
          isImporting || !validationResult?.isValid
            ? () => {}
            : handleImportData
        }
        onCancel={closeImportModal}
        confirmButtonClass={
          isImporting || !validationResult?.isValid
            ? 'opacity-50 cursor-not-allowed'
            : ''
        }
      >
        <div className='space-y-4'>
          {validationResult && (
            <>
              {/* 数据信息 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3'>
                <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  {t('data.import.file.info')}
                </h5>
                <div className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
                  <p>
                    {t('data.import.file.version')}:{' '}
                    {validationResult.dataInfo?.version}
                  </p>
                  <p>
                    {t('data.import.file.export.time')}:{' '}
                    {validationResult.dataInfo?.exportDate
                      ? new Date(
                          validationResult.dataInfo.exportDate
                        ).toLocaleString()
                      : t('data.import.file.unknown')}
                  </p>
                  <p>
                    {t('data.import.file.app')}:{' '}
                    {validationResult.dataInfo?.appName}
                  </p>
                </div>
              </div>

              {/* 数据选择器 */}
              {validationResult.dataInfo?.statistics && (
                <DataImportSelector
                  statistics={validationResult.dataInfo.statistics}
                  selection={selectedDataTypes}
                  onChange={setSelectedDataTypes}
                />
              )}

              {/* 错误信息 */}
              {validationResult.errors.length > 0 && (
                <div className='bg-red-50 dark:bg-red-900/20 rounded-lg p-3'>
                  <h5 className='text-sm font-medium text-red-900 dark:text-red-200 mb-2'>
                    {t('data.import.validation.errors')} (
                    {validationResult.errors.length})
                  </h5>
                  <ul className='text-sm text-red-700 dark:text-red-300 space-y-1'>
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 警告信息 */}
              {validationResult.warnings.length > 0 && (
                <div className='bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3'>
                  <h5 className='text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2'>
                    {t('data.import.validation.warnings')} (
                    {validationResult.warnings.length})
                  </h5>
                  <ul className='text-sm text-yellow-700 dark:text-yellow-300 space-y-1'>
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 导入选项 */}
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3'>
                <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-3'>
                  {t('data.import.options')}
                </h5>
                <div className='space-y-2'>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={importOptions.skipDuplicates}
                      onChange={e =>
                        setImportOptions(prev => ({
                          ...prev,
                          skipDuplicates: e.target.checked,
                        }))
                      }
                      className='mr-2'
                    />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {t('data.import.options.skip.duplicates')}
                    </span>
                  </label>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={importOptions.overwriteExisting}
                      onChange={e =>
                        setImportOptions(prev => ({
                          ...prev,
                          overwriteExisting: e.target.checked,
                        }))
                      }
                      className='mr-2'
                    />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {t('data.import.options.overwrite')}
                    </span>
                  </label>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={importOptions.createMissingCurrencies}
                      onChange={e =>
                        setImportOptions(prev => ({
                          ...prev,
                          createMissingCurrencies: e.target.checked,
                        }))
                      }
                      className='mr-2'
                    />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      {t('data.import.options.create.currencies')}
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </ConfirmationModal>

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
          <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4'>
            <li>• {t('data.delete.confirm.list.accounts')}</li>
            <li>• {t('data.delete.confirm.list.categories')}</li>
            <li>• {t('data.delete.confirm.list.settings')}</li>
            <li>• {t('data.delete.confirm.list.loans')}</li>
          </ul>
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

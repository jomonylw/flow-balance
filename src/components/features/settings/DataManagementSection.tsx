'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import type { ExportedData, ImportValidationResult } from '@/types/data-import'

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
  })

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
      showError(t('data.import.invalid.file'), '请选择JSON格式的文件')
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
            '数据验证完成',
            `发现 ${result.data.warnings.length} 个警告，请查看详情`
          )
        } else {
          showSuccess('数据验证成功', '数据格式正确，可以进行导入')
        }
      } else {
        showError('数据验证失败', result.error || '未知错误')
      }
    } catch (error) {
      console.error('File validation error:', error)
      if (error instanceof SyntaxError) {
        showError('文件格式错误', '请确保选择的是有效的JSON文件')
      } else {
        showError('验证失败', '文件读取或验证过程中发生错误')
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

    setIsImporting(true)

    try {
      const response = await fetch('/api/user/data/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: importData,
          options: importOptions,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const stats = result.data.statistics
        showSuccess(
          '数据导入成功',
          `成功创建 ${stats.created} 条记录，更新 ${stats.updated} 条记录${stats.skipped > 0 ? `，跳过 ${stats.skipped} 条记录` : ''}`
        )

        if (result.data.warnings?.length > 0) {
          showWarning(
            '导入完成',
            `有 ${result.data.warnings.length} 个警告，请查看详情`
          )
        }

        setShowImportModal(false)
        setImportData(null)
        setValidationResult(null)
      } else {
        showError('数据导入失败', result.error || '未知错误')
      }
    } catch (error) {
      console.error('Import data error:', error)
      showError('导入失败', '导入过程中发生错误')
    } finally {
      setIsImporting(false)
    }
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
            导出内容包括：
          </h5>
          <ul className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
            <li>• 账户和分类信息</li>
            <li>• 所有交易记录</li>
            <li>• 标签和货币设置</li>
            <li>• 汇率和交易模板</li>
            <li>• 定期交易和贷款合约</li>
            <li>• 用户偏好设置</li>
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
              导出中...
            </span>
          ) : (
            '导出数据'
          )}
        </button>
      </div>

      {/* 数据导入 */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          数据导入
        </h4>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          导入之前导出的数据文件，恢复您的财务记录。导入过程会自动处理ID映射，确保数据完整性。
        </p>
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4'>
          <h5 className='text-sm font-medium text-green-900 dark:text-green-200 mb-2'>
            导入特性：
          </h5>
          <ul className='text-sm text-green-700 dark:text-green-300 space-y-1'>
            <li>• 自动处理ID重新映射</li>
            <li>• 智能处理重复数据</li>
            <li>• 保持数据关联关系</li>
            <li>• 支持部分导入和错误恢复</li>
            <li>• 与用户账户无关，支持跨账户导入</li>
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
          className='px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isValidating ? (
            <span className='flex items-center'>
              <LoadingSpinnerSVG
                size='sm'
                color='white'
                className='-ml-1 mr-2'
              />
              验证中...
            </span>
          ) : (
            '选择导入文件'
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

      {/* 导入确认模态框 */}
      <ConfirmationModal
        isOpen={showImportModal}
        title='确认数据导入'
        message=''
        confirmLabel={isImporting ? '导入中...' : '确认导入'}
        cancelLabel='取消'
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
                  数据文件信息
                </h5>
                <div className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
                  <p>版本: {validationResult.dataInfo?.version}</p>
                  <p>
                    导出时间:{' '}
                    {validationResult.dataInfo?.exportDate
                      ? new Date(
                          validationResult.dataInfo.exportDate
                        ).toLocaleString()
                      : '未知'}
                  </p>
                  <p>应用: {validationResult.dataInfo?.appName}</p>
                </div>
              </div>

              {/* 统计信息 */}
              {validationResult.dataInfo?.statistics && (
                <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3'>
                  <h5 className='text-sm font-medium text-blue-900 dark:text-blue-200 mb-2'>
                    数据统计
                  </h5>
                  <div className='grid grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300'>
                    <div>
                      分类:{' '}
                      {validationResult.dataInfo.statistics.totalCategories}
                    </div>
                    <div>
                      账户: {validationResult.dataInfo.statistics.totalAccounts}
                    </div>
                    <div>
                      交易:{' '}
                      {validationResult.dataInfo.statistics.totalTransactions}
                    </div>
                    <div>
                      标签: {validationResult.dataInfo.statistics.totalTags}
                    </div>
                    <div>
                      货币:{' '}
                      {validationResult.dataInfo.statistics.totalUserCurrencies}
                    </div>
                    <div>
                      汇率:{' '}
                      {validationResult.dataInfo.statistics.totalExchangeRates}
                    </div>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {validationResult.errors.length > 0 && (
                <div className='bg-red-50 dark:bg-red-900/20 rounded-lg p-3'>
                  <h5 className='text-sm font-medium text-red-900 dark:text-red-200 mb-2'>
                    验证错误 ({validationResult.errors.length})
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
                    注意事项 ({validationResult.warnings.length})
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
                  导入选项
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
                      跳过重复数据
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
                      覆盖现有数据
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
                      创建缺失的货币
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
        title='确认删除账户'
        message=''
        confirmLabel='确认删除'
        cancelLabel='取消'
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteModal}
      >
        <div className='space-y-4'>
          <p className='text-gray-700 dark:text-gray-300'>
            此操作将永久删除您的账户和所有相关数据，包括：
          </p>
          <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4'>
            <li>• 所有账户和交易记录</li>
            <li>• 分类和标签</li>
            <li>• 用户设置和偏好</li>
            <li>• 贷款合约和定期交易</li>
          </ul>
          <p className='text-gray-700 dark:text-gray-300'>
            请输入您的密码以确认删除：
          </p>
          <input
            type='password'
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            placeholder='请输入密码'
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

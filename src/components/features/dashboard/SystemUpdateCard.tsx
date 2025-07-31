'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { publishSystemUpdate } from '@/lib/services/data-update.service'
import { format } from 'date-fns'
import LoadingSpinner, {
  LoadingSpinnerSVG,
} from '@/components/ui/feedback/LoadingSpinner'

export default function SystemUpdateCard() {
  const { t } = useLanguage()
  const { resolvedTheme: _resolvedTheme } = useTheme()
  const {
    syncStatus,
    triggerSync,
    refreshSyncStatus: _refreshSyncStatus,
    forceStopSync,
    userSettings,
  } = useUserData()
  const { showSuccess, showError } = useToast()
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const previousSyncStatusRef = useRef(syncStatus)

  // 检查是否启用了汇率自动更新
  const isExchangeRateAutoUpdateEnabled =
    userSettings?.autoUpdateExchangeRates || false

  // 检查是否存在状态不一致（真正的卡住状态）
  // 条件：同步状态为processing，存在stages数据，且所有阶段都完成但没有任何阶段在处理中
  const isStatusInconsistent =
    syncStatus.status === 'processing' &&
    syncStatus.stages &&
    Object.values(syncStatus.stages).every(s => s.stage === 'completed') &&
    !Object.values(syncStatus.stages).some(s => s.stage === 'processing')

  // 监听同步状态变化，当同步完成且有更新时触发refreshBalances
  useEffect(() => {
    const previousStatus = previousSyncStatusRef.current
    const currentStatus = syncStatus

    // 检查是否从非completed状态变为completed状态
    if (
      previousStatus.status !== 'completed' &&
      currentStatus.status === 'completed'
    ) {
      // 计算总的处理数量
      const totalProcessed =
        (currentStatus.processedRecurring || 0) +
        (currentStatus.processedLoans || 0) +
        (currentStatus.processedExchangeRates || 0)

      // 系统更新完成后，无论是否有处理项目，都发布系统更新事件
      // 这样可以确保侧边栏在同步完成后总是刷新，保持数据一致性
      publishSystemUpdate({
        totalProcessed,
        processedRecurring: currentStatus.processedRecurring || 0,
        processedLoans: currentStatus.processedLoans || 0,
        processedExchangeRates: currentStatus.processedExchangeRates || 0,
      }).catch(error => {
        console.error('Failed to publish system update event:', error)
      })
    }

    // 更新引用
    previousSyncStatusRef.current = currentStatus
  }, [syncStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'processing':
        return 'text-blue-600 dark:text-blue-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg
            className='h-5 w-5 text-green-600 dark:text-green-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        )
      case 'processing':
        return <LoadingSpinnerSVG size='sm' color='primary' />
      case 'failed':
        return (
          <svg
            className='h-5 w-5 text-red-600 dark:text-red-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        )
      default:
        return (
          <svg
            className='h-5 w-5 text-gray-600 dark:text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        )
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('sync.status.completed')
      case 'processing':
        return t('sync.status.processing')
      case 'failed':
        return t('sync.status.failed')
      default:
        return t('sync.status.idle')
    }
  }

  const handleManualSync = async () => {
    setIsManualSyncing(true)
    try {
      await triggerSync(true)
      showSuccess(
        t('sync.manual.triggered'),
        t('sync.manual.triggered.message')
      )
    } catch (error) {
      console.error('Manual sync failed:', error)
      showError(t('sync.manual.failed'), t('sync.manual.failed.message'))
    } finally {
      setIsManualSyncing(false)
    }
  }

  const handleForceReset = async () => {
    if (isResetting) return

    setIsResetting(true)
    try {
      const response = await fetch('/api/sync/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('sync.force.reset.success'))

        // 立即停止所有轮询并设置为待机状态
        forceStopSync()

        // 发布系统更新事件，触发相关组件数据刷新
        await publishSystemUpdate({
          type: 'force-reset',
          resetData: result.data,
        })
      } else {
        showError(result.error || t('sync.force.reset.failed'))
      }
    } catch (error) {
      console.error('Force reset failed:', error)
      showError(t('sync.force.reset.failed'))
    } finally {
      setIsResetting(false)
    }
  }

  // 渲染阶段状态图标的辅助函数
  const renderStageIcon = (stage: string) => {
    if (stage === 'completed') {
      // 如果存在状态不一致，显示警告状态
      if (isStatusInconsistent) {
        return (
          <div
            className='w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center'
            title='状态异常，请强制重置'
          >
            <svg
              className='w-2 h-2 text-white'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
          </div>
        )
      }
      // 正常完成状态
      return (
        <div className='w-3 h-3 rounded-full bg-green-500 flex items-center justify-center'>
          <svg
            className='w-2 h-2 text-white'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        </div>
      )
    } else if (stage === 'processing') {
      return <LoadingSpinner size='xs' color='primary' />
    } else {
      return (
        <span className='w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600' />
      )
    }
  }

  return (
    <div
      className={`rounded-lg border-2 p-4 mb-6 transition-all duration-200 ${getStatusBgColor(syncStatus.status)}`}
    >
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <div
            className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              syncStatus.status === 'completed'
                ? 'bg-green-100 dark:bg-green-900/30'
                : syncStatus.status === 'processing'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : syncStatus.status === 'failed'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {getStatusIcon(syncStatus.status)}
          </div>

          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {t('dashboard.system.update.status')}
            </h3>
            <div
              className={`flex items-center space-x-2 ${getStatusColor(syncStatus.status)}`}
            >
              <span className='text-sm font-medium'>
                {getStatusText(syncStatus.status)}
              </span>
              {syncStatus.lastSyncTime && (
                <>
                  <span className='text-gray-400'>•</span>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('sync.last.time')}:{' '}
                    {format(new Date(syncStatus.lastSyncTime), 'MM-dd HH:mm')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center space-x-3'>
          {/* 处理统计信息 */}
          {syncStatus.status === 'completed' && (
            <div className='hidden sm:flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400'>
              <div className='text-center'>
                <div className='font-semibold text-green-600 dark:text-green-400'>
                  {syncStatus.processedRecurring || 0}
                </div>
                <div>{t('sync.processed.recurring')}</div>
              </div>
              <div className='text-center'>
                <div className='font-semibold text-blue-600 dark:text-blue-400'>
                  {syncStatus.processedLoans || 0}
                </div>
                <div>{t('sync.processed.loans')}</div>
              </div>
              {/* 只有在启用汇率自动更新时才显示汇率更新统计 */}
              {isExchangeRateAutoUpdateEnabled && (
                <div className='text-center'>
                  <div className='font-semibold text-orange-600 dark:text-orange-400'>
                    {syncStatus.processedExchangeRates || 0}
                  </div>
                  <div>{t('sync.processed.exchange.rates')}</div>
                </div>
              )}
            </div>
          )}

          {/* 手动更新按钮 */}
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing || syncStatus.status === 'processing'}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${
              syncStatus.status === 'failed'
                ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isManualSyncing || syncStatus.status === 'processing' ? (
              <>
                <LoadingSpinner size='sm' color='white' className='mr-2' />
                {t('sync.processing')}
              </>
            ) : (
              <>
                <svg
                  className='mr-2 h-4 w-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
                {syncStatus.status === 'failed'
                  ? t('sync.retry')
                  : t('sync.manual.trigger')}
              </>
            )}
          </button>

          {/* 强制重置按钮 - 只在卡住时显示 */}
          {syncStatus.status === 'processing' && (
            <button
              onClick={handleForceReset}
              disabled={isResetting}
              className='inline-flex items-center justify-center w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
              title={
                isResetting ? t('common.processing') : t('sync.force.reset')
              }
            >
              {isResetting ? (
                <LoadingSpinner size='sm' color='muted' />
              ) : (
                <svg
                  className='h-4 w-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 错误信息 */}
      {syncStatus.status === 'failed' && syncStatus.errorMessage && (
        <div className='mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-md'>
          <p className='text-sm text-red-600 dark:text-red-400'>
            <span className='font-medium'>{t('sync.error')}:</span>{' '}
            {syncStatus.errorMessage}
          </p>
        </div>
      )}

      {/* 处理中信息 */}
      {syncStatus.status === 'processing' && (
        <div className='mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md'>
          <div className='flex items-center space-x-2 mb-2'>
            <LoadingSpinner size='xs' color='primary' />
            <p className='text-sm text-blue-600 dark:text-blue-400'>
              {t('sync.processing.message')}
            </p>
          </div>

          {/* 简约阶段状态显示 - 只在处理中时显示 */}
          {syncStatus.status === 'processing' && syncStatus.stages && (
            <div className='mt-2 flex items-center space-x-3 text-xs'>
              {/* 定期交易 */}
              <div className='flex items-center space-x-1'>
                {renderStageIcon(
                  syncStatus.stages?.recurringTransactions?.stage || 'pending'
                )}
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('sync.stages.recurringTransactions')}
                </span>
              </div>

              {/* 贷款合约 */}
              <div className='flex items-center space-x-1'>
                {renderStageIcon(
                  syncStatus.stages?.loanContracts?.stage || 'pending'
                )}
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('sync.stages.loanContracts')}
                </span>
              </div>

              {/* 汇率更新 - 只有在启用汇率自动更新时才显示 */}
              {isExchangeRateAutoUpdateEnabled && (
                <div className='flex items-center space-x-1'>
                  {renderStageIcon(
                    syncStatus.stages?.exchangeRates?.stage || 'pending'
                  )}
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('sync.stages.exchangeRates')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 成功信息 */}
      {syncStatus.status === 'completed' &&
        syncStatus.futureDataGenerated &&
        syncStatus.futureDataUntil && (
          <div className='mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-md'>
            <div className='flex items-center space-x-2 text-sm text-green-600 dark:text-green-400'>
              <svg
                className='h-4 w-4 flex-shrink-0'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
              <span>
                {t('sync.future.data.generated', {
                  until: format(new Date(syncStatus.futureDataUntil), 'MM-dd'),
                })}
              </span>
            </div>
          </div>
        )}
    </div>
  )
}

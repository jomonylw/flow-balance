'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { format } from 'date-fns'
import LoadingSpinner, {
  LoadingSpinnerSVG,
} from '@/components/ui/feedback/LoadingSpinner'

export default function SystemUpdateCard() {
  const { t } = useLanguage()
  const { resolvedTheme: _resolvedTheme } = useTheme()
  const { syncStatus, triggerSync, userSettings, refreshBalances } =
    useUserData()
  const { showSuccess, showError } = useToast()
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const previousSyncStatusRef = useRef(syncStatus)

  // 检查是否启用了汇率自动更新
  const isExchangeRateAutoUpdateEnabled =
    userSettings?.autoUpdateExchangeRates || false

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

      // 如果有更新（总数大于0），触发refreshBalances
      // 系统更新主要影响账户余额，使用精确刷新策略提升性能
      if (totalProcessed > 0) {
        console.log(
          `系统更新完成，共处理 ${totalProcessed} 项，触发余额数据刷新`
        )
        refreshBalances().catch(error => {
          console.error(
            'Failed to refresh balances after system update:',
            error
          )
        })
      }
    }

    // 更新引用
    previousSyncStatusRef.current = currentStatus
  }, [syncStatus, refreshBalances])

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
          <p className='text-sm text-blue-600 dark:text-blue-400'>
            {t('sync.processing.message')}
          </p>
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

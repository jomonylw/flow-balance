'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { format } from 'date-fns'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'

export default function SyncStatusCard() {
  const { t } = useLanguage()
  const { syncStatus, triggerSync } = useUserData()

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
        return '✅'
      case 'processing':
        return '🔄'
      case 'failed':
        return '❌'
      default:
        return '⏸️'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-900/20'
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-800/50'
    }
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
            {t('dashboard.sync.status')}
          </h3>
          <div
            className={`flex items-center mt-1 ${getStatusColor(syncStatus.status)}`}
          >
            <span className='mr-2'>{getStatusIcon(syncStatus.status)}</span>
            <span className='text-sm'>
              {t(`sync.status.${syncStatus.status}`)}
            </span>
          </div>
        </div>

        {syncStatus.status === 'failed' && (
          <button
            onClick={() => triggerSync(true)}
            className='px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400
                     border border-blue-300 dark:border-blue-600 rounded-md
                     hover:bg-blue-50 dark:hover:bg-blue-900/20
                     transition-colors duration-200'
          >
            {t('sync.retry')}
          </button>
        )}
      </div>

      {syncStatus.lastSyncTime && (
        <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
          {t('sync.last.time')}:{' '}
          {format(new Date(syncStatus.lastSyncTime), 'yyyy-MM-dd HH:mm')}
        </p>
      )}

      {syncStatus.status === 'completed' && (
        <div className='text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1'>
          <div>
            {(syncStatus.processedExchangeRates || 0) > 0
              ? t('sync.processed.summary.with.rates', {
                  recurring: syncStatus.processedRecurring || 0,
                  loans: syncStatus.processedLoans || 0,
                  exchangeRates: syncStatus.processedExchangeRates || 0,
                })
              : t('sync.processed.summary', {
                  recurring: syncStatus.processedRecurring || 0,
                  loans: syncStatus.processedLoans || 0,
                })}
          </div>
          {syncStatus.futureDataGenerated && syncStatus.futureDataUntil && (
            <div className='flex items-center space-x-1'>
              <span className='text-green-600 dark:text-green-400'>📅</span>
              <span>
                {t('sync.future.data.generated', {
                  until: format(new Date(syncStatus.futureDataUntil), 'MM-dd'),
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {syncStatus.status === 'failed' && syncStatus.errorMessage && (
        <div className={`mt-2 p-2 rounded-md ${getStatusBgColor('failed')}`}>
          <p className='text-xs text-red-600 dark:text-red-400'>
            {syncStatus.errorMessage}
          </p>
        </div>
      )}

      {syncStatus.status === 'processing' && (
        <div
          className={`mt-2 p-2 rounded-md ${getStatusBgColor('processing')}`}
        >
          <div className='flex items-center space-x-2'>
            <LoadingSpinner size='xs' color='primary' />
            <p className='text-xs text-blue-600 dark:text-blue-400'>
              {t('sync.processing.message')}
            </p>
          </div>

          {/* 分阶段进度显示 */}
          {syncStatus.stages && (
            <div className='mt-2 space-y-1'>
              <div className='text-xs text-gray-600 dark:text-gray-400'>
                {t('sync.stages.title')}:
              </div>

              {/* 定期交易阶段 */}
              <div className='flex items-center space-x-2'>
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus.stages.recurringTransactions.stage ===
                    'completed'
                      ? 'bg-green-500'
                      : syncStatus.stages.recurringTransactions.stage ===
                          'processing'
                        ? 'bg-blue-500'
                        : syncStatus.stages.recurringTransactions.stage ===
                            'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                  }`}
                />
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {t('sync.stages.recurringTransactions')}
                  {syncStatus.stages.recurringTransactions.processed !==
                    undefined &&
                    ` (${syncStatus.stages.recurringTransactions.processed})`}
                </span>
              </div>

              {/* 贷款合约阶段 */}
              <div className='flex items-center space-x-2'>
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus.stages.loanContracts.stage === 'completed'
                      ? 'bg-green-500'
                      : syncStatus.stages.loanContracts.stage === 'processing'
                        ? 'bg-blue-500'
                        : syncStatus.stages.loanContracts.stage === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                  }`}
                />
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {t('sync.stages.loanContracts')}
                  {syncStatus.stages.loanContracts.processed !== undefined &&
                    ` (${syncStatus.stages.loanContracts.processed})`}
                </span>
              </div>

              {/* 汇率更新阶段 */}
              <div className='flex items-center space-x-2'>
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus.stages.exchangeRates.stage === 'completed'
                      ? 'bg-green-500'
                      : syncStatus.stages.exchangeRates.stage === 'processing'
                        ? 'bg-blue-500'
                        : syncStatus.stages.exchangeRates.stage === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                  }`}
                />
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  {t('sync.stages.exchangeRates')}
                  {syncStatus.stages.exchangeRates.processed !== undefined &&
                    ` (${syncStatus.stages.exchangeRates.processed})`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

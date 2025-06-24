'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import ExchangeRateForm from './ExchangeRateForm'
import ExchangeRateList from './ExchangeRateList'
import ToggleSwitch from '@/components/ui/forms/ToggleSwitch'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import { ExchangeRateManagementSkeleton } from '@/components/ui/data-display/page-skeletons'
import type {
  ExchangeRateData,
  SimpleCurrency,
  MissingRateInfo,
} from '@/types/core'

interface ExchangeRateManagementProps {
  currencies: SimpleCurrency[]
}

export default function ExchangeRateManagement({
  currencies,
}: ExchangeRateManagementProps) {
  const { t } = useLanguage()
  const {
    currencies: userCurrencies,
    getBaseCurrency,
    userSettings,
    updateUserSettings,
  } = useUserData()
  const { showSuccess, showError } = useToast()
  const { formatInputDate } = useUserDateFormatter()
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData[]>([])
  const [missingRates, setMissingRates] = useState<MissingRateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRateData | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // 从 UserDataContext 获取基础货币和用户设置
  const baseCurrency = getBaseCurrency()
  const autoUpdateEnabled = userSettings?.autoUpdateExchangeRates || false
  const lastUpdate = userSettings?.lastExchangeRateUpdate

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // 获取缺失的汇率信息和现有汇率，用户货币从 UserDataContext 获取
      const [missingResponse, ratesResponse] = await Promise.all([
        fetch('/api/exchange-rates/missing'),
        fetch('/api/exchange-rates'),
      ])

      if (missingResponse.ok) {
        const missingData = await missingResponse.json()
        setMissingRates(missingData.data.missingRates || [])
      }

      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json()
        setExchangeRates(ratesData.data || [])
      }
    } catch (error) {
      console.error('获取汇率数据失败:', error)
      setError(t('error.fetch.failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRateCreated = async (newRate: ExchangeRateData) => {
    // 重新获取所有汇率数据，包括新生成的自动汇率
    await fetchData()

    // 从缺失列表中移除
    setMissingRates(prev =>
      prev.filter(
        missing =>
          !(
            missing.fromCurrency === newRate.fromCurrency &&
            missing.toCurrency === newRate.toCurrency
          )
      )
    )

    setShowForm(false)
    setEditingRate(null)
  }

  const handleRateDeleted = async (deletedRateId: string) => {
    const deletedRate = exchangeRates.find(rate => rate.id === deletedRateId)

    // 重新获取所有汇率数据，包括重新生成的自动汇率
    await fetchData()

    // 如果删除的汇率对应某个货币对，将其重新添加到缺失列表
    if (deletedRate) {
      const fromCurrency = currencies.find(
        c => c.code === deletedRate.fromCurrency
      )
      const toCurrency = currencies.find(c => c.code === deletedRate.toCurrency)

      if (fromCurrency && toCurrency) {
        setMissingRates(prev => [
          ...prev,
          {
            fromCurrency: deletedRate.fromCurrency,
            toCurrency: deletedRate.toCurrency,
            fromCurrencyInfo: fromCurrency,
            toCurrencyInfo: toCurrency,
            required: true,
          },
        ])
      }
    }
  }

  const handleEditRate = (rate: ExchangeRateData) => {
    setEditingRate(rate)
    setShowForm(true)
  }

  const handleAddMissingRate = (missing: MissingRateInfo) => {
    setEditingRate({
      id: '',
      fromCurrencyId: missing.fromCurrencyInfo.id,
      toCurrencyId: missing.toCurrencyInfo.id,
      fromCurrency: missing.fromCurrency,
      toCurrency: missing.toCurrency,
      rate: 1,
      effectiveDate: formatInputDate(new Date()),
      fromCurrencyRef: missing.fromCurrencyInfo,
      toCurrencyRef: missing.toCurrencyInfo,
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRate(null)
  }

  // 处理自动更新开关
  const handleAutoUpdateToggle = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoUpdateExchangeRates: enabled }),
      })

      const data = await response.json()

      if (response.ok) {
        // 更新 UserDataContext 中的用户设置
        if (data.data?.userSettings) {
          updateUserSettings(data.data.userSettings)
        }
        showSuccess(
          t('exchange.rate.auto.update'),
          enabled
            ? t('exchange.rate.auto.update.enabled')
            : t('exchange.rate.auto.update.disabled')
        )
      } else {
        showError(
          t('error.update.failed'),
          data.error || t('exchange.rate.settings.update.failed')
        )
      }
    } catch (error) {
      console.error('更新自动更新设置失败:', error)
      showError(t('error.network'), t('exchange.rate.network.error'))
    }
  }

  // 处理手动更新
  const handleManualUpdate = async () => {
    if (!baseCurrency) {
      showError(
        t('exchange.rate.base.currency.required'),
        t('exchange.rate.base.currency.setup.required')
      )
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/exchange-rates/auto-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        const { updatedCount, errors, skippedCurrencies } = data.data

        // 刷新汇率数据
        await fetchData()

        // 更新用户设置中的最后更新时间
        try {
          const settingsResponse = await fetch('/api/user/settings')
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json()
            if (settingsData.data?.userSettings) {
              updateUserSettings(settingsData.data.userSettings)
            }
          }
        } catch (error) {
          console.error('Failed to refresh user settings:', error)
        }

        // 只有真正的错误才显示为失败，跳过的货币不算失败
        if (errors && errors.length > 0) {
          showError(
            t('exchange.rate.update.partial'),
            t('exchange.rate.update.partial.message', {
              updatedCount,
              errorCount: errors.length,
            })
          )
        } else {
          // 构建成功消息
          let successMessage = t('exchange.rate.update.success.message', {
            updatedCount,
          })
          if (skippedCurrencies && skippedCurrencies.length > 0) {
            const skippedMessage = t('exchange.rate.update.skipped.message', {
              skippedCount: skippedCurrencies.length,
            })
            // 如果翻译键没有加载，使用回退文本
            if (skippedMessage === 'exchange.rate.update.skipped.message') {
              successMessage += `，跳过 ${skippedCurrencies.length} 个不支持的货币`
            } else {
              successMessage += skippedMessage
            }
          }

          showSuccess(t('exchange.rate.update.success'), successMessage)
        }
      } else {
        // 根据错误代码显示国际化错误信息
        let errorMessage =
          data.error || t('exchange.rate.update.general.failed')

        if (data.errorCode) {
          switch (data.errorCode) {
            case 'CURRENCY_NOT_SUPPORTED':
              errorMessage = t(
                'exchange.rate.api.currency.not.supported',
                data.errorParams || {}
              )
              break
            case 'SERVICE_UNAVAILABLE':
              errorMessage = t('exchange.rate.api.service.unavailable')
              break
            case 'API_ERROR':
              errorMessage = t(
                'exchange.rate.api.error.with.code',
                data.errorParams || {}
              )
              break
            case 'NETWORK_CONNECTION_FAILED':
              errorMessage = t('exchange.rate.network.connection.failed')
              break
            case 'API_FETCH_FAILED':
              errorMessage = t('exchange.rate.api.fetch.failed')
              break
            default:
              errorMessage =
                data.error || t('exchange.rate.update.general.failed')
          }
        }

        showError(t('exchange.rate.update.failed'), errorMessage)
      }
    } catch (error) {
      console.error('手动更新汇率失败:', error)
      showError(t('error.network'), t('exchange.rate.network.error'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return <ExchangeRateManagementSkeleton />
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('exchange.rate.management')}
        </h3>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {t('exchange.rate.management.description')}
          {baseCurrency && (
            <span className='ml-2 text-blue-600 dark:text-blue-400 font-medium'>
              ({t('exchange.rate.base.currency')}: {baseCurrency.symbol}{' '}
              {baseCurrency.name})
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className='bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg'>
          {error}
        </div>
      )}

      {/* 缺失汇率提醒 */}
      {missingRates.length > 0 && (
        <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4'>
          <div className='flex items-start'>
            <div className='flex-shrink-0'>
              <span className='text-yellow-400 text-xl'>⚠️</span>
            </div>
            <div className='ml-3 flex-1'>
              <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
                {t('exchange.rate.missing.title')}
              </h4>
              <p className='text-sm text-yellow-700 dark:text-yellow-300 mt-1'>
                {t('exchange.rate.missing.description', {
                  count: missingRates.length,
                })}
              </p>
              <div className='mt-3 space-y-2'>
                {missingRates.map((missing, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2'
                  >
                    <span className='text-sm text-gray-900 dark:text-gray-100'>
                      {missing.fromCurrencyInfo.symbol}{' '}
                      {missing.fromCurrencyInfo.name} →{' '}
                      {missing.toCurrencyInfo.symbol}{' '}
                      {missing.toCurrencyInfo.name}
                    </span>
                    <button
                      onClick={() => handleAddMissingRate(missing)}
                      className='flex items-center px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors'
                      title={t('exchange.rate.setup')}
                    >
                      <svg
                        className='w-4 h-4 mr-1'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                        />
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                        />
                      </svg>
                      {t('exchange.rate.setup')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 汇率自动更新设置 */}
      <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          {t('exchange.rate.auto.update.settings')}
        </h4>

        <div className='space-y-4'>
          {/* 自动更新开关 */}
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                {t('exchange.rate.auto.update')}
              </label>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {t('exchange.rate.auto.update.description')}
              </p>
            </div>
            <ToggleSwitch
              name='autoUpdateExchangeRates'
              label=''
              checked={autoUpdateEnabled}
              onChange={handleAutoUpdateToggle}
              disabled={!baseCurrency}
            />
          </div>

          {/* 手动更新按钮和最后更新时间 */}
          <div className='flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600'>
            <div className='flex-1'>
              <div className='text-sm text-gray-600 dark:text-gray-400'>
                {t('exchange.rate.last.update')}:{' '}
                {lastUpdate
                  ? new Date(lastUpdate).toLocaleString()
                  : t('exchange.rate.never.updated')}
              </div>
              <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {t('exchange.rate.source.frankfurter')}
              </div>
            </div>
            <button
              onClick={handleManualUpdate}
              disabled={isUpdating || !baseCurrency}
              className='flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors'
              title={t('exchange.rate.manual.update.description')}
            >
              {isUpdating ? (
                <>
                  <LoadingSpinnerSVG
                    size='sm'
                    color='white'
                    className='w-4 h-4 mr-1'
                  />
                  {t('exchange.rate.updating')}
                </>
              ) : (
                <>
                  <svg
                    className='w-4 h-4 mr-1'
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
                  {t('exchange.rate.manual.update')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {t('exchange.rate.count', { count: exchangeRates.length })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className='flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors'
          title={t('exchange.rate.add')}
        >
          <svg
            className='w-4 h-4 mr-1'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 6v6m0 0v6m0-6h6m-6 0H6'
            />
          </svg>
          {t('exchange.rate.add')}
        </button>
      </div>

      {/* 汇率表单 */}
      {showForm && (
        <ExchangeRateForm
          currencies={userCurrencies}
          baseCurrency={baseCurrency}
          editingRate={editingRate}
          onRateCreated={handleRateCreated}
          onClose={handleCloseForm}
        />
      )}

      {/* 汇率列表 */}
      <ExchangeRateList
        exchangeRates={exchangeRates}
        onEdit={handleEditRate}
        onDelete={handleRateDeleted}
        onRefresh={fetchData}
      />
    </div>
  )
}

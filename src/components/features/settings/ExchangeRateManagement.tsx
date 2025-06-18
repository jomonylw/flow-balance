'use client'

import { useState, useEffect } from 'react'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import ExchangeRateForm from './ExchangeRateForm'
import ExchangeRateList from './ExchangeRateList'
import { ExchangeRateManagementSkeleton } from '@/components/ui/data-display/page-skeletons'
import type { ExchangeRateData, SimpleCurrency, MissingRateInfo } from '@/types/core'

interface ExchangeRateManagementProps {
  currencies: SimpleCurrency[]
}

export default function ExchangeRateManagement({
  currencies,
}: ExchangeRateManagementProps) {
  const { t } = useLanguage()
  const { currencies: userCurrencies, getBaseCurrency } = useUserData()
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData[]>([])
  const [missingRates, setMissingRates] = useState<MissingRateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRateData | null>(null)

  // 从 UserDataContext 获取基础货币
  const baseCurrency = getBaseCurrency()

  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRateCreated = (newRate: ExchangeRateData) => {
    setExchangeRates(prev => {
      // 如果是更新现有汇率，替换它；否则添加新汇率
      const existingIndex = prev.findIndex(rate => rate.id === newRate.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = newRate
        return updated
      } else {
        return [...prev, newRate]
      }
    })

    // 从缺失列表中移除
    setMissingRates(prev =>
      prev.filter(
        missing =>
          !(
            missing.fromCurrency === newRate.fromCurrency &&
            missing.toCurrency === newRate.toCurrency
          ),
      ),
    )

    setShowForm(false)
    setEditingRate(null)
  }

  const handleRateDeleted = (deletedRateId: string) => {
    const deletedRate = exchangeRates.find(rate => rate.id === deletedRateId)

    setExchangeRates(prev => prev.filter(rate => rate.id !== deletedRateId))

    // 如果删除的汇率对应某个货币对，将其重新添加到缺失列表
    if (deletedRate) {
      const fromCurrency = currencies.find(
        c => c.code === deletedRate.fromCurrency,
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
      fromCurrency: missing.fromCurrency,
      toCurrency: missing.toCurrency,
      rate: 1,
      effectiveDate: new Date().toISOString().split('T')[0],
      fromCurrencyRef: missing.fromCurrencyInfo,
      toCurrencyRef: missing.toCurrencyInfo,
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRate(null)
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
                      className='text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors'
                    >
                      {t('exchange.rate.setup')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {t('exchange.rate.count', { count: exchangeRates.length })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
        >
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

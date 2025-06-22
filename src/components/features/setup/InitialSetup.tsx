'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, User } from '@prisma/client'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import SetupLayout from './SetupLayout'

interface _CurrencyWithStatus extends Currency {
  isSelected: boolean
}

interface InitialSetupProps {
  user: User
}

export default function InitialSetup({ user: _user }: InitialSetupProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([])
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [baseCurrency, setBaseCurrency] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const fetchCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies')
      if (response.ok) {
        const data = await response.json()
        // 从带有 isSelected 状态的货币列表中提取基本货币信息
        const currencies = data.data.currencies.map((currency: Currency) => ({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          isCustom: currency.isCustom,
          createdBy: currency.createdBy,
        }))
        setAllCurrencies(currencies)
      }
    } catch (error) {
      console.error('获取货币列表失败:', error)
      setError(t('setup.error.fetch.currencies'))
    }
  }

  const handleCurrencyToggle = (currencyCode: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(currencyCode)) {
        // 如果取消选择的是本位币，也要清除本位币设置
        if (currencyCode === baseCurrency) {
          setBaseCurrency('')
        }
        return prev.filter(code => code !== currencyCode)
      } else {
        return [...prev, currencyCode]
      }
    })
  }

  const handleBaseCurrencyChange = (currencyCode: string) => {
    setBaseCurrency(currencyCode)
    // 确保本位币也在选择列表中
    if (!selectedCurrencies.includes(currencyCode)) {
      setSelectedCurrencies(prev => [...prev, currencyCode])
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (selectedCurrencies.length === 0) {
        setError(t('setup.error.no.currencies'))
        return
      }
      setError('')
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleComplete = async () => {
    if (!baseCurrency) {
      setError(t('setup.error.no.base.currency'))
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 1. 设置用户可用货币
      const currenciesResponse = await fetch('/api/user/currencies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCodes: selectedCurrencies }),
      })

      if (!currenciesResponse.ok) {
        throw new Error(t('setup.error.set.currencies'))
      }

      // 2. 设置本位币
      const settingsResponse = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseCurrencyCode: baseCurrency }),
      })

      if (!settingsResponse.ok) {
        throw new Error(t('setup.error.set.base.currency'))
      }

      // 设置完成，跳转到仪表板
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('完成初始设置失败:', error)
      setError(t('setup.error.general'))
    } finally {
      setIsLoading(false)
    }
  }

  const commonCurrencies = ['USD', 'EUR', 'CNY', 'JPY', 'GBP']
  const otherCurrencies = allCurrencies.filter(
    c => !commonCurrencies.includes(c.code)
  )

  return (
    <SetupLayout title={t('setup.title')} subtitle={t('setup.subtitle')}>
      {/* 进度指示器 */}
      <div className='mb-8'>
        <div className='flex items-center'>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 mx-4 ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          ></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            2
          </div>
        </div>
        <div className='flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400'>
          <span>{t('setup.step.1')}</span>
          <span>{t('setup.step.2')}</span>
        </div>
      </div>

      {error && (
        <div className='mb-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded'>
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
            {t('setup.step.1.title')}
          </h3>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
            {t('setup.step.1.description')}
          </p>

          {/* 常用货币 */}
          <div className='mb-6'>
            <h4 className='text-md font-medium text-gray-800 dark:text-gray-200 mb-3'>
              {t('setup.common.currencies')}
            </h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {allCurrencies
                .filter(currency => commonCurrencies.includes(currency.code))
                .map(currency => (
                  <label
                    key={currency.code}
                    className='flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
                  >
                    <input
                      type='checkbox'
                      checked={selectedCurrencies.includes(currency.code)}
                      onChange={() => handleCurrencyToggle(currency.code)}
                      className='mr-3'
                    />
                    <span className='text-lg mr-3'>{currency.symbol}</span>
                    <div>
                      <div className='font-medium text-gray-900 dark:text-white'>
                        {currency.code}
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        {currency.name}
                      </div>
                    </div>
                  </label>
                ))}
            </div>
          </div>

          {/* 其他货币 */}
          {otherCurrencies.length > 0 && (
            <div>
              <h4 className='text-md font-medium text-gray-800 dark:text-gray-200 mb-3'>
                {t('setup.other.currencies')}
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto'>
                {otherCurrencies.map(currency => (
                  <label
                    key={currency.code}
                    className='flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
                  >
                    <input
                      type='checkbox'
                      checked={selectedCurrencies.includes(currency.code)}
                      onChange={() => handleCurrencyToggle(currency.code)}
                      className='mr-3'
                    />
                    <span className='text-lg mr-3'>{currency.symbol}</span>
                    <div>
                      <div className='font-medium text-gray-900 dark:text-white'>
                        {currency.code}
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
                        {currency.name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className='mt-6 text-sm text-gray-600 dark:text-gray-400'>
            {t('setup.selected.count', { count: selectedCurrencies.length })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
            {t('setup.step.2.title')}
          </h3>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
            {t('setup.step.2.description')}
          </p>

          <div className='space-y-3'>
            {selectedCurrencies.map(currencyCode => {
              const currency = allCurrencies.find(c => c.code === currencyCode)
              if (!currency) return null

              return (
                <label
                  key={currency.code}
                  className='flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
                >
                  <input
                    type='radio'
                    name='baseCurrency'
                    value={currency.code}
                    checked={baseCurrency === currency.code}
                    onChange={e => handleBaseCurrencyChange(e.target.value)}
                    className='mr-3'
                  />
                  <span className='text-lg mr-3'>{currency.symbol}</span>
                  <div>
                    <div className='font-medium text-gray-900 dark:text-white'>
                      {currency.code}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      {currency.name}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className='mt-8 flex justify-between'>
        <button
          type='button'
          onClick={handleBack}
          disabled={step === 1}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            step === 1
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
          }`}
        >
          {t('setup.button.previous')}
        </button>

        {step === 1 ? (
          <button
            type='button'
            onClick={handleNext}
            className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200'
          >
            {t('setup.button.next')}
          </button>
        ) : (
          <button
            type='button'
            onClick={handleComplete}
            disabled={isLoading}
            className='px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
          >
            {isLoading
              ? t('setup.button.completing')
              : t('setup.button.complete')}
          </button>
        )}
      </div>
    </SetupLayout>
  )
}

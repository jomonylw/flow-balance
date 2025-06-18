'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, User } from '@prisma/client'

interface _CurrencyWithStatus extends Currency {
  isSelected: boolean
}

interface InitialSetupProps {
  user: User
}

export default function InitialSetup({ user: _user }: InitialSetupProps) {
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
      setError('获取货币列表失败')
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
        setError('请至少选择一种货币')
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
      setError('请选择本位币')
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
        throw new Error('设置可用货币失败')
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
        throw new Error('设置本位币失败')
      }

      // 设置完成，跳转到仪表板
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('完成初始设置失败:', error)
      setError('设置失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const commonCurrencies = ['USD', 'EUR', 'CNY', 'JPY', 'GBP']
  const otherCurrencies = allCurrencies.filter(
    c => !commonCurrencies.includes(c.code)
  )

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
          欢迎使用 Flow Balance
        </h2>
        <p className='mt-2 text-center text-sm text-gray-600'>
          让我们先进行一些基本设置
        </p>
      </div>

      <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-2xl'>
        <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
          {/* 进度指示器 */}
          <div className='mb-8'>
            <div className='flex items-center'>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                1
              </div>
              <div
                className={`flex-1 h-1 mx-4 ${
                  step >= 2 ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                2
              </div>
            </div>
            <div className='flex justify-between mt-2 text-sm text-gray-600'>
              <span>选择货币</span>
              <span>设置本位币</span>
            </div>
          </div>

          {error && (
            <div className='mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>
                选择您需要使用的货币
              </h3>
              <p className='text-sm text-gray-600 mb-6'>
                请选择您在日常财务管理中会用到的货币。您可以随时在设置中修改这些选择。
              </p>

              {/* 常用货币 */}
              <div className='mb-6'>
                <h4 className='text-md font-medium text-gray-800 mb-3'>
                  常用货币
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {allCurrencies
                    .filter(currency =>
                      commonCurrencies.includes(currency.code)
                    )
                    .map(currency => (
                      <label
                        key={currency.code}
                        className='flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'
                      >
                        <input
                          type='checkbox'
                          checked={selectedCurrencies.includes(currency.code)}
                          onChange={() => handleCurrencyToggle(currency.code)}
                          className='mr-3'
                        />
                        <span className='text-lg mr-3'>{currency.symbol}</span>
                        <div>
                          <div className='font-medium text-gray-900'>
                            {currency.code}
                          </div>
                          <div className='text-sm text-gray-600'>
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
                  <h4 className='text-md font-medium text-gray-800 mb-3'>
                    其他货币
                  </h4>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto'>
                    {otherCurrencies.map(currency => (
                      <label
                        key={currency.code}
                        className='flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'
                      >
                        <input
                          type='checkbox'
                          checked={selectedCurrencies.includes(currency.code)}
                          onChange={() => handleCurrencyToggle(currency.code)}
                          className='mr-3'
                        />
                        <span className='text-lg mr-3'>{currency.symbol}</span>
                        <div>
                          <div className='font-medium text-gray-900'>
                            {currency.code}
                          </div>
                          <div className='text-sm text-gray-600'>
                            {currency.name}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className='mt-6 text-sm text-gray-600'>
                已选择 {selectedCurrencies.length} 种货币
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className='text-lg font-medium text-gray-900 mb-4'>
                选择您的本位币
              </h3>
              <p className='text-sm text-gray-600 mb-6'>
                本位币是您的主要货币，用于计算净资产和生成财务报告。其他货币的金额会自动转换为本位币显示。
              </p>

              <div className='space-y-3'>
                {selectedCurrencies.map(currencyCode => {
                  const currency = allCurrencies.find(
                    c => c.code === currencyCode
                  )
                  if (!currency) return null

                  return (
                    <label
                      key={currency.code}
                      className='flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'
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
                        <div className='font-medium text-gray-900'>
                          {currency.code}
                        </div>
                        <div className='text-sm text-gray-600'>
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
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              上一步
            </button>

            {step === 1 ? (
              <button
                type='button'
                onClick={handleNext}
                className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              >
                下一步
              </button>
            ) : (
              <button
                type='button'
                onClick={handleComplete}
                disabled={isLoading}
                className='px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? '设置中...' : '完成设置'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

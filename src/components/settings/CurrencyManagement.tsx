'use client'

import { useState, useEffect } from 'react'
import { Currency } from '@prisma/client'
import { useUserData } from '@/contexts/UserDataContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { CurrencyManagementSkeleton } from '@/components/ui/page-skeletons'

interface CurrencyWithStatus extends Currency {
  isSelected: boolean
}

interface UserCurrency extends Currency {
  order: number
  isActive: boolean
}

interface CurrencyManagementProps {
  onCurrenciesUpdated?: () => void
}

export default function CurrencyManagement({ onCurrenciesUpdated }: CurrencyManagementProps) {
  const { t } = useLanguage()
  const { currencies: userCurrencies, refreshCurrencies } = useUserData()
  const [allCurrencies, setAllCurrencies] = useState<CurrencyWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customCurrencyForm, setCustomCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: ''
  })

  useEffect(() => {
    fetchAllCurrencies()
  }, [])

  const fetchAllCurrencies = async () => {
    try {
      setIsLoading(true)
      setError('')

      // 只获取所有货币，用户货币从 UserDataContext 获取
      const allCurrenciesRes = await fetch('/api/currencies')

      if (!allCurrenciesRes.ok) {
        throw new Error(t('error.fetch.failed'))
      }

      const allCurrenciesData = await allCurrenciesRes.json()
      setAllCurrencies(allCurrenciesData.data.currencies)
    } catch (error) {
      console.error('获取货币数据失败:', error)
      setError(t('error.fetch.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch('/api/user/currencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || t('currency.add.failed'))
      }
    } catch (error) {
      console.error('添加货币失败:', error)
      setError(t('error.network'))
    }
  }

  const handleRemoveCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`/api/user/currencies/${currencyCode}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || t('currency.remove.failed'))
      }
    } catch (error) {
      console.error('删除货币失败:', error)
      setError(t('error.network'))
    }
  }

  const handleBatchUpdate = async (selectedCodes: string[]) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch('/api/user/currencies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCodes: selectedCodes }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || t('currency.update.failed'))
      }
    } catch (error) {
      console.error('更新货币设置失败:', error)
      setError(t('error.network'))
    }
  }

  const handleCreateCustomCurrency = async () => {
    try {
      setError('')
      setSuccessMessage('')

      if (!customCurrencyForm.code || !customCurrencyForm.name || !customCurrencyForm.symbol) {
        setError(t('currency.form.incomplete'))
        return
      }

      const response = await fetch('/api/currencies/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customCurrencyForm),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        setShowCustomForm(false)
        setCustomCurrencyForm({ code: '', name: '', symbol: '' })
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || t('currency.custom.create.failed'))
      }
    } catch (error) {
      console.error('创建自定义货币失败:', error)
      setError(t('error.network'))
    }
  }

  const handleDeleteCustomCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`/api/currencies/custom/${currencyCode}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || t('currency.custom.delete.failed'))
      }
    } catch (error) {
      console.error('删除自定义货币失败:', error)
      setError(t('error.network'))
    }
  }

  if (isLoading) {
    return <CurrencyManagementSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('currency.management')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('currency.management.description')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* 已选择的货币 */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
          {t('currency.selected')} ({userCurrencies.length})
        </h4>
        {userCurrencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userCurrencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{currency.code}</span>
                      {currency.isCustom && (
                        <span className="px-1 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
                          {t('currency.custom')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{currency.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCurrency(currency.code)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                >
                  {t('currency.remove')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="text-gray-500 dark:text-gray-400">{t('currency.none.selected')}</div>
            <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('currency.add.instruction')}</div>
          </div>
        )}
      </div>

      {/* 可添加的货币 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">{t('currency.available')}</h4>
          <button
            onClick={() => setShowCustomForm(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            + {t('currency.custom.create')}
          </button>
        </div>

        {/* 自定义货币表单 */}
        {showCustomForm && (
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{t('currency.custom.create')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('currency.code')} *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.code}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    code: e.target.value.toUpperCase()
                  }))}
                  placeholder={t('currency.code.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('currency.code.help')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('currency.name')} *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.name}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder={t('currency.name.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('currency.symbol')} *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.symbol}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    symbol: e.target.value
                  }))}
                  placeholder={t('currency.symbol.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateCustomCurrency}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                {t('common.add')}
              </button>
              <button
                onClick={() => {
                  setShowCustomForm(false)
                  setCustomCurrencyForm({ code: '', name: '', symbol: '' })
                }}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCurrencies
            .filter(currency => !currency.isSelected)
            .map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{currency.code}</span>
                      {currency.isCustom && (
                        <span className="px-1 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
                          {t('currency.custom')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{currency.name}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddCurrency(currency.code)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    {t('currency.add')}
                  </button>
                  {currency.isCustom && (
                    <button
                      onClick={() => handleDeleteCustomCurrency(currency.code)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 说明信息 */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">{t('currency.important.tips')}</h5>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• {t('currency.tip.custom.create')}</li>
          <li>• {t('currency.tip.code.format')}</li>
          <li>• {t('currency.tip.delete.warning')}</li>
          <li>• {t('currency.tip.base.currency')}</li>
          <li>• {t('currency.tip.major.currency')}</li>
        </ul>
      </div>
    </div>
  )
}

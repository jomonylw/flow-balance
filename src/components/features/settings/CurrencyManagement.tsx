'use client'

import { useState, useEffect, useCallback } from 'react'
import { Currency } from '@prisma/client'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { ApiEndpoints } from '@/lib/constants'
import { CurrencyManagementSkeleton } from '@/components/ui/data-display/page-skeletons'
import type { CurrencyManagementProps } from '@/types/components'

interface CurrencyWithStatus extends Currency {
  isSelected: boolean
}

export default function CurrencyManagement({
  onCurrenciesUpdated,
}: CurrencyManagementProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { currencies: userCurrencies, refreshCurrencies } = useUserData()
  const [allCurrencies, setAllCurrencies] = useState<CurrencyWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null)
  const [customCurrencyForm, setCustomCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
  })

  const fetchAllCurrencies = useCallback(async () => {
    try {
      setIsLoading(true)

      // 只获取所有货币，用户货币从 UserDataContext 获取
      const allCurrenciesRes = await fetch(ApiEndpoints.currency.LIST)

      if (!allCurrenciesRes.ok) {
        throw new Error(t('error.fetch.failed'))
      }

      const allCurrenciesData = await allCurrenciesRes.json()
      setAllCurrencies(allCurrenciesData.data.currencies)
    } catch (error) {
      console.error('获取货币数据失败:', error)
      showError(t('error.fetch.failed'), t('error.network'))
    } finally {
      setIsLoading(false)
    }
  }, [t, showError])

  useEffect(() => {
    fetchAllCurrencies()
  }, [fetchAllCurrencies])

  const handleAddCurrency = async (currencyId: string) => {
    try {
      const response = await fetch(ApiEndpoints.user.CURRENCIES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyId }),
      })

      const data = await response.json()

      if (response.ok) {
        const successMsg = data.message || t('currency.add.success')
        showSuccess(t('currency.add.success'), successMsg)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        const errorMessage = data.error || t('currency.add.failed')
        showError(t('currency.add.failed'), errorMessage)
      }
    } catch (error) {
      console.error('添加货币失败:', error)
      showError(t('currency.add.failed'), t('error.network'))
    }
  }

  const handleRemoveCurrency = async (currencyId: string) => {
    try {
      const response = await fetch(
        ApiEndpoints.user.CURRENCIES_DELETE(currencyId),
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (response.ok) {
        const successMsg = data.message || t('currency.remove.success')
        showSuccess(t('currency.remove.success'), successMsg)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        const errorMessage = data.error || t('currency.remove.failed')
        showError(t('currency.remove.failed'), errorMessage)
      }
    } catch (error) {
      console.error('删除货币失败:', error)
      showError(t('currency.remove.failed'), t('error.network'))
    }
  }

  const _handleBatchUpdate = async (selectedCodes: string[]) => {
    try {
      const response = await fetch(ApiEndpoints.user.CURRENCIES, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCodes: selectedCodes }),
      })

      const data = await response.json()

      if (response.ok) {
        showSuccess(t('currency.update.success'), data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        showError(
          t('currency.update.failed'),
          data.error || t('error.operation.failed')
        )
      }
    } catch (error) {
      console.error('更新货币设置失败:', error)
      showError(t('currency.update.failed'), t('error.network'))
    }
  }

  const handleEditCurrency = (currency: any) => {
    setEditingCurrency(currency.code)
    setCustomCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
    })
    setShowCustomForm(true)
  }

  const handleCreateCustomCurrency = async () => {
    try {
      if (
        !customCurrencyForm.code ||
        !customCurrencyForm.name ||
        !customCurrencyForm.symbol
      ) {
        showError(t('validation.failed'), t('currency.form.incomplete'))
        return
      }

      // 验证小数位数
      if (
        customCurrencyForm.decimalPlaces < 0 ||
        customCurrencyForm.decimalPlaces > 10
      ) {
        showError(t('validation.failed'), t('currency.decimal.places.invalid'))
        return
      }

      const isEditing = !!editingCurrency
      const url = isEditing
        ? ApiEndpoints.currency.CUSTOM_UPDATE(editingCurrency)
        : ApiEndpoints.currency.CUSTOM_CREATE
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customCurrencyForm),
      })

      const data = await response.json()

      if (response.ok) {
        const successMsg =
          data.message ||
          t(
            isEditing
              ? 'currency.custom.update.success'
              : 'currency.custom.create.success'
          )
        showSuccess(
          t(
            isEditing
              ? 'currency.custom.update.success'
              : 'currency.custom.create.success'
          ),
          successMsg
        )
        setShowCustomForm(false)
        setEditingCurrency(null)
        setCustomCurrencyForm({
          code: '',
          name: '',
          symbol: '',
          decimalPlaces: 2,
        })
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        const errorMessage =
          data.error ||
          t(
            isEditing
              ? 'currency.custom.update.failed'
              : 'currency.custom.create.failed'
          )
        showError(
          t(
            isEditing
              ? 'currency.custom.update.failed'
              : 'currency.custom.create.failed'
          ),
          errorMessage
        )
      }
    } catch (error) {
      console.error('创建自定义货币失败:', error)
      showError(
        t(
          editingCurrency
            ? 'currency.custom.update.failed'
            : 'currency.custom.create.failed'
        ),
        t('error.network')
      )
    }
  }

  const handleDeleteCustomCurrency = async (currencyCode: string) => {
    try {
      const response = await fetch(
        ApiEndpoints.currency.CUSTOM_DELETE(currencyCode),
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (response.ok) {
        const successMsg = data.message || t('currency.custom.delete.success')
        showSuccess(t('currency.custom.delete.success'), successMsg)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        const errorMessage = data.error || t('currency.custom.delete.failed')
        showError(t('currency.custom.delete.failed'), errorMessage)
      }
    } catch (error) {
      console.error('删除自定义货币失败:', error)
      showError(t('currency.custom.delete.failed'), t('error.network'))
    }
  }

  if (isLoading) {
    return <CurrencyManagementSkeleton />
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('currency.management')}
        </h3>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {t('currency.management.description')}
        </p>
      </div>

      {/* 已选择的货币 */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          {t('currency.selected')} ({userCurrencies.length})
        </h4>
        {userCurrencies.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {userCurrencies.map(currency => (
              <div
                key={currency.id}
                className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20'
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-lg'>{currency.symbol}</span>
                  <div>
                    <div className='flex items-center space-x-2'>
                      <span className='font-medium text-gray-900 dark:text-gray-100'>
                        {currency.code}
                      </span>
                      {currency.isCustom && (
                        <span className='px-1 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded'>
                          {t('currency.custom')}
                        </span>
                      )}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      {currency.name}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-500'>
                      {t('currency.decimalPlaces')}: {currency.decimalPlaces}
                    </div>
                  </div>
                </div>
                <div className='flex space-x-1'>
                  {currency.isCustom && (
                    <button
                      onClick={() => handleEditCurrency(currency)}
                      className='p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                      title={t('common.edit')}
                    >
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveCurrency(currency.id)}
                    className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                    title={t('currency.remove')}
                  >
                    <svg
                      className='w-4 h-4'
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
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-8 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800'>
            <div className='text-gray-500 dark:text-gray-400'>
              {t('currency.none.selected')}
            </div>
            <div className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
              {t('currency.add.instruction')}
            </div>
          </div>
        )}
      </div>

      {/* 可添加的货币 */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='text-md font-medium text-gray-900 dark:text-gray-100'>
            {t('currency.available')}
          </h4>
          <button
            onClick={() => setShowCustomForm(true)}
            className='flex items-center justify-center px-4 py-2 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors'
            title={t('currency.custom.create')}
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
            {t('currency.custom.create')}
          </button>
        </div>

        {/* 自定义货币表单 */}
        {showCustomForm && (
          <div className='mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800'>
            <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-3'>
              {editingCurrency
                ? t('currency.custom.edit')
                : t('currency.custom.create')}
            </h5>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3'>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t('currency.code')} *
                </label>
                <input
                  type='text'
                  value={customCurrencyForm.code}
                  onChange={e =>
                    setCustomCurrencyForm(prev => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={t('currency.code.placeholder')}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed'
                  maxLength={10}
                  disabled={!!editingCurrency}
                />
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {t('currency.code.help')}
                </p>
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t('currency.name')} *
                </label>
                <input
                  type='text'
                  value={customCurrencyForm.name}
                  onChange={e =>
                    setCustomCurrencyForm(prev => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder={t('currency.name.placeholder')}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t('currency.symbol')} *
                </label>
                <input
                  type='text'
                  value={customCurrencyForm.symbol}
                  onChange={e =>
                    setCustomCurrencyForm(prev => ({
                      ...prev,
                      symbol: e.target.value,
                    }))
                  }
                  placeholder={t('currency.symbol.placeholder')}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  maxLength={5}
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t('currency.decimalPlaces')}
                </label>
                <select
                  value={customCurrencyForm.decimalPlaces}
                  onChange={e =>
                    setCustomCurrencyForm(prev => ({
                      ...prev,
                      decimalPlaces: parseInt(e.target.value),
                    }))
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>
                      {num} {t('currency.decimalPlaces.unit')}
                    </option>
                  ))}
                </select>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {t('currency.decimalPlaces.help')}
                </p>
              </div>
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={handleCreateCustomCurrency}
                className='px-4 py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors inline-flex items-center justify-center'
              >
                {editingCurrency ? t('common.save') : t('common.add')}
              </button>
              <button
                onClick={() => {
                  setShowCustomForm(false)
                  setEditingCurrency(null)
                  setCustomCurrencyForm({
                    code: '',
                    name: '',
                    symbol: '',
                    decimalPlaces: 2,
                  })
                }}
                className='px-4 py-2 h-10 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors inline-flex items-center justify-center'
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {allCurrencies
            .filter(currency => !currency.isSelected)
            .map(currency => (
              <div
                key={currency.id}
                className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-lg'>{currency.symbol}</span>
                  <div>
                    <div className='flex items-center space-x-2'>
                      <span className='font-medium text-gray-900 dark:text-gray-100'>
                        {currency.code}
                      </span>
                      {currency.isCustom && (
                        <span className='px-1 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded'>
                          {t('currency.custom')}
                        </span>
                      )}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      {currency.name}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-500'>
                      {t('currency.decimalPlaces')}: {currency.decimalPlaces}
                    </div>
                  </div>
                </div>
                <div className='flex space-x-1'>
                  <button
                    onClick={() => handleAddCurrency(currency.id)}
                    className='p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                    title={t('currency.add')}
                  >
                    <svg
                      className='w-4 h-4'
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
                  </button>
                  {currency.isCustom && (
                    <>
                      <button
                        onClick={() => handleEditCurrency(currency)}
                        className='p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors'
                        title={t('common.edit')}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCustomCurrency(currency.code)
                        }
                        className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                        title={t('common.delete')}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 说明信息 */}
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4'>
        <h5 className='text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2'>
          {t('currency.important.tips')}
        </h5>
        <ul className='text-sm text-yellow-700 dark:text-yellow-300 space-y-1'>
          <li>• {t('currency.tip.custom.create')}</li>
          <li>• {t('currency.tip.code.format')}</li>
          <li>• {t('currency.tip.decimal.places')}</li>
          <li>• {t('currency.tip.delete.warning')}</li>
          <li>• {t('currency.tip.base.currency')}</li>
          <li>• {t('currency.tip.major.currency')}</li>
        </ul>
      </div>
    </div>
  )
}

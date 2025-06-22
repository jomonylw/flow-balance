'use client'

import { useState, useEffect } from 'react'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import type { SimpleCurrency, ExchangeRateData } from '@/types/core'

interface ExchangeRateFormProps {
  currencies: SimpleCurrency[]
  baseCurrency: SimpleCurrency | null
  editingRate: ExchangeRateData | null
  onRateCreated: (rate: ExchangeRateData) => void
  onClose: () => void
}

export default function ExchangeRateForm({
  currencies: _currencies,
  baseCurrency,
  editingRate,
  onRateCreated,
  onClose,
}: ExchangeRateFormProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    fromCurrency: '',
    toCurrency: baseCurrency?.code || '',
    rate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const { currencies: userCurrencies } = useUserData()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingRate) {
      setFormData({
        fromCurrency: editingRate.fromCurrency,
        toCurrency: editingRate.toCurrency,
        rate: editingRate.rate.toString(),
        effectiveDate: editingRate.effectiveDate.split('T')[0],
        notes: editingRate.notes || '',
      })
    } else {
      setFormData(prev => ({
        ...prev,
        toCurrency: baseCurrency?.code || '',
      }))
    }
  }, [editingRate, baseCurrency])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    if (error) setError('')
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 验证表单数据
      if (
        !formData.fromCurrency ||
        !formData.toCurrency ||
        !formData.rate ||
        !formData.effectiveDate
      ) {
        setError(t('exchange.rate.form.incomplete'))
        return
      }

      const rateValue = parseFloat(formData.rate)
      if (isNaN(rateValue) || rateValue <= 0) {
        setError(t('exchange.rate.invalid.rate'))
        return
      }

      if (formData.fromCurrency === formData.toCurrency) {
        setError(t('exchange.rate.same.currency'))
        return
      }

      const requestData = {
        fromCurrency: formData.fromCurrency,
        toCurrency: formData.toCurrency,
        rate: rateValue,
        effectiveDate: formData.effectiveDate,
        notes: formData.notes || null,
      }

      let response
      if (editingRate && editingRate.id) {
        // 更新现有汇率
        response = await fetch(`/api/exchange-rates/${editingRate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })
      } else {
        // 创建新汇率
        response = await fetch('/api/exchange-rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })
      }

      const data = await response.json()

      if (response.ok) {
        const isEditing = editingRate && editingRate.id
        showSuccess(
          t(
            isEditing
              ? 'exchange.rate.update.success'
              : 'exchange.rate.create.success'
          ),
          t(isEditing ? 'exchange.rate.updated' : 'exchange.rate.created')
        )
        onRateCreated(data.data)
      } else {
        const errorMessage = data.error || t('error.operation.failed')
        setError(errorMessage)
        showError(
          t(
            editingRate && editingRate.id
              ? 'exchange.rate.update.failed'
              : 'exchange.rate.create.failed'
          ),
          errorMessage
        )
      }
    } catch (error) {
      console.error('提交汇率失败:', error)
      const errorMessage = t('error.network')
      setError(errorMessage)
      showError(
        t(
          editingRate && editingRate.id
            ? 'exchange.rate.update.failed'
            : 'exchange.rate.create.failed'
        ),
        errorMessage
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 准备货币选项
  const currencyOptions = userCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name} (${currency.code})`,
  }))

  // 过滤源货币选项（排除目标货币）
  const fromCurrencyOptions = currencyOptions.filter(
    option => option.value !== formData.toCurrency
  )

  // 过滤目标货币选项（排除源货币）
  const toCurrencyOptions = currencyOptions.filter(
    option => option.value !== formData.fromCurrency
  )

  return (
    <div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6'>
      <div className='flex justify-between items-center mb-4'>
        <h4 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {editingRate ? t('exchange.rate.edit') : t('exchange.rate.add')}
        </h4>
        <button
          onClick={onClose}
          className='text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
        >
          <span className='sr-only'>{t('common.close')}</span>
          <svg
            className='h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
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

      {error && (
        <div className='bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <SelectField
            name='fromCurrency'
            label={t('exchange.rate.from.currency')}
            value={formData.fromCurrency}
            onChange={handleSelectChange}
            options={fromCurrencyOptions}
            required
            help={t('exchange.rate.from.currency.help')}
          />

          <SelectField
            name='toCurrency'
            label={t('exchange.rate.to.currency')}
            value={formData.toCurrency}
            onChange={handleSelectChange}
            options={toCurrencyOptions}
            required
            help={t('exchange.rate.to.currency.help')}
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <InputField
            type='number'
            name='rate'
            label={t('exchange.rate.rate')}
            placeholder={t('exchange.rate.rate.placeholder')}
            value={formData.rate}
            onChange={handleInputChange}
            required
            step='0.000001'
            help={t('exchange.rate.rate.help')}
          />

          <InputField
            type='date'
            name='effectiveDate'
            label={t('exchange.rate.effective.date')}
            value={formData.effectiveDate}
            onChange={handleInputChange}
            required
            help={t('exchange.rate.effective.date.help')}
          />
        </div>

        <div>
          <label
            htmlFor='notes'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
          >
            {t('exchange.rate.notes')}
          </label>
          <textarea
            id='notes'
            name='notes'
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500'
            placeholder={t('exchange.rate.notes.placeholder')}
            value={formData.notes}
            onChange={handleInputChange}
          />
        </div>

        <div className='flex justify-end space-x-3 pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
          >
            {t('common.cancel')}
          </button>
          <button
            type='submit'
            disabled={isLoading}
            className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {isLoading
              ? t('common.saving')
              : editingRate
                ? t('exchange.rate.update')
                : t('exchange.rate.add')}
          </button>
        </div>
      </form>
    </div>
  )
}

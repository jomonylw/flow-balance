'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import TextAreaField from '@/components/ui/forms/TextAreaField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import ColorPicker, { COLOR_OPTIONS } from '@/components/ui/forms/ColorPicker'
import { ApiEndpoints } from '@/lib/constants'
import type { AddAccountModalProps } from '@/types/components'
import type { SimpleAccount } from '@/types/core'

export default function AddAccountModal({
  isOpen,
  onClose,
  onSuccess,
  category,
  currencies = [],
}: AddAccountModalProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0].value,
    currencyCode: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0].value,
        currencyCode: '',
      })
      setErrors({})
    }
  }, [isOpen])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required.field')
    } else if (formData.name.length > 50) {
      newErrors.name = t('validation.account.name.max.length')
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = t('validation.account.description.max.length')
    }

    if (!formData.currencyCode) {
      newErrors.currencyCode = t('validation.account.currency.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(ApiEndpoints.account.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          categoryId: category.id,
          description: formData.description.trim() || undefined,
          color: formData.color,
          currencyCode: formData.currencyCode,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 转换为 SimpleAccount 类型
        const selectedCurrency = currencies.find(
          c => c.code === formData.currencyCode
        )
        const simpleAccount: SimpleAccount = {
          id: result.data.id,
          name: result.data.name,
          currencyId: result.data.currencyId,
          categoryId: category.id,
          category: {
            id: category.id,
            name: category.name,
            type: category.type,
          },
          currency: selectedCurrency
            ? {
                id: selectedCurrency.id,
                code: selectedCurrency.code,
                name: selectedCurrency.name,
                symbol: selectedCurrency.symbol,
                decimalPlaces: selectedCurrency.decimalPlaces,
              }
            : {
                id: 'default-usd',
                code: 'USD',
                name: 'US Dollar',
                symbol: '$',
                decimalPlaces: 2,
              },
        }
        onSuccess(simpleAccount)
        onClose()
      } else {
        setErrors({ general: result.error || t('account.create.error') })
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setErrors({ general: t('common.network.error') })
    } finally {
      setIsLoading(false)
    }
  }

  const getAccountTypeInfo = () => {
    switch (category.type) {
      case 'ASSET':
        return {
          label: t('account.type.asset'),
          description: t('account.type.asset.description'),
          color: 'text-blue-700',
        }
      case 'LIABILITY':
        return {
          label: t('account.type.liability'),
          description: t('account.type.liability.description'),
          color: 'text-yellow-700',
        }
      case 'INCOME':
        return {
          label: t('account.type.income'),
          description: t('account.type.income.description'),
          color: 'text-green-700',
        }
      case 'EXPENSE':
        return {
          label: t('account.type.expense'),
          description: t('account.type.expense.description'),
          color: 'text-red-700',
        }
      default:
        return {
          label: t('account.type.unknown'),
          description: t('account.type.unknown.description'),
          color: 'text-gray-700',
        }
    }
  }

  const typeInfo = getAccountTypeInfo()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('account.add.title', { type: typeInfo.label })}
      size='lg'
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        {errors.general && (
          <div
            className={`border border-red-200 text-red-700 px-4 py-3 rounded ${
              resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
            }`}
          >
            <div className='text-sm'>{errors.general}</div>
          </div>
        )}

        {/* 账户类型信息 */}
        <div
          className={`rounded-lg p-4 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
        >
          <h3 className={`font-medium ${typeInfo.color} mb-2`}>
            {category.name} • {typeInfo.label}
          </h3>
          <p
            className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {typeInfo.description}
          </p>
        </div>

        {/* 基本信息 */}
        <div className='space-y-4'>
          <h3
            className={`text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
          >
            {t('account.settings.basic.info')}
          </h3>

          <InputField
            name='name'
            label={t('account.settings.account.name')}
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder={t('account.settings.name.placeholder')}
          />

          <TextAreaField
            name='description'
            label={t('account.settings.account.description')}
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder={t('account.settings.description.placeholder')}
            rows={3}
          />
        </div>

        {/* 显示设置 */}
        <div className='space-y-4'>
          <h3
            className={`text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
          >
            {t('account.settings.display.settings')}
          </h3>

          <ColorPicker
            selectedColor={formData.color}
            onColorChange={color => setFormData(prev => ({ ...prev, color }))}
          />
        </div>

        {/* 货币设置 */}
        {currencies.length > 0 && (
          <div className='space-y-4'>
            <h3
              className={`text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
            >
              {t('account.settings.currency.settings')}
            </h3>

            <SelectField
              name='currencyCode'
              label={t('account.settings.currency')}
              value={formData.currencyCode}
              onChange={handleChange}
              options={currencies.map(currency => ({
                value: currency.code,
                label: `${currency.symbol} ${currency.code} - ${currency.name}`,
                id: currency.id, // 添加唯一标识符
              }))}
              error={errors.currencyCode}
              help={t('account.settings.currency.help')}
              required
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div
          className={`flex justify-end space-x-3 pt-4 border-t ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
        >
          <button
            type='button'
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              resolvedTheme === 'dark'
                ? 'text-gray-300 bg-gray-800 hover:bg-gray-700 border-gray-600'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type='submit'
            label={isLoading ? t('account.creating') : t('account.create')}
            isLoading={isLoading}
            disabled={!formData.name.trim() || isLoading}
            variant='primary'
          />
        </div>
      </form>
    </Modal>
  )
}

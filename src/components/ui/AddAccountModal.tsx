'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import InputField from './InputField'
import SelectField from './SelectField'
import TextAreaField from './TextAreaField'
import AuthButton from './AuthButton'
import { useLanguage } from '@/contexts/LanguageContext'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Category {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (account: any) => void
  category: Category
  currencies?: Currency[]
}

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: '蓝色' },
  { value: '#10B981', label: '绿色' },
  { value: '#F59E0B', label: '橙色' },
  { value: '#EF4444', label: '红色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#06B6D4', label: '青色' },
  { value: '#84CC16', label: '柠檬绿' },
  { value: '#F97316', label: '橘色' },
  { value: '#EC4899', label: '粉色' },
  { value: '#6B7280', label: '灰色' },
  { value: '#14B8A6', label: '蓝绿色' },
  { value: '#F43F5E', label: '玫瑰红' }
]

export default function AddAccountModal({
  isOpen,
  onClose,
  onSuccess,
  category,
  currencies = []
}: AddAccountModalProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0].value,
    currencyCode: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0].value,
        currencyCode: ''
      })
      setErrors({})
    }
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      newErrors.name = '账户名称不能超过50个字符'
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = '账户描述不能超过200个字符'
    }

    if (!formData.currencyCode) {
      newErrors.currencyCode = '请选择账户货币'
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
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          categoryId: category.id,
          description: formData.description.trim() || undefined,
          color: formData.color,
          currencyCode: formData.currencyCode
        }),
      })

      const result = await response.json()

      if (response.ok) {
        onSuccess(result.data)
        onClose()
      } else {
        setErrors({ general: result.error || '创建账户失败' })
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setErrors({ general: '网络错误，请稍后重试' })
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
          color: 'text-blue-700'
        }
      case 'LIABILITY':
        return {
          label: t('account.type.liability'),
          description: t('account.type.liability.description'),
          color: 'text-yellow-700'
        }
      case 'INCOME':
        return {
          label: t('account.type.income'),
          description: t('account.type.income.description'),
          color: 'text-green-700'
        }
      case 'EXPENSE':
        return {
          label: t('account.type.expense'),
          description: t('account.type.expense.description'),
          color: 'text-red-700'
        }
      default:
        return {
          label: t('account.type.unknown'),
          description: t('account.type.unknown.description'),
          color: 'text-gray-700'
        }
    }
  }

  const typeInfo = getAccountTypeInfo()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`添加${typeInfo.label}账户`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{errors.general}</div>
          </div>
        )}

        {/* 账户类型信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium ${typeInfo.color} mb-2`}>
            {category.name} • {typeInfo.label}
          </h3>
          <p className="text-sm text-gray-600">
            {typeInfo.description}
          </p>
        </div>

        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{t('account.settings.basic.info')}</h3>

          <InputField
            name="name"
            label={t('account.settings.account.name')}
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder={t('account.settings.name.placeholder')}
          />

          <TextAreaField
            name="description"
            label={t('account.settings.account.description')}
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder={t('account.settings.description.placeholder')}
            rows={3}
          />
        </div>

        {/* 显示设置 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{t('account.settings.display.settings')}</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('account.settings.account.color')}
            </label>
            <p className="text-sm text-gray-500 mb-4">
              {t('account.settings.color.help')}
            </p>
            
            <div className="grid grid-cols-6 gap-3">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  className={`
                    relative w-12 h-12 rounded-lg border-2 transition-all
                    ${formData.color === color.value 
                      ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {formData.color === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 货币设置 */}
        {currencies.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{t('account.settings.currency.settings')}</h3>

            <SelectField
              name="currencyCode"
              label={t('account.settings.currency')}
              value={formData.currencyCode}
              onChange={handleChange}
              options={currencies.map(currency => ({
                value: currency.code,
                label: `${currency.symbol} ${currency.code} - ${currency.name}`
              }))}
              error={errors.currencyCode}
              help={t('account.settings.currency.help')}
              required
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type="submit"
            label={isLoading ? '创建中...' : '创建账户'}
            isLoading={isLoading}
            disabled={!formData.name.trim() || isLoading}
            variant="primary"
          />
        </div>
      </form>
    </Modal>
  )
}

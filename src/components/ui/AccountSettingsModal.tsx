'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import InputField from './InputField'
import TextAreaField from './TextAreaField'
import AuthButton from './AuthButton'
import { useLanguage } from '@/contexts/LanguageContext'

interface Account {
  id: string
  name: string
  description?: string
  color?: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<Account>) => Promise<void>
  account: Account
}

// 预定义的颜色选项
const COLOR_OPTIONS = [
  { value: '#3b82f6', label: '蓝色', bg: 'bg-blue-500' },
  { value: '#10b981', label: '绿色', bg: 'bg-emerald-500' },
  { value: '#f59e0b', label: '橙色', bg: 'bg-amber-500' },
  { value: '#ef4444', label: '红色', bg: 'bg-red-500' },
  { value: '#8b5cf6', label: '紫色', bg: 'bg-violet-500' },
  { value: '#06b6d4', label: '青色', bg: 'bg-cyan-500' },
  { value: '#84cc16', label: '柠檬绿', bg: 'bg-lime-500' },
  { value: '#f97316', label: '橘色', bg: 'bg-orange-500' },
  { value: '#ec4899', label: '粉色', bg: 'bg-pink-500' },
  { value: '#6b7280', label: '灰色', bg: 'bg-gray-500' },
  { value: '#14b8a6', label: '青绿色', bg: 'bg-teal-500' },
  { value: '#a855f7', label: '深紫色', bg: 'bg-purple-500' }
]

export default function AccountSettingsModal({
  isOpen,
  onClose,
  onSave,
  account
}: AccountSettingsModalProps) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && account) {
      setName(account.name)
      setDescription(account.description || '')
      setSelectedColor(account.color || COLOR_OPTIONS[0].value)
    }
  }, [isOpen, account])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const updates: Partial<Account> = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor
      }

      await onSave(updates)
      onClose()
    } catch (error) {
      console.error('Error saving account settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAccountTypeInfo = () => {
    const accountType = account.category.type
    switch (accountType) {
      case 'ASSET':
        return {
          label: t('account.type.asset'),
          description: t('account.type.asset.description'),
          color: 'text-green-700',
          features: [t('account.feature.balance.update'), t('account.feature.asset.stats'), t('account.feature.net.worth')]
        }
      case 'LIABILITY':
        return {
          label: t('account.type.liability'),
          description: t('account.type.liability.description'),
          color: 'text-red-700',
          features: [t('account.feature.balance.update'), t('account.feature.liability.stats'), t('account.feature.net.worth')]
        }
      case 'INCOME':
        return {
          label: t('account.type.income'),
          description: t('account.type.income.description'),
          color: 'text-blue-700',
          features: [t('account.feature.transaction.record'), t('account.feature.income.stats'), t('account.feature.cash.flow')]
        }
      case 'EXPENSE':
        return {
          label: t('account.type.expense'),
          description: t('account.type.expense.description'),
          color: 'text-orange-700',
          features: [t('account.feature.expense.stats'), t('account.feature.income.stats'), t('account.feature.cash.flow')]
        }
      default:
        return {
          label: t('account.type.unknown'),
          description: t('account.type.unknown.description'),
          color: 'text-gray-700',
          features: []
        }
    }
  }

  const typeInfo = getAccountTypeInfo()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('account.settings')} size="lg">
      <div className="space-y-6">
        {/* 账户类型信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium ${typeInfo.color} mb-2`}>
            {typeInfo.label}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {typeInfo.description}
          </p>
          {typeInfo.features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {typeInfo.features.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{t('account.settings.basic.info')}</h3>

          <InputField
            name="name"
            label={t('account.settings.account.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t('account.settings.name.placeholder')}
          />

          <TextAreaField
            name="description"
            label={t('account.settings.account.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('account.settings.description.placeholder')}
            rows={3}
          />
        </div>

        {/* 颜色设置 */}
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
                  onClick={() => setSelectedColor(color.value)}
                  className={`
                    relative w-12 h-12 rounded-lg border-2 transition-all
                    ${selectedColor === color.value 
                      ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {selectedColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-3 flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: selectedColor }}
              />
              <span className="text-sm text-gray-600">
                {t('account.color.preview', { color: COLOR_OPTIONS.find(c => c.value === selectedColor)?.label || '' })}
              </span>
            </div>
          </div>
        </div>

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
            label={isLoading ? t('account.settings.saving') : t('account.settings.save')}
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!name.trim()}
            variant="primary"
          />
        </div>
      </div>
    </Modal>
  )
}

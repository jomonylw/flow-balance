'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface TopCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; type: string }) => Promise<void>
}

export default function TopCategoryModal({
  isOpen,
  onClose,
  onSave,
}: TopCategoryModalProps) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({})

  // 账户类型选项
  const ACCOUNT_TYPE_OPTIONS = [
    { value: '', label: t('category.type.select.placeholder') },
    { value: 'ASSET', label: t('category.type.asset.description') },
    { value: 'LIABILITY', label: t('category.type.liability.description') },
    { value: 'INCOME', label: t('category.type.income.description') },
    { value: 'EXPENSE', label: t('category.type.expense.description') },
  ]

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType('')
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: { name?: string; type?: string } = {}

    if (!name.trim()) {
      newErrors.name = t('category.name.required')
    } else if (name.length > 50) {
      newErrors.name = t('category.name.too.long')
    }

    if (!type) {
      newErrors.type = t('category.type.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await onSave({
        name: name.trim(),
        type,
      })
      onClose()
    } catch (error) {
      console.error('Error saving top category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeDescription = (selectedType: string) => {
    switch (selectedType) {
      case 'ASSET':
        return {
          title: t('category.type.asset.title'),
          description: t('category.type.asset.detail'),
          color: 'text-green-700 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-700',
          features: [
            t('category.type.asset.feature.balance'),
            t('category.type.asset.feature.statistics'),
            t('category.type.asset.feature.networth'),
            t('category.type.asset.feature.tracking'),
          ],
        }
      case 'LIABILITY':
        return {
          title: t('category.type.liability.title'),
          description: t('category.type.liability.detail'),
          color: 'text-red-700 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-700',
          features: [
            t('category.type.liability.feature.management'),
            t('category.type.liability.feature.statistics'),
            t('category.type.liability.feature.networth'),
            t('category.type.liability.feature.repayment'),
          ],
        }
      case 'INCOME':
        return {
          title: t('category.type.income.title'),
          description: t('category.type.income.detail'),
          color: 'text-blue-700 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700',
          features: [
            t('category.type.income.feature.record'),
            t('category.type.income.feature.cashflow'),
            t('category.type.income.feature.trend'),
            t('category.type.income.feature.budget'),
          ],
        }
      case 'EXPENSE':
        return {
          title: t('category.type.expense.title'),
          description: t('category.type.expense.detail'),
          color: 'text-orange-700 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-700',
          features: [
            t('category.type.expense.feature.record'),
            t('category.type.expense.feature.cashflow'),
            t('category.type.expense.feature.trend'),
            t('category.type.expense.feature.control'),
          ],
        }
      default:
        return null
    }
  }

  const typeInfo = getTypeDescription(type)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('category.top.add')}
      size='lg'
    >
      <div className='space-y-6'>
        {/* 说明文字 */}
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
          <h3 className='text-sm font-medium text-blue-900 dark:text-blue-300 mb-2'>
            💡 {t('category.top.what.title')}
          </h3>
          <p className='text-sm text-blue-700 dark:text-blue-400'>
            {t('category.top.what.description')}
          </p>
        </div>

        {/* 基本信息 */}
        <div className='space-y-4'>
          <InputField
            name='name'
            label={t('category.name')}
            value={name}
            onChange={e => {
              setName(e.target.value)
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: undefined }))
              }
            }}
            error={errors.name}
            placeholder={t('category.name.placeholder')}
            required
          />

          <SelectField
            name='type'
            label={t('category.type')}
            value={type}
            onChange={e => {
              setType(e.target.value)
              if (errors.type) {
                setErrors(prev => ({ ...prev, type: undefined }))
              }
            }}
            options={ACCOUNT_TYPE_OPTIONS}
            error={errors.type}
            required
          />
        </div>

        {/* 类型说明 */}
        {typeInfo && (
          <div
            className={`${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-4`}
          >
            <h3 className={`font-medium ${typeInfo.color} mb-2`}>
              {typeInfo.title}
            </h3>
            <p className={`text-sm ${typeInfo.color} mb-3`}>
              {typeInfo.description}
            </p>
            <div className='flex flex-wrap gap-2'>
              {typeInfo.features.map((feature, index) => (
                <span
                  key={index}
                  className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 示例 */}
        {type && (
          <div className='bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
              📝 {t('category.examples.title')}
            </h4>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              {type === 'ASSET' && (
                <ul className='list-disc list-inside space-y-1'>
                  <li>{t('category.examples.asset.cash')}</li>
                  <li>{t('category.examples.asset.investment')}</li>
                  <li>{t('category.examples.asset.fixed')}</li>
                </ul>
              )}
              {type === 'LIABILITY' && (
                <ul className='list-disc list-inside space-y-1'>
                  <li>{t('category.examples.liability.credit')}</li>
                  <li>{t('category.examples.liability.loan')}</li>
                  <li>{t('category.examples.liability.other')}</li>
                </ul>
              )}
              {type === 'INCOME' && (
                <ul className='list-disc list-inside space-y-1'>
                  <li>{t('category.examples.income.work')}</li>
                  <li>{t('category.examples.income.investment')}</li>
                  <li>{t('category.examples.income.other')}</li>
                </ul>
              )}
              {type === 'EXPENSE' && (
                <ul className='list-disc list-inside space-y-1'>
                  <li>{t('category.examples.expense.living')}</li>
                  <li>{t('category.examples.expense.fixed')}</li>
                  <li>{t('category.examples.expense.other')}</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400'
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            label={isLoading ? t('category.creating') : t('category.create')}
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!name.trim() || !type}
            variant='primary'
          />
        </div>
      </div>
    </Modal>
  )
}

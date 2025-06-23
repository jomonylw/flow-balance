'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import TextAreaField from '@/components/ui/forms/TextAreaField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import ColorPicker, { COLOR_OPTIONS } from '@/components/ui/forms/ColorPicker'
import type { AccountSettingsModalProps } from '@/types/components'
import type { SimpleAccount } from '@/types/core'

export default function AccountSettingsModal({
  isOpen,
  onClose,
  onSave,
  account,
  currencies = [],
}: AccountSettingsModalProps) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && account) {
      setName(account.name)
      setDescription(account.description || '')
      setSelectedColor(account.color || COLOR_OPTIONS[0].value)
      setSelectedCurrency(account.currency?.code || '')
    }
  }, [isOpen, account])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const updates: Partial<SimpleAccount> = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        currencyId: selectedCurrency || undefined,
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
          features: [
            t('account.feature.balance.update'),
            t('account.feature.asset.stats'),
            t('account.feature.net.worth'),
          ],
        }
      case 'LIABILITY':
        return {
          label: t('account.type.liability'),
          description: t('account.type.liability.description'),
          color: 'text-red-700',
          features: [
            t('account.feature.balance.update'),
            t('account.feature.liability.stats'),
            t('account.feature.net.worth'),
          ],
        }
      case 'INCOME':
        return {
          label: t('account.type.income'),
          description: t('account.type.income.description'),
          color: 'text-blue-700',
          features: [
            t('account.feature.transaction.record'),
            t('account.feature.income.stats'),
            t('account.feature.cash.flow'),
          ],
        }
      case 'EXPENSE':
        return {
          label: t('account.type.expense'),
          description: t('account.type.expense.description'),
          color: 'text-orange-700',
          features: [
            t('account.feature.expense.stats'),
            t('account.feature.income.stats'),
            t('account.feature.cash.flow'),
          ],
        }
      default:
        return {
          label: t('account.type.unknown'),
          description: t('account.type.unknown.description'),
          color: 'text-gray-700',
          features: [],
        }
    }
  }

  const typeInfo = getAccountTypeInfo()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('account.settings')}
      size='lg'
    >
      <div className='space-y-6'>
        {/* 账户类型信息 */}
        <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4'>
          <h3 className={`font-medium ${typeInfo.color} mb-2`}>
            {typeInfo.label}
          </h3>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
            {typeInfo.description}
          </p>
          {typeInfo.features.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {typeInfo.features.map((feature, index) => (
                <span
                  key={index}
                  className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('account.settings.basic.info')}
          </h3>

          <InputField
            name='name'
            label={t('account.settings.account.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder={t('account.settings.name.placeholder')}
          />

          <TextAreaField
            name='description'
            label={t('account.settings.account.description')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('account.settings.description.placeholder')}
            rows={3}
          />
        </div>

        {/* 颜色设置 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('account.settings.display.settings')}
          </h3>

          <ColorPicker
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
          />
        </div>

        {/* 货币设置 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('account.settings.currency.settings')}
          </h3>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('account.settings.currency')}
            </label>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>
              {t('account.settings.currency.help')}
            </p>

            <div className='mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-blue-400 dark:text-blue-300'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <p className='text-sm text-blue-800 dark:text-blue-300'>
                    {t('account.settings.currency.info')}
                  </p>
                </div>
              </div>
            </div>

            <select
              value={selectedCurrency}
              onChange={e => setSelectedCurrency(e.target.value)}
              className='mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700'
              required
            >
              {!selectedCurrency && (
                <option value='' disabled>
                  {t('account.settings.currency.select')}
                </option>
              )}
              {currencies.map(currency => (
                <option key={currency.id} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </option>
              ))}
            </select>

            {selectedCurrency && (
              <div className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                <span className='font-medium'>
                  {t('account.settings.currency.selected')}:
                </span>{' '}
                {currencies.find(c => c.code === selectedCurrency)?.symbol}{' '}
                {selectedCurrency}
              </div>
            )}
          </div>
        </div>

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
            label={
              isLoading
                ? t('account.settings.saving')
                : t('account.settings.save')
            }
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!name.trim() || !selectedCurrency}
            variant='primary'
          />
        </div>
      </div>
    </Modal>
  )
}

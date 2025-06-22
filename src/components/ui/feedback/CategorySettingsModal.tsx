'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { ConstantsManager } from '@/lib/utils/constants-manager'
import type { CategorySettingsModalProps } from '@/types/components'
import type { SimpleCategory } from '@/types/core'

interface TypeChangeCheck {
  canChangeType: boolean
  hasAccounts: boolean
  hasTransactions: boolean
  accountCount: number
  transactionCount: number
  accounts: Array<{
    id: string
    name: string
    currencyCode: string
    category: { name: string }
  }>
  transactionStats: Record<string, number>
  riskLevel: 'safe' | 'warning' | 'danger'
}

export default function CategorySettingsModal({
  isOpen,
  category,
  onClose,
  onSave,
}: CategorySettingsModalProps) {
  const { t } = useLanguage()
  const { showError } = useToast()
  const [name, setName] = useState(category.name)
  const [selectedType, setSelectedType] = useState<string>(category.type || '')
  const [_description, _setDescription] = useState('')
  const [order, setOrder] = useState(category.order || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [typeChangeCheck, setTypeChangeCheck] =
    useState<TypeChangeCheck | null>(null)
  const [isCheckingType, setIsCheckingType] = useState(false)

  // 使用UserDataContext获取分类数据，避免API调用
  const { categories } = useUserData()

  // 使用统一的账户类型配置
  const accountTypeConfigs = ConstantsManager.getAccountTypeConfigs().map(config => ({
    value: config.value,
    label: t(config.labelKey),
    description: t(config.descriptionKey),
    color: config.colorClass,
  }))

  // 是否为顶级分类
  const isTopLevel = !category.parentId

  // 从Context中获取父分类信息
  const parentCategory = category.parentId
    ? categories.find(cat => cat.id === category.parentId) || null
    : null

  useEffect(() => {
    if (isOpen) {
      setName(category.name)
      setSelectedType(category.type || '')
      setOrder(category.order || 0)
      setTypeChangeCheck(null)
    }
  }, [isOpen, category])

  // 检查类型变更的安全性
  const checkTypeChange = async () => {
    if (!isTopLevel || !category.type) return

    setIsCheckingType(true)
    try {
      const response = await fetch(
        `/api/categories/${category.id}/check-type-change`
      )
      if (response.ok) {
        const result = await response.json()
        setTypeChangeCheck(result.data)
      } else {
        console.error('Failed to check type change safety')
      }
    } catch (error) {
      console.error('Error checking type change:', error)
    } finally {
      setIsCheckingType(false)
    }
  }

  // 当用户尝试更改类型时进行检查
  const handleTypeChange = async (newType: string) => {
    if (isTopLevel && category.type && newType !== category.type) {
      await checkTypeChange()
    }
    setSelectedType(newType)
  }

  const handleSave = async () => {
    // 验证名称
    if (!name.trim()) {
      showError(t('category.validation.name.required'))
      return
    }

    setIsLoading(true)
    try {
      const updates: Partial<SimpleCategory> = {
        name: name.trim(),
        order,
      }

      // 只有顶级分类可以设置账户类型
      if (isTopLevel && selectedType) {
        // 检查类型变更的安全性
        if (category.type && selectedType !== category.type) {
          if (!typeChangeCheck) {
            // 如果还没有检查过，先进行检查
            await checkTypeChange()
            return // 等待用户确认
          }

          if (!typeChangeCheck.canChangeType) {
            // 如果不能安全变更，显示错误提示并阻止保存
            showError(
              t('category.type.change.error'),
              t('category.type.change.error')
            )
            return
          }
        }

        // 验证并设置账户类型
        const validatedType = ConstantsManager.validateAccountType(selectedType)
        if (validatedType) {
          updates.type = validatedType
        }
      }

      await onSave(updates)
      // 成功消息由父组件处理
      onClose()
    } catch (error) {
      console.error('Error saving category settings:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('category.settings.save.failed')
      showError(t('category.settings.save.failed'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getInheritedType = () => {
    if (isTopLevel) return null
    return parentCategory?.type || null
  }

  const getTypeInfo = (type: string) => {
    return accountTypeConfigs.find(t => t.value === type)
  }

  const inheritedType = getInheritedType()
  const inheritedTypeInfo = inheritedType ? getTypeInfo(inheritedType) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('category.settings')}>
      <div className='space-y-6'>
        {/* 基本信息 */}
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
            {t('category.settings.basic.info')}
          </h3>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='categoryName'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t('category.name')}
              </label>
              <input
                type='text'
                id='categoryName'
                value={name}
                onChange={e => setName(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                placeholder={t('category.name.placeholder')}
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                {t('category.settings.level')}
              </label>
              <div className='text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md'>
                {isTopLevel
                  ? t('category.settings.top.level')
                  : t('category.subcategory')}
              </div>
            </div>

            <div>
              <label
                htmlFor='order'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                {t('category.settings.sort.order')}
              </label>
              <input
                type='number'
                id='order'
                value={order}
                onChange={e => setOrder(parseInt(e.target.value) || 0)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                placeholder={t('category.settings.sort.placeholder')}
              />
            </div>
          </div>
        </div>

        {/* 账户类型设置 */}
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
            {t('category.type')}
          </h3>

          {isTopLevel ? (
            <div className='space-y-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t('category.settings.top.level.description')}
              </p>

              <div className='space-y-3'>
                {accountTypeConfigs.map(type => (
                  <label
                    key={type.value}
                    className='flex items-start space-x-3 cursor-pointer'
                  >
                    <input
                      type='radio'
                      name='accountType'
                      value={type.value}
                      checked={selectedType === type.value}
                      onChange={e => handleTypeChange(e.target.value)}
                      className='mt-1 h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    />
                    <div className='flex-1'>
                      <div className={`font-medium ${type.color}`}>
                        {type.label}
                      </div>
                      <div className='text-sm text-gray-500 dark:text-gray-400'>
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* 类型变更安全检查结果 */}
              {isCheckingType && (
                <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <LoadingSpinner size='sm' color='primary' />
                    <span className='text-sm text-blue-800 dark:text-blue-400'>
                      {t('category.type.change.checking')}
                    </span>
                  </div>
                </div>
              )}

              {typeChangeCheck &&
                category.type &&
                selectedType !== category.type && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      typeChangeCheck.riskLevel === 'safe'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : typeChangeCheck.riskLevel === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div
                      className={`font-medium mb-2 ${
                        typeChangeCheck.riskLevel === 'safe'
                          ? 'text-green-800 dark:text-green-300'
                          : typeChangeCheck.riskLevel === 'warning'
                            ? 'text-yellow-800 dark:text-yellow-300'
                            : 'text-red-800 dark:text-red-300'
                      }`}
                    >
                      {typeChangeCheck.riskLevel === 'safe' &&
                        `✅ ${t('category.type.change.safe')}`}
                      {typeChangeCheck.riskLevel === 'warning' &&
                        `⚠️ ${t('category.type.change.warning')}`}
                      {typeChangeCheck.riskLevel === 'danger' &&
                        `🚫 ${t('category.type.change.danger')}`}
                    </div>

                    <div
                      className={`text-sm space-y-2 ${
                        typeChangeCheck.riskLevel === 'safe'
                          ? 'text-green-700 dark:text-green-400'
                          : typeChangeCheck.riskLevel === 'warning'
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {typeChangeCheck.hasAccounts && (
                        <p>
                          •{' '}
                          {t('category.type.change.accounts.count', {
                            count: typeChangeCheck.accountCount,
                          })}
                        </p>
                      )}
                      {typeChangeCheck.hasTransactions && (
                        <p>
                          •{' '}
                          {t('category.type.change.transactions.count', {
                            count: typeChangeCheck.transactionCount,
                          })}
                        </p>
                      )}
                      {typeChangeCheck.transactionStats.BALANCE > 0 && (
                        <p>
                          •{' '}
                          {t('category.type.change.balance.records.count', {
                            count: typeChangeCheck.transactionStats.BALANCE,
                          })}
                        </p>
                      )}

                      {!typeChangeCheck.canChangeType && (
                        <p className='font-medium mt-2'>
                          {t('category.type.change.risk.description')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {selectedType && (
                <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                  <h4 className='font-medium text-blue-900 dark:text-blue-300 mb-2'>
                    {t('category.settings.statistics.method')}
                  </h4>
                  <div className='text-sm text-blue-800 dark:text-blue-400'>
                    {ConstantsManager.isStockAccount(selectedType) ? (
                      <div>
                        <p>
                          <strong>
                            {t('category.settings.stock.statistics')}：
                          </strong>
                        </p>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li>{t('category.settings.stock.balance.point')}</li>
                          <li>{t('category.settings.stock.net.worth')}</li>
                          <li>{t('category.settings.stock.balance.sheet')}</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p>
                          <strong>
                            {t('category.settings.flow.statistics')}：
                          </strong>
                        </p>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li>{t('category.settings.flow.period.amount')}</li>
                          <li>{t('category.settings.flow.trend.analysis')}</li>
                          <li>
                            {t('category.settings.flow.cash.flow.statement')}
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t('category.settings.subcategory.description')}
              </p>

              {inheritedTypeInfo ? (
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      {t('category.settings.inherited.type')}：
                    </span>
                    <span className={`font-medium ${inheritedTypeInfo.color}`}>
                      {inheritedTypeInfo.label}
                    </span>
                  </div>
                  <div className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    {inheritedTypeInfo.description}
                  </div>
                </div>
              ) : (
                <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg'>
                  <div className='text-sm text-yellow-800 dark:text-yellow-400'>
                    ⚠️ {t('category.settings.parent.type.warning')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400'
          >
            {t('common.cancel')}
          </button>
          <button
            type='button'
            onClick={handleSave}
            disabled={isLoading}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading
              ? t('category.settings.saving')
              : t('category.settings.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

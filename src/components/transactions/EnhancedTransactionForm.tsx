'use client'

import { useState, useEffect } from 'react'
import { validateTransactionForm } from '@/lib/data-validation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

interface Account {
  id: string
  name: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface Category {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
}

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface EnhancedTransactionFormProps {
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  defaultValues?: any
  isLoading?: boolean
}

export default function EnhancedTransactionForm({
  accounts,
  categories,
  currencies,
  tags,
  onSubmit,
  onCancel,
  defaultValues,
  isLoading = false
}: EnhancedTransactionFormProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    currencyCode: 'USD',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    tagIds: [] as string[]
  })

  const [validation, setValidation] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // 初始化表单数据
  useEffect(() => {
    if (defaultValues) {
      setFormData({ ...formData, ...defaultValues })
    }
  }, [defaultValues])

  // 实时验证
  useEffect(() => {
    const validationResult = validateTransactionForm(formData)
    setValidation(validationResult)
  }, [formData])

  // 账户选择变化时的处理
  useEffect(() => {
    if (formData.accountId) {
      const account = accounts.find(a => a.id === formData.accountId)
      setSelectedAccount(account || null)
      
      // 根据账户类型智能推荐交易类型
      if (account?.category.type) {
        if (account.category.type === 'INCOME' && formData.type !== 'INCOME') {
          setFormData(prev => ({ ...prev, type: 'INCOME' }))
        } else if (account.category.type === 'EXPENSE' && formData.type !== 'EXPENSE') {
          setFormData(prev => ({ ...prev, type: 'EXPENSE' }))
        }
      }
    }
  }, [formData.accountId, accounts])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation?.isValid) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Transaction submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 过滤相关分类
  const relevantCategories = categories.filter(category => {
    if (!selectedAccount?.category.type) return true
    
    // 存量类账户可以选择任何分类
    if (selectedAccount.category.type === 'ASSET' || selectedAccount.category.type === 'LIABILITY') {
      return true
    }
    
    // 流量类账户只能选择对应类型的分类
    return category.type === selectedAccount.category.type
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {defaultValues ? t('transaction.edit') : t('transaction.create')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('transaction.form.description')}
        </p>
      </div>

      {/* 数据质量提示 */}
      {validation && (
        <div className="mb-6">
          {validation.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{t('form.validation.errors.title')}</h3>
                  <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                    {validation.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('form.validation.warnings.title')}</h3>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {validation.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validation.score < 80 && validation.suggestions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('form.validation.suggestions.title')}</h3>
                  <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
                    {validation.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 账户和分类选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.account')} <span className="text-red-500">*</span>
            </label>
            <select
              name="accountId"
              value={formData.accountId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">{t('form.select.account')}</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.category.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.category')} <span className="text-red-500">*</span>
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">{t('form.select.category')}</option>
              {relevantCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.type && `(${category.type})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 交易类型和金额 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.type')} <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="INCOME">{t('type.income')}</option>
              <option value="EXPENSE">{t('type.expense')}</option>
              <option value="TRANSFER">{t('type.transfer')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.amount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('currency.currency')} <span className="text-red-500">*</span>
            </label>
            <select
              name="currencyCode"
              value={formData.currencyCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 描述和日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.description')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t('transaction.description.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('transaction.notes')}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            placeholder={t('transaction.notes.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!validation?.isValid || isSubmitting || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.submitting')}
              </div>
            ) : (
              defaultValues ? t('transaction.update') : t('transaction.create')
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import TagFormModal from '@/components/ui/TagFormModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { useTheme } from '@/contexts/ThemeContext'
import { publishTransactionCreate, publishTransactionUpdate } from '@/utils/DataUpdateManager'

interface Account {
  id: string
  name: string
  currencyCode?: string
  currency?: {
    code: string
    name: string
    symbol: string
  }
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
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

interface Transaction {
  id: string
  accountId: string
  amount: number
  description: string
  notes?: string
  date: string
  tagIds?: string[]
}

interface SimpleFlowTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction?: Transaction
  account: Account // 预选的账户
  currencies: Currency[]
  tags: Tag[]
}

export default function SimpleFlowTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  account,
  currencies,
  tags
}: SimpleFlowTransactionModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { tags: userTags } = useUserData()
  const { resolvedTheme } = useTheme()

  // 简化的表单数据 - 保留必要字段包括标签
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tagIds: [] as string[]
  })

  // 获取最新的标签颜色信息
  const getUpdatedTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>(tags)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 获取账户的货币信息
  const accountCurrency = account.currencyCode || currencies[0]?.code || 'USD'
  const currencyInfo = currencies.find(c => c.code === accountCurrency) || currencies[0]

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        // 编辑模式
        setFormData({
          amount: transaction.amount.toString(),
          description: transaction.description,
          notes: transaction.notes || '',
          date: new Date(transaction.date).toISOString().split('T')[0],
          tagIds: transaction.tagIds || []
        })
      } else {
        // 新增模式
        setFormData({
          amount: '',
          description: '',
          notes: '',
          date: new Date().toISOString().split('T')[0],
          tagIds: []
        })
      }
      setErrors({})
    }
  }, [isOpen, transaction])

  // 更新可用标签列表
  useEffect(() => {
    setAvailableTags(tags)
  }, [tags])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }

  const handleTagFormSuccess = (newTag: Tag) => {
    setAvailableTags(prev => [...prev, newTag])
    setFormData(prev => ({
      ...prev,
      tagIds: [...prev.tagIds, newTag.id]
    }))
    setShowTagFormModal(false)
    showSuccess(t('success.created'), t('tag.created.and.added'))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount) {
      newErrors.amount = t('transaction.modal.enter.amount')
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('transaction.modal.amount.positive')
    }

    if (!formData.description.trim()) {
      newErrors.description = t('transaction.modal.enter.description')
    }

    if (!formData.date) {
      newErrors.date = t('transaction.modal.select.date')
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
      // 构建提交数据 - 自动填充简化的字段
      const submitData = {
        accountId: account.id,
        categoryId: account.category.id, // 自动使用账户的分类
        currencyCode: accountCurrency, // 自动使用账户的货币
        type: account.category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE', // 根据账户类型自动确定
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        date: formData.date,
        tagIds: formData.tagIds // 保留标签选择
      }

      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : '/api/transactions'
      const method = transaction ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (result.success) {
        const successMessage = transaction
          ? t('transaction.modal.update.success')
          : t('transaction.modal.create.success')
        showSuccess(successMessage, `${formData.amount} ${currencyInfo?.symbol || accountCurrency}`)

        // 发布交易更新事件
        if (transaction) {
          await publishTransactionUpdate(account.id, account.category.id, {
            transaction: result.transaction,
            amount: parseFloat(formData.amount),
            currencyCode: accountCurrency
          })
        } else {
          await publishTransactionCreate(account.id, account.category.id, {
            transaction: result.transaction,
            amount: parseFloat(formData.amount),
            currencyCode: accountCurrency
          })
        }

        onSuccess()
        onClose()
      } else {
        const errorMessage = result.error || (transaction ? t('transaction.update.failed') : t('transaction.create.failed'))
        setErrors({ general: errorMessage })
        showError(transaction ? t('transaction.update.failed') : t('transaction.create.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      const errorMessage = error instanceof Error ? error.message : t('error.network')
      setErrors({ general: errorMessage })
      showError(transaction ? t('transaction.update.failed') : t('transaction.create.failed'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取账户类型的显示信息
  const getAccountTypeInfo = () => {
    const accountType = account.category?.type
    const isIncome = accountType === 'INCOME'
    return {
      icon: isIncome ? '💰' : '💸',
      label: isIncome ? t('common.income') : t('common.expense'),
      color: isIncome ? 'text-green-600' : 'text-red-600'
    }
  }

  const accountTypeInfo = getAccountTypeInfo()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${transaction ? t('common.edit') : t('common.add')}${accountTypeInfo.label}${t('transaction.title')} - ${account.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className={`border border-red-200 text-red-700 px-4 py-3 rounded ${
            resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
          }`}>
            {errors.general}
          </div>
        )}

        {/* 账户信息显示 */}
        <div className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{accountTypeInfo.icon}</span>
                <span className={`font-medium ${accountTypeInfo.color}`}>
                  {accountTypeInfo.label}{t('account.title')}
                </span>
              </div>
              <p className={`text-sm mt-1 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {account.name} ({account.category.name})
              </p>
            </div>
            <div className="text-right">
              <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('common.currency')}</div>
              <div className={`font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                {currencyInfo?.symbol} {currencyInfo?.name}
              </div>
            </div>
          </div>
        </div>

        {/* 金额和日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="amount"
            label={`${accountTypeInfo.label}${t('transaction.amount')}`}
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            error={errors.amount}
            step="0.01"
            required
          />

          <InputField
            type="date"
            name="date"
            label={t('transaction.date')}
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />
        </div>

        {/* 描述 */}
        <InputField
          name="description"
          label={t('transaction.description')}
          value={formData.description}
          onChange={handleChange}
          placeholder={t('transaction.description.placeholder', { type: accountTypeInfo.label })}
          error={errors.description}
          required
        />

        {/* 标签选择 */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('tag.label.optional')}
          </label>
          <div className="space-y-3">
            {/* 已选标签显示 */}
            {formData.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tagIds.map(tagId => {
                  const tag = availableTags.find(t => t.id === tagId)
                  if (!tag) return null

                  // 从 UserDataContext 获取标签颜色信息
                  const currentColor = getUpdatedTagColor(tag.id)

                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={currentColor ? {
                        backgroundColor: currentColor + '20',
                        color: currentColor,
                        border: `1px solid ${currentColor}40`
                      } : {
                        backgroundColor: '#E5E7EB',
                        color: '#374151',
                        border: '1px solid #D1D5DB'
                      }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleTagToggle(tagId)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none"
                      >
                        <svg className="w-2 h-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                          <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* 可选标签列表 */}
            {availableTags.length > 0 && (
              <div className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
                resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    // 从 UserDataContext 获取标签颜色信息
                    const currentColor = getUpdatedTagColor(tag.id)

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`
                          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                          ${formData.tagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : (resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                        `}
                        style={formData.tagIds.includes(tag.id) && currentColor ? {
                          backgroundColor: currentColor + '20',
                          color: currentColor,
                          borderColor: currentColor + '40'
                        } : formData.tagIds.includes(tag.id) ? {
                          backgroundColor: '#DBEAFE',
                          color: '#1E40AF',
                          borderColor: '#93C5FD'
                        } : {
                          backgroundColor: '#F9FAFB',
                          color: '#374151',
                          borderColor: '#E5E7EB'
                        }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 创建新标签 */}
            <div className={`border-t pt-3 ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setShowTagFormModal(true)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('tag.create.new')}
              </button>
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label htmlFor="notes" className={`block text-sm font-medium mb-1 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('transaction.notes.optional')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              resolvedTheme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder={t('transaction.notes.placeholder')}
          />
        </div>

        {/* 操作按钮 */}
        <div className={`flex justify-end space-x-3 pt-4 border-t ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              resolvedTheme === 'dark'
                ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type="submit"
            label={transaction ? t('common.save.changes') : `${t('common.add')}${accountTypeInfo.label}`}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>

      {/* 标签表单模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
      />
    </Modal>
  )
}

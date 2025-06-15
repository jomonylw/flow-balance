'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import AuthButton from '@/components/ui/AuthButton'
import TagFormModal from '@/components/ui/TagFormModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { useTheme } from '@/contexts/ThemeContext'

interface QuickFlowTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultType?: 'INCOME' | 'EXPENSE' // 可选的默认交易类型
  defaultCategoryId?: string // 可选的预设分类ID
}

export default function QuickFlowTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'EXPENSE',
  defaultCategoryId
}: QuickFlowTransactionModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { accounts, currencies, tags: userTags, getBaseCurrency } = useUserData()
  const { resolvedTheme } = useTheme()

  // 表单数据
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tagIds: [] as string[]
  })

  // 交易类型状态
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>(defaultType)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 获取最新的标签颜色信息
  const getUpdatedTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  // 根据交易类型和可选的分类ID过滤账户
  const filteredAccounts = accounts.filter(account => {
    // 首先按交易类型过滤
    if (account.category?.type !== transactionType) {
      return false
    }

    // 如果指定了分类ID，则只显示该分类下的账户
    if (defaultCategoryId && account.category.id !== defaultCategoryId) {
      return false
    }

    return true
  })

  // 获取选中账户的信息
  const selectedAccount = accounts.find(acc => acc.id === formData.accountId)
  const accountCurrency = selectedAccount?.currencyCode || getBaseCurrency()?.code || 'USD'
  const currencyInfo = currencies.find(c => c.code === accountCurrency) || getBaseCurrency()

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      setFormData({
        accountId: '',
        amount: '',
        description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        tagIds: []
      })
      setErrors({})
      setTransactionType(defaultType) // 重置交易类型为默认值
    }
  }, [isOpen, defaultType])

  // 当交易类型改变时，重置账户选择
  useEffect(() => {
    setFormData(prev => ({ ...prev, accountId: '' }))
    setErrors(prev => ({ ...prev, accountId: '' }))
  }, [transactionType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleTagFormSuccess = (newTag: any) => {
    setFormData(prev => ({
      ...prev,
      tagIds: [...prev.tagIds, newTag.id]
    }))
    setShowTagFormModal(false)
    showSuccess(t('transaction.quick.tag.create.success'), t('transaction.quick.tag.added.success'))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.accountId) {
      newErrors.accountId = t('transaction.quick.select.account.error')
    }

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

    if (!selectedAccount) {
      setErrors({ general: t('transaction.quick.select.valid.account.error') })
      return
    }

    setIsLoading(true)

    try {
      // 构建提交数据 - 自动填充简化的字段
      const submitData = {
        accountId: selectedAccount.id,
        categoryId: selectedAccount.category.id, // 自动使用账户的分类
        currencyCode: accountCurrency, // 自动使用账户的货币
        type: transactionType, // 使用当前选择的交易类型
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        date: formData.date,
        tagIds: formData.tagIds // 保留标签选择
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (result.success) {
        const successMessage = t('transaction.modal.create.success')
        showSuccess(successMessage, `${formData.amount} ${currencyInfo?.symbol || accountCurrency}`)
        onSuccess()
        onClose()
      } else {
        const errorMessage = result.error || t('transaction.quick.create.failed')
        setErrors({ general: errorMessage })
        showError(t('transaction.quick.create.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      const errorMessage = error instanceof Error ? error.message : t('error.network')
      setErrors({ general: errorMessage })
      showError(t('transaction.quick.create.failed'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取账户类型的显示信息
  const getAccountTypeInfo = () => {
    const isIncome = transactionType === 'INCOME'
    return {
      icon: isIncome ? '💰' : '💸',
      label: isIncome ? t('transaction.quick.income') : t('transaction.quick.expense'),
      color: isIncome ? 'text-green-600' : 'text-red-600'
    }
  }

  const accountTypeInfo = getAccountTypeInfo()

  // 账户选项
  const accountOptions = filteredAccounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.category.name})`
  }))

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('transaction.quick.record.title', { type: accountTypeInfo.label })}
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

          {/* 交易类型选择 */}
          <div className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{accountTypeInfo.icon}</span>
                <span className={`font-medium ${accountTypeInfo.color}`}>
                  {t('transaction.quick.transaction', { type: accountTypeInfo.label })}
                </span>
              </div>

              {/* 交易类型切换按钮 */}
              <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setTransactionType('EXPENSE')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    transactionType === 'EXPENSE'
                      ? 'bg-red-600 text-white'
                      : resolvedTheme === 'dark'
                      ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  💸 {t('transaction.quick.expense')}
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('INCOME')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    transactionType === 'INCOME'
                      ? 'bg-green-600 text-white'
                      : resolvedTheme === 'dark'
                      ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  💰 {t('transaction.quick.income')}
                </button>
              </div>
            </div>
            <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('transaction.quick.select.account.help', { type: accountTypeInfo.label })}
            </p>
          </div>

          {/* 账户选择 */}
          <SelectField
            name="accountId"
            label={t('transaction.quick.account.label', { type: accountTypeInfo.label })}
            value={formData.accountId}
            onChange={handleChange}
            options={accountOptions}
            error={errors.accountId}
            required
            help={t('transaction.quick.account.help', { type: accountTypeInfo.label })}
          />

          {/* 显示选中账户的货币信息 */}
          {selectedAccount && (
            <div className={`border border-blue-200 rounded-md p-3 ${
              resolvedTheme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                    {t('transaction.quick.selected.account')}<span className="font-medium">{selectedAccount.name}</span>
                  </div>
                  <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {t('transaction.quick.category')}{selectedAccount.category.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>{t('transaction.quick.currency')}</div>
                  <div className={`font-medium ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                    {currencyInfo?.symbol} {currencyInfo?.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 金额和日期 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              type="number"
              name="amount"
              label={t('transaction.quick.amount.label', { type: accountTypeInfo.label })}
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
              label={t('transaction.quick.date.label')}
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              required
            />
          </div>

          {/* 描述 */}
          <InputField
            name="description"
            label={t('transaction.quick.description.label')}
            value={formData.description}
            onChange={handleChange}
            placeholder={t('transaction.quick.description.placeholder', { type: accountTypeInfo.label })}
            error={errors.description}
            required
          />

          {/* 标签选择 */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('transaction.quick.tags.label')}
            </label>
            <div className="space-y-3">
              {/* 已选标签显示 */}
              {formData.tagIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tagIds.map(tagId => {
                    const tag = userTags.find(t => t.id === tagId)
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
              {userTags.length > 0 && (
                <div className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
                  resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <div className="flex flex-wrap gap-2">
                    {userTags.map(tag => {
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
                  {t('transaction.quick.tags.create')}
                </button>
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label htmlFor="notes" className={`block text-sm font-medium mb-1 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('transaction.quick.notes.label')}
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
              placeholder={t('transaction.quick.notes.placeholder')}
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
              {t('transaction.quick.cancel')}
            </button>
            <AuthButton
              type="submit"
              label={t('transaction.quick.add', { type: accountTypeInfo.label })}
              isLoading={isLoading}
              disabled={isLoading}
            />
          </div>
        </form>
      </Modal>

      {/* 标签表单模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
      />
    </>
  )
}

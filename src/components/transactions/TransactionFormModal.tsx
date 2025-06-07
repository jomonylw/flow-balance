'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import AuthButton from '@/components/ui/AuthButton'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'

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

interface Transaction {
  id: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  description: string
  notes?: string
  date: string
  tags: { tag: Tag }[]
}

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction?: Transaction | null
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  defaultAccountId?: string
  defaultCategoryId?: string
  defaultType?: 'INCOME' | 'EXPENSE'
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  accounts,
  categories,
  currencies,
  tags,
  defaultAccountId,
  defaultCategoryId,
  defaultType
}: TransactionFormModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
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

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>(tags)
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (transaction) {
      // 编辑模式 - 检查是否为余额调整交易
      if (transaction.type === 'BALANCE_ADJUSTMENT') {
        // 余额调整交易不能通过普通交易表单编辑
        setErrors({ general: t('transaction.modal.balance.adjustment.error') })
        return
      }

      setFormData({
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        currencyCode: transaction.currencyCode,
        type: transaction.type as 'INCOME' | 'EXPENSE', // 确保类型安全
        amount: transaction.amount.toString(),
        description: transaction.description,
        notes: transaction.notes || '',
        date: new Date(transaction.date).toISOString().split('T')[0],
        tagIds: transaction.tags.map(t => t.tag.id)
      })
    } else {
      // 新增模式
      setFormData({
        accountId: defaultAccountId || '',
        categoryId: defaultCategoryId || '',
        currencyCode: 'USD',
        type: defaultType || 'EXPENSE',
        amount: '',
        description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        tagIds: []
      })
    }
    setErrors({})
  }, [transaction, defaultAccountId, defaultCategoryId, defaultType, isOpen])

  // 更新可用标签列表
  useEffect(() => {
    setAvailableTags(tags)
  }, [tags])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // 如果选择了账户，自动设置对应的分类和交易类型
    if (name === 'accountId' && value) {
      const selectedAccount = accounts.find(acc => acc.id === value)
      if (selectedAccount) {
        const accountType = selectedAccount.category?.type
        let defaultType = formData.type

        // 根据账户类型智能设置默认交易类型
        if (accountType === 'INCOME') {
          defaultType = 'INCOME'
        } else if (accountType === 'EXPENSE') {
          defaultType = 'EXPENSE'
        }

        setFormData(prev => ({
          ...prev,
          [name]: value,
          categoryId: selectedAccount.category.id, // 自动设置分类
          type: defaultType // 智能设置交易类型
        }))
      } else {
        setFormData(prev => ({ ...prev, [name]: value }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // 根据选择的账户获取可用的交易类型选项
  const getAvailableTransactionTypes = () => {
    const selectedAccount = accounts.find(acc => acc.id === formData.accountId)
    const accountType = selectedAccount?.category?.type

    if (!accountType) {
      return [
        { value: 'INCOME', label: '收入' },
        { value: 'EXPENSE', label: '支出' }
      ]
    }

    switch (accountType) {
      case 'INCOME':
        return [{ value: 'INCOME', label: '收入' }]
      case 'EXPENSE':
        return [{ value: 'EXPENSE', label: '支出' }]
      default:
        return [
          { value: 'INCOME', label: '收入' },
          { value: 'EXPENSE', label: '支出' }
        ]
    }
  }

  // 获取账户类型提示信息
  const getAccountTypeHint = () => {
    const selectedAccount = accounts.find(acc => acc.id === formData.accountId)
    const accountType = selectedAccount?.category?.type

    if (!accountType || !selectedAccount) return null

    switch (accountType) {
      case 'INCOME':
        return {
          type: 'info',
          message: '📊 收入账户用于记录各种收入来源，每笔交易代表一次收入流入。'
        }
      case 'EXPENSE':
        return {
          type: 'info',
          message: '📊 支出账户用于记录各种支出项目，每笔交易代表一次支出流出。'
        }
      default:
        return null
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

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      showError('验证失败', '标签名称不能为空')
      return
    }

    try {
      setIsCreatingTag(true)
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: null
        })
      })

      const result = await response.json()

      if (result.success) {
        const newTag = result.data
        setAvailableTags(prev => [...prev, newTag])
        setFormData(prev => ({
          ...prev,
          tagIds: [...prev.tagIds, newTag.id]
        }))
        setNewTagName('')
        setShowNewTagForm(false)
        showSuccess('创建成功', '标签已创建并添加到当前交易')
      } else {
        showError('创建失败', result.error || '创建标签失败')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      showError('创建失败', '网络错误，请稍后重试')
    } finally {
      setIsCreatingTag(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.accountId) newErrors.accountId = t('transaction.modal.select.account')
    if (!formData.categoryId) newErrors.categoryId = t('transaction.modal.select.category')
    if (!formData.currencyCode) newErrors.currencyCode = t('transaction.modal.select.currency')
    if (!formData.type) newErrors.type = t('transaction.modal.select.type')
    if (!formData.amount) {
      newErrors.amount = t('transaction.modal.enter.amount')
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('transaction.modal.amount.positive')
    }
    if (!formData.description) newErrors.description = t('transaction.modal.enter.description')
    if (!formData.date) newErrors.date = t('transaction.modal.select.date')

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
      const url = transaction 
        ? `/api/transactions/${transaction.id}`
        : '/api/transactions'
      
      const method = transaction ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        setErrors({ general: result.error || t('transaction.modal.operation.failed') })
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      setErrors({ general: t('error.network') })
    } finally {
      setIsLoading(false)
    }
  }

  // 使用智能的交易类型选项
  const typeOptions = getAvailableTransactionTypes()

  // 只显示流量类账户（收入/支出）
  const flowAccounts = accounts.filter(account => {
    const accountType = account.category?.type
    return accountType === 'INCOME' || accountType === 'EXPENSE'
  })

  const accountOptions = flowAccounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.category.name})`
  }))

  // 只显示流量类分类（收入/支出）
  const flowCategories = categories.filter(category => {
    const categoryType = category.type
    return categoryType === 'INCOME' || categoryType === 'EXPENSE'
  })

  const categoryOptions = flowCategories.map(category => ({
    value: category.id,
    label: category.name
  }))

  const currencyOptions = (currencies || []).map(currency => ({
    value: currency.code,
    label: `${currency.name} (${currency.symbol})`
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? t('transaction.modal.edit.title') : t('transaction.modal.title')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {/* 操作说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">{t('transaction.modal.operation.tips')}</p>
              <p>{t('transaction.modal.flow.account.tip')}</p>
              <p>{t('transaction.modal.stock.account.tip')}</p>
              <p>{t('transaction.modal.auto.category.tip')}</p>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            name="type"
            label={t('transaction.modal.transaction.type')}
            value={formData.type}
            onChange={handleChange}
            options={typeOptions}
            error={errors.type}
            required
          />

          <InputField
            type="date"
            name="date"
            label={t('transaction.modal.transaction.date')}
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />
        </div>

        <div className="space-y-4">
          <SelectField
            name="accountId"
            label={t('transaction.modal.account')}
            value={formData.accountId}
            onChange={handleChange}
            options={accountOptions}
            error={errors.accountId}
            required
            help={t('transaction.modal.account.help')}
          />

          {/* 显示自动选择的分类 */}
          {formData.accountId && formData.categoryId && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-700">
                  {t('transaction.modal.category.auto.set')}
                  <span className="font-medium ml-1">
                    {categories.find(cat => cat.id === formData.categoryId)?.name || '未知分类'}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* 显示账户类型提示 */}
          {(() => {
            const hint = getAccountTypeHint()
            if (!hint) return null

            return (
              <div className={`border rounded-md p-3 ${
                hint.type === 'info' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  <svg className={`h-4 w-4 mt-0.5 mr-2 flex-shrink-0 ${
                    hint.type === 'info' ? 'text-green-500' : 'text-yellow-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-sm ${
                    hint.type === 'info' ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {hint.message}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="amount"
            label={t('transaction.modal.amount')}
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            error={errors.amount}
            required
          />

          <SelectField
            name="currencyCode"
            label={t('transaction.modal.currency')}
            value={formData.currencyCode}
            onChange={handleChange}
            options={currencyOptions}
            error={errors.currencyCode}
            required
          />
        </div>

        <InputField
          type="text"
          name="description"
          label={t('transaction.modal.description')}
          value={formData.description}
          onChange={handleChange}
          placeholder={t('transaction.modal.description.placeholder')}
          error={errors.description}
          required
        />

        <TextAreaField
          name="notes"
          label={t('transaction.modal.notes')}
          value={formData.notes}
          onChange={handleChange}
          placeholder={t('transaction.modal.notes.placeholder')}
          rows={3}
        />

        {/* 标签选择 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              {t('transaction.modal.tags')}
            </label>
            <button
              type="button"
              onClick={() => setShowNewTagForm(!showNewTagForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showNewTagForm ? t('transaction.modal.cancel.new.tag') : t('transaction.modal.create.new.tag')}
            </button>
          </div>

          {/* 创建新标签表单 */}
          {showNewTagForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t('transaction.modal.tag.name.placeholder')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreatingTag || !newTagName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingTag ? t('transaction.modal.creating') : t('transaction.modal.create')}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {t('transaction.modal.tag.auto.add.tip')}
              </p>
            </div>
          )}

          {/* 现有标签选择 */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation
                    ${formData.tagIds.includes(tag.id)
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }
                  `}
                  style={tag.color && formData.tagIds.includes(tag.id) ? {
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    borderColor: tag.color + '40'
                  } : {}}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* 无标签提示 */}
          {availableTags.length === 0 && !showNewTagForm && (
            <div className="text-center py-4 border border-gray-200 rounded-md bg-gray-50">
              <p className="text-sm text-gray-500">{t('transaction.modal.no.tags')}</p>
              <button
                type="button"
                onClick={() => setShowNewTagForm(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {t('transaction.modal.create.first.tag')}
              </button>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          >
            {t('transaction.modal.cancel')}
          </button>
          <AuthButton
            type="submit"
            label={transaction ? t('transaction.modal.update.transaction') : t('transaction.modal.create.transaction')}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

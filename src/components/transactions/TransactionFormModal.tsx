'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import AuthButton from '@/components/ui/AuthButton'

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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
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
  defaultType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
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
  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    currencyCode: 'USD',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE' | 'TRANSFER',
    amount: '',
    description: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    tagIds: [] as string[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (transaction) {
      // 编辑模式
      setFormData({
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        currencyCode: transaction.currencyCode,
        type: transaction.type,
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
        { value: 'EXPENSE', label: '支出' },
        { value: 'TRANSFER', label: '转账' }
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
          { value: 'EXPENSE', label: '支出' },
          { value: 'TRANSFER', label: '转账' }
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.accountId) newErrors.accountId = '请选择账户'
    if (!formData.categoryId) newErrors.categoryId = '请选择分类'
    if (!formData.currencyCode) newErrors.currencyCode = '请选择币种'
    if (!formData.type) newErrors.type = '请选择交易类型'
    if (!formData.amount) {
      newErrors.amount = '请输入金额'
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = '金额必须是大于0的数字'
    }
    if (!formData.description) newErrors.description = '请输入描述'
    if (!formData.date) newErrors.date = '请选择日期'

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
        setErrors({ general: result.error || '操作失败' })
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      setErrors({ general: '网络错误，请稍后重试' })
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
      title={transaction ? '编辑交易' : '新增交易'}
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
              <p className="font-medium mb-1">💡 操作提示</p>
              <p>• 此表单用于记录<strong>流量类账户</strong>的交易明细</p>
              <p>• 如需管理<strong>存量类账户</strong>（资产/负债），请使用"余额更新"功能</p>
              <p>• 系统会根据选择的账户自动设置对应的交易类型和分类</p>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            name="type"
            label="交易类型"
            value={formData.type}
            onChange={handleChange}
            options={typeOptions}
            error={errors.type}
            required
          />

          <InputField
            type="date"
            name="date"
            label="交易日期"
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />
        </div>

        <div className="space-y-4">
          <SelectField
            name="accountId"
            label="账户"
            value={formData.accountId}
            onChange={handleChange}
            options={accountOptions}
            error={errors.accountId}
            required
            help="只能选择收入或支出类账户进行交易记录"
          />

          {/* 显示自动选择的分类 */}
          {formData.accountId && formData.categoryId && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-700">
                  分类已自动设置为：
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="amount"
            label="金额"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            error={errors.amount}
            required
          />

          <SelectField
            name="currencyCode"
            label="币种"
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
          label="描述"
          value={formData.description}
          onChange={handleChange}
          placeholder="请输入交易描述"
          error={errors.description}
          required
        />

        <TextAreaField
          name="notes"
          label="备注"
          value={formData.notes}
          onChange={handleChange}
          placeholder="可选的备注信息"
          rows={3}
        />

        {/* 标签选择 */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`
                    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
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
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            取消
          </button>
          <AuthButton
            type="submit"
            label={transaction ? '更新交易' : '创建交易'}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

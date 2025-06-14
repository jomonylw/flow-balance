'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import AuthButton from '@/components/ui/AuthButton'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { publishBalanceUpdate } from '@/utils/DataUpdateManager'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Account {
  id: string
  name: string
  currencyCode?: string
  currency?: Currency
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface BalanceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  account: Account
  currencies: Currency[]
  currentBalance?: number
  currencyCode?: string
  editingTransaction?: any // 要编辑的交易记录
}

export default function BalanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  currencies,
  currentBalance = 0,
  currencyCode = 'USD',
  editingTransaction
}: BalanceUpdateModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    newBalance: '',
    currencyCode: currencyCode,
    updateDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // 编辑模式：从现有交易记录加载数据
        const transactionDate = new Date(editingTransaction.date).toISOString().split('T')[0]
        const editCurrencyCode = editingTransaction.currencyCode || account.currencyCode || currencyCode

        console.log('编辑模式表单初始化:', {
          editingTransaction: {
            id: editingTransaction.id,
            amount: editingTransaction.amount,
            currencyCode: editingTransaction.currencyCode,
            date: editingTransaction.date
          },
          account: {
            currencyCode: account.currencyCode,
            currency: account.currency
          },
          finalCurrencyCode: editCurrencyCode
        })

        setFormData({
          newBalance: editingTransaction.amount.toString(),
          currencyCode: editCurrencyCode,
          updateDate: transactionDate,
          notes: editingTransaction.notes || ''
        })
      } else {
        // 新建模式 - 优先使用账户的货币限制
        const defaultCurrency = account.currencyCode || currencyCode
        setFormData({
          newBalance: currentBalance.toString(),
          currencyCode: defaultCurrency,
          updateDate: new Date().toISOString().split('T')[0],
          notes: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, currentBalance, currencyCode, editingTransaction, account.currencyCode])

  // 额外的useEffect确保编辑模式下币种值正确设置
  useEffect(() => {
    if (isOpen && editingTransaction && (!formData.currencyCode || formData.currencyCode === '')) {
      const correctCurrencyCode = editingTransaction.currencyCode || account.currencyCode || currencyCode
      console.log('修正编辑模式下的币种值:', {
        current: formData.currencyCode,
        correct: correctCurrencyCode,
        editingTransaction: editingTransaction.currencyCode,
        account: account.currencyCode,
        fallback: currencyCode
      })

      setFormData(prev => ({
        ...prev,
        currencyCode: correctCurrencyCode
      }))
    }
  }, [isOpen, editingTransaction, formData.currencyCode, account.currencyCode, currencyCode])

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

    if (!formData.newBalance.trim()) {
      newErrors.newBalance = '请输入余额金额'
    } else if (isNaN(parseFloat(formData.newBalance))) {
      newErrors.newBalance = '请输入有效的数字'
    }

    // 更严格的币种验证
    if (!formData.currencyCode || formData.currencyCode.trim() === '') {
      newErrors.currencyCode = '请选择币种'
    }

    if (!formData.updateDate) {
      newErrors.updateDate = '请选择更新日期'
    }

    // 添加详细的调试信息
    console.log('前端表单验证详细信息:', {
      formData: {
        ...formData,
        currencyCodeType: typeof formData.currencyCode,
        currencyCodeLength: formData.currencyCode?.length,
        currencyCodeValue: `"${formData.currencyCode}"`
      },
      account: {
        id: account.id,
        name: account.name,
        currencyCode: account.currencyCode,
        currency: account.currency
      },
      availableCurrencies: availableCurrencies?.map(c => c.code),
      currencyOptions: currencyOptions,
      errors: newErrors,
      editingTransaction: editingTransaction ? {
        id: editingTransaction.id,
        currencyCode: editingTransaction.currencyCode
      } : null
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log(`[BalanceUpdateModal] handleSubmit called for account ${account.id}`)

    // 在提交前再次确保币种值正确
    if (!formData.currencyCode && account.currencyCode) {
      console.log('提交前修正币种:', account.currencyCode)
      setFormData(prev => ({ ...prev, currencyCode: account.currencyCode! }))
      return
    }

    if (!validateForm()) {
      console.log(`[BalanceUpdateModal] Form validation failed`)
      return
    }

    console.log(`[BalanceUpdateModal] Starting balance update, editingTransaction:`, editingTransaction)
    setIsLoading(true)

    try {
      if (editingTransaction) {
        // 编辑模式：更新现有交易
        const requestData = {
          accountId: account.id,
          categoryId: account.category.id,
          currencyCode: formData.currencyCode,
          type: editingTransaction.type,
          amount: parseFloat(formData.newBalance),
          description: `${t('balance.update.modal.balance.update')} - ${account.name}`,
          notes: formData.notes || t('balance.update.modal.balance.record.update'),
          date: formData.updateDate,
          tagIds: [] // 余额更新记录通常不需要标签
        }

        // 添加调试信息
        console.log('编辑余额记录提交数据:', {
          requestData,
          editingTransaction: {
            id: editingTransaction.id,
            type: editingTransaction.type,
            currencyCode: editingTransaction.currencyCode,
            amount: editingTransaction.amount
          },
          account: {
            id: account.id,
            name: account.name,
            currencyCode: account.currencyCode,
            currency: account.currency
          }
        })

        console.log(`[BalanceUpdateModal] Sending PUT request to /api/transactions/${editingTransaction.id}`)
        const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })

        const result = await response.json()
        console.log(`[BalanceUpdateModal] Edit transaction response:`, result)

        if (result.success) {
          console.log(`[BalanceUpdateModal] Balance update successful for account ${account.id}`)
          showSuccess(t('balance.update.modal.update.success'), `${account.name} ${t('balance.update.modal.balance.updated')}`)

          // 发布余额更新事件
          console.log(`[BalanceUpdateModal] Publishing balance update event for account ${account.id}`)
          await publishBalanceUpdate(account.id, {
            newBalance: parseFloat(formData.newBalance),
            currencyCode: account.currencyCode,
            transaction: result.transaction
          })
          console.log(`[BalanceUpdateModal] Balance update event published successfully`)

          onSuccess()
          onClose()
        } else {
          console.log(`[BalanceUpdateModal] Edit transaction failed:`, result)
          const errorMessage = result.error || t('balance.update.modal.update.failed')
          setErrors({ general: errorMessage })
          showError(t('balance.update.modal.update.failed'), errorMessage)
        }
      } else {
        // 新建模式：创建新的余额调整交易
        const newBalance = parseFloat(formData.newBalance)
        const balanceChange = newBalance - currentBalance

        // 添加调试信息
        console.log('前端提交数据:', {
          newBalance,
          balanceChange,
          currentBalance,
          formData: formData.newBalance,
          accountId: account.id,
          updateDate: formData.updateDate
        })

        console.log(`[BalanceUpdateModal] Sending POST request to /api/balance-update`)
        const response = await fetch('/api/balance-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accountId: account.id,
            currencyCode: formData.currencyCode,
            balanceChange,
            newBalance: newBalance,
            updateDate: formData.updateDate,
            notes: formData.notes || t('balance.update.modal.balance.update')
          })
        })

        const result = await response.json()
        console.log(`[BalanceUpdateModal] Create balance update response:`, result)

        if (result.success) {
          const message = result.data?.message || `${account.name} ${t('balance.update.modal.balance.updated')}`
          console.log(`[BalanceUpdateModal] Balance update successful for account ${account.id}`)
          showSuccess(t('balance.update.modal.update.success'), message)

          // 发布余额更新事件
          console.log(`[BalanceUpdateModal] Publishing balance update event for account ${account.id}`)
          await publishBalanceUpdate(account.id, {
            newBalance: parseFloat(formData.newBalance),
            currencyCode: account.currencyCode,
            transaction: result.transaction
          })
          console.log(`[BalanceUpdateModal] Balance update event published successfully`)

          onSuccess()
          onClose()
        } else {
          console.log(`[BalanceUpdateModal] Create balance update failed:`, result)
          const errorMessage = result.error || t('balance.update.modal.update.failed')
          setErrors({ general: errorMessage })
          showError(t('balance.update.modal.update.failed'), errorMessage)
        }
      }
    } catch (error) {
      console.error('[BalanceUpdateModal] Balance update error:', error)
      const errorMessage = t('error.network')
      setErrors({ general: errorMessage })
      showError(t('balance.update.modal.update.failed'), errorMessage)
    } finally {
      console.log(`[BalanceUpdateModal] Balance update completed, setting isLoading to false`)
      setIsLoading(false)
    }
  }

  const accountType = account.category.type
  const isStockAccount = accountType === 'ASSET' || accountType === 'LIABILITY'

  if (!isStockAccount) {
    return null // 只有存量类账户才显示余额更新
  }

  // 如果账户有货币限制，只显示该货币
  const availableCurrencies = account.currencyCode
    ? currencies.filter(c => c.code === account.currencyCode)
    : currencies

  const currencyOptions = (availableCurrencies || []).map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`
  }))

  // 如果账户有货币限制但在可用货币列表中找不到，添加一个临时选项
  if (account.currencyCode && currencyOptions.length === 0) {
    currencyOptions.push({
      value: account.currencyCode,
      label: `${account.currencyCode} - ${account.currency?.name || account.currencyCode}`
    })
  }

  // 在编辑模式下，如果交易的币种不在选项中，也要添加
  if (editingTransaction && editingTransaction.currencyCode &&
      !currencyOptions.find(opt => opt.value === editingTransaction.currencyCode)) {
    const transactionCurrency = currencies.find(c => c.code === editingTransaction.currencyCode)
    currencyOptions.push({
      value: editingTransaction.currencyCode,
      label: `${editingTransaction.currencyCode} - ${transactionCurrency?.name || editingTransaction.currencyCode}`
    })
  }

  const selectedCurrency = (currencies || []).find(c => c.code === formData.currencyCode)
  const currencySymbol = selectedCurrency?.symbol || '$'

  // 当前余额显示的货币符号（基于传入的 currencyCode 参数）
  const currentBalanceCurrency = (currencies || []).find(c => c.code === currencyCode)
  const currentBalanceCurrencySymbol = currentBalanceCurrency?.symbol || '$'

  // 组件渲染时的调试信息
  console.log('BalanceUpdateModal 渲染调试信息:', {
    isOpen,
    editingTransaction: editingTransaction ? {
      id: editingTransaction.id,
      currencyCode: editingTransaction.currencyCode,
      amount: editingTransaction.amount
    } : null,
    formData,
    account: {
      id: account.id,
      name: account.name,
      currencyCode: account.currencyCode,
      currency: account.currency
    },
    currencyOptions,
    availableCurrencies: availableCurrencies?.map(c => c.code),
    allCurrencies: currencies?.map(c => c.code)
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${editingTransaction ? t('balance.update.modal.edit.title') : t('balance.update.modal.title')} - ${account.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {/* 账户信息提示 */}
        <div className={`p-4 rounded-lg border ${
          accountType === 'ASSET' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              accountType === 'ASSET' ? 'bg-blue-500' : 'bg-orange-500'
            }`}></div>
            <div>
              <p className="font-medium text-gray-900">
                {accountType === 'ASSET' ? t('balance.update.modal.asset.account') : t('balance.update.modal.liability.account')} • {t('balance.update.modal.stock.data')}
              </p>
              <p className="text-sm text-gray-600">
                {t('balance.update.modal.current.balance')}: {currentBalanceCurrencySymbol}{currentBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({currencyCode})
              </p>
            </div>
          </div>
        </div>

        {/* 币种选择 */}
        <div>
          <SelectField
            name="currencyCode"
            label={t('balance.update.modal.currency')}
            value={formData.currencyCode || ''}
            onChange={handleChange}
            options={currencyOptions}
            error={errors.currencyCode}
            disabled={!!account.currencyCode}
            help={account.currencyCode ? `此账户限制使用 ${account.currency?.name} (${account.currencyCode})` : undefined}
            required
          />
          {/* 调试信息显示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500">
              调试: currencyCode="{formData.currencyCode}", options={currencyOptions.length}, disabled={!!account.currencyCode}
            </div>
          )}
        </div>

        {/* 新余额和更新日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="newBalance"
            label={t('balance.update.modal.new.balance')}
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            placeholder={t('balance.update.modal.new.balance.placeholder')}
            step="0.01"
            required
          />

          <InputField
            type="date"
            name="updateDate"
            label={t('balance.update.modal.update.date')}
            value={formData.updateDate}
            onChange={handleChange}
            error={errors.updateDate}
            required
          />
        </div>



        {/* 备注 */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            {t('balance.update.modal.notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('balance.update.modal.notes.placeholder')}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('balance.update.modal.cancel')}
          </button>
          <AuthButton
            type="submit"
            label={editingTransaction ? t('balance.update.modal.save.changes') : t('balance.update.modal.update.balance')}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

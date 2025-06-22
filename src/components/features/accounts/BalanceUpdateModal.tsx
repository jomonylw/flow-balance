'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useToast } from '@/contexts/providers/ToastContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { publishBalanceUpdate } from '@/lib/services/data-update.service'
import type { SimpleCurrency, CategoryType } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface BalanceUpdateAccount {
  id: string
  name: string
  currencyCode?: string
  currency?: SimpleCurrency
  category: {
    id: string
    name: string
    type?: CategoryType
  }
}

interface EditingTransaction {
  id: string
  amount: number
  currencyCode: string
  date: string
  notes?: string
  type: string
}

interface BalanceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  account: BalanceUpdateAccount
  currencies: SimpleCurrency[]
  currentBalance?: number
  currencyCode?: string
  editingTransaction?: EditingTransaction // 要编辑的交易记录
}

export default function BalanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  currencies,
  currentBalance = 0,
  currencyCode = 'USD',
  editingTransaction,
}: BalanceUpdateModalProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { showSuccess, showError } = useToast()
  const { resolvedTheme } = useTheme()
  const [formData, setFormData] = useState({
    newBalance: '',
    currencyCode: currencyCode,
    updateDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // 编辑模式：从现有交易记录加载数据
        const transactionDate = new Date(editingTransaction.date)
          .toISOString()
          .split('T')[0]
        const editCurrencyCode =
          editingTransaction.currencyCode ||
          account.currencyCode ||
          currencyCode

        setFormData({
          newBalance: editingTransaction.amount.toString(),
          currencyCode: editCurrencyCode,
          updateDate: transactionDate,
          notes: editingTransaction.notes || '',
        })
      } else {
        // 新建模式 - 优先使用账户的货币限制
        const defaultCurrency = account.currencyCode || currencyCode
        setFormData({
          newBalance: currentBalance.toString(),
          currencyCode: defaultCurrency,
          updateDate: new Date().toISOString().split('T')[0],
          notes: '',
        })
      }
      setErrors({})
    }
  }, [
    isOpen,
    currentBalance,
    currencyCode,
    editingTransaction,
    account.currency?.code,
  ])

  // 额外的useEffect确保编辑模式下币种值正确设置
  useEffect(() => {
    if (
      isOpen &&
      editingTransaction &&
      (!formData.currencyCode || formData.currencyCode === '')
    ) {
      const correctCurrencyCode =
        editingTransaction.currencyCode ||
        account.currency?.code ||
        currencyCode

      setFormData(prev => ({
        ...prev,
        currencyCode: correctCurrencyCode,
      }))
    }
  }, [
    isOpen,
    editingTransaction,
    formData.currencyCode,
    account.currency?.code,
    currencyCode,
  ])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
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
      newErrors.newBalance = t('balance.update.enter.amount')
    } else if (isNaN(parseFloat(formData.newBalance))) {
      newErrors.newBalance = t('balance.update.valid.number')
    }

    // 更严格的币种验证
    if (!formData.currencyCode || formData.currencyCode.trim() === '') {
      newErrors.currencyCode = t('balance.update.select.currency')
    }

    if (!formData.updateDate) {
      newErrors.updateDate = t('balance.update.select.date')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 在提交前再次确保币种值正确
    if (!formData.currencyCode && account.currency?.code) {
      setFormData(prev => ({
        ...prev,
        currencyCode: account.currency?.code || '',
      }))
      return
    }

    if (!validateForm()) {
      return
    }

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
          notes:
            formData.notes || t('balance.update.modal.balance.record.update'),
          date: formData.updateDate,
          tagIds: [], // 余额更新记录通常不需要标签
        }

        const response = await fetch(
          `/api/transactions/${editingTransaction.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          }
        )

        const result = await response.json()

        if (result.success) {
          showSuccess(
            t('balance.update.modal.update.success'),
            `${account.name} ${t('balance.update.modal.balance.updated')}`
          )

          // 发布余额更新事件
          await publishBalanceUpdate(account.id, {
            newBalance: parseFloat(formData.newBalance),
            currencyCode: account.currency?.code || '',
            transaction: result.transaction,
          })

          onSuccess()
          onClose()
        } else {
          console.log('[BalanceUpdateModal] Edit transaction failed:', result)
          const errorMessage =
            result.error || t('balance.update.modal.update.failed')
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
          updateDate: formData.updateDate,
        })

        console.log(
          '[BalanceUpdateModal] Sending POST request to /api/balance-update'
        )
        const response = await fetch('/api/balance-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: account.id,
            currencyCode: formData.currencyCode,
            balanceChange,
            newBalance: newBalance,
            updateDate: formData.updateDate,
            notes: formData.notes || t('balance.update.modal.balance.update'),
          }),
        })

        const result = await response.json()
        console.log(
          '[BalanceUpdateModal] Create balance update response:',
          result
        )

        if (result.success) {
          const message =
            result.data?.message ||
            `${account.name} ${t('balance.update.modal.balance.updated')}`
          console.log(
            `[BalanceUpdateModal] Balance update successful for account ${account.id}`
          )
          showSuccess(t('balance.update.modal.update.success'), message)

          // 发布余额更新事件
          console.log(
            `[BalanceUpdateModal] Publishing balance update event for account ${account.id}`
          )
          await publishBalanceUpdate(account.id, {
            newBalance: parseFloat(formData.newBalance),
            currencyCode: account.currency?.code || '',
            transaction: result.transaction,
          })
          console.log(
            '[BalanceUpdateModal] Balance update event published successfully'
          )

          onSuccess()
          onClose()
        } else {
          console.log(
            '[BalanceUpdateModal] Create balance update failed:',
            result
          )
          const errorMessage =
            result.error || t('balance.update.modal.update.failed')
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
      console.log(
        '[BalanceUpdateModal] Balance update completed, setting isLoading to false'
      )
      setIsLoading(false)
    }
  }

  const accountType = account.category.type
  const isStockAccount = accountType === 'ASSET' || accountType === 'LIABILITY'

  if (!isStockAccount) {
    return null // 只有存量类账户才显示余额更新
  }

  // 如果账户有货币限制，只显示该货币
  const availableCurrencies = account.currency?.code
    ? currencies.filter(c => c.code === account.currency?.code)
    : currencies

  const currencyOptions = (availableCurrencies || []).map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
    id: currency.id, // 添加唯一标识符
  }))

  // 如果账户有货币限制但在可用货币列表中找不到，添加一个临时选项
  if (account.currency?.code && currencyOptions.length === 0) {
    currencyOptions.push({
      value: account.currency.code,
      label: `${account.currency.code} - ${account.currency.name || account.currency.code}`,
      id: account.currency.id || account.currency.code, // 使用 currency id 或 code 作为 fallback
    })
  }

  // 在编辑模式下，如果交易的币种不在选项中，也要添加
  if (
    editingTransaction &&
    editingTransaction.currencyCode &&
    !currencyOptions.find(opt => opt.value === editingTransaction.currencyCode)
  ) {
    const transactionCurrency = currencies.find(
      c => c.code === editingTransaction.currencyCode
    )
    currencyOptions.push({
      value: editingTransaction.currencyCode,
      label: `${editingTransaction.currencyCode} - ${transactionCurrency?.name || editingTransaction.currencyCode}`,
      id: transactionCurrency?.id || editingTransaction.currencyCode, // 使用 currency id 或 code 作为 fallback
    })
  }

  // 当前余额显示的货币符号（基于传入的 currencyCode 参数）
  const currentBalanceCurrency = (currencies || []).find(
    c => c.code === currencyCode
  )
  const _currentBalanceCurrencySymbol = currentBalanceCurrency?.symbol || '$'

  // 组件渲染时的调试信息
  console.log('BalanceUpdateModal 渲染调试信息:', {
    isOpen,
    editingTransaction: editingTransaction
      ? {
          id: editingTransaction.id,
          currencyCode:
            editingTransaction.currencyCode || account.currency?.code || 'USD',
          amount: editingTransaction.amount,
        }
      : null,
    formData,
    account: {
      id: account.id,
      name: account.name,
      currencyCode: account.currency?.code,
      currency: account.currency,
    },
    currencyOptions,
    availableCurrencies: availableCurrencies?.map(c => c.code),
    allCurrencies: currencies?.map(c => c.code),
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${editingTransaction ? t('balance.update.modal.edit.title') : t('balance.update.modal.title')} - ${account.name}`}
      size='lg'
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        {errors.general && (
          <div
            className={`border border-red-200 rounded-md p-4 ${
              resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
            }`}
          >
            <div className='text-sm text-red-600'>{errors.general}</div>
          </div>
        )}

        {/* 账户信息提示 */}
        <div
          className={`p-4 rounded-lg border ${
            accountType === 'ASSET'
              ? resolvedTheme === 'dark'
                ? 'bg-blue-900/20 border-blue-700'
                : 'bg-blue-50 border-blue-200'
              : resolvedTheme === 'dark'
                ? 'bg-orange-900/20 border-orange-700'
                : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className='flex items-center'>
            <div
              className={`w-3 h-3 rounded-full mr-3 ${
                accountType === 'ASSET' ? 'bg-blue-500' : 'bg-orange-500'
              }`}
            ></div>
            <div>
              <p
                className={`font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
              >
                {accountType === 'ASSET'
                  ? t('balance.update.modal.asset.account')
                  : t('balance.update.modal.liability.account')}{' '}
                • {t('balance.update.modal.stock.data')}
              </p>
              <p
                className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {t('balance.update.modal.current.balance')}:{' '}
                {formatCurrency(currentBalance, currencyCode)} ({currencyCode})
              </p>
            </div>
          </div>
        </div>

        {/* 币种选择 */}
        <div>
          <SelectField
            name='currencyCode'
            label={t('balance.update.modal.currency')}
            value={formData.currencyCode || ''}
            onChange={handleChange}
            options={currencyOptions}
            error={errors.currencyCode}
            disabled={!!account.currency?.code}
            help={
              account.currency?.code
                ? t('balance.update.currency.locked', {
                    currencyName: account.currency.name || '',
                    currencyCode: account.currency.code,
                  })
                : undefined
            }
            required
          />
        </div>

        {/* 新余额和更新日期 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <InputField
            type='number'
            name='newBalance'
            label={t('balance.update.modal.new.balance')}
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            placeholder={t('balance.update.modal.new.balance.placeholder')}
            step='0.01'
            required
          />

          <InputField
            type='date'
            name='updateDate'
            label={t('balance.update.modal.update.date')}
            value={formData.updateDate}
            onChange={handleChange}
            error={errors.updateDate}
            required
          />
        </div>

        {/* 备注 */}
        <div>
          <label
            htmlFor='notes'
            className={`block text-sm font-medium mb-1 ${
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            {t('balance.update.modal.notes')}
          </label>
          <textarea
            id='notes'
            name='notes'
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              resolvedTheme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            placeholder={t('balance.update.modal.notes.placeholder')}
          />
        </div>

        {/* 操作按钮 */}
        <div
          className={`flex justify-end space-x-3 pt-4 border-t ${
            resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            type='button'
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              resolvedTheme === 'dark'
                ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {t('balance.update.modal.cancel')}
          </button>
          <AuthButton
            type='submit'
            label={
              editingTransaction
                ? t('balance.update.modal.save.changes')
                : t('balance.update.modal.update.balance')
            }
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import AuthButton from '@/components/ui/AuthButton'
import { useToast } from '@/contexts/ToastContext'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Account {
  id: string
  name: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  balances: Record<string, number>
}

interface QuickBalanceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accounts: Account[]
  currencies: Currency[]
  baseCurrency: Currency
}

export default function QuickBalanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  currencies,
  baseCurrency
}: QuickBalanceUpdateModalProps) {
  const { showSuccess, showError } = useToast()
  
  const [formData, setFormData] = useState({
    accountId: '',
    newBalance: '',
    currencyCode: baseCurrency.code,
    updateDate: new Date().toISOString().split('T')[0],
    notes: '',
    updateType: 'absolute' as 'absolute' | 'adjustment'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 过滤出存量类账户（资产/负债）
  const stockAccounts = accounts.filter(account => 
    account.category.type === 'ASSET' || account.category.type === 'LIABILITY'
  )

  // 获取选中账户的当前余额
  const selectedAccount = stockAccounts.find(account => account.id === formData.accountId)
  const currentBalance = selectedAccount?.balances[formData.currencyCode] || 0
  const currencySymbol = currencies.find(c => c.code === formData.currencyCode)?.symbol || ''

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setFormData({
        accountId: '',
        newBalance: '',
        currencyCode: baseCurrency.code,
        updateDate: new Date().toISOString().split('T')[0],
        notes: '',
        updateType: 'absolute'
      })
      setErrors({})
    }
  }, [isOpen, baseCurrency.code])

  // 当选择账户时，更新币种为该账户的主要币种
  useEffect(() => {
    if (selectedAccount && selectedAccount.balances) {
      const accountCurrencies = Object.keys(selectedAccount.balances)
      if (accountCurrencies.length > 0) {
        // 优先使用基础货币，如果账户没有基础货币余额，则使用第一个可用货币
        const preferredCurrency = accountCurrencies.includes(baseCurrency.code) 
          ? baseCurrency.code 
          : accountCurrencies[0]
        
        setFormData(prev => ({
          ...prev,
          currencyCode: preferredCurrency,
          newBalance: selectedAccount.balances[preferredCurrency]?.toString() || '0'
        }))
      }
    }
  }, [formData.accountId, selectedAccount, baseCurrency.code])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.accountId) {
      newErrors.accountId = '请选择账户'
    }

    if (!formData.newBalance.trim()) {
      newErrors.newBalance = '请输入金额'
    } else {
      const amount = parseFloat(formData.newBalance)
      if (isNaN(amount)) {
        newErrors.newBalance = '请输入有效的数字'
      }
    }

    if (!formData.currencyCode) {
      newErrors.currencyCode = '请选择币种'
    }

    if (!formData.updateDate) {
      newErrors.updateDate = '请选择日期'
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
      const newBalance = parseFloat(formData.newBalance)
      const balanceChange = formData.updateType === 'absolute'
        ? newBalance - currentBalance
        : newBalance

      const response = await fetch('/api/balance-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: formData.accountId,
          currencyCode: formData.currencyCode,
          balanceChange,
          newBalance: formData.updateType === 'absolute' ? newBalance : currentBalance + newBalance,
          updateDate: formData.updateDate,
          notes: formData.notes || `余额${formData.updateType === 'absolute' ? '更新' : '调整'}`,
          updateType: formData.updateType
        })
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('余额更新成功', `${selectedAccount?.name} 余额已更新`)
        onSuccess()
        onClose()
      } else {
        setErrors({ general: result.error || '更新失败' })
      }
    } catch (error) {
      console.error('Balance update error:', error)
      setErrors({ general: '网络错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  // 准备选项数据
  const accountOptions = stockAccounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.category.name})`
  }))

  const currencyOptions = currencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`
  }))

  const updateTypeOptions = [
    { value: 'absolute', label: '设置为新余额' },
    { value: 'adjustment', label: '调整金额' }
  ]

  // 计算预览结果
  const inputAmount = parseFloat(formData.newBalance) || 0
  const previewBalance = formData.updateType === 'absolute' 
    ? inputAmount 
    : currentBalance + inputAmount

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="快速更新余额"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{errors.general}</div>
          </div>
        )}

        {/* 账户选择 */}
        <SelectField
          name="accountId"
          label="选择存量账户"
          value={formData.accountId}
          onChange={handleChange}
          options={[
            { value: '', label: '请选择账户...' },
            ...accountOptions
          ]}
          error={errors.accountId}
          required
        />

        {/* 显示选中账户信息 */}
        {selectedAccount && (
          <div className={`p-4 rounded-lg border ${
            selectedAccount.category.type === 'ASSET' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                selectedAccount.category.type === 'ASSET' ? 'bg-blue-500' : 'bg-orange-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedAccount.category.type === 'ASSET' ? '资产账户' : '负债账户'} • 存量数据
                </p>
                <p className="text-sm text-gray-600">
                  当前余额: {currencySymbol}{currentBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 更新方式和币种 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            name="updateType"
            label="更新方式"
            value={formData.updateType}
            onChange={handleChange}
            options={updateTypeOptions}
            error={errors.updateType}
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

        {/* 金额和日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="newBalance"
            label={formData.updateType === 'absolute' ? '新余额' : '调整金额'}
            type="number"
            step="0.01"
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            required
            placeholder={formData.updateType === 'absolute' ? '输入新的余额' : '输入调整金额（正数增加，负数减少）'}
          />

          <InputField
            name="updateDate"
            label="更新日期"
            type="date"
            value={formData.updateDate}
            onChange={handleChange}
            error={errors.updateDate}
            required
          />
        </div>

        {/* 预览结果 */}
        {formData.newBalance && selectedAccount && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">预览结果</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>当前余额: {currencySymbol}{currentBalance.toFixed(2)}</p>
              <p>
                {formData.updateType === 'absolute' ? '新余额' : '调整后余额'}: 
                <span className="font-medium text-gray-900 ml-1">
                  {currencySymbol}{previewBalance.toFixed(2)}
                </span>
              </p>
              <p>
                变化金额: 
                <span className={`font-medium ml-1 ${
                  (previewBalance - currentBalance) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(previewBalance - currentBalance) >= 0 ? '+' : ''}{(previewBalance - currentBalance).toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* 备注 */}
        <InputField
          name="notes"
          label="备注（可选）"
          value={formData.notes}
          onChange={handleChange}
          placeholder="添加备注信息..."
        />

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <AuthButton
            type="submit"
            loading={isLoading}
            disabled={!formData.accountId || !formData.newBalance}
          >
            更新余额
          </AuthButton>
        </div>
      </form>
    </Modal>
  )
}

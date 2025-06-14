'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import AuthButton from '@/components/ui/AuthButton'
import { useToast } from '@/contexts/ToastContext'
import { useUserData } from '@/contexts/UserDataContext'
import { publishBalanceUpdate } from '@/utils/DataUpdateManager'

interface QuickBalanceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountType?: 'ASSET' | 'LIABILITY' // 可选的账户类型筛选
}

export default function QuickBalanceUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  accountType
}: QuickBalanceUpdateModalProps) {
  const { showSuccess, showError } = useToast()
  const { accounts, currencies, getBaseCurrency, accountBalances, fetchBalances } = useUserData()

  // 从context获取基础货币
  const baseCurrency = getBaseCurrency() || { code: 'CNY', symbol: '¥', name: '人民币' }

  // 确保余额数据已加载
  useEffect(() => {
    if (isOpen && !accountBalances) {
      fetchBalances()
    }
  }, [isOpen, accountBalances, fetchBalances])
  
  const [formData, setFormData] = useState({
    accountId: '',
    newBalance: '',
    currencyCode: baseCurrency.code,
    updateDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 过滤出存量类账户（资产/负债），如果指定了accountType则进一步筛选
  const stockAccounts = accounts.filter(account => {
    const isStockAccount = account.category.type === 'ASSET' || account.category.type === 'LIABILITY'
    if (!isStockAccount) return false

    // 如果指定了accountType，则只显示该类型的账户
    if (accountType) {
      return account.category.type === accountType
    }

    // 否则显示所有存量类账户
    return true
  })

  // 获取选中账户的当前余额
  const selectedAccount = stockAccounts.find(account => account.id === formData.accountId)
  const accountBalance = accountBalances?.[formData.accountId]
  const currentBalance = accountBalance?.balances[formData.currencyCode]?.amount || 0
  const currencySymbol = currencies.find(c => c.code === formData.currencyCode)?.symbol || ''

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setFormData({
        accountId: '',
        newBalance: '',
        currencyCode: baseCurrency.code,
        updateDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setErrors({})
    }
  }, [isOpen, baseCurrency.code])

  // 当选择账户时，更新币种为该账户的货币，新余额默认为 0
  useEffect(() => {
    if (selectedAccount) {
      // 使用账户设定的货币
      const accountCurrency = selectedAccount.currencyCode

      setFormData(prev => ({
        ...prev,
        currencyCode: accountCurrency,
        newBalance: '0' // 新余额默认为 0
      }))
    }
  }, [formData.accountId, selectedAccount])

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
      const balanceChange = newBalance - currentBalance

      const response = await fetch('/api/balance-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: formData.accountId,
          currencyCode: formData.currencyCode,
          balanceChange,
          newBalance: newBalance,
          updateDate: formData.updateDate,
          notes: formData.notes || '余额更新'
        })
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('余额更新成功', `${selectedAccount?.name} 余额已更新`)

        // 发布余额更新事件
        console.log(`[QuickBalanceUpdateModal] Publishing balance update event for account ${formData.accountId}`)
        await publishBalanceUpdate(formData.accountId, {
          newBalance: parseFloat(formData.newBalance),
          currencyCode: formData.currencyCode,
          transaction: result.transaction
        })
        console.log(`[QuickBalanceUpdateModal] Balance update event published successfully`)

        onSuccess()
        onClose()
      } else {
        const errorMessage = result.error || '更新失败'
        setErrors({ general: errorMessage })
        showError('余额更新失败', errorMessage)
      }
    } catch (error) {
      console.error('Balance update error:', error)
      const errorMessage = '网络错误，请稍后重试'
      setErrors({ general: errorMessage })
      showError('余额更新失败', errorMessage)
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



  // 根据accountType生成标题
  const getModalTitle = () => {
    if (accountType === 'ASSET') return '更新资产账户余额'
    if (accountType === 'LIABILITY') return '更新负债账户余额'
    return '快速更新余额'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
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
          label={accountType === 'ASSET' ? '选择资产账户' : accountType === 'LIABILITY' ? '选择负债账户' : '选择存量账户'}
          value={formData.accountId}
          onChange={handleChange}
          options={[
            { value: '', label: accountType === 'ASSET' ? '请选择资产账户...' : accountType === 'LIABILITY' ? '请选择负债账户...' : '请选择账户...' },
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
                  当前余额: {currencySymbol}{currentBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 币种选择 */}
        <div>
          <SelectField
            name="currencyCode"
            label="币种"
            value={formData.currencyCode}
            onChange={handleChange}
            options={currencyOptions}
            error={errors.currencyCode}
            required
            disabled={!!selectedAccount} // 选择账户后币种不可更改
          />
          {selectedAccount && (
            <p className="mt-1 text-sm text-gray-500">
              此账户只能使用 {currencies.find(c => c.code === selectedAccount.currencyCode)?.name} ({selectedAccount.currencyCode})
            </p>
          )}
        </div>

        {/* 新余额和日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="newBalance"
            label="新余额"
            type="number"
            step="0.01"
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            required
            placeholder="输入新的余额"
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
            label="更新余额"
            isLoading={isLoading}
            disabled={!formData.accountId || !formData.newBalance}
          />
        </div>
      </form>
    </Modal>
  )
}

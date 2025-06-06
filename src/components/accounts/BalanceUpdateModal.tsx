'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'
import AuthButton from '@/components/ui/AuthButton'

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
  const [formData, setFormData] = useState({
    newBalance: '',
    currencyCode: currencyCode,
    updateDate: new Date().toISOString().split('T')[0],
    notes: '',
    updateType: 'absolute' as 'absolute' | 'adjustment' // 绝对值更新 或 调整金额
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // 编辑模式：从现有交易记录加载数据
        const transactionDate = new Date(editingTransaction.date).toISOString().split('T')[0]
        setFormData({
          newBalance: editingTransaction.amount.toString(),
          currencyCode: editingTransaction.currencyCode,
          updateDate: transactionDate,
          notes: editingTransaction.notes || '',
          updateType: 'absolute' // 编辑时默认为绝对值模式
        })
      } else {
        // 新建模式
        setFormData({
          newBalance: currentBalance.toString(),
          currencyCode: currencyCode,
          updateDate: new Date().toISOString().split('T')[0],
          notes: '',
          updateType: 'absolute'
        })
      }
      setErrors({})
    }
  }, [isOpen, currentBalance, currencyCode, editingTransaction])

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

    if (!formData.currencyCode) {
      newErrors.currencyCode = '请选择币种'
    }

    if (!formData.updateDate) {
      newErrors.updateDate = '请选择更新日期'
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
      if (editingTransaction) {
        // 编辑模式：更新现有交易
        const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: parseFloat(formData.newBalance),
            currencyCode: formData.currencyCode,
            date: formData.updateDate,
            notes: formData.notes || `余额记录更新`,
            description: `余额更新 - ${account.name}`
          })
        })

        const result = await response.json()

        if (result.success) {
          onSuccess()
          onClose()
        } else {
          setErrors({ general: result.error || '更新失败' })
        }
      } else {
        // 新建模式：创建新的余额调整交易
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
            accountId: account.id,
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
          onSuccess()
          onClose()
        } else {
          setErrors({ general: result.error || '更新失败' })
        }
      }
    } catch (error) {
      console.error('Balance update error:', error)
      setErrors({ general: '网络错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  const accountType = account.category.type
  const isStockAccount = accountType === 'ASSET' || accountType === 'LIABILITY'

  if (!isStockAccount) {
    return null // 只有存量类账户才显示余额更新
  }

  const currencyOptions = (currencies || []).map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`
  }))

  const updateTypeOptions = [
    { value: 'absolute', label: '设置为新余额' },
    { value: 'adjustment', label: '调整金额' }
  ]

  const selectedCurrency = (currencies || []).find(c => c.code === formData.currencyCode)
  const currencySymbol = selectedCurrency?.symbol || '$'

  const calculateNewBalance = () => {
    const inputAmount = parseFloat(formData.newBalance) || 0
    if (formData.updateType === 'absolute') {
      return inputAmount
    } else {
      return currentBalance + inputAmount
    }
  }

  const calculateChange = () => {
    const newBalance = calculateNewBalance()
    return newBalance - currentBalance
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${editingTransaction ? '编辑余额记录' : '更新余额'} - ${account.name}`}
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
                {accountType === 'ASSET' ? '资产账户' : '负债账户'} • 存量数据
              </p>
              <p className="text-sm text-gray-600">
                当前余额: {currencySymbol}{currentBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* 更新类型和金额 */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="newBalance"
            label={formData.updateType === 'absolute' ? '新余额' : '调整金额'}
            value={formData.newBalance}
            onChange={handleChange}
            error={errors.newBalance}
            placeholder={formData.updateType === 'absolute' ? '输入新的账户余额' : '输入调整金额（正数增加，负数减少）'}
            step="0.01"
            required
          />

          <InputField
            type="date"
            name="updateDate"
            label="更新日期"
            value={formData.updateDate}
            onChange={handleChange}
            error={errors.updateDate}
            required
          />
        </div>

        {/* 预览计算结果 */}
        {formData.newBalance && !isNaN(parseFloat(formData.newBalance)) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">更新预览</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">当前余额:</span>
                <span>{currencySymbol}{currentBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {formData.updateType === 'absolute' ? '新余额:' : '调整后余额:'}
                </span>
                <span className="font-medium">
                  {currencySymbol}{calculateNewBalance().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-gray-600">变化金额:</span>
                <span className={`font-medium ${
                  calculateChange() >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {calculateChange() >= 0 ? '+' : ''}{currencySymbol}{calculateChange().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 备注 */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            备注说明
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="可选：说明余额变化的原因，如银行对账、投资收益等"
          />
        </div>

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
            label={editingTransaction ? "保存修改" : "更新余额"}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

'use client'

import { useState } from 'react'
import { UserSettings, Currency } from '@prisma/client'
import SelectField from '@/components/ui/SelectField'

interface PreferencesFormProps {
  userSettings: (UserSettings & { baseCurrency: Currency }) | null
  currencies: Currency[]
}

export default function PreferencesForm({ userSettings, currencies }: PreferencesFormProps) {
  const [formData, setFormData] = useState({
    baseCurrencyCode: userSettings?.baseCurrencyCode || 'USD',
    dateFormat: userSettings?.dateFormat || 'YYYY-MM-DD'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '2024-01-01 (YYYY-MM-DD)' },
    { value: 'DD/MM/YYYY', label: '01/01/2024 (DD/MM/YYYY)' },
    { value: 'MM/DD/YYYY', label: '01/01/2024 (MM/DD/YYYY)' },
    { value: 'DD-MM-YYYY', label: '01-01-2024 (DD-MM-YYYY)' }
  ]

  const currencyOptions = currencies.map(currency => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name} (${currency.code})`
  }))

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('偏好设置更新成功')
      } else {
        setError(data.error || '更新失败')
      }
    } catch (error) {
      console.error('Update preferences error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">偏好设置</h3>
        <p className="text-sm text-gray-600">自定义您的应用偏好</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <SelectField
          name="baseCurrencyCode"
          label="本位币"
          value={formData.baseCurrencyCode}
          onChange={handleSelectChange}
          options={currencyOptions}
          help="选择您的主要货币，用于汇总和报告"
        />

        <SelectField
          name="dateFormat"
          label="日期格式"
          value={formData.dateFormat}
          onChange={handleSelectChange}
          options={dateFormatOptions}
          help="选择您偏好的日期显示格式"
        />

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>

      <div className="border-t pt-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">关于本位币</h4>
          <p className="text-sm text-blue-700">
            本位币是您的主要货币，用于计算净资产和生成财务报告。
            如果您有多种货币的账户，系统会自动进行汇率转换（功能开发中）。
          </p>
        </div>
      </div>
    </div>
  )
}

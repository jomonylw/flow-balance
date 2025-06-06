'use client'

import { useState, useEffect } from 'react'
import { Currency } from '@prisma/client'
import InputField from '@/components/ui/InputField'
import SelectField from '@/components/ui/SelectField'

interface ExchangeRateData {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: string
  notes?: string
  fromCurrencyRef: Currency
  toCurrencyRef: Currency
}

interface ExchangeRateFormProps {
  currencies: Currency[]
  baseCurrency: Currency | null
  editingRate: ExchangeRateData | null
  onRateCreated: (rate: ExchangeRateData) => void
  onClose: () => void
}

export default function ExchangeRateForm({
  currencies,
  baseCurrency,
  editingRate,
  onRateCreated,
  onClose
}: ExchangeRateFormProps) {
  const [formData, setFormData] = useState({
    fromCurrency: '',
    toCurrency: baseCurrency?.code || '',
    rate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserCurrencies()
  }, [])

  const fetchUserCurrencies = async () => {
    try {
      const response = await fetch('/api/user/currencies')
      if (response.ok) {
        const data = await response.json()
        setUserCurrencies(data.data.currencies)
      }
    } catch (error) {
      console.error('获取用户货币失败:', error)
    }
  }

  useEffect(() => {
    if (editingRate) {
      setFormData({
        fromCurrency: editingRate.fromCurrency,
        toCurrency: editingRate.toCurrency,
        rate: editingRate.rate.toString(),
        effectiveDate: editingRate.effectiveDate.split('T')[0],
        notes: editingRate.notes || ''
      })
    } else {
      setFormData(prev => ({
        ...prev,
        toCurrency: baseCurrency?.code || ''
      }))
    }
  }, [editingRate, baseCurrency])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (error) setError('')
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 验证表单数据
      if (!formData.fromCurrency || !formData.toCurrency || !formData.rate || !formData.effectiveDate) {
        setError('请填写所有必填字段')
        return
      }

      const rateValue = parseFloat(formData.rate)
      if (isNaN(rateValue) || rateValue <= 0) {
        setError('汇率必须是大于0的数字')
        return
      }

      if (formData.fromCurrency === formData.toCurrency) {
        setError('源货币和目标货币不能相同')
        return
      }

      const requestData = {
        fromCurrency: formData.fromCurrency,
        toCurrency: formData.toCurrency,
        rate: rateValue,
        effectiveDate: formData.effectiveDate,
        notes: formData.notes || null
      }

      let response
      if (editingRate && editingRate.id) {
        // 更新现有汇率
        response = await fetch(`/api/exchange-rates/${editingRate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })
      } else {
        // 创建新汇率
        response = await fetch('/api/exchange-rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })
      }

      const data = await response.json()

      if (response.ok) {
        onRateCreated(data.data)
      } else {
        setError(data.error || '操作失败')
      }
    } catch (error) {
      console.error('提交汇率失败:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 准备货币选项
  const currencyOptions = userCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name} (${currency.code})`
  }))

  // 过滤源货币选项（排除目标货币）
  const fromCurrencyOptions = currencyOptions.filter(
    option => option.value !== formData.toCurrency
  )

  // 过滤目标货币选项（排除源货币）
  const toCurrencyOptions = currencyOptions.filter(
    option => option.value !== formData.fromCurrency
  )

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {editingRate ? '编辑汇率' : '添加汇率'}
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">关闭</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            name="fromCurrency"
            label="源货币"
            value={formData.fromCurrency}
            onChange={handleSelectChange}
            options={fromCurrencyOptions}
            required
            help="要转换的原始货币"
          />

          <SelectField
            name="toCurrency"
            label="目标货币"
            value={formData.toCurrency}
            onChange={handleSelectChange}
            options={toCurrencyOptions}
            required
            help="转换后的目标货币"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            type="number"
            name="rate"
            label="汇率"
            placeholder="例如: 7.2"
            value={formData.rate}
            onChange={handleInputChange}
            required
            step="0.000001"

            help="1单位源货币 = ? 单位目标货币"
          />

          <InputField
            type="date"
            name="effectiveDate"
            label="生效日期"
            value={formData.effectiveDate}
            onChange={handleInputChange}
            required
            help="汇率开始生效的日期"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            备注
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="可选的备注信息..."
            value={formData.notes}
            onChange={handleInputChange}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : (editingRate ? '更新汇率' : '添加汇率')}
          </button>
        </div>
      </form>
    </div>
  )
}

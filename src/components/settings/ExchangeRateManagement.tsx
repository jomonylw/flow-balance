'use client'

import { useState, useEffect } from 'react'
import { Currency } from '@prisma/client'
import ExchangeRateForm from './ExchangeRateForm'
import ExchangeRateList from './ExchangeRateList'

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

interface MissingRateInfo {
  fromCurrency: string
  toCurrency: string
  fromCurrencyInfo: Currency
  toCurrencyInfo: Currency
  required: boolean
}

interface ExchangeRateManagementProps {
  currencies: Currency[]
}

export default function ExchangeRateManagement({ currencies }: ExchangeRateManagementProps) {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData[]>([])
  const [missingRates, setMissingRates] = useState<MissingRateInfo[]>([])
  const [baseCurrency, setBaseCurrency] = useState<Currency | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRateData | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 获取缺失的汇率信息
      const missingResponse = await fetch('/api/exchange-rates/missing')
      if (missingResponse.ok) {
        const missingData = await missingResponse.json()
        setMissingRates(missingData.data.missingRates || [])
        setBaseCurrency(missingData.data.baseCurrency)
      }

      // 获取现有汇率
      const ratesResponse = await fetch('/api/exchange-rates')
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json()
        setExchangeRates(ratesData.data || [])
      }
    } catch (error) {
      console.error('获取汇率数据失败:', error)
      setError('获取汇率数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRateCreated = (newRate: ExchangeRateData) => {
    setExchangeRates(prev => {
      // 如果是更新现有汇率，替换它；否则添加新汇率
      const existingIndex = prev.findIndex(rate => rate.id === newRate.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = newRate
        return updated
      } else {
        return [...prev, newRate]
      }
    })

    // 从缺失列表中移除
    setMissingRates(prev => 
      prev.filter(missing => 
        !(missing.fromCurrency === newRate.fromCurrency && 
          missing.toCurrency === newRate.toCurrency)
      )
    )

    setShowForm(false)
    setEditingRate(null)
  }

  const handleRateDeleted = (deletedRateId: string) => {
    const deletedRate = exchangeRates.find(rate => rate.id === deletedRateId)
    
    setExchangeRates(prev => prev.filter(rate => rate.id !== deletedRateId))
    
    // 如果删除的汇率对应某个货币对，将其重新添加到缺失列表
    if (deletedRate) {
      const fromCurrency = currencies.find(c => c.code === deletedRate.fromCurrency)
      const toCurrency = currencies.find(c => c.code === deletedRate.toCurrency)
      
      if (fromCurrency && toCurrency) {
        setMissingRates(prev => [...prev, {
          fromCurrency: deletedRate.fromCurrency,
          toCurrency: deletedRate.toCurrency,
          fromCurrencyInfo: fromCurrency,
          toCurrencyInfo: toCurrency,
          required: true
        }])
      }
    }
  }

  const handleEditRate = (rate: ExchangeRateData) => {
    setEditingRate(rate)
    setShowForm(true)
  }

  const handleAddMissingRate = (missing: MissingRateInfo) => {
    setEditingRate({
      id: '',
      fromCurrency: missing.fromCurrency,
      toCurrency: missing.toCurrency,
      rate: 1,
      effectiveDate: new Date().toISOString().split('T')[0],
      fromCurrencyRef: missing.fromCurrencyInfo,
      toCurrencyRef: missing.toCurrencyInfo
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRate(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">汇率管理</h3>
          <p className="text-sm text-gray-600">正在加载汇率数据...</p>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">汇率管理</h3>
        <p className="text-sm text-gray-600">
          管理您的货币汇率设置，确保所有统计数据能正确转换为本位币
          {baseCurrency && (
            <span className="ml-2 text-blue-600 font-medium">
              (本位币: {baseCurrency.symbol} {baseCurrency.name})
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 缺失汇率提醒 */}
      {missingRates.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                需要设置汇率
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                您有 {missingRates.length} 个货币对需要设置汇率，以便正确计算统计数据。
              </p>
              <div className="mt-3 space-y-2">
                {missingRates.map((missing, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded px-3 py-2">
                    <span className="text-sm text-gray-900">
                      {missing.fromCurrencyInfo.symbol} {missing.fromCurrencyInfo.name} → {missing.toCurrencyInfo.symbol} {missing.toCurrencyInfo.name}
                    </span>
                    <button
                      onClick={() => handleAddMissingRate(missing)}
                      className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    >
                      设置汇率
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          已设置 {exchangeRates.length} 个汇率
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          添加汇率
        </button>
      </div>

      {/* 汇率表单 */}
      {showForm && (
        <ExchangeRateForm
          currencies={currencies}
          baseCurrency={baseCurrency}
          editingRate={editingRate}
          onRateCreated={handleRateCreated}
          onClose={handleCloseForm}
        />
      )}

      {/* 汇率列表 */}
      <ExchangeRateList
        exchangeRates={exchangeRates}
        onEdit={handleEditRate}
        onDelete={handleRateDeleted}
        onRefresh={fetchData}
      />
    </div>
  )
}

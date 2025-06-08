'use client'

import { useState, useEffect } from 'react'
import { Currency } from '@prisma/client'
import { useUserData } from '@/contexts/UserDataContext'

interface CurrencyWithStatus extends Currency {
  isSelected: boolean
}

interface UserCurrency extends Currency {
  order: number
  isActive: boolean
}

interface CurrencyManagementProps {
  onCurrenciesUpdated?: () => void
}

export default function CurrencyManagement({ onCurrenciesUpdated }: CurrencyManagementProps) {
  const { currencies: userCurrencies, refreshCurrencies } = useUserData()
  const [allCurrencies, setAllCurrencies] = useState<CurrencyWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customCurrencyForm, setCustomCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: ''
  })

  useEffect(() => {
    fetchAllCurrencies()
  }, [])

  const fetchAllCurrencies = async () => {
    try {
      setIsLoading(true)
      setError('')

      // 只获取所有货币，用户货币从 UserDataContext 获取
      const allCurrenciesRes = await fetch('/api/currencies')

      if (!allCurrenciesRes.ok) {
        throw new Error('获取数据失败')
      }

      const allCurrenciesData = await allCurrenciesRes.json()
      setAllCurrencies(allCurrenciesData.data.currencies)
    } catch (error) {
      console.error('获取货币数据失败:', error)
      setError('获取货币数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch('/api/user/currencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || '添加货币失败')
      }
    } catch (error) {
      console.error('添加货币失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  const handleRemoveCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`/api/user/currencies/${currencyCode}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || '删除货币失败')
      }
    } catch (error) {
      console.error('删除货币失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  const handleBatchUpdate = async (selectedCodes: string[]) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch('/api/user/currencies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currencyCodes: selectedCodes }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || '更新货币设置失败')
      }
    } catch (error) {
      console.error('更新货币设置失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  const handleCreateCustomCurrency = async () => {
    try {
      setError('')
      setSuccessMessage('')

      if (!customCurrencyForm.code || !customCurrencyForm.name || !customCurrencyForm.symbol) {
        setError('请填写完整的货币信息')
        return
      }

      const response = await fetch('/api/currencies/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customCurrencyForm),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        setShowCustomForm(false)
        setCustomCurrencyForm({ code: '', name: '', symbol: '' })
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || '创建自定义货币失败')
      }
    } catch (error) {
      console.error('创建自定义货币失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  const handleDeleteCustomCurrency = async (currencyCode: string) => {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`/api/currencies/custom/${currencyCode}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message)
        await refreshCurrencies() // 刷新 UserDataContext 中的货币数据
        await fetchAllCurrencies() // 刷新所有货币数据
        onCurrenciesUpdated?.()
      } else {
        setError(data.error || '删除自定义货币失败')
      }
    } catch (error) {
      console.error('删除自定义货币失败:', error)
      setError('网络错误，请稍后重试')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">货币管理</h3>
          <p className="text-sm text-gray-600">管理您可以使用的货币</p>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">货币管理</h3>
        <p className="text-sm text-gray-600">
          管理您可以使用的货币。只有添加到可用列表的货币才能在账户、交易和汇率设置中使用。
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* 已选择的货币 */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          已选择的货币 ({userCurrencies.length})
        </h4>
        {userCurrencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userCurrencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-blue-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{currency.code}</span>
                      {currency.isCustom && (
                        <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                          自定义
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{currency.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveCurrency(currency.code)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-gray-500">还没有选择任何货币</div>
            <div className="text-sm text-gray-400 mt-1">请从下方添加您需要使用的货币</div>
          </div>
        )}
      </div>

      {/* 可添加的货币 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-900">可添加的货币</h4>
          <button
            onClick={() => setShowCustomForm(true)}
            className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            + 创建自定义货币
          </button>
        </div>

        {/* 自定义货币表单 */}
        {showCustomForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h5 className="text-sm font-medium text-gray-900 mb-3">创建自定义货币</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  货币代码 *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.code}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    code: e.target.value.toUpperCase()
                  }))}
                  placeholder="如: BTC, USDT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">3-10个大写字母或数字</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  货币名称 *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.name}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="如: Bitcoin, Tether"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  货币符号 *
                </label>
                <input
                  type="text"
                  value={customCurrencyForm.symbol}
                  onChange={(e) => setCustomCurrencyForm(prev => ({
                    ...prev,
                    symbol: e.target.value
                  }))}
                  placeholder="如: ₿, ₮"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateCustomCurrency}
                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCustomForm(false)
                  setCustomCurrencyForm({ code: '', name: '', symbol: '' })
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCurrencies
            .filter(currency => !currency.isSelected)
            .map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{currency.code}</span>
                      {currency.isCustom && (
                        <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                          自定义
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{currency.name}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddCurrency(currency.code)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    添加
                  </button>
                  {currency.isCustom && (
                    <button
                      onClick={() => handleDeleteCustomCurrency(currency.code)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 说明信息 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="text-sm font-medium text-yellow-800 mb-2">重要提示</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 您可以创建自定义货币（如加密货币、积分等）</li>
          <li>• 自定义货币代码必须是3-10个大写字母或数字的组合</li>
          <li>• 删除货币前，请确保没有相关的交易记录和汇率设置</li>
          <li>• 本位币不能被删除，如需更换请先在偏好设置中修改本位币</li>
          <li>• 建议至少保留一种主要货币（如 USD、EUR、CNY）</li>
        </ul>
      </div>
    </div>
  )
}

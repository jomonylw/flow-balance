'use client'

import { useState, useEffect } from 'react'

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

export default function TestCurrencyPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [newCurrency, setNewCurrency] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [accountsRes, currenciesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/user/currencies')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData.data || [])
      }

      if (currenciesRes.ok) {
        const currenciesData = await currenciesRes.json()
        setCurrencies(currenciesData.data?.currencies || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage('获取数据失败')
    }
  }

  const handleUpdateCurrency = async () => {
    if (!selectedAccount || !newCurrency) {
      setMessage('请选择账户和货币')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedAccount.name,
          categoryId: selectedAccount.category.id,
          currencyCode: newCurrency
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('✅ 货币设置成功')
        fetchData() // 重新获取数据
        setSelectedAccount(null)
        setNewCurrency('')
      } else {
        setMessage(`❌ 设置失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error updating currency:', error)
      setMessage('❌ 网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleTestBalanceUpdate = async () => {
    if (!selectedAccount) {
      setMessage('请选择账户')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 测试使用错误货币进行余额更新
      const wrongCurrency = currencies.find(c => c.code !== selectedAccount.currencyCode)?.code
      if (!wrongCurrency) {
        setMessage('没有其他货币可用于测试')
        return
      }

      const response = await fetch('/api/balance-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          currencyCode: wrongCurrency, // 故意使用错误货币
          balanceChange: 100,
          newBalance: 1100,
          updateDate: new Date().toISOString().split('T')[0],
          notes: '测试货币限制',
          updateType: 'adjustment'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('❌ 意外成功：应该阻止使用不同货币进行余额更新')
      } else {
        setMessage(`✅ 正确阻止余额更新: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing balance update:', error)
      setMessage('❌ 测试失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTestCorrectCurrency = async () => {
    if (!selectedAccount || !selectedAccount.currencyCode) {
      setMessage('请选择有货币限制的账户')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 测试使用正确货币进行余额更新
      const response = await fetch('/api/balance-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          currencyCode: selectedAccount.currencyCode, // 使用正确货币
          balanceChange: 50,
          newBalance: 1050,
          updateDate: new Date().toISOString().split('T')[0],
          notes: '测试正确货币',
          updateType: 'adjustment'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ 正确货币余额更新成功: ${result.message}`)
        fetchData() // 刷新数据
      } else {
        setMessage(`❌ 正确货币余额更新失败: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing correct currency:', error)
      setMessage('❌ 测试失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            账户货币设置功能测试
          </h1>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 账户列表 */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">账户列表</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccount?.id === account.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAccount(account)}
                >
                  <h3 className="font-medium text-gray-900">{account.name}</h3>
                  <p className="text-sm text-gray-600">{account.category.name}</p>
                  <p className="text-sm text-gray-500">
                    类型: {account.category.type}
                  </p>
                  {account.currencyCode ? (
                    <p className="text-sm font-medium text-green-600">
                      货币: {account.currency?.symbol} {account.currencyCode}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">未设置货币</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 操作区域 */}
          {selectedAccount && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                操作账户: {selectedAccount.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 设置货币 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">设置账户货币</h3>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择货币</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateCurrency}
                    disabled={loading || !newCurrency}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '设置中...' : '设置货币'}
                  </button>
                </div>

                {/* 测试正确货币 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">测试正确货币</h3>
                  <p className="text-sm text-gray-600">
                    使用账户限制的货币进行余额更新，应该成功
                  </p>
                  <button
                    onClick={handleTestCorrectCurrency}
                    disabled={loading || !selectedAccount.currencyCode}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '测试中...' : '测试正确货币'}
                  </button>
                  {!selectedAccount.currencyCode && (
                    <p className="text-xs text-gray-500">
                      需要先设置账户货币才能测试
                    </p>
                  )}
                </div>

                {/* 测试错误货币 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">测试错误货币</h3>
                  <p className="text-sm text-gray-600">
                    尝试使用不同货币进行余额更新，应该被阻止
                  </p>
                  <button
                    onClick={handleTestBalanceUpdate}
                    disabled={loading || !selectedAccount.currencyCode}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '测试中...' : '测试错误货币'}
                  </button>
                  {!selectedAccount.currencyCode && (
                    <p className="text-xs text-gray-500">
                      需要先设置账户货币才能测试
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 功能说明 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">功能说明</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 点击账户卡片选择要操作的账户</li>
              <li>• 为账户设置货币后，该账户的所有交易都将限制在此货币内</li>
              <li>• 账户有交易记录后，无法更换货币</li>
              <li>• 测试功能会尝试使用错误货币创建交易，验证限制是否生效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

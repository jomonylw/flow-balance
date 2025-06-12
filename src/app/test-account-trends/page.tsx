'use client'

import { useState, useEffect } from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import StockAccountTrendChart from '@/components/charts/StockAccountTrendChart'
import FlowAccountTrendChart from '@/components/charts/FlowAccountTrendChart'

const mockBaseCurrency = {
  code: 'CNY',
  symbol: '¥',
  name: '人民币'
}

const mockStockAccount = {
  id: 'test-stock-account',
  name: '测试资产账户',
  type: 'ASSET'
}

const mockFlowAccount = {
  id: 'test-flow-account',
  name: '测试收入账户',
  type: 'INCOME'
}

export default function TestAccountTrends() {
  const [mounted, setMounted] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  // 获取账户列表
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts')
        if (response.ok) {
          const result = await response.json()
          console.log('Accounts fetched:', result)
          setAccounts(result.accounts || [])
          if (result.accounts && result.accounts.length > 0) {
            setSelectedAccountId(result.accounts[0].id)
            setSelectedAccount(result.accounts[0])
          }
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      }
    }

    fetchAccounts()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    setSelectedAccountId(accountId)
    setSelectedAccount(account)
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              账户趋势图表测试页面
            </h1>

            {/* 账户选择 */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                选择账户
              </h2>
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">请选择账户</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.category?.type || 'Unknown'})
                  </option>
                ))}
              </select>
              
              {selectedAccount && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h3 className="font-semibold text-gray-900 dark:text-white">选中账户信息:</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    名称: {selectedAccount.name}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    类型: {selectedAccount.category?.type || 'Unknown'}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    分类: {selectedAccount.category?.name || 'Unknown'}
                  </p>
                </div>
              )}
            </div>

            {/* API测试 */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                API测试
              </h2>
              <button
                onClick={async () => {
                  if (!selectedAccountId) {
                    alert('请先选择账户')
                    return
                  }
                  
                  try {
                    const url = `/api/accounts/${selectedAccountId}/trends?range=lastYear&granularity=monthly`
                    console.log('Testing API:', url)
                    
                    const response = await fetch(url)
                    const result = await response.json()
                    
                    console.log('API Response:', result)
                    alert(`API调用成功！数据点数量: ${result.data?.length || 0}`)
                  } catch (error) {
                    console.error('API Error:', error)
                    alert('API调用失败: ' + error)
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                测试API调用
              </button>
            </div>

            {/* 图表展示 */}
            {selectedAccount && (
              <div className="space-y-8">
                {(selectedAccount.category?.type === 'ASSET' || selectedAccount.category?.type === 'LIABILITY') ? (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      存量账户趋势图表 (Stock Account)
                    </h2>
                    <StockAccountTrendChart
                      accountId={selectedAccountId}
                      account={{
                        id: selectedAccount.id,
                        name: selectedAccount.name,
                        type: selectedAccount.category?.type || 'ASSET'
                      }}
                      baseCurrency={mockBaseCurrency}
                      height={400}
                    />
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      流量账户趋势图表 (Flow Account)
                    </h2>
                    <FlowAccountTrendChart
                      accountId={selectedAccountId}
                      account={{
                        id: selectedAccount.id,
                        name: selectedAccount.name,
                        type: selectedAccount.category?.type || 'INCOME'
                      }}
                      baseCurrency={mockBaseCurrency}
                      height={400}
                    />
                  </div>
                )}
              </div>
            )}

            {!selectedAccount && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  请选择一个账户来查看趋势图表
                </p>
              </div>
            )}
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}

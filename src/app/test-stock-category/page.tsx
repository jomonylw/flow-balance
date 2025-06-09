'use client'

import { useState } from 'react'

interface HistoricalBalances {
  currentMonth: Record<string, number>
  lastMonth: Record<string, number>
  yearStart: Record<string, number>
  currentMonthInBaseCurrency: Record<string, number>
  lastMonthInBaseCurrency: Record<string, number>
  yearStartInBaseCurrency: Record<string, number>
}

interface AccountSummary {
  id: string
  name: string
  balances: Record<string, number>
  historicalBalances?: HistoricalBalances
}

interface ChildCategorySummary {
  id: string
  name: string
  balances: Record<string, number>
  historicalBalances?: HistoricalBalances
}

interface StockCategorySummary {
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
}

export default function TestStockCategoryPage() {
  const [summaryData, setSummaryData] = useState<StockCategorySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')

  const fetchSummary = async () => {
    if (!categoryId.trim()) {
      setError('请输入分类ID')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/categories/${categoryId}/summary`)
      const result = await response.json()
      
      if (result.success) {
        setSummaryData(result.data)
      } else {
        setError(result.error || '获取数据失败')
      }
    } catch (err) {
      setError('网络错误')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderHistoricalBalances = (historicalBalances?: HistoricalBalances) => {
    if (!historicalBalances) return <span className="text-gray-500">无历史余额数据</span>

    return (
      <div className="space-y-2 text-xs">
        <div>
          <strong>当月原币余额:</strong>
          {Object.entries(historicalBalances.currentMonth).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
        <div>
          <strong>上月原币余额:</strong>
          {Object.entries(historicalBalances.lastMonth).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
        <div>
          <strong>年初原币余额:</strong>
          {Object.entries(historicalBalances.yearStart).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
        <div>
          <strong>当月本币余额:</strong>
          {Object.entries(historicalBalances.currentMonthInBaseCurrency).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
        <div>
          <strong>上月本币余额:</strong>
          {Object.entries(historicalBalances.lastMonthInBaseCurrency).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
        <div>
          <strong>年初本币余额:</strong>
          {Object.entries(historicalBalances.yearStartInBaseCurrency).map(([currency, amount]) => (
            <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">存量类分类汇总测试</h1>
      
      <div className="mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">分类ID:</label>
            <input
              type="text"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded px-3 py-2 w-64"
              placeholder="输入存量类分类ID"
            />
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '加载中...' : '获取汇总'}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {summaryData && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">汇总数据</h2>
            <p><strong>子分类数量:</strong> {summaryData.children.length}</p>
            <p><strong>直属账户数量:</strong> {summaryData.accounts.length}</p>
          </div>

          {summaryData.children.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">子分类 ({summaryData.children.length})</h2>
              <div className="space-y-4">
                {summaryData.children.map((child) => (
                  <div key={child.id} className="border rounded p-4">
                    <h3 className="font-medium mb-2">{child.name}</h3>
                    <div className="mb-2">
                      <strong>当前余额:</strong>
                      {Object.entries(child.balances).map(([currency, amount]) => (
                        <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
                      ))}
                    </div>
                    {renderHistoricalBalances(child.historicalBalances)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {summaryData.accounts.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">直属账户 ({summaryData.accounts.length})</h2>
              <div className="space-y-4">
                {summaryData.accounts.map((account) => (
                  <div key={account.id} className="border rounded p-4">
                    <h3 className="font-medium mb-2">{account.name}</h3>
                    <div className="mb-2">
                      <strong>当前余额:</strong>
                      {Object.entries(account.balances).map(([currency, amount]) => (
                        <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
                      ))}
                    </div>
                    {renderHistoricalBalances(account.historicalBalances)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

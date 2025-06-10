'use client'

import { useState } from 'react'

// #region Updated Type Definitions
interface Balance {
  [currency: string]: number
}

interface MonthlyBalance {
  original: Balance
  converted: Balance
}

interface MonthlyChildCategorySummary {
  id: string
  name: string
  balances: MonthlyBalance
}

interface MonthlyAccountSummary {
  id: string
  name: string
  balances: MonthlyBalance
}

interface MonthlyReport {
  month: string
  childCategories: MonthlyChildCategorySummary[]
  directAccounts: MonthlyAccountSummary[]
}
// #endregion

export default function TestStockCategoryPage() {
  const [summaryData, setSummaryData] = useState<MonthlyReport[] | null>(null)
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
        setSummaryData(null)
      }
    } catch (err) {
      setError('网络错误')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderBalances = (balances: MonthlyBalance) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <strong>原币:</strong>
          {Object.entries(balances.original).length > 0 ? (
            Object.entries(balances.original).map(([currency, amount]) => (
              <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
            ))
          ) : (
            <span className="text-gray-500 ml-2">无</span>
          )}
        </div>
        <div>
          <strong>本币:</strong>
          {Object.entries(balances.converted).length > 0 ? (
            Object.entries(balances.converted).map(([currency, amount]) => (
              <span key={currency} className="ml-2">{currency}: {amount.toFixed(2)}</span>
            ))
          ) : (
            <span className="text-gray-500 ml-2">无</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">存量类分类月度汇总测试</h1>
      
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-grow">
            <label htmlFor="categoryId" className="block text-sm font-medium mb-2 text-gray-700">分类ID:</label>
            <input
              id="categoryId"
              type="text"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder="输入存量类分类ID"
            />
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '获取汇总'}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {summaryData && (
        <div className="space-y-8">
          {summaryData.map((report) => (
            <div key={report.month} className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                月份: {report.month}
              </h2>
              
              {report.childCategories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-600">子分类 ({report.childCategories.length})</h3>
                  <div className="space-y-4">
                    {report.childCategories.map((child) => (
                      <div key={child.id} className="border rounded p-4 bg-gray-50">
                        <h4 className="font-medium mb-2 text-gray-800">{child.name}</h4>
                        {renderBalances(child.balances)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.directAccounts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-600">直属账户 ({report.directAccounts.length})</h3>
                  <div className="space-y-4">
                    {report.directAccounts.map((account) => (
                      <div key={account.id} className="border rounded p-4 bg-gray-50">
                        <h4 className="font-medium mb-2 text-gray-800">{account.name}</h4>
                        {renderBalances(account.balances)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.childCategories.length === 0 && report.directAccounts.length === 0 && (
                <p className="text-gray-500">该月份无子分类和直属账户数据。</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

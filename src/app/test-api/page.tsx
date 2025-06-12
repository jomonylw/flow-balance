'use client'

import { useState } from 'react'

export default function TestAPI() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [accountId, setAccountId] = useState('')

  const testAPI = async () => {
    if (!accountId.trim()) {
      alert('请输入账户ID')
      return
    }

    setLoading(true)
    try {
      const url = `/api/accounts/${accountId}/trends?range=lastYear&granularity=monthly`
      console.log('Testing API:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('API Response:', data)
      setResult(data)
    } catch (error) {
      console.error('API Error:', error)
      setResult({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  const getAccounts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      
      console.log('Accounts:', data)
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          API 测试页面
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">获取账户列表</h2>
          <button
            onClick={getAccounts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '加载中...' : '获取账户'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试趋势API</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="输入账户ID"
              className="flex-1 p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={testAPI}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试趋势API'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">API 响应结果</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

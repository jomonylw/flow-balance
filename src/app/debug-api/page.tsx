'use client'

import { useState, useEffect } from 'react'

interface DashboardSummaryResponse {
  success: boolean
  data?: {
    netWorth?: {
      amount: number
      currency: {
        symbol: string
        code: string
      }
    }
    totalAssets?: {
      amount: number
      currency: {
        symbol: string
        code: string
      }
      accountCount: number
    }
    totalLiabilities?: {
      amount: number
      currency: {
        symbol: string
        code: string
      }
      accountCount: number
    }
  }
  error?: string
  message?: string
}

export default function DebugAPIPage() {
  const [apiResponse, setApiResponse] =
    useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/summary')

        if (response.ok) {
          const data = await response.json()
          setApiResponse(data)
        } else {
          const errorData = await response.json()
          setError(
            `API错误: ${response.status} - ${errorData.error || '未知错误'}`,
          )
        }
      } catch (err) {
        setError(`网络错误: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className='p-8'>
        <h1 className='text-2xl font-bold mb-4'>API调试页面</h1>
        <p>正在加载...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-8'>
        <h1 className='text-2xl font-bold mb-4'>API调试页面</h1>
        <div className='bg-red-50 border border-red-200 rounded p-4'>
          <p className='text-red-800'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>API调试页面</h1>

      <div className='space-y-6'>
        <div>
          <h2 className='text-lg font-semibold mb-2'>完整API响应:</h2>
          <pre className='bg-gray-100 p-4 rounded overflow-auto text-sm'>
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>

        {apiResponse?.data && (
          <div>
            <h2 className='text-lg font-semibold mb-2'>关键数据检查:</h2>
            <div className='bg-blue-50 p-4 rounded space-y-2'>
              <p>
                <strong>success:</strong> {String(apiResponse.success)}
              </p>
              <p>
                <strong>data存在:</strong> {String(!!apiResponse.data)}
              </p>
              <p>
                <strong>netWorth存在:</strong>{' '}
                {String(!!apiResponse.data.netWorth)}
              </p>
              <p>
                <strong>totalAssets存在:</strong>{' '}
                {String(!!apiResponse.data.totalAssets)}
              </p>
              <p>
                <strong>totalLiabilities存在:</strong>{' '}
                {String(!!apiResponse.data.totalLiabilities)}
              </p>

              {apiResponse.data.netWorth && (
                <p>
                  <strong>净资产金额:</strong>{' '}
                  {apiResponse.data.netWorth.amount}
                </p>
              )}

              {apiResponse.data.totalAssets && (
                <p>
                  <strong>总资产金额:</strong>{' '}
                  {apiResponse.data.totalAssets.amount}
                </p>
              )}

              {apiResponse.data.totalLiabilities && (
                <p>
                  <strong>总负债金额:</strong>{' '}
                  {apiResponse.data.totalLiabilities.amount}
                </p>
              )}
            </div>
          </div>
        )}

        {apiResponse?.data && (
          <div>
            <h2 className='text-lg font-semibold mb-2'>前端显示模拟:</h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* 总资产 */}
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <p className='text-sm font-medium text-blue-700'>总资产</p>
                <p className='text-xl font-bold text-blue-900'>
                  {apiResponse.data.totalAssets ? (
                    <>
                      {apiResponse.data.totalAssets.currency.symbol}
                      {apiResponse.data.totalAssets.amount.toLocaleString(
                        'zh-CN',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </>
                  ) : (
                    <>
                      {apiResponse.data.netWorth?.currency?.symbol || '¥'}
                      0.00
                    </>
                  )}
                </p>
                <p className='text-xs text-blue-600'>
                  {apiResponse.data.totalAssets
                    ? apiResponse.data.totalAssets.accountCount
                    : 0}{' '}
                  个账户
                </p>
              </div>

              {/* 总负债 */}
              <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                <p className='text-sm font-medium text-red-700'>总负债</p>
                <p className='text-xl font-bold text-red-900'>
                  {apiResponse.data.totalLiabilities ? (
                    <>
                      {apiResponse.data.totalLiabilities.currency.symbol}
                      {apiResponse.data.totalLiabilities.amount.toLocaleString(
                        'zh-CN',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </>
                  ) : (
                    <>
                      {apiResponse.data.netWorth?.currency?.symbol || '¥'}
                      0.00
                    </>
                  )}
                </p>
                <p className='text-xs text-red-600'>
                  {apiResponse.data.totalLiabilities
                    ? apiResponse.data.totalLiabilities.accountCount
                    : 0}{' '}
                  个账户
                </p>
              </div>

              {/* 净资产 */}
              <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                <p className='text-sm font-medium text-green-700'>净资产</p>
                <p className='text-xl font-bold text-green-900'>
                  {apiResponse.data.netWorth ? (
                    <>
                      {apiResponse.data.netWorth.amount >= 0 ? '+' : ''}
                      {apiResponse.data.netWorth.currency.symbol}
                      {apiResponse.data.netWorth.amount.toLocaleString(
                        'zh-CN',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </>
                  ) : (
                    '¥0.00'
                  )}
                </p>
                <p className='text-xs text-green-600'>资产 - 负债</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

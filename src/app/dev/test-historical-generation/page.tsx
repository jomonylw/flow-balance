'use client'

import { useState } from 'react'

export default function TestHistoricalGenerationPage() {
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)

  const handleGenerateHistorical = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        '/api/recurring-transactions/generate-historical',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || '生成失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupDuplicates = async () => {
    setCleanupLoading(true)
    setCleanupError(null)
    setCleanupResult(null)

    try {
      const response = await fetch(
        '/api/recurring-transactions/cleanup-duplicates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        setCleanupResult(data.data)
      } else {
        setCleanupError(data.error || '清理失败')
      }
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>定期交易历史记录生成测试</h1>

      <div className='space-y-4'>
        <div className='flex gap-4'>
          <button
            onClick={handleGenerateHistorical}
            disabled={loading}
            className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50'
          >
            {loading ? '生成中...' : '检查并生成历史遗漏记录'}
          </button>

          <button
            onClick={handleCleanupDuplicates}
            disabled={cleanupLoading}
            className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50'
          >
            {cleanupLoading ? '清理中...' : '清理重复记录'}
          </button>
        </div>

        {error && (
          <div className='p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
            <h3 className='font-bold'>生成错误:</h3>
            <p>{error}</p>
          </div>
        )}

        {cleanupError && (
          <div className='p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
            <h3 className='font-bold'>清理错误:</h3>
            <p>{cleanupError}</p>
          </div>
        )}

        {result && (
          <div className='p-4 bg-green-100 border border-green-400 text-green-700 rounded'>
            <h3 className='font-bold mb-2'>生成结果:</h3>
            <div className='space-y-2'>
              <p>
                <strong>总计生成:</strong> {result.totalGenerated} 条记录
              </p>
              <p>
                <strong>定期交易:</strong> {result.recurringGenerated} 条
              </p>
              <p>
                <strong>贷款还款:</strong> {result.loanGenerated} 条
              </p>
              <p>
                <strong>消息:</strong> {result.message}
              </p>

              {result.errors && result.errors.length > 0 && (
                <div className='mt-4'>
                  <h4 className='font-bold'>错误信息:</h4>
                  <ul className='list-disc list-inside'>
                    {result.errors.map((error: string, index: number) => (
                      <li key={index} className='text-red-600'>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {cleanupResult && (
          <div className='p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded'>
            <h3 className='font-bold mb-2'>清理结果:</h3>
            <div className='space-y-2'>
              <p>
                <strong>删除记录数:</strong> {cleanupResult.totalDeleted} 条
              </p>
              <p>
                <strong>消息:</strong> {cleanupResult.message}
              </p>

              {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                <div className='mt-4'>
                  <h4 className='font-bold'>错误信息:</h4>
                  <ul className='list-disc list-inside'>
                    {cleanupResult.errors.map(
                      (error: string, index: number) => (
                        <li key={index} className='text-red-600'>
                          {error}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className='mt-8 p-4 bg-gray-100 rounded'>
        <h2 className='text-lg font-bold mb-2'>功能说明</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h3 className='font-bold mb-2'>历史记录生成</h3>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              <li>检查所有活跃的定期交易，从开始日期到当前日期</li>
              <li>查找应该存在但实际缺失的交易记录</li>
              <li>批量创建遗漏的交易记录</li>
              <li>为遗漏的记录添加相应的标签</li>
              <li>同时处理定期交易和贷款合约的历史记录</li>
              <li>避免重复生成已存在的记录</li>
            </ul>
          </div>
          <div>
            <h3 className='font-bold mb-2'>重复记录清理</h3>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              <li>查找同一定期交易在同一天的重复记录</li>
              <li>保留最早创建的记录，删除其余重复记录</li>
              <li>同时清理相关的标签关联</li>
              <li>确保每个定期交易每天只有一条记录</li>
              <li>解决之前重复生成导致的数据问题</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

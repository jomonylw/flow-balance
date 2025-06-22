'use client'

import { useState, useEffect } from 'react'

interface SimpleAccountForDev {
  id: string
  name: string
  currencyCode: string
}

export default function CreateTestRecurringPage() {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<SimpleAccountForDev[]>([])
  const [result, setResult] = useState<{
    id: string
    description: string
    amount: number
    frequency: string
    startDate: string
    nextDate: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    accountId: '',
    type: 'EXPENSE',
    amount: '100',
    description: '测试定期交易',
    frequency: 'MONTHLY',
    interval: 1,
    dayOfMonth: 15,
    startDate: '2024-01-15', // 设置一个过去的日期来测试历史记录生成
    notes: '这是一个测试定期交易，用于验证历史记录生成功能',
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (data.success) {
        setAccounts(data.data.accounts)
        if (data.data.accounts.length > 0) {
          setFormData(prev => ({
            ...prev,
            accountId: data.data.accounts[0].id,
          }))
        }
      }
    } catch (err) {
      console.error('获取账户失败:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data.recurringTransaction)
      } else {
        setError(data.error || '创建失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>创建测试定期交易</h1>

      <form onSubmit={handleSubmit} className='space-y-4 max-w-md'>
        <div>
          <label className='block text-sm font-medium mb-1'>账户</label>
          <select
            value={formData.accountId}
            onChange={e =>
              setFormData(prev => ({ ...prev, accountId: e.target.value }))
            }
            className='w-full p-2 border rounded'
            required
          >
            <option value=''>选择账户</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>类型</label>
          <select
            value={formData.type}
            onChange={e =>
              setFormData(prev => ({ ...prev, type: e.target.value }))
            }
            className='w-full p-2 border rounded'
          >
            <option value='EXPENSE'>支出</option>
            <option value='INCOME'>收入</option>
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>金额</label>
          <input
            type='number'
            value={formData.amount}
            onChange={e =>
              setFormData(prev => ({ ...prev, amount: e.target.value }))
            }
            className='w-full p-2 border rounded'
            required
            min='0'
            step='0.01'
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>描述</label>
          <input
            type='text'
            value={formData.description}
            onChange={e =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            className='w-full p-2 border rounded'
            required
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>频率</label>
          <select
            value={formData.frequency}
            onChange={e =>
              setFormData(prev => ({ ...prev, frequency: e.target.value }))
            }
            className='w-full p-2 border rounded'
          >
            <option value='MONTHLY'>每月</option>
            <option value='WEEKLY'>每周</option>
            <option value='DAILY'>每日</option>
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>每月第几天</label>
          <input
            type='number'
            value={formData.dayOfMonth}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                dayOfMonth: parseInt(e.target.value),
              }))
            }
            className='w-full p-2 border rounded'
            min='1'
            max='31'
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>开始日期</label>
          <input
            type='date'
            value={formData.startDate}
            onChange={e =>
              setFormData(prev => ({ ...prev, startDate: e.target.value }))
            }
            className='w-full p-2 border rounded'
            required
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>备注</label>
          <textarea
            value={formData.notes}
            onChange={e =>
              setFormData(prev => ({ ...prev, notes: e.target.value }))
            }
            className='w-full p-2 border rounded'
            rows={3}
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50'
        >
          {loading ? '创建中...' : '创建测试定期交易'}
        </button>
      </form>

      {error && (
        <div className='mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded'>
          <h3 className='font-bold'>错误:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className='mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded'>
          <h3 className='font-bold mb-2'>创建成功:</h3>
          <div className='space-y-1 text-sm'>
            <p>
              <strong>ID:</strong> {result.id}
            </p>
            <p>
              <strong>描述:</strong> {result.description}
            </p>
            <p>
              <strong>金额:</strong> {result.amount}
            </p>
            <p>
              <strong>频率:</strong> {result.frequency}
            </p>
            <p>
              <strong>开始日期:</strong>{' '}
              {new Date(result.startDate).toLocaleDateString()}
            </p>
            <p>
              <strong>下次执行:</strong>{' '}
              {new Date(result.nextDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      <div className='mt-8 p-4 bg-gray-100 rounded'>
        <h2 className='text-lg font-bold mb-2'>说明</h2>
        <p className='text-sm'>
          创建一个开始日期为过去时间的定期交易，然后使用历史记录生成功能来测试是否能正确补全遗漏的交易记录。
        </p>
      </div>
    </div>
  )
}

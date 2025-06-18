'use client'

import { useState } from 'react'
import { useAllDataListener } from '@/hooks/business/useDataUpdateListener'
import {
  publishBalanceUpdate,
  publishTransactionCreate,
  publishAccountCreate,
  publishCategoryCreate,
} from '@/lib/services/data-update.service'

/**
 * 数据更新测试组件
 * 用于测试数据更新管理系统是否正常工作
 */
export default function DataUpdateTest() {
  const [events, setEvents] = useState<string[]>([])

  // 监听所有数据更新事件
  useAllDataListener(async event => {
    const timestamp = new Date().toLocaleTimeString()
    const eventInfo = `[${timestamp}] ${event.type} - Account: ${event.accountId || 'N/A'}, Category: ${event.categoryId || 'N/A'}`
    setEvents(prev => [eventInfo, ...prev.slice(0, 9)]) // 保留最近10条记录
  })

  const handleTestBalanceUpdate = async () => {
    await publishBalanceUpdate('test-account-1', {
      newBalance: 1000,
      currencyCode: 'CNY',
    })
  }

  const handleTestTransactionCreate = async () => {
    await publishTransactionCreate('test-account-1', 'test-category-1', {
      amount: 500,
      description: 'Test transaction',
    })
  }

  const handleTestAccountCreate = async () => {
    await publishAccountCreate('test-category-1', {
      name: 'Test Account',
      currencyCode: 'CNY',
    })
  }

  const handleTestCategoryCreate = async () => {
    await publishCategoryCreate('test-parent-category', {
      name: 'Test Category',
      type: 'ASSET',
    })
  }

  const clearEvents = () => {
    setEvents([])
  }

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
          数据更新系统测试
        </h2>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          <button
            onClick={handleTestBalanceUpdate}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            测试余额更新
          </button>

          <button
            onClick={handleTestTransactionCreate}
            className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
          >
            测试交易创建
          </button>

          <button
            onClick={handleTestAccountCreate}
            className='px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
          >
            测试账户创建
          </button>

          <button
            onClick={handleTestCategoryCreate}
            className='px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500'
          >
            测试分类创建
          </button>
        </div>

        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            事件日志 (最近10条)
          </h3>
          <button
            onClick={clearEvents}
            className='px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400'
          >
            清空日志
          </button>
        </div>

        <div className='bg-gray-50 dark:bg-gray-700 rounded-md p-4 min-h-[200px]'>
          {events.length === 0 ? (
            <p className='text-gray-500 dark:text-gray-400 text-center py-8'>
              暂无事件记录，点击上方按钮测试数据更新事件
            </p>
          ) : (
            <div className='space-y-2'>
              {events.map((event, index) => (
                <div
                  key={index}
                  className='text-sm font-mono text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-600 rounded border-l-4 border-blue-500'
                >
                  {event}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
          <h4 className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-2'>
            测试说明
          </h4>
          <ul className='text-sm text-blue-800 dark:text-blue-200 space-y-1'>
            <li>• 点击测试按钮会发布相应的数据更新事件</li>
            <li>• 事件会被监听器捕获并显示在日志中</li>
            <li>• 在实际应用中，这些事件会触发相关组件的数据刷新</li>
            <li>• 左侧侧边栏、面板组件等都会响应这些事件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

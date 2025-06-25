'use client'

import { useState } from 'react'
import Calendar from '@/components/ui/forms/Calendar'

export default function TestCalendarPage() {
  const [selectedDate, setSelectedDate] = useState('2024-01-15')
  const [calendarKey, setCalendarKey] = useState(0)

  const handleDateChange = (newDate: string) => {
    console.log('Date changed from', selectedDate, 'to', newDate)
    setSelectedDate(newDate)
    // 强制重新创建Calendar组件来测试
    setCalendarKey(prev => prev + 1)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
            Calendar组件测试页面
          </h1>
          <div className='space-x-4'>
            <button
              onClick={() => {
                setSelectedDate('2024-06-15')
                setCalendarKey(prev => prev + 1)
              }}
              className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            >
              设置为6月15日
            </button>
            <button
              onClick={() => {
                setSelectedDate('')
                setCalendarKey(prev => prev + 1)
              }}
              className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
            >
              清空日期
            </button>
            <button
              onClick={() => setCalendarKey(prev => prev + 1)}
              className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
            >
              重新创建Calendar
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {/* 基础日历 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              基础日历
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              当前选中: {selectedDate || '未选择'}
            </p>
            <div className='border border-gray-200 dark:border-gray-600 rounded-lg'>
              <Calendar
                key={`basic-calendar-${calendarKey}`}
                value={selectedDate}
                onChange={handleDateChange}
                showYearMonthSelector={true}
              />
            </div>
          </div>

          {/* 带限制的日历 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              带日期限制的日历
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
              限制范围: 2024-01-01 到 2024-12-31
            </p>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              当前选中: {selectedDate || '未选择'}
            </p>
            <div className='border border-gray-200 dark:border-gray-600 rounded-lg'>
              <Calendar
                key={`limited-calendar-${calendarKey}`}
                value={selectedDate}
                onChange={handleDateChange}
                minDate={new Date('2024-01-01')}
                maxDate={new Date('2024-12-31')}
                showYearMonthSelector={true}
              />
            </div>
          </div>

          {/* 简化日历 */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              简化日历（无年月选择器）
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              当前选中: {selectedDate || '未选择'}
            </p>
            <div className='border border-gray-200 dark:border-gray-600 rounded-lg'>
              <Calendar
                key={`simple-calendar-${calendarKey}`}
                value={selectedDate}
                onChange={handleDateChange}
                showYearMonthSelector={false}
              />
            </div>
          </div>

          {/* 测试说明 */}
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6'>
            <h2 className='text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4'>
              测试说明
            </h2>
            <div className='space-y-3 text-sm text-blue-800 dark:text-blue-200'>
              <div>
                <strong>左右按钮测试:</strong>
                <ul className='list-disc list-inside mt-1 space-y-1'>
                  <li>日期视图: 左右按钮应该切换月份</li>
                  <li>月份视图: 左右按钮应该切换年份</li>
                  <li>年份视图: 左右按钮应该切换十年</li>
                </ul>
              </div>

              <div>
                <strong>视图切换测试:</strong>
                <ul className='list-disc list-inside mt-1 space-y-1'>
                  <li>点击月年标题进入月份选择</li>
                  <li>在月份视图点击标题进入年份选择</li>
                  <li>选择年份后返回月份视图</li>
                  <li>选择月份后返回日期视图</li>
                </ul>
              </div>

              <div>
                <strong>日期限制测试:</strong>
                <ul className='list-disc list-inside mt-1 space-y-1'>
                  <li>尝试导航到限制范围外的日期</li>
                  <li>限制范围外的日期应该被禁用</li>
                  <li>左右按钮在边界处应该被限制</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 操作日志 */}
        <div className='mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            操作日志
          </h2>
          <div className='bg-gray-50 dark:bg-gray-700 rounded p-4 font-mono text-sm'>
            <p className='text-gray-600 dark:text-gray-400'>
              选中日期:{' '}
              <span className='text-blue-600 dark:text-blue-400'>
                {selectedDate}
              </span>
            </p>
            <p className='text-gray-600 dark:text-gray-400 mt-2'>
              时间戳:{' '}
              <span className='text-green-600 dark:text-green-400'>
                {new Date().toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

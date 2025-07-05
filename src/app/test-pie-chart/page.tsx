'use client'

import { useState } from 'react'
import FlowMonthlySummaryChart from '@/components/features/charts/FlowMonthlySummaryChart'
import type { FlowMonthlyData, SimpleCurrency } from '@/types/components'

// 模拟数据
const mockMonthlyData: FlowMonthlyData = {
  '2024-01': {
    CNY: {
      income: 15000,
      expense: 8000,
      balance: 7000,
      transactionCount: 25,
      categories: {
        工资收入: { income: 12000, expense: 0, balance: 12000 },
        投资收益: { income: 3000, expense: 0, balance: 3000 },
        餐饮支出: { income: 0, expense: 3000, balance: -3000 },
        交通支出: { income: 0, expense: 2000, balance: -2000 },
        购物支出: { income: 0, expense: 3000, balance: -3000 },
      },
    },
  },
  '2024-02': {
    CNY: {
      income: 16000,
      expense: 9000,
      balance: 7000,
      transactionCount: 28,
      categories: {
        工资收入: { income: 12000, expense: 0, balance: 12000 },
        投资收益: { income: 4000, expense: 0, balance: 4000 },
        餐饮支出: { income: 0, expense: 3500, balance: -3500 },
        交通支出: { income: 0, expense: 2500, balance: -2500 },
        购物支出: { income: 0, expense: 3000, balance: -3000 },
      },
    },
  },
  '2024-03': {
    CNY: {
      income: 14000,
      expense: 10000,
      balance: 4000,
      transactionCount: 32,
      categories: {
        工资收入: { income: 12000, expense: 0, balance: 12000 },
        投资收益: { income: 2000, expense: 0, balance: 2000 },
        餐饮支出: { income: 0, expense: 4000, balance: -4000 },
        交通支出: { income: 0, expense: 2000, balance: -2000 },
        购物支出: { income: 0, expense: 4000, balance: -4000 },
      },
    },
  },
}

const mockBaseCurrency: SimpleCurrency = {
  id: '1',
  code: 'CNY',
  name: '人民币',
  symbol: '¥',
  decimalPlaces: 2,
}

const mockAccounts = [
  { id: '1', name: '工资收入', color: '#10b981', type: 'INCOME' },
  { id: '2', name: '投资收益', color: '#059669', type: 'INCOME' },
  { id: '3', name: '餐饮支出', color: '#ef4444', type: 'EXPENSE' },
  { id: '4', name: '交通支出', color: '#dc2626', type: 'EXPENSE' },
  { id: '5', name: '购物支出', color: '#b91c1c', type: 'EXPENSE' },
]

export default function TestPieChartPage() {
  const [showPieChart, setShowPieChart] = useState(true)

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-8'>
          饼状图功能测试页面
        </h1>

        <div className='mb-6'>
          <label className='flex items-center space-x-2'>
            <input
              type='checkbox'
              checked={showPieChart}
              onChange={e => setShowPieChart(e.target.checked)}
              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
            />
            <span className='text-gray-700 dark:text-gray-300'>显示饼状图</span>
          </label>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            收入类图表演示
          </h2>
          <FlowMonthlySummaryChart
            monthlyData={mockMonthlyData}
            baseCurrency={mockBaseCurrency}
            title='月度收入汇总'
            height={showPieChart ? 600 : 400}
            showPieChart={showPieChart}
            accounts={mockAccounts.filter(acc => acc.type === 'INCOME')}
          />
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            支出类图表演示
          </h2>
          <FlowMonthlySummaryChart
            monthlyData={mockMonthlyData}
            baseCurrency={mockBaseCurrency}
            title='月度支出汇总'
            height={showPieChart ? 600 : 400}
            showPieChart={showPieChart}
            accounts={mockAccounts.filter(acc => acc.type === 'EXPENSE')}
          />
        </div>

        <div className='mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3'>
            使用说明
          </h3>
          <ul className='text-blue-800 dark:text-blue-200 space-y-2'>
            <li>• 点击柱状图的任意月份，饼状图会切换显示该月份的数据占比</li>
            <li>• 饼状图仅用于数据展示，不会影响柱状图的显示状态</li>
            <li>• 饼状图默认显示最新月份（2024-03）的数据</li>
            <li>• 使用上方的复选框可以切换是否显示饼状图</li>
            <li>• 大尺寸饼状图设计，提供清晰的数据可视化效果</li>
            <li>• 简洁设计，去除图例显示，数据标签直接显示在饼状图上</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

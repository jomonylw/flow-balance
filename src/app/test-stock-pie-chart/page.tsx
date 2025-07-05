'use client'

import { useState } from 'react'
import StockMonthlySummaryChart from '@/components/features/charts/StockMonthlySummaryChart'
import type {
  StockMonthlyData,
  SimpleCurrency,
  ChartStockAccount,
} from '@/types/components'

// 模拟存量类数据
const mockStockMonthlyData: StockMonthlyData = {
  '2024-01': {
    CNY: {
      accounts: {
        '1': { balance: 50000, name: '招商银行储蓄' },
        '2': { balance: 120000, name: '支付宝余额宝' },
        '3': { balance: 80000, name: '股票投资账户' },
        '4': { balance: -30000, name: '信用卡负债' },
        '5': { balance: -150000, name: '房贷' },
      },
      totalBalance: 70000,
    },
  },
  '2024-02': {
    CNY: {
      accounts: {
        '1': { balance: 55000, name: '招商银行储蓄' },
        '2': { balance: 125000, name: '支付宝余额宝' },
        '3': { balance: 85000, name: '股票投资账户' },
        '4': { balance: -25000, name: '信用卡负债' },
        '5': { balance: -148000, name: '房贷' },
      },
      totalBalance: 92000,
    },
  },
  '2024-03': {
    CNY: {
      accounts: {
        '1': { balance: 60000, name: '招商银行储蓄' },
        '2': { balance: 130000, name: '支付宝余额宝' },
        '3': { balance: 90000, name: '股票投资账户' },
        '4': { balance: -20000, name: '信用卡负债' },
        '5': { balance: -146000, name: '房贷' },
      },
      totalBalance: 114000,
    },
  },
  '2024-04': {
    CNY: {
      accounts: {
        '1': { balance: 65000, name: '招商银行储蓄' },
        '2': { balance: 135000, name: '支付宝余额宝' },
        '3': { balance: 95000, name: '股票投资账户' },
        '4': { balance: -15000, name: '信用卡负债' },
        '5': { balance: -144000, name: '房贷' },
      },
      totalBalance: 136000,
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

const mockAccounts: ChartStockAccount[] = [
  { id: '1', name: '招商银行储蓄', color: '#3b82f6', type: 'ASSET' },
  { id: '2', name: '支付宝余额宝', color: '#10b981', type: 'ASSET' },
  { id: '3', name: '股票投资账户', color: '#8b5cf6', type: 'ASSET' },
  { id: '4', name: '信用卡负债', color: '#f97316', type: 'LIABILITY' },
  { id: '5', name: '房贷', color: '#ef4444', type: 'LIABILITY' },
]

export default function TestStockPieChartPage() {
  const [showPieChart, setShowPieChart] = useState(true)

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-8'>
          存量类图表饼状图功能测试页面
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
            存量类账户余额图表演示
          </h2>
          <StockMonthlySummaryChart
            stockMonthlyData={mockStockMonthlyData}
            baseCurrency={mockBaseCurrency}
            title='月度账户余额汇总'
            height={showPieChart ? 600 : 400}
            showPieChart={showPieChart}
            accounts={mockAccounts}
          />
        </div>

        <div className='mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3'>
            使用说明
          </h3>
          <ul className='text-blue-800 dark:text-blue-200 space-y-2'>
            <li>
              • 点击柱状图的任意月份，饼状图会切换显示该月份的账户余额占比
            </li>
            <li>• 饼状图仅用于数据展示，不会影响柱状图的显示状态</li>
            <li>• 饼状图默认显示最新月份（2024-04）的数据</li>
            <li>• 使用上方的复选框可以切换是否显示饼状图</li>
            <li>• 饼状图显示各账户余额的绝对值占比，负值账户会标注为负数</li>
            <li>• 颜色与柱状图保持一致，确保视觉统一性</li>
            <li>• 支持时间范围切换（最近12个月 / 全部）</li>
          </ul>
        </div>

        <div className='mt-8 bg-green-50 dark:bg-green-900/20 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-green-900 dark:text-green-100 mb-3'>
            数据说明
          </h3>
          <ul className='text-green-800 dark:text-green-200 space-y-2'>
            <li>
              • <strong>资产账户</strong>
              ：招商银行储蓄、支付宝余额宝、股票投资账户（正值）
            </li>
            <li>
              • <strong>负债账户</strong>：信用卡负债、房贷（负值）
            </li>
            <li>• 饼状图显示各账户余额的绝对值占比，便于理解资产负债结构</li>
            <li>• 总余额线图显示净资产变化趋势</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

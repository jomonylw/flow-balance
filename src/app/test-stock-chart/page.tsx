'use client'

import { useState, useEffect } from 'react'
import StockMonthlySummaryChart from '@/components/charts/StockMonthlySummaryChart'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock data for testing
const mockStockMonthlyData = {
  '2024-01': {
    'USD': {
      accounts: {
        '1': { balance: 1000, name: '现金账户' },
        '2': { balance: 5000, name: '储蓄账户' },
        '3': { balance: 10000, name: '投资账户' }
      },
      totalBalance: 16000
    }
  },
  '2024-02': {
    'USD': {
      accounts: {
        '1': { balance: 1200, name: '现金账户' },
        '2': { balance: 5200, name: '储蓄账户' },
        '3': { balance: 10500, name: '投资账户' }
      },
      totalBalance: 16900
    }
  },
  '2024-03': {
    'USD': {
      accounts: {
        '1': { balance: 1100, name: '现金账户' },
        '2': { balance: 5300, name: '储蓄账户' },
        '3': { balance: 11000, name: '投资账户' }
      },
      totalBalance: 17400
    }
  },
  '2024-04': {
    'USD': {
      accounts: {
        '1': { balance: 1300, name: '现金账户' },
        '2': { balance: 5400, name: '储蓄账户' },
        '3': { balance: 11500, name: '投资账户' }
      },
      totalBalance: 18200
    }
  },
  '2024-05': {
    'USD': {
      accounts: {
        '1': { balance: 1250, name: '现金账户' },
        '2': { balance: 5500, name: '储蓄账户' },
        '3': { balance: 12000, name: '投资账户' }
      },
      totalBalance: 18750
    }
  },
  '2024-06': {
    'USD': {
      accounts: {
        '1': { balance: 1400, name: '现金账户' },
        '2': { balance: 5600, name: '储蓄账户' },
        '3': { balance: 12500, name: '投资账户' }
      },
      totalBalance: 19500
    }
  },
  '2024-07': {
    'USD': {
      accounts: {
        '1': { balance: 1350, name: '现金账户' },
        '2': { balance: 5700, name: '储蓄账户' },
        '3': { balance: 13000, name: '投资账户' }
      },
      totalBalance: 20050
    }
  },
  '2024-08': {
    'USD': {
      accounts: {
        '1': { balance: 1500, name: '现金账户' },
        '2': { balance: 5800, name: '储蓄账户' },
        '3': { balance: 13500, name: '投资账户' }
      },
      totalBalance: 20800
    }
  },
  '2024-09': {
    'USD': {
      accounts: {
        '1': { balance: 1450, name: '现金账户' },
        '2': { balance: 5900, name: '储蓄账户' },
        '3': { balance: 14000, name: '投资账户' }
      },
      totalBalance: 21350
    }
  },
  '2024-10': {
    'USD': {
      accounts: {
        '1': { balance: 1600, name: '现金账户' },
        '2': { balance: 6000, name: '储蓄账户' },
        '3': { balance: 14500, name: '投资账户' }
      },
      totalBalance: 22100
    }
  },
  '2024-11': {
    'USD': {
      accounts: {
        '1': { balance: 1550, name: '现金账户' },
        '2': { balance: 6100, name: '储蓄账户' },
        '3': { balance: 15000, name: '投资账户' }
      },
      totalBalance: 22650
    }
  },
  '2024-12': {
    'USD': {
      accounts: {
        '1': { balance: 1700, name: '现金账户' },
        '2': { balance: 6200, name: '储蓄账户' },
        '3': { balance: 15500, name: '投资账户' }
      },
      totalBalance: 23400
    }
  }
}

const mockBaseCurrency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar'
}

export default function TestStockChart() {
  const [mounted, setMounted] = useState(false)

  // Simulate mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              StockMonthlySummaryChart 测试页面
            </h1>

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  优化后的图表组件
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  特性：时间范围选择、余额变动线图、国际化支持、明暗主题
                </p>

                {/* 调试信息 */}
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                  <h3 className="font-semibold mb-2">调试信息:</h3>
                  <p>数据月份数量: {Object.keys(mockStockMonthlyData).length}</p>
                  <p>基础货币: {mockBaseCurrency.code} ({mockBaseCurrency.symbol})</p>
                  <p>第一个月数据: {JSON.stringify(mockStockMonthlyData['2024-01'])}</p>
                </div>

                <StockMonthlySummaryChart
                  stockMonthlyData={mockStockMonthlyData}
                  baseCurrency={mockBaseCurrency}
                  height={500}
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  测试说明
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>✅ 移除了底部摘要信息（当前总余额、平均余额、账户数量）</li>
                  <li>✅ 添加了时间范围选择器（近一年/全部）</li>
                  <li>✅ 添加了余额变动趋势线图</li>
                  <li>✅ 支持国际化（中英文切换）</li>
                  <li>✅ 支持明暗主题切换</li>
                  <li>✅ 构建成功，无TypeScript错误</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}

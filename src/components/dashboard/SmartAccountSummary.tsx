'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import QuickBalanceUpdateModal from './QuickBalanceUpdateModal'
import { useUserData } from '@/contexts/UserDataContext'
import { useTheme } from '@/contexts/ThemeContext'

interface Currency {
  code: string
  symbol: string
  name: string
}

interface Account {
  id: string
  name: string
  category: {
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  balances: Record<string, number>
}

interface SmartAccountSummaryProps {
  accounts: Account[]
  baseCurrency: Currency
}

export default function SmartAccountSummary({
  accounts,
  baseCurrency
}: SmartAccountSummaryProps) {
  const { refreshAccounts } = useUserData()
  const { resolvedTheme } = useTheme()
  const [selectedPeriod, setSelectedPeriod] = useState('month') // month, quarter, year
  const [flowData, setFlowData] = useState<any>(null)
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)

  // 处理余额更新
  const handleBalanceUpdate = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBalanceUpdateSuccess = () => {
    // 刷新账户数据
    refreshAccounts()
  }

  // 按账户类型分组账户
  const accountsByType = accounts.reduce((acc, account) => {
    const type = account.category.type || 'ASSET'
    if (!acc[type]) acc[type] = []
    acc[type].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  // 计算存量数据（资产、负债）
  const calculateStockData = (accountType: 'ASSET' | 'LIABILITY') => {
    const typeAccounts = accountsByType[accountType] || []
    let total = 0
    
    typeAccounts.forEach(account => {
      const balance = account.balances[baseCurrency.code] || 0
      total += balance
    })
    
    return {
      total,
      accounts: typeAccounts,
      count: typeAccounts.length
    }
  }

  // 获取流量数据（收入、支出）
  const fetchFlowData = async () => {
    try {
      const endDate = new Date()
      let startDate = new Date()
      
      switch (selectedPeriod) {
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }
      
      const response = await fetch(
        `/api/reports/cash-flow?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const result = await response.json()
        setFlowData(result.data)
      }
    } catch (error) {
      console.error('Error fetching flow data:', error)
    }
  }

  useEffect(() => {
    fetchFlowData()
  }, [selectedPeriod])

  const formatCurrency = (amount: number) => {
    return `${baseCurrency.symbol}${Math.abs(amount).toLocaleString('zh-CN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const assetData = calculateStockData('ASSET')
  const liabilityData = calculateStockData('LIABILITY')
  const netWorth = assetData.total - liabilityData.total

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 资产总计 - 存量数据 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            总资产 (存量)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(assetData.total)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {assetData.count} 个账户
          </div>
          <div className="mt-2 space-y-1">
            {assetData.accounts.slice(0, 3).map(account => (
              <div key={account.id} className="flex justify-between text-xs">
                <span className="text-blue-600 truncate">{account.name}</span>
                <span className="text-blue-800 font-medium">
                  {formatCurrency(account.balances[baseCurrency.code] || 0)}
                </span>
              </div>
            ))}
            {assetData.accounts.length > 3 && (
              <div className="text-xs text-blue-500">
                还有 {assetData.accounts.length - 3} 个账户...
              </div>
            )}
          </div>

          {/* 更新余额按钮 */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <button
              onClick={handleBalanceUpdate}
              className="w-full flex items-center justify-center px-3 py-2 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新余额
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 负债总计 - 存量数据 */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700">
            总负债 (存量)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-900">
            {formatCurrency(liabilityData.total)}
          </div>
          <div className="text-xs text-red-600 mt-1">
            {liabilityData.count} 个账户
          </div>
          <div className="mt-2 space-y-1">
            {liabilityData.accounts.slice(0, 3).map(account => (
              <div key={account.id} className="flex justify-between text-xs">
                <span className="text-red-600 truncate">{account.name}</span>
                <span className="text-red-800 font-medium">
                  {formatCurrency(account.balances[baseCurrency.code] || 0)}
                </span>
              </div>
            ))}
            {liabilityData.accounts.length > 3 && (
              <div className="text-xs text-red-500">
                还有 {liabilityData.accounts.length - 3} 个账户...
              </div>
            )}
          </div>

          {/* 更新余额按钮 */}
          <div className="mt-3 pt-3 border-t border-red-200">
            <button
              onClick={handleBalanceUpdate}
              className="w-full flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新余额
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 净资产 */}
      <Card className={`border-green-200 ${netWorth >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium ${netWorth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            净资产
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {netWorth >= 0 ? '+' : '-'}{formatCurrency(netWorth)}
          </div>
          <div className={`text-xs mt-1 ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            资产 - 负债
          </div>
          <div className={`mt-2 text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div>资产: {formatCurrency(assetData.total)}</div>
            <div>负债: {formatCurrency(liabilityData.total)}</div>
          </div>
        </CardContent>
      </Card>

      {/* 现金流 - 流量数据 */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-purple-700">
              现金流 (流量)
            </CardTitle>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={`text-xs border border-purple-300 rounded px-2 py-1 ${
                resolvedTheme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
              }`}
            >
              <option value="month">近1月</option>
              <option value="quarter">近3月</option>
              <option value="year">近1年</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {flowData ? (
            <div>
              <div className={`text-2xl font-bold ${
                (flowData.cashFlow.netCashFlow[baseCurrency.code] || 0) >= 0 
                  ? 'text-green-900' 
                  : 'text-red-900'
              }`}>
                {(flowData.cashFlow.netCashFlow[baseCurrency.code] || 0) >= 0 ? '+' : ''}
                {formatCurrency(flowData.cashFlow.netCashFlow[baseCurrency.code] || 0)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                净现金流
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">经营现金流:</span>
                  <span className="text-green-800 font-medium">
                    +{formatCurrency(flowData.cashFlow.operatingActivities.net[baseCurrency.code] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">投资现金流:</span>
                  <span className="text-blue-800 font-medium">
                    {(flowData.cashFlow.investingActivities.net[baseCurrency.code] || 0) >= 0 ? '+' : ''}
                    {formatCurrency(flowData.cashFlow.investingActivities.net[baseCurrency.code] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">筹资现金流:</span>
                  <span className="text-orange-800 font-medium">
                    {(flowData.cashFlow.financingActivities.net[baseCurrency.code] || 0) >= 0 ? '+' : ''}
                    {formatCurrency(flowData.cashFlow.financingActivities.net[baseCurrency.code] || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>加载中...</div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* 快速余额更新模态框 */}
    <QuickBalanceUpdateModal
      isOpen={isBalanceUpdateModalOpen}
      onClose={() => setIsBalanceUpdateModalOpen(false)}
      onSuccess={handleBalanceUpdateSuccess}
    />
  </>
  )
}

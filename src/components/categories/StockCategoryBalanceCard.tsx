'use client'

import { useState, useEffect } from 'react'

interface Account {
  id: string
  name: string
  balances: Record<string, number>
  transactionCount: number
}

interface StockCategoryBalanceCardProps {
  categoryId: string
  categoryName: string
  categoryType: 'ASSET' | 'LIABILITY'
  currencySymbol: string
  baseCurrency: {
    code: string
    symbol: string
    name: string
  }
}

export default function StockCategoryBalanceCard({
  categoryId,
  categoryName,
  categoryType,
  currencySymbol,
  baseCurrency
}: StockCategoryBalanceCardProps) {
  const [balanceData, setBalanceData] = useState<{
    accounts: Account[]
    totalBalance: number
    currencyBreakdown: Record<string, number>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/categories/${categoryId}/summary`)
        
        if (response.ok) {
          const result = await response.json()
          const accounts = result.data.accounts || []
          
          // 计算总余额和币种分布
          let totalBalance = 0
          const currencyBreakdown: Record<string, number> = {}
          
          accounts.forEach((account: Account) => {
            Object.entries(account.balances).forEach(([currency, balance]) => {
              if (!currencyBreakdown[currency]) {
                currencyBreakdown[currency] = 0
              }
              currencyBreakdown[currency] += balance
              
              // 如果是基础货币，累计到总余额
              if (currency === baseCurrency.code) {
                totalBalance += balance
              }
            })
          })
          
          setBalanceData({
            accounts,
            totalBalance,
            currencyBreakdown
          })
        }
      } catch (error) {
        console.error('Error fetching balance data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalanceData()
  }, [categoryId, baseCurrency.code])

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!balanceData) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          无法加载余额数据
        </div>
      </div>
    )
  }

  const { accounts, totalBalance, currencyBreakdown } = balanceData

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {categoryName} - 余额汇总
        </h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          categoryType === 'ASSET' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {categoryType === 'ASSET' ? '资产' : '负债'} • 存量数据
        </span>
      </div>

      {/* 总余额显示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-2">
            {baseCurrency.code} 总余额
          </div>
          <div className={`text-3xl font-bold ${
            totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {currencySymbol}{Math.abs(totalBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {totalBalance < 0 && <span className="text-sm ml-1">(负)</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            共 {accounts.length} 个账户
          </div>
        </div>
      </div>

      {/* 币种分布 */}
      {Object.keys(currencyBreakdown).length > 1 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">币种分布</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(currencyBreakdown).map(([currency, balance]) => (
              <div key={currency} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{currency}</span>
                  <span className={`font-semibold ${
                    balance >= 0 ? 'text-gray-900' : 'text-red-600'
                  }`}>
                    {currency === baseCurrency.code ? currencySymbol : ''}
                    {Math.abs(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {balance < 0 && <span className="text-xs ml-1">(负)</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 账户列表 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">账户明细</h4>
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {account.transactionCount} 笔记录
                  </div>
                </div>
                <div className="text-right">
                  {Object.entries(account.balances).map(([currency, balance]) => (
                    <div key={currency} className="text-sm">
                      <span className="text-gray-500">{currency}: </span>
                      <span className={`font-semibold ${
                        balance >= 0 ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {currency === baseCurrency.code ? currencySymbol : ''}
                        {Math.abs(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {balance < 0 && <span className="text-xs ml-1">(负)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明文字 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-700">
          💡 存量数据显示的是账户在各个时点的余额状态，反映资产或负债的存量情况。
          {categoryType === 'ASSET' ? '正值表示拥有的资产。' : '正值表示需要偿还的负债。'}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import SmartPasteModal from '@/components/ui/data-input/SmartPasteModal'
import type { TransactionBatchResult } from '@/types/core'
import { AccountType } from '@/types/core/constants'

export default function TestSmartPastePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>(
    AccountType.EXPENSE
  )
  const [lastResult, setLastResult] = useState<TransactionBatchResult | null>(
    null
  )

  const handleSuccess = (result: TransactionBatchResult) => {
    setLastResult(result)
    console.log('Smart paste result:', result)
  }

  const mockAccount = {
    id: 'test-account-1',
    name: '测试账户',
    currencyId: 'cny-id',
    categoryId: 'expense-category-id',
    category: {
      id: 'expense-category-id',
      name: '日常支出',
      type: AccountType.EXPENSE,
    },
    currency: {
      id: 'cny-id',
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
      decimalPlaces: 2,
      isCustom: false,
      createdBy: null,
    },
    description: '测试账户描述',
    color: '#3B82F6',
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6'>
            智能粘贴表格测试页面
          </h1>

          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                账户类型
              </label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value as AccountType)}
                className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100'
              >
                <option value={AccountType.INCOME}>收入</option>
                <option value={AccountType.EXPENSE}>支出</option>
              </select>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            >
              <svg
                className='mr-2 h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              打开智能粘贴表格
            </button>

            {lastResult && (
              <div className='mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md'>
                <h3 className='text-lg font-medium text-green-800 dark:text-green-200 mb-2'>
                  最后一次操作结果
                </h3>
                <div className='text-sm text-green-700 dark:text-green-300'>
                  <p>成功处理: {lastResult.processedCount} 条</p>
                  <p>错误数量: {lastResult.errorCount} 条</p>
                  <p>警告数量: {lastResult.warnings.length} 条</p>
                  {lastResult.warnings.length > 0 && (
                    <div className='mt-2'>
                      <p className='font-medium'>警告信息:</p>
                      <ul className='list-disc list-inside'>
                        {lastResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lastResult.errors.length > 0 && (
                    <div className='mt-2'>
                      <p className='font-medium'>错误信息:</p>
                      <ul className='list-disc list-inside'>
                        {lastResult.errors.map((error, index) => (
                          <li key={index}>
                            第 {error.rowIndex + 1} 行 {error.field}:{' '}
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className='mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md'>
              <h3 className='text-lg font-medium text-blue-800 dark:text-blue-200 mb-2'>
                使用说明
              </h3>
              <div className='text-sm text-blue-700 dark:text-blue-300 space-y-2'>
                <p>1. 点击&ldquo;打开智能粘贴表格&rdquo;按钮</p>
                <p>
                  2. 在表格中手动输入数据或从Excel/Google Sheets复制粘贴数据
                </p>
                <p>
                  3. <strong>列粘贴功能</strong>
                  ：复制Excel中的一整列数据，在对应列的任意单元格中粘贴，表格会自动扩展行数
                </p>
                <p>4. 系统会实时验证数据格式和完整性</p>
                <p>5. 绿色勾选表示行数据验证通过</p>
                <p>6. 红色错误表示数据有问题需要修正</p>
                <p>7. 黄色警告表示数据可用但建议检查</p>
                <p>8. 只有所有数据验证通过后才能提交</p>
                <p>9. 支持撤销/重做操作 (Ctrl+Z / Ctrl+Y)</p>
                <p>10. 支持键盘导航 (方向键、Tab、Enter)</p>
              </div>
            </div>

            <div className='mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md'>
              <h3 className='text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2'>
                测试数据示例
              </h3>
              <div className='text-sm text-yellow-700 dark:text-yellow-300 space-y-3'>
                <div>
                  <p className='font-medium'>整行粘贴数据（Tab分隔）：</p>
                  <pre className='mt-1 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs overflow-x-auto'>
                    {`2024-01-15	50.00	午餐	麦当劳
2024-01-15	25.50	交通	地铁费用
2024-01-16	120.00	购物	超市采购
2024-01-16	8.00	饮料	咖啡`}
                  </pre>
                </div>

                <div>
                  <p className='font-medium'>列粘贴数据示例：</p>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-2 mt-1'>
                    <div>
                      <p className='text-xs font-medium'>日期列：</p>
                      <pre className='p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs'>
                        {`2024-01-15
2024-01-16
2024-01-17
2024-01-18`}
                      </pre>
                    </div>
                    <div>
                      <p className='text-xs font-medium'>金额列：</p>
                      <pre className='p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs'>
                        {`50.00
25.50
120.00
8.00`}
                      </pre>
                    </div>
                    <div>
                      <p className='text-xs font-medium'>描述列：</p>
                      <pre className='p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs'>
                        {`午餐
交通
购物
饮料`}
                      </pre>
                    </div>
                  </div>
                  <p className='text-xs mt-2 text-yellow-600 dark:text-yellow-400'>
                    💡
                    复制任意一列数据，在表格对应列的单元格中粘贴，表格会自动扩展行数
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SmartPasteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        accountType={accountType}
        selectedAccount={mockAccount}
        title={`${accountType === AccountType.INCOME ? '收入' : '支出'}批量录入测试`}
      />
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import SmartPasteModal from '@/components/ui/data-input/SmartPasteModal'
import { AccountType } from '@/types/core/constants'
import type { SimpleAccount } from '@/types/core'

/**
 * 智能表格UI美化演示页面
 */
export default function SmartPasteUIDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 模拟账户数据
  const mockAccount: SimpleAccount = {
    id: 'demo-account',
    name: '演示账户',
    currencyId: 'cny',
    categoryId: 'demo-category',
    category: {
      id: 'demo-category',
      name: '演示分类',
      type: AccountType.EXPENSE,
    },
    currency: {
      id: 'cny',
      code: 'CNY',
      name: '人民币',
      symbol: '¥',
      decimalPlaces: 2,
    },
    color: '#3b82f6',
  }

  const handleSuccess = () => {
    console.log('批量录入成功')
    setIsModalOpen(false)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/20 p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* 页面标题 */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent mb-4'>
            智能表格UI美化演示
          </h1>
          <p className='text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto'>
            展示批量录入智能表格的全新美化设计，包括现代化的色彩搭配、优雅的交互动画和清晰的状态反馈
          </p>
        </div>

        {/* 功能特性展示 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50'>
            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4'>
              <svg
                className='w-6 h-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z'
                />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
              现代化设计
            </h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              采用渐变背景、圆角边框和阴影效果，打造现代化的视觉体验
            </p>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50'>
            <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4'>
              <svg
                className='w-6 h-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
              状态反馈
            </h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              清晰的验证状态指示，包括成功、错误、警告等不同状态的视觉表达
            </p>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50'>
            <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4'>
              <svg
                className='w-6 h-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 10V3L4 14h7v7l9-11h-7z'
                />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
              流畅动画
            </h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              微妙的过渡动画和交互效果，提升用户操作的流畅感和愉悦度
            </p>
          </div>
        </div>

        {/* 演示按钮 */}
        <div className='text-center'>
          <button
            onClick={() => setIsModalOpen(true)}
            className='px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105'
          >
            <div className='flex items-center space-x-3'>
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
              <span>打开智能表格演示</span>
            </div>
          </button>
        </div>

        {/* 设计说明 */}
        <div className='mt-12 bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200/50 dark:border-gray-700/50'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6'>
            设计亮点
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3'>
                色彩系统
              </h3>
              <ul className='space-y-2 text-gray-600 dark:text-gray-400'>
                <li className='flex items-center space-x-2'>
                  <div className='w-3 h-3 bg-blue-500 rounded-full'></div>
                  <span>主色调：蓝色系 (#3b82f6)</span>
                </li>
                <li className='flex items-center space-x-2'>
                  <div className='w-3 h-3 bg-green-500 rounded-full'></div>
                  <span>成功状态：绿色系</span>
                </li>
                <li className='flex items-center space-x-2'>
                  <div className='w-3 h-3 bg-red-500 rounded-full'></div>
                  <span>错误状态：红色系</span>
                </li>
                <li className='flex items-center space-x-2'>
                  <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
                  <span>警告状态：黄色系</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3'>
                交互效果
              </h3>
              <ul className='space-y-2 text-gray-600 dark:text-gray-400'>
                <li>• 悬停时的渐变背景变化</li>
                <li>• 选中状态的边框高亮</li>
                <li>• 编辑模式的阴影提升</li>
                <li>• 按钮的缩放动画效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 智能表格模态框 */}
      <SmartPasteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        accountType={AccountType.EXPENSE}
        selectedAccount={mockAccount}
        showAccountSelector={false}
        title='智能表格UI美化演示'
      />
    </div>
  )
}

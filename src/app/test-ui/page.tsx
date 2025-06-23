'use client'

import { useState } from 'react'
import OptimizedCategoryAccountTree from '@/components/features/layout/OptimizedCategoryAccountTree'

/**
 * UI测试页面 - 用于测试左侧树状菜单的改进效果
 */
export default function TestUIPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          左侧树状菜单UI测试
        </h1>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索账户..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            账户树状菜单
          </h2>
          
          <OptimizedCategoryAccountTree
            searchQuery={searchQuery}
            onNavigate={() => console.log('导航点击')}
          />
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            测试说明
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 展开账户类型分组，查看统一的背景色和边框包裹效果</li>
            <li>• 鼠标悬停在账户项目上，查看账户颜色的hover效果</li>
            <li>• 测试搜索功能和展开/折叠状态</li>
            <li>• 切换明暗主题查看适配效果</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

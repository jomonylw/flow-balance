'use client'

import DataUpdateTest from '@/components/debug/DataUpdateTest'

export default function TestDataUpdatePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            数据更新联动测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试数据更新事件系统是否正常工作
          </p>
        </div>
        
        <DataUpdateTest />
        
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            测试说明
          </h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                如何测试实时联动更新：
              </h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>打开多个浏览器标签页，分别访问：
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Dashboard页面 (/dashboard)</li>
                    <li>某个账户详情页面 (/accounts/[id])</li>
                    <li>某个分类详情页面 (/categories/[id])</li>
                    <li>当前测试页面 (/test-data-update)</li>
                  </ul>
                </li>
                <li>在任意页面进行以下操作：
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>更新账户余额</li>
                    <li>创建/编辑/删除交易</li>
                    <li>添加新的分类或账户</li>
                  </ul>
                </li>
                <li>观察其他页面是否自动更新：
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>左侧侧边栏的金额数据</li>
                    <li>账户详情页面的交易列表和图表</li>
                    <li>分类详情页面的汇总数据</li>
                    <li>Dashboard的概览数据</li>
                  </ul>
                </li>
                <li>在当前测试页面点击测试按钮，观察事件日志</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                预期行为：
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>所有相关页面应该自动刷新数据，无需手动刷新页面</li>
                <li>左侧侧边栏的金额应该实时更新</li>
                <li>账户详情页面的交易列表和图表应该自动更新</li>
                <li>测试页面应该显示相应的事件日志</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

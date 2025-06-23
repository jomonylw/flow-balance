'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/providers/LanguageContext'

export default function DevIndexPage() {
  const { t } = useLanguage()

  const devPages = [
    {
      title: 'DateInput 组件演示',
      description: '展示国际化日期输入组件的各种功能和效果',
      href: '/dev/date-input-demo',
      status: '🆕 新增',
      category: 'UI组件'
    },
    {
      title: '设置预览',
      description: '预览用户设置和偏好配置',
      href: '/dev/settings-preview',
      status: '✅ 可用',
      category: '设置'
    },
    {
      title: '创建测试循环交易',
      description: '创建测试用的循环交易数据',
      href: '/dev/create-test-recurring',
      status: '✅ 可用',
      category: '数据'
    },
    {
      title: '测试历史数据生成',
      description: '测试历史数据生成功能',
      href: '/dev/test-historical-generation',
      status: '✅ 可用',
      category: '数据'
    }
  ]

  const categories = [...new Set(devPages.map(page => page.category))]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            开发工具和演示页面
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Flow Balance 开发和测试工具集合
          </p>
        </div>

        {/* 快速导航 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🎯 推荐查看
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dev/date-input-demo"
              className="inline-flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              🆕 DateInput 组件演示
            </Link>
            <Link
              href="/dev/settings-preview"
              className="inline-flex items-center px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
            >
              ⚙️ 设置预览
            </Link>
          </div>
        </div>

        {/* 按分类显示页面 */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devPages
                .filter(page => page.category === category)
                .map(page => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {page.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        page.status.includes('新增')
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {page.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {page.description}
                    </p>
                    
                    <div className="flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium">
                      查看演示
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}

        {/* 使用说明 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            使用说明
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                🎯 DateInput 组件演示
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 展示新的日期输入组件功能</li>
                <li>• 测试国际化和格式化效果</li>
                <li>• 对比新旧组件的差异</li>
                <li>• 实时切换语言和日期格式</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                ⚙️ 其他工具
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 设置预览：查看用户配置</li>
                <li>• 数据生成：创建测试数据</li>
                <li>• 历史生成：测试数据处理</li>
                <li>• 更多工具持续添加中...</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 返回主页 */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回主页
          </Link>
        </div>
      </div>
    </div>
  )
}

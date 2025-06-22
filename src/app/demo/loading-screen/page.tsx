'use client'

import { useState } from 'react'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/data-display/card'
import { useLanguage } from '@/contexts/providers/LanguageContext'

export default function LoadingScreenDemo() {
  const { t: _t } = useLanguage()
  const [currentDemo, setCurrentDemo] = useState<string | null>(null)

  const messageTypes = [
    { key: 'loading', label: '默认加载' },
    { key: 'redirecting', label: '重定向' },
    { key: 'processing', label: '处理中' },
    { key: 'initializing', label: '初始化' },
    { key: 'preparing', label: '准备中' },
    { key: 'loading-data', label: '加载数据' },
    { key: 'loading-page', label: '加载页面' },
    { key: 'loading-app', label: '启动应用' },
    { key: 'auth-checking', label: '认证检查' },
  ] as const

  const variants = [
    { key: 'spin', label: '旋转' },
    { key: 'pulse', label: '脉冲' },
    { key: 'dots', label: '点动画' },
    { key: 'bars', label: '柱状' },
    { key: 'ring', label: '环形' },
  ] as const

  if (currentDemo) {
    return (
      <div className='relative'>
        <LoadingScreen
          messageType={
            currentDemo as
              | 'loading'
              | 'redirecting'
              | 'processing'
              | 'initializing'
              | 'preparing'
              | 'loading-data'
              | 'loading-page'
              | 'loading-app'
              | 'auth-checking'
          }
          variant='spin'
          showAppTitle={currentDemo === 'loading-app'}
          showBackground={true}
        />
        <button
          onClick={() => setCurrentDemo(null)}
          className='absolute top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
        >
          返回演示
        </button>
      </div>
    )
  }

  return (
    <div className='container mx-auto p-6 space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          LoadingScreen 组件展示
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          支持国际化、主题适配和多种加载样式的全屏加载组件
        </p>
      </div>

      {/* 消息类型展示 */}
      <Card>
        <CardHeader>
          <CardTitle>消息类型 (Message Types)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
            {messageTypes.map(type => (
              <button
                key={type.key}
                onClick={() => setCurrentDemo(type.key)}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left'
              >
                <h3 className='font-medium text-gray-900 dark:text-gray-100 mb-1'>
                  {type.label}
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {type.key}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 动画样式展示 */}
      <Card>
        <CardHeader>
          <CardTitle>动画样式 (Variants)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-6'>
            {variants.map(variant => (
              <div key={variant.key} className='text-center space-y-4'>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {variant.label}
                </h3>
                <div className='h-32 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg'>
                  <LoadingScreen
                    messageType='loading'
                    variant={
                      variant.key as 'spin' | 'pulse' | 'dots' | 'bars' | 'ring'
                    }
                    showBackground={false}
                    className='h-full'
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 特殊场景展示 */}
      <Card>
        <CardHeader>
          <CardTitle>特殊场景</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* 应用启动页面 */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                应用启动页面
              </h3>
              <div className='h-64 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                <LoadingScreen
                  messageType='loading-app'
                  variant='spin'
                  showAppTitle={true}
                  showBackground={true}
                  className='h-full'
                />
              </div>
            </div>

            {/* 认证检查 */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                认证检查
              </h3>
              <div className='h-64 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                <LoadingScreen
                  messageType='auth-checking'
                  variant='pulse'
                  showBackground={true}
                  className='h-full'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 自定义消息展示 */}
      <Card>
        <CardHeader>
          <CardTitle>自定义消息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                自定义中文消息
              </h3>
              <div className='h-48 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                <LoadingScreen
                  message='正在同步您的财务数据...'
                  variant='dots'
                  showBackground={true}
                  className='h-full'
                />
              </div>
            </div>

            <div className='space-y-4'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                自定义英文消息
              </h3>
              <div className='h-48 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
                <LoadingScreen
                  message='Synchronizing your financial data...'
                  variant='bars'
                  showBackground={true}
                  className='h-full'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 使用示例代码 */}
      <Card>
        <CardHeader>
          <CardTitle>使用示例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                基础用法
              </h4>
              <pre className='bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto'>
                {`// 默认加载屏幕
<LoadingScreen />

// 指定消息类型
<LoadingScreen messageType="auth-checking" />

// 自定义消息
<LoadingScreen message="正在处理您的请求..." />

// 应用启动页面
<LoadingScreen 
  messageType="loading-app" 
  showAppTitle={true} 
  variant="spin" 
/>`}
              </pre>
            </div>

            <div>
              <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                高级配置
              </h4>
              <pre className='bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto'>
                {`// 完整配置
<LoadingScreen
  messageType="loading-data"
  variant="pulse"
  showAppTitle={false}
  showBackground={true}
  className="custom-class"
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

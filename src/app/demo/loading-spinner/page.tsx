'use client'

import LoadingSpinner, {
  LoadingSpinnerSVG,
} from '@/components/ui/feedback/LoadingSpinner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/data-display/card'
import { useLanguage } from '@/contexts/providers/LanguageContext'

export default function LoadingSpinnerDemo() {
  const { t: _t } = useLanguage()

  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
  const colors = ['primary', 'secondary', 'muted', 'white', 'current'] as const
  const variants = ['spin', 'pulse', 'dots', 'bars', 'ring'] as const

  return (
    <div className='container mx-auto p-6 space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          LoadingSpinner 组件展示
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          扁平、美观、和谐、统一的加载动画组件
        </p>
      </div>

      {/* 不同样式展示 */}
      <Card>
        <CardHeader>
          <CardTitle>动画样式 (Variants)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-8'>
            {variants.map(variant => (
              <div key={variant} className='text-center space-y-4'>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 capitalize'>
                  {variant}
                </h3>
                <LoadingSpinner
                  variant={variant}
                  size='lg'
                  showText
                  text={variant}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 不同尺寸展示 */}
      <Card>
        <CardHeader>
          <CardTitle>尺寸大小 (Sizes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-5 gap-8'>
            {sizes.map(size => (
              <div key={size} className='text-center space-y-4'>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 uppercase'>
                  {size}
                </h3>
                <LoadingSpinner size={size} showText text={size} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 不同颜色展示 */}
      <Card>
        <CardHeader>
          <CardTitle>颜色主题 (Colors)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-8'>
            {colors.map(color => (
              <div key={color} className='text-center space-y-4'>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 capitalize'>
                  {color}
                </h3>
                <LoadingSpinner color={color} size='lg' showText text={color} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 内联展示 */}
      <Card>
        <CardHeader>
          <CardTitle>内联使用 (Inline)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <p className='text-gray-700 dark:text-gray-300'>
              正在加载数据 <LoadingSpinner inline size='sm' color='primary' />
            </p>
            <p className='text-gray-700 dark:text-gray-300'>
              处理中{' '}
              <LoadingSpinner
                inline
                size='sm'
                variant='dots'
                color='secondary'
              />
            </p>
            <p className='text-gray-700 dark:text-gray-300'>
              请稍候{' '}
              <LoadingSpinner inline size='sm' variant='bars' color='muted' />
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SVG版本展示 */}
      <Card>
        <CardHeader>
          <CardTitle>SVG 版本 (用于按钮)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex flex-wrap gap-4'>
              <button className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'>
                <LoadingSpinnerSVG size='sm' color='white' />
                <span>加载中</span>
              </button>

              <button className='flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700'>
                <LoadingSpinnerSVG size='sm' variant='dots' color='current' />
                <span>处理中</span>
              </button>

              <button className='flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'>
                <LoadingSpinnerSVG size='sm' variant='bars' color='white' />
                <span>删除中</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 深色背景展示 */}
      <Card>
        <CardHeader>
          <CardTitle>深色背景展示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='bg-gray-900 dark:bg-gray-950 p-6 rounded-lg space-y-4'>
            <div className='grid grid-cols-2 md:grid-cols-5 gap-8'>
              {variants.map(variant => (
                <div key={variant} className='text-center space-y-4'>
                  <h3 className='text-sm font-medium text-gray-300 capitalize'>
                    {variant}
                  </h3>
                  <LoadingSpinner
                    variant={variant}
                    size='lg'
                    color='white'
                    showText
                    text={variant}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 组合展示 */}
      <Card>
        <CardHeader>
          <CardTitle>组合展示</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                数据加载
              </h3>
              <LoadingSpinner
                variant='spin'
                size='xl'
                color='primary'
                showText
              />
            </div>

            <div className='text-center space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                文件上传
              </h3>
              <LoadingSpinner
                variant='bars'
                size='xl'
                color='secondary'
                showText
                text='上传中...'
              />
            </div>

            <div className='text-center space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                同步数据
              </h3>
              <LoadingSpinner
                variant='pulse'
                size='xl'
                color='muted'
                showText
                text='同步中...'
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

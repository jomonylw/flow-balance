'use client'

import { useState } from 'react'

interface MobilePreviewProps {
  children: React.ReactNode
}

export default function MobilePreview({ children }: MobilePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  )

  const getViewportStyles = () => {
    switch (viewMode) {
      case 'mobile':
        return {
          width: '375px',
          height: '667px',
          border: '8px solid #333',
          borderRadius: '20px',
          overflow: 'hidden',
        }
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          border: '8px solid #333',
          borderRadius: '12px',
          overflow: 'hidden',
        }
      default:
        return {
          width: '100%',
          height: '100vh',
          border: 'none',
          borderRadius: '0',
          overflow: 'auto',
        }
    }
  }

  return (
    <div className='min-h-screen bg-gray-100 p-4'>
      {/* 控制面板 */}
      <div className='mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
        <h3 className='text-lg font-medium text-gray-900 mb-3'>响应式预览</h3>
        <div className='flex space-x-2'>
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'desktop'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            桌面端
          </button>
          <button
            onClick={() => setViewMode('tablet')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'tablet'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            平板端
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'mobile'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            移动端
          </button>
        </div>
        <p className='text-sm text-gray-500 mt-2'>
          当前视图:{' '}
          {viewMode === 'desktop'
            ? '桌面端'
            : viewMode === 'tablet'
              ? '平板端'
              : '移动端'}
          {viewMode !== 'desktop' && ` (${getViewportStyles().width})`}
        </p>
      </div>

      {/* 预览区域 */}
      <div className='flex justify-center'>
        <div style={getViewportStyles()} className='bg-white shadow-lg'>
          <div className='w-full h-full overflow-auto'>{children}</div>
        </div>
      </div>
    </div>
  )
}

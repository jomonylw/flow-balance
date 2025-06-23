'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/providers/ToastContext'
import Modal from '@/components/ui/feedback/Modal'
import MobileSidebarOverlay from '@/components/features/layout/MobileSidebarOverlay'

export default function TestToastZIndexPage() {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)

  const handleShowToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: '成功', message: '这是一个成功的toast通知' },
      error: { title: '错误', message: '这是一个错误的toast通知' },
      warning: { title: '警告', message: '这是一个警告的toast通知' },
      info: { title: '信息', message: '这是一个信息的toast通知' },
    }
    
    const { title, message } = messages[type]
    
    switch (type) {
      case 'success':
        showSuccess(title, message)
        break
      case 'error':
        showError(title, message)
        break
      case 'warning':
        showWarning(title, message)
        break
      case 'info':
        showInfo(title, message)
        break
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8'>
          Toast Z-Index 测试页面
        </h1>
        
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            Toast 通知测试
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            点击下面的按钮来测试不同类型的toast通知。Toast应该显示在所有遮罩层的最顶部。
          </p>
          
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            <button
              onClick={() => handleShowToast('success')}
              className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
            >
              成功 Toast
            </button>
            <button
              onClick={() => handleShowToast('error')}
              className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
            >
              错误 Toast
            </button>
            <button
              onClick={() => handleShowToast('warning')}
              className='px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors'
            >
              警告 Toast
            </button>
            <button
              onClick={() => handleShowToast('info')}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              信息 Toast
            </button>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            遮罩层测试
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            打开模态框或侧边栏，然后触发toast通知，验证toast是否显示在遮罩层之上，同时确保模态框内容可以正常操作。
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <button
              onClick={() => setShowModal(true)}
              className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
            >
              打开模态框 (z-index: 50)
            </button>
            <button
              onClick={() => setShowSidebar(true)}
              className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors lg:hidden'
            >
              打开移动侧边栏 (z-index: 50)
            </button>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            Z-Index 层级说明
          </h2>
          <div className='space-y-2 text-sm text-gray-600 dark:text-gray-400'>
            <div>• Toast 通知: z-index 80 (NOTIFICATION)</div>
            <div>• 工具提示: z-index 70 (TOOLTIP)</div>
            <div>• 弹出框: z-index 60 (POPOVER)</div>
            <div>• 模态框: z-index 50 (MODAL)</div>
            <div>• 模态框背景: z-index 40 (MODAL_BACKDROP)</div>
            <div>• 下拉菜单: z-index 10 (DROPDOWN)</div>
          </div>
        </div>
      </div>

      {/* 模态框 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title='测试模态框'
      >
        <div className='space-y-4'>
          <p className='text-gray-600 dark:text-gray-400'>
            这是一个测试模态框。现在点击下面的按钮来触发toast通知，验证toast是否显示在模态框之上，同时确保这些按钮可以正常点击。
          </p>

          <div className='grid grid-cols-2 gap-4'>
            <button
              onClick={() => handleShowToast('success')}
              className='px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm'
            >
              成功 Toast
            </button>
            <button
              onClick={() => handleShowToast('error')}
              className='px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm'
            >
              错误 Toast
            </button>
          </div>

          <div className='mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              ✅ 如果你能看到并点击这些按钮，说明模态框层级正常
            </p>
          </div>
        </div>
      </Modal>

      {/* 移动侧边栏 */}
      <MobileSidebarOverlay
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      >
        <div className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            测试侧边栏
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            这是一个测试侧边栏。点击下面的按钮来触发toast通知，验证toast是否显示在侧边栏之上。
          </p>
          
          <div className='space-y-3'>
            <button
              onClick={() => handleShowToast('warning')}
              className='w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm'
            >
              警告 Toast
            </button>
            <button
              onClick={() => handleShowToast('info')}
              className='w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm'
            >
              信息 Toast
            </button>
          </div>
        </div>
      </MobileSidebarOverlay>
    </div>
  )
}

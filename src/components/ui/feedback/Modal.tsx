'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // 确保点击的是背景遮罩层，而不是模态框内容
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        (event.target as Element)?.classList?.contains('modal-backdrop')
      ) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const modalContent = (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-2 sm:p-4'>
        {/* 背景遮罩 */}
        <div className='modal-backdrop fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity' />

        {/* 模态框内容 */}
        <div
          ref={modalRef}
          className={`
            relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-800 shadow-xl transform transition-all
            mx-2 sm:mx-0 rounded-lg sm:rounded-lg
            max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col
          `}
        >
          {/* 头部 */}
          <div className='flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate pr-4'>
              {title}
            </h3>
            <button
              onClick={onClose}
              className='flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-md p-1 touch-manipulation'
              aria-label='关闭'
            >
              <svg
                className='h-5 w-5 sm:h-6 sm:w-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          {/* 内容 */}
          <div className='flex-grow p-4 sm:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-800/50'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  if (!isMounted) {
    return null
  }

  return createPortal(modalContent, document.body)
}

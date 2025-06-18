'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import Toast, { ToastProps } from './Toast'

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onClose'>[]
  onRemoveToast: (id: string) => void
}

export default function ToastContainer({
  toasts,
  onRemoveToast,
}: ToastContainerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return createPortal(
    <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 w-full max-w-md px-4 sm:px-0'>
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={onRemoveToast} />
      ))}
    </div>,
    document.body
  )
}

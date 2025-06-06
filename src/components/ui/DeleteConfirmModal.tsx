'use client'

import { useState } from 'react'
import Modal from './Modal'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  itemName: string
  itemType: string
  onConfirm: () => void
  onCancel: () => void
  hasRelatedData?: boolean
  relatedDataMessage?: string
  onClearRelatedData?: () => void
  clearDataLabel?: string
  requiresPassword?: boolean
  onPasswordConfirm?: (password: string) => void
  children?: React.ReactNode
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  hasRelatedData = false,
  relatedDataMessage,
  onClearRelatedData,
  clearDataLabel = '清空相关数据',
  requiresPassword = false,
  onPasswordConfirm,
  children
}: DeleteConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [showClearDataOption, setShowClearDataOption] = useState(false)

  const handleConfirm = () => {
    if (requiresPassword && onPasswordConfirm) {
      onPasswordConfirm(password)
    } else {
      onConfirm()
    }
  }

  const handleClearData = () => {
    if (onClearRelatedData) {
      onClearRelatedData()
    }
  }

  const handleClose = () => {
    setPassword('')
    setShowClearDataOption(false)
    onCancel()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="text-center">
        {/* 危险图标 */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {title}
        </h3>
        
        <div className="space-y-4 mb-6 text-left">
          <p className="text-gray-700 text-sm text-center">
            确定要删除{itemType}「<span className="font-medium text-gray-900">{itemName}</span>」吗？
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">
              ⚠️ 此操作不可撤销，请谨慎操作。
            </p>
          </div>

          {hasRelatedData && relatedDataMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-yellow-800 text-sm mb-2">
                {relatedDataMessage}
              </p>
              {onClearRelatedData && (
                <button
                  type="button"
                  onClick={() => setShowClearDataOption(true)}
                  className="text-yellow-700 underline text-sm hover:text-yellow-900"
                >
                  {clearDataLabel}
                </button>
              )}
            </div>
          )}

          {showClearDataOption && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-orange-800 text-sm mb-3">
                将先清空相关数据，然后删除{itemType}。此操作不可撤销。
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleClearData}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  确认清空并删除
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearDataOption(false)}
                  className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {requiresPassword && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                请输入密码确认删除：
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
              />
            </div>
          )}

          {children}
        </div>

        {!showClearDataOption && (
          <div className="flex justify-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={requiresPassword && !password.trim()}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认删除
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

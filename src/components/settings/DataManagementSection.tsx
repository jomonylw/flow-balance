'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

export default function DataManagementSection() {
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [message, setMessage] = useState('')

  const handleExportData = async () => {
    setIsExporting(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/data/export', {
        method: 'GET',
      })

      if (response.ok) {
        // 创建下载链接
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `flow-balance-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setMessage('数据导出成功')
      } else {
        const data = await response.json()
        setMessage(`导出失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Export data error:', error)
      setMessage('导出失败: 网络错误')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('请输入密码确认删除')
      return
    }

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await response.json()

      if (response.ok) {
        // 删除成功，重定向到登录页
        window.location.href = '/login'
      } else {
        setDeleteError(data.error || '删除失败')
      }
    } catch (error) {
      console.error('Delete account error:', error)
      setDeleteError('删除失败: 网络错误')
    }
  }

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    setDeletePassword('')
    setDeleteError('')
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeletePassword('')
    setDeleteError('')
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${
          message.includes('成功')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.includes('成功') ? (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {message}
          </div>
        </div>
      )}

      {/* 数据导出 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-medium text-gray-900 mb-2">导出数据</h4>
            <p className="text-sm text-gray-600 mb-4">
              导出您的所有数据，包括账户、分类、交易记录等。数据将以JSON格式下载，方便您备份或迁移到其他系统。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h5 className="text-sm font-medium text-blue-900 mb-2">导出内容包括：</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 所有账户信息和余额</li>
                <li>• 所有交易记录</li>
                <li>• 分类和标签设置</li>
                <li>• 货币和汇率配置</li>
                <li>• 个人偏好设置</li>
              </ul>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  导出中...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出我的数据
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 危险操作区域 */}
      <div className="bg-white border border-red-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-medium text-red-900 mb-2">删除账户</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ 警告：此操作将永久删除您的账户和所有相关数据
              </p>
              <p className="text-sm text-red-700 mb-3">删除的数据包括：</p>
              <ul className="text-sm text-red-700 space-y-1 mb-3">
                <li>• 所有账户和余额信息</li>
                <li>• 所有交易记录</li>
                <li>• 所有分类和标签</li>
                <li>• 个人设置和偏好</li>
              </ul>
              <p className="text-sm text-red-800 font-medium">
                此操作无法撤销！建议在删除前先导出您的数据。
              </p>
            </div>
            <button
              onClick={openDeleteModal}
              className="w-full sm:w-auto bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <span className="flex items-center justify-center sm:justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除我的账户
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="确认删除账户"
        message=""
        confirmLabel="确认删除"
        cancelLabel="取消"
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteModal}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            您即将永久删除您的账户和所有数据。此操作无法撤销。
          </p>
          <p className="text-gray-700">
            请输入您的密码以确认删除：
          </p>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="请输入密码"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
        </div>
      </ConfirmationModal>
    </div>
  )
}

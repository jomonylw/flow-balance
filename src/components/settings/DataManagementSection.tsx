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
      <div>
        <h3 className="text-lg font-medium text-gray-900">数据管理</h3>
        <p className="text-sm text-gray-600">导出您的数据或删除账户</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded ${
          message.includes('成功') 
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* 数据导出 */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="text-lg font-medium text-blue-900 mb-2">导出数据</h4>
        <p className="text-sm text-blue-700 mb-4">
          导出您的所有数据，包括账户、分类、交易记录等。数据将以JSON格式下载。
        </p>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出我的数据'}
        </button>
      </div>

      {/* 删除账户 */}
      <div className="bg-red-50 p-6 rounded-lg">
        <h4 className="text-lg font-medium text-red-900 mb-2">删除账户</h4>
        <p className="text-sm text-red-700 mb-4">
          <strong>警告：</strong>此操作将永久删除您的账户和所有相关数据，包括：
        </p>
        <ul className="text-sm text-red-700 mb-4 list-disc list-inside space-y-1">
          <li>所有账户和余额信息</li>
          <li>所有交易记录</li>
          <li>所有分类和标签</li>
          <li>个人设置和偏好</li>
        </ul>
        <p className="text-sm text-red-700 mb-4">
          <strong>此操作无法撤销！</strong>建议在删除前先导出您的数据。
        </p>
        <button
          onClick={openDeleteModal}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          删除我的账户
        </button>
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

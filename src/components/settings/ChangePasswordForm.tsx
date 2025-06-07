'use client'

import { useState } from 'react'
import InputField from '@/components/ui/InputField'

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // 清除消息
    if (message) setMessage('')
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = '请输入当前密码'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = '请输入新密码'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = '新密码长度至少为6位'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认新密码'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = '新密码不能与当前密码相同'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('密码修改成功')
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setErrors({ general: data.error || '密码修改失败' })
      }
    } catch (error) {
      console.error('Change password error:', error)
      setErrors({ general: '网络错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.general}
          </div>
        </div>
      )}

      {/* 密码修改表单 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <span className="mr-2">🔒</span>
            修改密码
          </h3>
          <p className="text-sm text-gray-600 mt-1">为了账户安全，请定期更换密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            type="password"
            name="currentPassword"
            label="当前密码"
            placeholder="请输入当前密码"
            value={formData.currentPassword}
            onChange={handleInputChange}
            error={errors.currentPassword}
            required
          />

          <InputField
            type="password"
            name="newPassword"
            label="新密码"
            placeholder="请输入新密码（至少6位）"
            value={formData.newPassword}
            onChange={handleInputChange}
            error={errors.newPassword}
            required
            help="密码长度至少为6位，建议使用字母、数字和特殊字符的组合"
          />

          <InputField
            type="password"
            name="confirmPassword"
            label="确认新密码"
            placeholder="请再次输入新密码"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            required
          />

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  修改中...
                </span>
              ) : (
                '修改密码'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 安全提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-yellow-800 mb-3 flex items-center">
          <span className="mr-2">⚠️</span>
          安全提示
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-yellow-700">
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>密码长度至少为6位</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>建议使用字母、数字和特殊字符的组合</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>定期更换密码以确保账户安全</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>不要在多个网站使用相同密码</span>
          </div>
        </div>
      </div>

      {/* 其他安全选项 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🛡️</span>
          其他安全选项
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">两步验证</p>
              <p className="text-xs text-gray-500">增强账户安全性</p>
            </div>
            <button
              disabled
              className="bg-gray-300 text-gray-500 px-3 py-1.5 rounded-md cursor-not-allowed text-sm"
            >
              即将推出
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">登录历史</p>
              <p className="text-xs text-gray-500">查看最近的登录记录</p>
            </div>
            <button
              disabled
              className="bg-gray-300 text-gray-500 px-3 py-1.5 rounded-md cursor-not-allowed text-sm"
            >
              即将推出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

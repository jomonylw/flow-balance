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
      <div>
        <h3 className="text-lg font-medium text-gray-900">安全设置</h3>
        <p className="text-sm text-gray-600">修改您的登录密码</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}

      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '修改中...' : '修改密码'}
          </button>
        </div>
      </form>

      <div className="border-t pt-6">
        <div className="bg-yellow-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">安全提示</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 密码长度至少为6位</li>
            <li>• 建议使用字母、数字和特殊字符的组合</li>
            <li>• 定期更换密码以确保账户安全</li>
            <li>• 不要在多个网站使用相同密码</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

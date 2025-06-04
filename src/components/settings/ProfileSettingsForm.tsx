'use client'

import { useState } from 'react'
import { User } from '@prisma/client'
import InputField from '@/components/ui/InputField'

interface ProfileSettingsFormProps {
  user: User
}

export default function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const [formData, setFormData] = useState({
    email: user.email,
    nickname: user.email.split('@')[0] // 临时使用邮箱前缀作为昵称
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: formData.nickname
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('个人资料更新成功')
      } else {
        setError(data.error || '更新失败')
      }
    } catch (error) {
      console.error('Update profile error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">个人资料</h3>
        <p className="text-sm text-gray-600">更新您的个人信息</p>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          type="email"
          name="email"
          label="邮箱"
          value={formData.email}
          onChange={handleInputChange}
          disabled={true}
          help="邮箱地址不可修改"
        />

        <InputField
          type="text"
          name="nickname"
          label="昵称"
          placeholder="请输入昵称"
          value={formData.nickname}
          onChange={handleInputChange}
        />

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存更改'}
          </button>
        </div>
      </form>

      <div className="border-t pt-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">头像上传</h4>
          <p className="text-sm text-gray-600 mb-3">
            头像上传功能将在后续版本中提供
          </p>
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
          >
            上传头像（即将推出）
          </button>
        </div>
      </div>
    </div>
  )
}

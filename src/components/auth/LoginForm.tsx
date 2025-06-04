'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'

export default function LoginForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // 清除通用错误
    if (generalError) {
      setGeneralError('')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
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
    setGeneralError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        // 登录成功，重定向到 dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        setGeneralError(result.error || '登录失败')
      }
    } catch (error) {
      console.error('Login error:', error)
      setGeneralError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {generalError}
        </div>
      )}

      <InputField
        type="email"
        name="email"
        label="邮箱"
        placeholder="请输入您的邮箱"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      <InputField
        type="password"
        name="password"
        label="密码"
        placeholder="请输入您的密码"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <AuthButton
        type="submit"
        label="登录"
        isLoading={isLoading}
        disabled={isLoading}
      />

      <div className="text-center space-y-2">
        <Link 
          href="/forgot-password" 
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          忘记密码？
        </Link>
        
        <div className="text-sm text-gray-600">
          还没有账户？{' '}
          <Link 
            href="/signup" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            立即注册
          </Link>
        </div>
      </div>
    </form>
  )
}

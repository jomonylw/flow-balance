'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'

export default function SignupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // 清除通用错误和成功消息
    if (generalError) {
      setGeneralError('')
    }
    if (successMessage) {
      setSuccessMessage('')
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
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符'
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = '密码需要包含至少一个小写字母'
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = '密码需要包含至少一个数字'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
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
    setSuccessMessage('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage('注册成功！正在跳转到初始设置...')
        // 2秒后自动跳转到登录页
        setTimeout(() => {
          router.push('/login?redirect=setup')
        }, 2000)
      } else {
        setGeneralError(result.error || '注册失败')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setGeneralError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {generalError && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
          {generalError}
        </div>
      )}

      {successMessage && (
        <div className='bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded'>
          {successMessage}
        </div>
      )}

      <InputField
        type='email'
        name='email'
        label='邮箱'
        placeholder='请输入您的邮箱'
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      <InputField
        type='password'
        name='password'
        label='密码'
        placeholder='至少6个字符，包含字母和数字'
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <InputField
        type='password'
        name='confirmPassword'
        label='确认密码'
        placeholder='请再次输入密码'
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      <AuthButton
        type='submit'
        label='注册'
        isLoading={isLoading}
        disabled={isLoading || !!successMessage}
      />

      <div className='text-center'>
        <div className='text-sm text-gray-600'>
          已有账户？{' '}
          <Link
            href='/login'
            className='text-blue-600 hover:text-blue-500 font-medium'
          >
            立即登录
          </Link>
        </div>
      </div>
    </form>
  )
}

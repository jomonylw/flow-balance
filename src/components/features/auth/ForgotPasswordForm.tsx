'use client'

import { useState } from 'react'
import Link from 'next/link'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    // 清除错误和成功消息
    if (error) setError('')
    if (successMessage) setSuccessMessage('')
  }

  const validateForm = () => {
    if (!email) {
      setError('请输入邮箱')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(
          data.data.message ||
            '如果该邮箱已注册，您将收到密码重置链接。请检查您的邮箱。'
        )
        setEmail('')
      } else {
        setError(data.error || '发送重置链接失败')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
          {error}
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
        placeholder='请输入您的注册邮箱'
        value={email}
        onChange={handleChange}
        error={error}
        required
        disabled={!!successMessage}
      />

      <AuthButton
        type='submit'
        label='发送重置链接'
        isLoading={isLoading}
        disabled={isLoading || !!successMessage}
      />

      <div className='text-center'>
        <Link
          href='/login'
          className='text-sm text-blue-600 hover:text-blue-500'
        >
          返回登录
        </Link>
      </div>
    </form>
  )
}

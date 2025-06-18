'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 如果没有令牌，显示错误信息
  if (!token) {
    return (
      <div className='w-full max-w-md mx-auto'>
        <div className='bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4'>
          <h2 className='text-2xl font-bold text-center text-gray-800 mb-6'>
            重置密码
          </h2>
          <div className='text-center'>
            <p className='text-red-600 mb-4'>无效的重置链接</p>
            <Link
              href='/forgot-password'
              className='text-blue-600 hover:text-blue-800 underline'
            >
              重新申请密码重置
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.password) {
      newErrors.password = '请输入新密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少为6位'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认新密码'
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
    setMessage('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('密码重置成功！正在跳转到登录页面...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setErrors({ general: data.error || '重置密码失败' })
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setErrors({ general: '网络错误，请稍后重试' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <div className='bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4'>
        <h2 className='text-2xl font-bold text-center text-gray-800 mb-6'>
          重置密码
        </h2>

        <p className='text-gray-600 text-center mb-6'>请输入您的新密码</p>

        {message && (
          <div className='bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4'>
            {message}
          </div>
        )}

        {errors.general && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <InputField
            type='password'
            name='password'
            label='新密码'
            placeholder='请输入新密码'
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
          />

          <InputField
            type='password'
            name='confirmPassword'
            label='确认新密码'
            placeholder='请再次输入新密码'
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
          />

          <AuthButton
            type='submit'
            label='重置密码'
            isLoading={isLoading}
            disabled={isLoading}
          />
        </form>

        <div className='text-center mt-4'>
          <Link
            href='/login'
            className='text-blue-600 hover:text-blue-800 underline'
          >
            返回登录
          </Link>
        </div>
      </div>
    </div>
  )
}

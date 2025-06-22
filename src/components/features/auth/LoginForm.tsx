'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAuth } from '@/contexts/providers/AuthContext'

export default function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    login,
    error: authError,
    isLoading: authLoading,
    clearError,
  } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
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

    // 清除认证错误
    if (authError) {
      clearError()
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = t('form.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.invalid.email')
    }

    if (!formData.password) {
      newErrors.password = t('form.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setGeneralError('')
    clearError()

    try {
      const success = await login(formData.email, formData.password)

      if (success) {
        // 检查是否需要跳转到初始设置
        const redirect = searchParams.get('redirect')
        if (redirect === 'setup') {
          router.push('/setup')
        } else {
          // 登录成功，重定向到 dashboard
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setGeneralError(t('error.network'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {(generalError || authError) && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded'>
          {generalError || authError}
        </div>
      )}

      <InputField
        type='email'
        name='email'
        label={t('auth.email')}
        placeholder={t('auth.email.placeholder')}
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      <InputField
        type='password'
        name='password'
        label={t('auth.password')}
        placeholder={t('auth.password.placeholder')}
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <AuthButton
        type='submit'
        label={t('auth.login')}
        isLoading={authLoading}
        disabled={authLoading}
      />

      <div className='text-center space-y-2'>
        <Link
          href='/forgot-password'
          className='text-sm text-blue-600 hover:text-blue-500'
        >
          {t('auth.forgot.password')}？
        </Link>

        <div className='text-sm text-gray-600'>
          {t('auth.no.account')}？{' '}
          <Link
            href='/signup'
            className='text-blue-600 hover:text-blue-500 font-medium'
          >
            {t('auth.signup.now')}
          </Link>
        </div>
      </div>
    </form>
  )
}

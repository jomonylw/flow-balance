'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/InputField'
import AuthButton from '@/components/ui/AuthButton'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
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
        // 检查是否需要跳转到初始设置
        const redirect = searchParams.get('redirect')
        if (redirect === 'setup') {
          router.push('/setup')
        } else {
          // 登录成功，重定向到 dashboard
          router.push('/dashboard')
        }
        router.refresh()
      } else {
        setGeneralError(result.error || t('auth.login.failed'))
      }
    } catch (error) {
      console.error('Login error:', error)
      setGeneralError(t('error.network'))
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
        label={t('auth.email')}
        placeholder={t('auth.email.placeholder')}
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
      />

      <InputField
        type="password"
        name="password"
        label={t('auth.password')}
        placeholder={t('auth.password.placeholder')}
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required
      />

      <AuthButton
        type="submit"
        label={t('auth.login')}
        isLoading={isLoading}
        disabled={isLoading}
      />

      <div className="text-center space-y-2">
        <Link 
          href="/forgot-password" 
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {t('auth.forgot.password')}？
        </Link>
        
        <div className="text-sm text-gray-600">
          {t('auth.no.account')}？{' '}
          <Link
            href="/signup"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            {t('auth.signup.now')}
          </Link>
        </div>
      </div>
    </form>
  )
}

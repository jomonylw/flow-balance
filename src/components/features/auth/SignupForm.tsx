'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'

export default function SignupForm() {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
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
      newErrors.email = t('form.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.invalid.email')
    }

    if (!formData.password) {
      newErrors.password = t('form.required')
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.password.min.length')
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = t('auth.password.lowercase.required')
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = t('auth.password.number.required')
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.confirm.password.required')
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.password.mismatch')
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
      const response = await fetch(ApiEndpoints.auth.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        const successMsg = t('auth.signup.success')
        setSuccessMessage(successMsg)
        showSuccess(t('auth.signup.success'), t('auth.signup.success.message'))

        // 2秒后自动跳转到登录页
        setTimeout(() => {
          router.push('/login?redirect=setup')
        }, 2000)
      } else {
        const errorMessage = result.error || t('auth.signup.failed')
        setGeneralError(errorMessage)
        showError(t('auth.signup.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Signup error:', error)
      const errorMessage = t('error.network')
      setGeneralError(errorMessage)
      showError(t('auth.signup.failed'), errorMessage)
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

      <InputField
        type='password'
        name='confirmPassword'
        label={t('auth.confirm.password')}
        placeholder={t('auth.confirm.password.placeholder')}
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      <AuthButton
        type='submit'
        label={t('auth.signup')}
        isLoading={isLoading}
        disabled={isLoading || !!successMessage}
      />

      <div className='text-center'>
        <div className='text-sm text-gray-600'>
          {t('auth.have.account')}？{' '}
          <Link
            href='/login'
            className='text-blue-600 hover:text-blue-500 font-medium'
          >
            {t('auth.login.now')}
          </Link>
        </div>
      </div>
    </form>
  )
}

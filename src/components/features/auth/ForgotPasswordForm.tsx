'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ApiEndpoints } from '@/lib/constants'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'

export default function ForgotPasswordForm() {
  const { t } = useLanguage()
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
      setError(t('auth.email.required'))
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth.email.format.invalid'))
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
      const response = await fetch(ApiEndpoints.auth.REQUEST_PASSWORD_RESET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(
          data.data.message || t('auth.password.reset.email.sent')
        )
        setEmail('')
      } else {
        setError(data.error || t('auth.unknown.error'))
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setError(t('error.network'))
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
        label={t('auth.forgot.password.email.label')}
        placeholder={t('auth.forgot.password.email.placeholder')}
        value={email}
        onChange={handleChange}
        error={error}
        required
        disabled={!!successMessage}
      />

      <AuthButton
        type='submit'
        label={t('auth.forgot.password.submit')}
        isLoading={isLoading}
        disabled={isLoading || !!successMessage}
      />

      <div className='text-center'>
        <Link
          href='/login'
          className='text-sm text-blue-600 hover:text-blue-500'
        >
          {t('auth.back.to.login')}
        </Link>
      </div>
    </form>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'

interface ResetPasswordFormData {
  newPassword: string
  confirmPassword: string
}

interface ResetPasswordFormErrors {
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export default function ResetPasswordWithKey() {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      router.push('/forgot-password')
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  const validateForm = (): boolean => {
    const newErrors: ResetPasswordFormErrors = {}

    // 验证新密码
    if (!formData.newPassword) {
      newErrors.newPassword = t('recovery.key.validation.password.required')
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('recovery.key.validation.password.min')
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('recovery.key.validation.password.required')
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('recovery.key.validation.password.confirm')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const field = name as keyof ResetPasswordFormData
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !token) {
      return
    }

    setIsLoading(true)
    setMessage('')
    setErrors({})

    try {
      const response = await fetch(ApiEndpoints.auth.RESET_PASSWORD_WITH_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationToken: token,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t('recovery.key.reset.success'))
        showSuccess(t('recovery.key.success.reset'))
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        const errorMessage = data.error || t('recovery.key.error.token.invalid')
        setErrors({ general: errorMessage })
        showError(t('recovery.key.error.token.invalid'), errorMessage)
      }
    } catch (error) {
      console.error('Reset password error:', error)
      const errorMessage = t('recovery.key.error.network')
      setErrors({ general: errorMessage })
      showError(t('recovery.key.error.network'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className='text-center'>
        <p className='text-sm text-gray-500 dark:text-gray-500'>
          {t('common.loading')}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
          {t('recovery.key.reset.title')}
        </h2>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
          {t('recovery.key.reset.subtitle')}
        </p>
      </div>

      {message && (
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3'>
          <p className='text-sm text-green-600 dark:text-green-400'>
            {message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <InputField
          name='newPassword'
          label={t('recovery.key.reset.new.password')}
          type='password'
          value={formData.newPassword}
          onChange={handleInputChange}
          placeholder={t('recovery.key.reset.new.password.placeholder')}
          error={errors.newPassword}
          required
        />

        <InputField
          name='confirmPassword'
          label={t('recovery.key.reset.confirm.password')}
          type='password'
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder={t('recovery.key.reset.confirm.password.placeholder')}
          error={errors.confirmPassword}
          required
        />

        {errors.general && (
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3'>
            <p className='text-sm text-red-600 dark:text-red-400'>
              {errors.general}
            </p>
          </div>
        )}

        <AuthButton
          label={
            isLoading
              ? t('recovery.key.reset.submitting')
              : t('recovery.key.reset.submit')
          }
          type='submit'
          isLoading={isLoading}
          className='w-full'
          disabled={!!message} // 如果显示成功消息，禁用按钮
        />
      </form>
    </div>
  )
}

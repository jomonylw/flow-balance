'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { formatRecoveryKey } from '@/lib/utils/recovery-key'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import Link from 'next/link'

interface ForgotPasswordFormData {
  email: string
  recoveryKey: string
}

interface ForgotPasswordFormErrors {
  email?: string
  recoveryKey?: string
  general?: string
}

export default function ForgotPasswordWithKey() {
  const { t } = useLanguage()
  const { showError } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
    recoveryKey: '',
  })
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: ForgotPasswordFormErrors = {}

    // 验证邮箱
    if (!formData.email.trim()) {
      newErrors.email = t('recovery.key.validation.email.required')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = t('recovery.key.validation.email.invalid')
      }
    }

    // 验证恢复密钥
    if (!formData.recoveryKey.trim()) {
      newErrors.recoveryKey = t('recovery.key.validation.key.required')
    } else {
      const formattedKey = formatRecoveryKey(formData.recoveryKey)
      if (!formattedKey) {
        newErrors.recoveryKey = t('recovery.key.validation.key.invalid')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const field = name as keyof ForgotPasswordFormData
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch(ApiEndpoints.auth.VERIFY_RECOVERY_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          recoveryKey: formData.recoveryKey.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 验证成功，跳转到重置密码页面
        router.push(`/reset-password?token=${data.data.verificationToken}`)
      } else {
        const errorMessage =
          data.error || t('recovery.key.error.verification.failed')
        setErrors({ general: errorMessage })
        showError(t('recovery.key.error.verification.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Verify recovery key error:', error)
      const errorMessage = t('recovery.key.error.network')
      setErrors({ general: errorMessage })
      showError(t('recovery.key.error.network'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
          {t('recovery.key.forgot.title')}
        </h2>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
          {t('recovery.key.forgot.subtitle')}
        </p>
        <p className='mt-1 text-xs text-gray-500 dark:text-gray-500'>
          {t('recovery.key.forgot.description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <InputField
          name='email'
          label={t('recovery.key.forgot.email')}
          type='email'
          value={formData.email}
          onChange={handleInputChange}
          placeholder={t('recovery.key.forgot.email.placeholder')}
          error={errors.email}
          required
        />

        <div>
          <InputField
            name='recoveryKey'
            label={t('recovery.key.forgot.key')}
            type='text'
            value={formData.recoveryKey}
            onChange={handleInputChange}
            placeholder={t('recovery.key.forgot.key.placeholder')}
            error={errors.recoveryKey}
            required
            className='font-mono tracking-wider'
          />
          <div className='mt-2 space-y-1'>
            <p className='text-xs text-blue-600 dark:text-blue-400'>
              {t('recovery.key.forgot.key.hint')}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-500'>
              {t('recovery.key.forgot.key.location')}
            </p>
          </div>
        </div>

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
              ? t('recovery.key.forgot.verifying')
              : t('recovery.key.forgot.verify')
          }
          type='submit'
          isLoading={isLoading}
          className='w-full'
        />
      </form>

      <div className='text-center'>
        {/* <p className="text-xs text-gray-500 dark:text-gray-500">
          {t('recovery.key.forgot.no.key')}
        </p> */}
        <div className='mt-2 space-x-4'>
          <Link
            href='/login'
            className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'
          >
            {t('auth.back.to.login')}
          </Link>
          <Link
            href='/signup'
            className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'
          >
            {t('auth.register.new.account')}
          </Link>
        </div>
      </div>
    </div>
  )
}

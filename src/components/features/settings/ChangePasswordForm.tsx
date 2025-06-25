'use client'

import { useState } from 'react'
import InputField from '@/components/ui/forms/InputField'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'

export default function ChangePasswordForm() {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

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

    if (!formData.currentPassword) {
      newErrors.currentPassword = t('password.validation.current.required')
    }

    if (!formData.newPassword) {
      newErrors.newPassword = t('password.validation.new.required')
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('password.validation.new.length')
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('password.validation.confirm.required')
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('password.validation.confirm.mismatch')
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = t('password.validation.same.as.current')
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

    try {
      const response = await fetch(ApiEndpoints.user.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showSuccess(
          t('password.change.success'),
          t('password.change.success.message')
        )
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setErrors({}) // 清除所有错误
      } else {
        const errorMessage = data.error || t('password.change.failed')
        showError(t('password.change.failed'), errorMessage)
        setErrors({ general: errorMessage })
      }
    } catch (error) {
      console.error('Change password error:', error)
      const errorMessage = t('error.network')
      showError(t('password.change.failed'), errorMessage)
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* 密码修改表单 */}
      <div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('password.change')}
        </h3>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          {t('password.change.description')}
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <InputField
            type='password'
            name='currentPassword'
            label={t('password.current')}
            placeholder={t('password.current.placeholder')}
            value={formData.currentPassword}
            onChange={handleInputChange}
            error={errors.currentPassword}
            required
          />

          <InputField
            type='password'
            name='newPassword'
            label={t('password.new')}
            placeholder={t('password.new.placeholder')}
            value={formData.newPassword}
            onChange={handleInputChange}
            error={errors.newPassword}
            required
            help={t('password.new.help')}
          />

          <InputField
            type='password'
            name='confirmPassword'
            label={t('password.confirm')}
            placeholder={t('password.confirm.placeholder')}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            required
          />

          <div className='pt-4'>
            <button
              type='submit'
              disabled={isLoading}
              className='px-4 py-2 h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center'
            >
              {isLoading ? (
                <>
                  <LoadingSpinnerSVG
                    size='sm'
                    color='white'
                    className='-ml-1 mr-2'
                  />
                  {t('password.changing')}
                </>
              ) : (
                t('password.change')
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 安全提示 */}
      <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4'>
        <h4 className='text-sm font-medium text-amber-800 dark:text-amber-200 mb-3'>
          {t('password.security.tips')}
        </h4>
        <ul className='text-sm text-amber-700 dark:text-amber-300 space-y-1'>
          <li>• {t('password.tip.length')}</li>
          <li>• {t('password.tip.combination')}</li>
          <li>• {t('password.tip.regular.change')}</li>
          <li>• {t('password.tip.unique')}</li>
        </ul>
      </div>
    </div>
  )
}

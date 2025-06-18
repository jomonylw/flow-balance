'use client'

import { useState } from 'react'
import InputField from '@/components/ui/forms/InputField'
import { useLanguage } from '@/contexts/providers/LanguageContext'

export default function ChangePasswordForm() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

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

    // 清除消息
    if (message) setMessage('')
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
    setMessage('')

    try {
      const response = await fetch('/api/user/change-password', {
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
        setMessage(t('password.change.success'))
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        setErrors({ general: data.error || t('password.change.failed') })
      }
    } catch (error) {
      console.error('Change password error:', error)
      setErrors({ general: t('settings.network.error') })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* 消息提示 */}
      {message && (
        <div className='bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg'>
          <div className='flex items-center'>
            <svg
              className='w-5 h-5 mr-2'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd'
              />
            </svg>
            {message}
          </div>
        </div>
      )}

      {errors.general && (
        <div className='bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg'>
          <div className='flex items-center'>
            <svg
              className='w-5 h-5 mr-2'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
            {errors.general}
          </div>
        </div>
      )}

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
              className='px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <span className='flex items-center'>
                  <svg
                    className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  {t('password.changing')}
                </span>
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

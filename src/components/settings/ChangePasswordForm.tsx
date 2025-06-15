'use client'

import { useState } from 'react'
import InputField from '@/components/ui/InputField'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ChangePasswordForm() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
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
          newPassword: formData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t('password.change.success'))
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
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
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.general}
          </div>
        </div>
      )}

      {/* 密码修改表单 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <span className="mr-2">🔒</span>
            {t('password.change')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('password.change.description')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            type="password"
            name="currentPassword"
            label={t('password.current')}
            placeholder={t('password.current.placeholder')}
            value={formData.currentPassword}
            onChange={handleInputChange}
            error={errors.currentPassword}
            required
          />

          <InputField
            type="password"
            name="newPassword"
            label={t('password.new')}
            placeholder={t('password.new.placeholder')}
            value={formData.newPassword}
            onChange={handleInputChange}
            error={errors.newPassword}
            required
            help={t('password.new.help')}
          />

          <InputField
            type="password"
            name="confirmPassword"
            label={t('password.confirm')}
            placeholder={t('password.confirm.placeholder')}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            required
          />

          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
          <span className="mr-2">⚠️</span>
          {t('password.security.tips')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-yellow-700 dark:text-yellow-300">
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('password.tip.length')}</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('password.tip.combination')}</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('password.tip.regular.change')}</span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>{t('password.tip.unique')}</span>
          </div>
        </div>
      </div>

      {/* 其他安全选项 */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <span className="mr-2">🛡️</span>
          {t('password.other.security.options')}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('password.two.factor.auth')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('password.two.factor.description')}</p>
            </div>
            <button
              disabled
              className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-md cursor-not-allowed text-sm"
            >
              {t('password.coming.soon')}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('password.login.history')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('password.login.history.description')}</p>
            </div>
            <button
              disabled
              className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-md cursor-not-allowed text-sm"
            >
              {t('password.coming.soon')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

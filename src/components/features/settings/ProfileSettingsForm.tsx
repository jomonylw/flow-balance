'use client'

import { useState } from 'react'
import { User } from '@prisma/client'
import InputField from '@/components/ui/forms/InputField'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { ApiEndpoints, VALIDATION } from '@/lib/constants'

interface ProfileSettingsFormProps {
  user: User
}

export default function ProfileSettingsForm({
  user,
}: ProfileSettingsFormProps) {
  const { t } = useLanguage()
  const { formatDate } = useUserDateFormatter()
  const [formData, setFormData] = useState({
    email: user.email,
    nickname: user.email.split('@')[0], // 临时使用邮箱前缀作为昵称
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(ApiEndpoints.user.PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: formData.nickname,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t('settings.profile.updated'))
      } else {
        setError(data.error || t('settings.update.failed'))
      }
    } catch (error) {
      console.error('Update profile error:', error)
      setError(t('settings.network.error'))
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

      {error && (
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
            {error}
          </div>
        </div>
      )}

      {/* 基本信息表单 */}
      <div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('settings.basic.info')}
        </h3>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          {t('settings.basic.info.description')}
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <InputField
            type='email'
            name='email'
            label={t('settings.email.address')}
            value={formData.email}
            onChange={handleInputChange}
            disabled={true}
            help={t('settings.email.readonly')}
          />

          <InputField
            type='text'
            name='nickname'
            label={t('settings.display.name')}
            placeholder={t('settings.name.placeholder')}
            value={formData.nickname}
            onChange={handleInputChange}
            maxLength={VALIDATION.USERNAME_MAX_LENGTH}
            help={t('settings.name.help')}
          />

          <div className='pt-4'>
            <button
              type='submit'
              disabled={isLoading}
              className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <span className='flex items-center'>
                  <LoadingSpinnerSVG size='sm' color='white' className='-ml-1 mr-2' />
                  {t('common.loading')}
                </span>
              ) : (
                t('settings.save.changes')
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 头像设置 */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          {t('settings.avatar.settings')}
        </h4>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          {t('settings.avatar.description')}
        </p>
        <button
          disabled
          className='px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-md cursor-not-allowed'
        >
          {t('settings.avatar.upload')}
        </button>
      </div>

      {/* 账户统计 */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
        <h4 className='text-sm font-medium text-blue-900 dark:text-blue-200 mb-3'>
          {t('settings.account.stats')}
        </h4>
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <p className='text-blue-700 dark:text-blue-300 font-medium'>
              {t('settings.registration.date')}
            </p>
            <p className='text-blue-600 dark:text-blue-400'>
              {formatDate(new Date(user.createdAt))}
            </p>
          </div>
          <div>
            <p className='text-blue-700 dark:text-blue-300 font-medium'>
              {t('settings.account.status')}
            </p>
            <p className='text-blue-600 dark:text-blue-400'>
              {t('settings.status.normal')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

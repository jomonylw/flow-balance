'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import {
  maskRecoveryKey,
  generateRecoveryKeyFileContent,
} from '@/lib/utils/recovery-key'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import Modal from '@/components/ui/feedback/Modal'
import { Eye, EyeOff, Copy, Download, RotateCcw } from 'lucide-react'

interface RecoveryKeyData {
  recoveryKey: string | null
  recoveryKeyCreatedAt: string | null
}

export default function RecoveryKeyManagement() {
  const { t, language } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()
  const [keyData, setKeyData] = useState<RecoveryKeyData>({
    recoveryKey: null,
    recoveryKeyCreatedAt: null,
  })
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    fetchRecoveryKey()
  }, [])

  const fetchRecoveryKey = async () => {
    try {
      const response = await fetch(ApiEndpoints.user.RECOVERY_KEY)
      if (response.ok) {
        const data = await response.json()
        setKeyData(data.data)
      } else {
        showError(t('recovery.key.error.server'))
      }
    } catch (error) {
      console.error('Fetch recovery key error:', error)
      showError(t('recovery.key.error.network'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!keyData.recoveryKey) return

    try {
      await navigator.clipboard.writeText(keyData.recoveryKey)
      showSuccess(t('recovery.key.success.copied'))
    } catch (error) {
      console.error('Failed to copy recovery key:', error)
    }
  }

  const handleDownload = () => {
    if (!keyData.recoveryKey || !keyData.recoveryKeyCreatedAt || !user?.email)
      return

    const createdAt = new Date(keyData.recoveryKeyCreatedAt)

    const content = generateRecoveryKeyFileContent(
      keyData.recoveryKey,
      user.email,
      createdAt,
      t,
      language
    )

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flow-balance-recovery-key.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showSuccess(t('recovery.key.success.downloaded'))
  }

  const handleRegenerate = async () => {
    if (!currentPassword.trim()) {
      setPasswordError(t('recovery.key.validation.current.password.required'))
      return
    }

    setIsRegenerating(true)
    setPasswordError('')

    try {
      const response = await fetch(ApiEndpoints.user.RECOVERY_KEY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setKeyData({
          recoveryKey: data.data.recoveryKey,
          recoveryKeyCreatedAt: data.data.recoveryKeyCreatedAt,
        })
        setShowRegenerateModal(false)
        setCurrentPassword('')
        setIsVisible(true) // 显示新生成的密钥
        showSuccess(t('recovery.key.success.regenerate'))
      } else {
        const errorMessage =
          data.error || t('recovery.key.error.password.incorrect')
        setPasswordError(errorMessage)
        showError(t('recovery.key.error.password.incorrect'), errorMessage)
      }
    } catch (error) {
      console.error('Regenerate recovery key error:', error)
      const errorMessage = t('recovery.key.error.network')
      setPasswordError(errorMessage)
      showError(t('recovery.key.error.network'), errorMessage)
    } finally {
      setIsRegenerating(false)
    }
  }

  const displayKey = keyData.recoveryKey
    ? isVisible
      ? keyData.recoveryKey
      : maskRecoveryKey(keyData.recoveryKey, 1)
    : '****-****-****-****'

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
        <div className='animate-pulse'>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2'></div>
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2'></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
        <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-6'>
          {t('recovery.key.management.title')}
        </h3>

        <div className='space-y-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('recovery.key.management.current')}
            </label>
            <div className='flex items-center space-x-3'>
              <div className='flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3'>
                <code className='text-sm font-mono text-gray-900 dark:text-white'>
                  {displayKey}
                </code>
              </div>
              <button
                onClick={() => setIsVisible(!isVisible)}
                className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                title={
                  isVisible
                    ? t('recovery.key.management.hide')
                    : t('recovery.key.management.show')
                }
              >
                {isVisible ? (
                  <EyeOff className='h-5 w-5' />
                ) : (
                  <Eye className='h-5 w-5' />
                )}
              </button>
              <button
                onClick={handleCopy}
                disabled={!keyData.recoveryKey}
                className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title={t('recovery.key.management.copy')}
              >
                <Copy className='h-5 w-5' />
              </button>
              <button
                onClick={handleDownload}
                disabled={!keyData.recoveryKey}
                className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title={t('recovery.key.management.download')}
              >
                <Download className='h-5 w-5' />
              </button>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              {t('recovery.key.management.created')}
            </label>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {formatDate(keyData.recoveryKeyCreatedAt)}
            </p>
          </div>

          <div className='border-t border-gray-200 dark:border-gray-700 pt-6'>
            <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4'>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                {t('recovery.key.management.regenerate.warning')}
              </p>
            </div>
            <button
              onClick={() => setShowRegenerateModal(true)}
              className='inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
            >
              <RotateCcw className='h-4 w-4 mr-2' />
              {t('recovery.key.management.regenerate')}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRegenerateModal}
        onClose={() => {
          setShowRegenerateModal(false)
          setCurrentPassword('')
          setPasswordError('')
        }}
        title={t('recovery.key.management.regenerate.confirm')}
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            {t('recovery.key.management.regenerate.password')}
          </p>

          <InputField
            name='currentPassword'
            label=''
            type='password'
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder={t(
              'recovery.key.management.regenerate.password.placeholder'
            )}
            error={passwordError}
            required
          />

          <div className='flex space-x-3 pt-4'>
            <AuthButton
              label={t('common.cancel')}
              onClick={() => {
                setShowRegenerateModal(false)
                setCurrentPassword('')
                setPasswordError('')
              }}
              variant='outline'
              className='flex-1'
            />
            <AuthButton
              label={
                isRegenerating
                  ? t('recovery.key.management.regenerate.submitting')
                  : t('recovery.key.management.regenerate.submit')
              }
              onClick={handleRegenerate}
              isLoading={isRegenerating}
              className='flex-1'
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

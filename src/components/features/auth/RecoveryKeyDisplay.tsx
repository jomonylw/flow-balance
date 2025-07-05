'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { generateRecoveryKeyFileContent } from '@/lib/utils/recovery-key'
import AuthButton from '@/components/ui/forms/AuthButton'
import AuthHeader from './AuthHeader'
import { Check, Copy, Download } from 'lucide-react'

interface RecoveryKeyDisplayProps {
  recoveryKey: string
  userEmail: string
  createdAt: Date
}

export default function RecoveryKeyDisplay({
  recoveryKey,
  userEmail,
  createdAt,
}: RecoveryKeyDisplayProps) {
  const { t, language } = useLanguage()
  const { showSuccess } = useToast()
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      showSuccess(t('recovery.key.success.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy recovery key:', error)
    }
  }

  const handleDownload = () => {
    const content = generateRecoveryKeyFileContent(
      recoveryKey,
      userEmail,
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

  const handleContinue = () => {
    if (!confirmed) {
      return
    }
    // 跳转到货币设置页面
    router.push('/setup')
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 safe-area-inset-top safe-area-inset-bottom transition-colors duration-200'>
      {/* 统一的认证页面头部 */}
      <AuthHeader />

      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center'>
            <svg
              className='h-6 w-6 text-blue-600 dark:text-blue-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414a6 6 0 015.743-7.743z'
              />
            </svg>
          </div>
          <h2 className='mt-6 text-3xl font-bold text-gray-900 dark:text-white'>
            {t('recovery.key.display.title')}
          </h2>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            {t('recovery.key.display.subtitle')}
          </p>
        </div>

        <div className='bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 space-y-6'>
          <div>
            <p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('recovery.key.display.your.key')}
            </p>
            <div className='relative'>
              <div className='bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center'>
                <code className='text-lg font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider'>
                  {recoveryKey}
                </code>
              </div>
            </div>
          </div>

          <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
            <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2'>
              {t('recovery.key.display.warning.title')}
            </h4>
            <ul className='text-xs text-yellow-700 dark:text-yellow-300 space-y-1'>
              <li>• {t('recovery.key.display.warning.reset')}</li>
              <li>• {t('recovery.key.display.warning.safe')}</li>
              <li>• {t('recovery.key.display.warning.lost')}</li>
              <li>• {t('recovery.key.display.warning.view')}</li>
            </ul>
          </div>

          <div className='flex space-x-3'>
            <button
              onClick={handleCopy}
              className='flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
            >
              {copied ? (
                <Check className='h-4 w-4 mr-2 text-green-500' />
              ) : (
                <Copy className='h-4 w-4 mr-2' />
              )}
              {t('recovery.key.display.copy')}
            </button>
            <button
              onClick={handleDownload}
              className='flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
            >
              <Download className='h-4 w-4 mr-2' />
              {t('recovery.key.display.download')}
            </button>
          </div>

          <div className='flex items-center'>
            <input
              id='confirmation'
              type='checkbox'
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded'
            />
            <label
              htmlFor='confirmation'
              className='ml-2 block text-sm text-gray-700 dark:text-gray-300'
            >
              {t('recovery.key.display.confirmation')}
            </label>
          </div>

          <AuthButton
            label={t('recovery.key.display.continue')}
            onClick={handleContinue}
            disabled={!confirmed}
            className='w-full'
          />
        </div>
      </div>
    </div>
  )
}

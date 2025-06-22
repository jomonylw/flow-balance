'use client'

import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface CurrencySetupPromptProps {
  className?: string
  showIcon?: boolean
}

/**
 * 货币设置提示组件
 * 当用户未设置本位币时显示引导提示
 */
export function CurrencySetupPrompt({
  className = '',
  showIcon = true,
}: CurrencySetupPromptProps) {
  const { t } = useLanguage()
  const { userSettings: _userSettings, getBaseCurrency } = useUserData()
  const router = useRouter()

  const baseCurrency = getBaseCurrency()

  // 如果已设置本位币，不显示提示
  if (baseCurrency) {
    return null
  }

  const handleSetupClick = () => {
    router.push('/settings?tab=preferences')
  }

  return (
    <div
      className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 ${className}`}
    >
      <div className='flex items-start space-x-3'>
        {showIcon && (
          <AlertTriangle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0' />
        )}
        <div className='flex-1'>
          <h3 className='text-yellow-800 dark:text-yellow-200 font-medium text-sm'>
            {t('currency.setup.required')}
          </h3>
          <p className='text-yellow-700 dark:text-yellow-300 text-sm mt-1'>
            {t('currency.setup.description')}
          </p>
          <button
            onClick={handleSetupClick}
            className='mt-2 text-yellow-800 dark:text-yellow-200 underline text-sm hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors'
          >
            {t('currency.setup.action')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 简化版货币设置提示（内联使用）
 */
export function InlineCurrencySetupPrompt() {
  const { t } = useLanguage()
  const { getBaseCurrency } = useUserData()
  const router = useRouter()

  const baseCurrency = getBaseCurrency()

  if (baseCurrency) {
    return null
  }

  return (
    <span className='text-yellow-600 dark:text-yellow-400 text-sm'>
      {t('currency.setup.inline')}{' '}
      <button
        onClick={() => router.push('/settings?tab=preferences')}
        className='underline hover:text-yellow-700 dark:hover:text-yellow-300'
      >
        {t('currency.setup.action')}
      </button>
    </span>
  )
}

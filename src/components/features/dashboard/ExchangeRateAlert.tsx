'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import type { MissingRateInfo } from '@/types/core'

interface ExchangeRateAlertProps {
  className?: string
}

export default function ExchangeRateAlert({
  className = '',
}: ExchangeRateAlertProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [missingRates, setMissingRates] = useState<MissingRateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchMissingRates()
  }, [])

  const fetchMissingRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates/missing')
      if (response.ok) {
        const data = await response.json()
        setMissingRates(data.data.missingRates || [])
      }
    } catch (error) {
      console.error(t('exchange.rate.fetch.failed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // 可以在这里保存到 localStorage 或用户偏好设置
    localStorage.setItem('exchangeRateAlertDismissed', 'true')
  }

  useEffect(() => {
    // 检查是否已经被用户关闭过
    const isDismissed = localStorage.getItem('exchangeRateAlertDismissed')
    if (isDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  if (loading || dismissed || missingRates.length === 0) {
    return null
  }

  return (
    <div
      className={`border-l-4 border-yellow-400 p-4 ${className} ${
        resolvedTheme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
      }`}
    >
      <div className='flex'>
        <div className='flex-shrink-0'>
          <svg
            className='h-5 w-5 text-yellow-400'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <div className='ml-3 flex-1'>
          <h3
            className={`text-sm font-medium ${resolvedTheme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}
          >
            {t('exchange.rate.alert.title')}
          </h3>
          <div
            className={`mt-2 text-sm ${resolvedTheme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'}`}
          >
            <p>
              {t('exchange.rate.alert.description', {
                count: missingRates.length,
              })}
            </p>
            <ul className='mt-2 space-y-1'>
              {missingRates.slice(0, 3).map((missing, index) => (
                <li key={index} className='flex items-center'>
                  <span className='inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2'></span>
                  {missing.fromCurrencyInfo.symbol}{' '}
                  {missing.fromCurrencyInfo.name} →{' '}
                  {missing.toCurrencyInfo.symbol} {missing.toCurrencyInfo.name}
                </li>
              ))}
              {missingRates.length > 3 && (
                <li
                  className={
                    resolvedTheme === 'dark'
                      ? 'text-yellow-300'
                      : 'text-yellow-600'
                  }
                >
                  {t('exchange.rate.alert.more.pairs', {
                    count: missingRates.length - 3,
                  })}
                </li>
              )}
            </ul>
          </div>
          <div className='mt-4 flex space-x-3'>
            <Link
              href='/settings?tab=exchange-rates'
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                resolvedTheme === 'dark'
                  ? 'bg-yellow-800 text-yellow-100 hover:bg-yellow-700'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              }`}
            >
              {t('exchange.rate.alert.setup.now')}
            </Link>
            <button
              onClick={handleDismiss}
              className={`text-sm font-medium transition-colors ${
                resolvedTheme === 'dark'
                  ? 'text-yellow-200 hover:text-yellow-100'
                  : 'text-yellow-700 hover:text-yellow-800'
              }`}
            >
              {t('exchange.rate.alert.ignore')}
            </button>
          </div>
        </div>
        <div className='ml-auto pl-3'>
          <div className='-mx-1.5 -my-1.5'>
            <button
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 text-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 ${
                resolvedTheme === 'dark'
                  ? 'bg-yellow-900/20 hover:bg-yellow-800/30 focus:ring-offset-yellow-900'
                  : 'bg-yellow-50 hover:bg-yellow-100 focus:ring-offset-yellow-50'
              }`}
            >
              <span className='sr-only'>{t('exchange.rate.alert.close')}</span>
              <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

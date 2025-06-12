'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Currency {
  code: string
  symbol: string
  name: string
}

interface ConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  rateDate: Date
  success: boolean
  error?: string
}

interface CurrencyConversionStatusProps {
  baseCurrency: Currency
  conversionDetails?: ConversionResult[]
  hasErrors?: boolean
  className?: string
}

export default function CurrencyConversionStatus({
  baseCurrency,
  conversionDetails = [],
  hasErrors = false,
  className = ''
}: CurrencyConversionStatusProps) {
  const { t } = useLanguage()

  if (conversionDetails.length === 0) {
    return null
  }

  const successfulConversions = conversionDetails.filter(c => c.success)
  const failedConversions = conversionDetails.filter(c => !c.success)

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          💱 {t('currency.conversion.status')}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {t('currency.base.currency')}: {baseCurrency.symbol} {baseCurrency.name}
          </span>
        </div>
      </div>

      {hasErrors && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-yellow-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-800">
              {t('currency.conversion.partial.error')}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* 成功的转换 */}
        {successfulConversions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-green-700 mb-1">
              ✅ {t('currency.conversion.successful')} ({successfulConversions.length})
            </div>
            <div className="space-y-1">
              {successfulConversions.slice(0, 3).map((conversion, index) => (
                <div key={index} className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    {conversion.originalCurrency} → {conversion.targetCurrency}
                  </span>
                  <span className="font-mono">
                    1:{conversion.exchangeRate.toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </span>
                </div>
              ))}
              {successfulConversions.length > 3 && (
                <div className="text-xs text-gray-500">
                  {t('currency.conversion.more.successful', { count: successfulConversions.length - 3 })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 失败的转换 */}
        {failedConversions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-red-700 mb-1">
              ❌ {t('currency.conversion.failed')} ({failedConversions.length})
            </div>
            <div className="space-y-1">
              {failedConversions.slice(0, 3).map((conversion, index) => (
                <div key={index} className="text-xs text-red-600">
                  <div className="flex items-center justify-between">
                    <span>
                      {conversion.originalCurrency} → {conversion.targetCurrency}
                    </span>
                    <span className="text-red-500">{t('currency.conversion.missing.rate')}</span>
                  </div>
                  {conversion.error && (
                    <div className="text-xs text-red-500 mt-1">
                      {conversion.error}
                    </div>
                  )}
                </div>
              ))}
              {failedConversions.length > 3 && (
                <div className="text-xs text-red-500">
                  {t('currency.conversion.more.failed', { count: failedConversions.length - 3 })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {failedConversions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <a
            href="/settings?tab=exchange-rates"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('currency.conversion.setup.missing')}
          </a>
        </div>
      )}
    </div>
  )
}

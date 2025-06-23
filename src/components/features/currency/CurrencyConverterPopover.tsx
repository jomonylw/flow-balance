'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import type { SimpleCurrency } from '@/types/core'

interface CurrencyConverterPopoverProps {
  isOpen: boolean
  onClose: () => void
  baseCurrency: SimpleCurrency
  anchorElement?: HTMLElement | null
}

interface ConversionData {
  currency: SimpleCurrency
  rate: number
  isReverse?: boolean
}

export default function CurrencyConverterPopover({
  isOpen,
  onClose,
  baseCurrency,
  anchorElement,
}: CurrencyConverterPopoverProps) {
  const { t } = useLanguage()
  const { currencies, exchangeRates } = useUserData()
  const popoverRef = useRef<HTMLDivElement>(null)

  // 计算转换数据
  const getConversions = (): ConversionData[] => {
    const conversions: ConversionData[] = []

    // 为每个非本位币计算转换结果
    for (const currency of currencies) {
      if (currency.id === baseCurrency.id) continue

      // 查找从其他货币到本位币的汇率（使用货币ID进行精确匹配）
      let rate = exchangeRates.find(
        r =>
          r.fromCurrencyId === currency.id && r.toCurrencyId === baseCurrency.id
      )

      let isReverse = false

      // 如果没有直接汇率，查找反向汇率
      if (!rate) {
        const reverseRate = exchangeRates.find(
          r =>
            r.fromCurrencyId === baseCurrency.id &&
            r.toCurrencyId === currency.id
        )
        if (reverseRate) {
          rate = {
            ...reverseRate,
            fromCurrencyId: currency.id,
            toCurrencyId: baseCurrency.id,
            fromCurrency: currency.code,
            toCurrency: baseCurrency.code,
            rate: 1 / reverseRate.rate,
          }
          isReverse = true
        }
      }

      // 如果仍然没有找到汇率，尝试通过相同货币代码查找
      if (!rate && currency.code === baseCurrency.code && currency.id !== baseCurrency.id) {
        // 对于相同货币代码但不同ID的情况（如两个CNY），假设汇率为1
        rate = {
          id: `same-code-${currency.id}-${baseCurrency.id}`,
          fromCurrencyId: currency.id,
          toCurrencyId: baseCurrency.id,
          fromCurrency: currency.code,
          toCurrency: baseCurrency.code,
          rate: 1,
          effectiveDate: new Date().toISOString(),
          type: 'USER',
          notes: '相同货币代码，汇率为1',
          fromCurrencyRef: {
            id: currency.id,
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimalPlaces: currency.decimalPlaces,
            isCustom: currency.isCustom,
          },
          toCurrencyRef: {
            id: baseCurrency.id,
            code: baseCurrency.code,
            name: baseCurrency.name,
            symbol: baseCurrency.symbol,
            decimalPlaces: baseCurrency.decimalPlaces,
            isCustom: baseCurrency.isCustom,
          },
        }
        isReverse = false
      }

      // 如果还是没有找到汇率，尝试通过货币代码间接查找
      if (!rate) {
        // 查找从当前货币代码到本位币代码的汇率
        const codeBasedRate = exchangeRates.find(
          r =>
            r.fromCurrency === currency.code && r.toCurrency === baseCurrency.code
        )

        if (codeBasedRate) {
          rate = {
            ...codeBasedRate,
            fromCurrencyId: currency.id,
            toCurrencyId: baseCurrency.id,
          }
        } else {
          // 查找反向的代码匹配
          const reverseCodeRate = exchangeRates.find(
            r =>
              r.fromCurrency === baseCurrency.code && r.toCurrency === currency.code
          )
          if (reverseCodeRate) {
            rate = {
              ...reverseCodeRate,
              fromCurrencyId: currency.id,
              toCurrencyId: baseCurrency.id,
              fromCurrency: currency.code,
              toCurrency: baseCurrency.code,
              rate: 1 / reverseCodeRate.rate,
            }
            isReverse = true
          }
        }
      }

      // 如果仍然没有找到直接汇率，尝试通过中介货币（如USD）进行转换
      if (!rate) {
        // 查找常见的中介货币（USD, EUR等）
        const intermediateCurrencies = ['USD', 'EUR', 'CNY']

        for (const intermediateCurrency of intermediateCurrencies) {
          if (intermediateCurrency === currency.code || intermediateCurrency === baseCurrency.code) {
            continue
          }

          // 查找 currency -> intermediate 的汇率
          const toIntermediate = exchangeRates.find(r =>
            (r.fromCurrencyId === currency.id || r.fromCurrency === currency.code) &&
            (r.toCurrency === intermediateCurrency)
          )

          // 查找 intermediate -> baseCurrency 的汇率
          const fromIntermediate = exchangeRates.find(r =>
            (r.fromCurrency === intermediateCurrency) &&
            (r.toCurrencyId === baseCurrency.id || r.toCurrency === baseCurrency.code)
          )

          if (toIntermediate && fromIntermediate) {
            // 计算通过中介货币的汇率
            const intermediateRate = parseFloat(toIntermediate.rate.toString()) * parseFloat(fromIntermediate.rate.toString())
            rate = {
              id: `intermediate-${currency.id}-${baseCurrency.id}`,
              fromCurrencyId: currency.id,
              toCurrencyId: baseCurrency.id,
              fromCurrency: currency.code,
              toCurrency: baseCurrency.code,
              rate: intermediateRate,
              effectiveDate: new Date().toISOString(),
              type: 'AUTO',
              notes: `通过${intermediateCurrency}中介转换`,
              fromCurrencyRef: {
                id: currency.id,
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                decimalPlaces: currency.decimalPlaces,
                isCustom: currency.isCustom,
              },
              toCurrencyRef: {
                id: baseCurrency.id,
                code: baseCurrency.code,
                name: baseCurrency.name,
                symbol: baseCurrency.symbol,
                decimalPlaces: baseCurrency.decimalPlaces,
                isCustom: baseCurrency.isCustom,
              },
            }
            break
          }

          // 尝试反向中介转换
          const fromIntermediateReverse = exchangeRates.find(r =>
            (r.fromCurrency === intermediateCurrency) &&
            (r.toCurrencyId === currency.id || r.toCurrency === currency.code)
          )

          const toIntermediateReverse = exchangeRates.find(r =>
            (r.fromCurrencyId === baseCurrency.id || r.fromCurrency === baseCurrency.code) &&
            (r.toCurrency === intermediateCurrency)
          )

          if (fromIntermediateReverse && toIntermediateReverse) {
            // 计算通过中介货币的反向汇率
            const intermediateRate = (1 / parseFloat(fromIntermediateReverse.rate.toString())) * parseFloat(toIntermediateReverse.rate.toString())
            rate = {
              id: `intermediate-reverse-${currency.id}-${baseCurrency.id}`,
              fromCurrencyId: currency.id,
              toCurrencyId: baseCurrency.id,
              fromCurrency: currency.code,
              toCurrency: baseCurrency.code,
              rate: intermediateRate,
              effectiveDate: new Date().toISOString(),
              type: 'AUTO',
              notes: `通过${intermediateCurrency}中介反向转换`,
              fromCurrencyRef: {
                id: currency.id,
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                decimalPlaces: currency.decimalPlaces,
                isCustom: currency.isCustom,
              },
              toCurrencyRef: {
                id: baseCurrency.id,
                code: baseCurrency.code,
                name: baseCurrency.name,
                symbol: baseCurrency.symbol,
                decimalPlaces: baseCurrency.decimalPlaces,
                isCustom: baseCurrency.isCustom,
              },
            }
            isReverse = true
            break
          }
        }
      }

      if (rate) {
        conversions.push({
          currency,
          rate: rate.rate,
          isReverse,
        })
      }
    }

    return conversions
  }

  const conversions = getConversions()

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorElement &&
        !anchorElement.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {} // 确保总是返回清理函数
  }, [isOpen, onClose, anchorElement])

  // 计算弹窗位置
  const getPopoverStyle = () => {
    if (!anchorElement) return {}

    const rect = anchorElement.getBoundingClientRect()
    const popoverWidth = 280 // 预估宽度，适合内容
    const popoverHeight = Math.min(conversions.length * 48 + 40, 280) // 动态高度

    let left = rect.left
    let top = rect.bottom + 8

    // 确保弹窗不超出屏幕右边界
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 16
    }

    // 确保弹窗不超出屏幕下边界
    if (top + popoverHeight > window.innerHeight) {
      top = rect.top - popoverHeight - 8
    }

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 50,
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      style={getPopoverStyle()}
      className='min-w-fit max-w-xs bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden ring-1 ring-black/5 dark:ring-white/10'
    >
      {/* 汇率列表 */}
      <div className=''>
        {conversions.length === 0 && (
          <div className='p-6 text-center'>
            <div className='w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-gray-400 dark:text-gray-500'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {t('currency.converter.no.rates') || '暂无可用汇率'}
            </p>
          </div>
        )}

        {conversions.length > 0 && (
          <div className='py-1'>
            {conversions.map((conversion, index) => (
              <div
                key={conversion.currency.id}
                className={`px-4 py-2.5 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 transition-all duration-200 ${
                  index !== conversions.length - 1
                    ? 'border-b border-gray-100/60 dark:border-gray-700/60'
                    : ''
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <div className='w-6 h-6 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center shadow-sm'>
                      <div className='h-6 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center shadow-sm px-1'>
                        <span className='text-xs font-bold text-blue-700 dark:text-blue-300'>
                          {conversion.currency.code}
                        </span>
                      </div>
                    </div>
                    <span className='text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap'>
                      {conversion.currency.symbol}1
                    </span>
                  </div>
                  <div className='flex items-center space-x-2 ml-2'>
                    <span className='text-sm text-gray-400 dark:text-gray-500'>
                      =
                    </span>
                    <div className='text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap'>
                      {baseCurrency.symbol}
                      {conversion.rate.toFixed(4)}
                    </div>
                    {conversion.isReverse && (
                      <span className='text-xs text-blue-600 dark:text-blue-400 ml-1'>
                        *
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部说明 */}
      {conversions.some(c => c.isReverse) && (
        <div className='px-4 py-2 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-900/15 dark:to-indigo-900/15 border-t border-blue-100/60 dark:border-blue-800/40'>
          <div className='flex items-center space-x-2'>
            <div className='w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-400 flex items-center justify-center shadow-sm'>
              <span className='text-xs text-white font-bold'>*</span>
            </div>
            <p className='text-xs text-gray-600 dark:text-gray-400 font-medium'>
              {t('currency.converter.reverse.note') || '基于反向汇率计算'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

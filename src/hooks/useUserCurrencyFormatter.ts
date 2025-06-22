import { useUserData } from '@/contexts/providers/UserDataContext'
import { useCallback } from 'react'

/**
 * 基于用户设置的货币格式化Hook
 * 优先使用UserDataContext中的用户设置信息
 */
export function useUserCurrencyFormatter() {
  const { currencies, userSettings } = useUserData()

  /**
   * 格式化货币金额
   * @param amount 金额
   * @param currencyCode 货币代码
   * @param options 格式化选项
   * @returns 格式化后的货币字符串
   */
  const formatCurrency = useCallback(
    (
      amount: number,
      currencyCode: string,
      options?: {
        showSymbol?: boolean
        precision?: number // 如果指定，会覆盖货币的默认小数位数
        showOriginal?: boolean
        originalAmount?: number
        originalCurrency?: string
      }
    ) => {
      // 使用用户的语言设置确定locale
      const locale = userSettings?.language === 'zh' ? 'zh-CN' : 'en-US'

      // 从用户可用货币中获取完整货币信息
      const currency = currencies.find(c => c.code === currencyCode)
      const symbol = currency?.symbol || currencyCode

      // 确定小数位数：优先使用用户指定的precision，否则使用货币的decimalPlaces，最后回退到2
      const decimalPlaces = options?.precision ?? currency?.decimalPlaces ?? 2

      // 格式化数字
      const formattedNumber = amount.toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })

      // 构建基础格式化结果
      const baseResult =
        options?.showSymbol === false
          ? formattedNumber
          : `${symbol}${formattedNumber}`

      // 如果需要显示原始金额信息
      if (
        options?.showOriginal &&
        options?.originalAmount !== undefined &&
        options?.originalCurrency
      ) {
        const originalCurrencyInfo = currencies.find(
          c => c.code === options.originalCurrency
        )
        const originalSymbol =
          originalCurrencyInfo?.symbol || options.originalCurrency
        // 原始金额也使用对应货币的小数位数
        const originalDecimalPlaces =
          options?.precision ?? originalCurrencyInfo?.decimalPlaces ?? 2
        const originalFormatted = options.originalAmount.toLocaleString(
          locale,
          {
            minimumFractionDigits: originalDecimalPlaces,
            maximumFractionDigits: originalDecimalPlaces,
          }
        )
        return `${baseResult} (原: ${originalSymbol}${originalFormatted})`
      }

      return baseResult
    },
    [currencies, userSettings?.language]
  )

  /**
   * 获取货币符号
   * @param currencyCode 货币代码
   * @returns 货币符号
   */
  const getCurrencySymbol = useCallback(
    (currencyCode: string) => {
      const currency = currencies.find(c => c.code === currencyCode)
      return currency?.symbol || currencyCode
    },
    [currencies]
  )

  /**
   * 获取货币小数位数
   * @param currencyCode 货币代码
   * @returns 小数位数
   */
  const getCurrencyDecimalPlaces = useCallback(
    (currencyCode: string) => {
      const currency = currencies.find(c => c.code === currencyCode)
      return currency?.decimalPlaces ?? 2
    },
    [currencies]
  )

  /**
   * 获取货币信息
   * @param currencyCode 货币代码
   * @returns 货币信息对象
   */
  const getCurrencyInfo = useCallback(
    (currencyCode: string) => {
      return (
        currencies.find(c => c.code === currencyCode) || {
          id: '',
          code: currencyCode,
          symbol: currencyCode,
          name: currencyCode,
          decimalPlaces: 2, // 默认2位小数
          isCustom: false,
          createdBy: null,
        }
      )
    },
    [currencies]
  )

  /**
   * 获取用户的locale设置
   * @returns locale字符串
   */
  const getUserLocale = useCallback(() => {
    return userSettings?.language === 'zh' ? 'zh-CN' : 'en-US'
  }, [userSettings?.language])

  /**
   * 格式化数字（不带货币符号）
   * @param value 数值
   * @param decimalsOrCurrency 小数位数或货币代码
   * @returns 格式化的数字字符串
   */
  const formatNumber = useCallback(
    (value: number, decimalsOrCurrency?: number | string) => {
      const locale = getUserLocale()

      // 确定小数位数
      let decimals: number
      if (typeof decimalsOrCurrency === 'string') {
        // 如果传入的是货币代码，使用该货币的小数位数
        decimals = getCurrencyDecimalPlaces(decimalsOrCurrency)
      } else {
        // 如果传入的是数字或undefined，使用指定值或默认值2
        decimals = decimalsOrCurrency ?? 2
      }

      return value.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    },
    [getUserLocale, getCurrencyDecimalPlaces]
  )

  /**
   * 智能格式化货币金额（自动使用货币的小数位数配置）
   * @param amount 金额
   * @param currencyCode 货币代码
   * @param showSymbol 是否显示货币符号，默认true
   * @returns 格式化后的货币字符串
   */
  const formatCurrencyAuto = useCallback(
    (amount: number, currencyCode: string, showSymbol: boolean = true) => {
      return formatCurrency(amount, currencyCode, { showSymbol })
    },
    [formatCurrency]
  )

  return {
    formatCurrency,
    formatCurrencyAuto,
    getCurrencySymbol,
    getCurrencyDecimalPlaces,
    getCurrencyInfo,
    getUserLocale,
    formatNumber,
  }
}

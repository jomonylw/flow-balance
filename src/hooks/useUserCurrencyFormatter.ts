import { useUserData } from '@/contexts/providers/UserDataContext'
import { useCallback } from 'react'

/**
 * 基于用户设置的货币格式化Hook
 * 优先使用UserDataContext中的用户设置信息
 */
export function useUserCurrencyFormatter() {
  const { currencies, userSettings } = useUserData()

  /**
   * 根据货币ID查找货币信息（唯一且精确）
   */
  const findCurrencyById = useCallback(
    (currencyId: string) => {
      if (!currencyId) {
        console.warn('findCurrencyById: currencyId is empty or null')
        return null
      }
      return currencies.find(c => c.id === currencyId) || null
    },
    [currencies]
  )

  /**
   * 根据货币代码查找货币信息（向后兼容，但有重复风险）
   * 优先级：本位币 > 用户自定义货币 > 全局货币
   * @deprecated 建议使用 findCurrencyById 和货币ID
   */
  const findCurrencyByCode = useCallback(
    (currencyCode: string) => {
      // 如果是本位币，直接返回本位币记录
      if (userSettings?.baseCurrency?.code === currencyCode) {
        return userSettings.baseCurrency
      }

      // 查找所有匹配的货币
      const matchingCurrencies = currencies.filter(c => c.code === currencyCode)

      if (matchingCurrencies.length === 0) {
        return null
      }

      if (matchingCurrencies.length === 1) {
        return matchingCurrencies[0]
      }

      // 如果有多个匹配，优先选择用户自定义货币
      const customCurrency = matchingCurrencies.find(c => c.isCustom)
      if (customCurrency) {
        return customCurrency
      }

      // 否则返回第一个（通常是全局货币）
      return matchingCurrencies[0]
    },
    [currencies, userSettings?.baseCurrency]
  )

  /**
   * 格式化货币金额（基于货币ID，推荐使用）
   * @param amount 金额
   * @param currencyId 货币ID
   * @param options 格式化选项
   * @returns 格式化后的货币字符串
   */
  const formatCurrencyById = useCallback(
    (
      amount: number,
      currencyId: string,
      options?: {
        showSymbol?: boolean
        precision?: number // 如果指定，会覆盖货币的默认小数位数
        showOriginal?: boolean
        originalAmount?: number
        originalCurrencyId?: string
      }
    ) => {
      // 使用用户的语言设置确定locale
      const locale = userSettings?.language === 'zh' ? 'zh-CN' : 'en-US'

      // 根据货币ID精确查找货币信息
      const currency = findCurrencyById(currencyId)
      if (!currency && currencyId) {
        console.warn(
          `formatCurrencyById: Currency not found for ID: ${currencyId}`
        )
      }
      const symbol = currency?.symbol || '?'

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
        options?.originalCurrencyId
      ) {
        const originalCurrencyInfo = findCurrencyById(
          options.originalCurrencyId
        )
        const originalSymbol = originalCurrencyInfo?.symbol || '?'
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
    [findCurrencyById, userSettings?.language]
  )

  /**
   * 格式化货币金额（基于货币代码，向后兼容）
   * @param amount 金额
   * @param currencyCode 货币代码
   * @param options 格式化选项
   * @returns 格式化后的货币字符串
   * @deprecated 建议使用 formatCurrencyById 以避免重复货币代码问题
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

      // 智能查找货币信息（处理重复货币代码问题）
      const currency = findCurrencyByCode(currencyCode)
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
        const originalCurrencyInfo = findCurrencyByCode(
          options.originalCurrency
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
    [findCurrencyByCode, userSettings?.language]
  )

  /**
   * 获取货币符号（基于货币ID，推荐使用）
   * @param currencyId 货币ID
   * @returns 货币符号
   */
  const getCurrencySymbolById = useCallback(
    (currencyId: string) => {
      const currency = findCurrencyById(currencyId)
      if (!currency && currencyId) {
        console.warn(
          `getCurrencySymbolById: Currency not found for ID: ${currencyId}`
        )
      }
      return currency?.symbol || '?'
    },
    [findCurrencyById]
  )

  /**
   * 获取货币小数位数（基于货币ID，推荐使用）
   * @param currencyId 货币ID
   * @returns 小数位数
   */
  const getCurrencyDecimalPlacesById = useCallback(
    (currencyId: string) => {
      const currency = findCurrencyById(currencyId)
      return currency?.decimalPlaces ?? 2
    },
    [findCurrencyById]
  )

  /**
   * 获取货币信息（基于货币ID，推荐使用）
   * @param currencyId 货币ID
   * @returns 货币信息对象
   */
  const getCurrencyInfoById = useCallback(
    (currencyId: string) => {
      return (
        findCurrencyById(currencyId) || {
          id: currencyId,
          code: 'UNKNOWN',
          symbol: '?',
          name: 'Unknown Currency',
          decimalPlaces: 2, // 默认2位小数
          isCustom: false,
          createdBy: null,
        }
      )
    },
    [findCurrencyById]
  )

  /**
   * 获取货币符号（基于货币代码，向后兼容）
   * @param currencyCode 货币代码
   * @returns 货币符号
   * @deprecated 建议使用 getCurrencySymbolById 以避免重复货币代码问题
   */
  const getCurrencySymbol = useCallback(
    (currencyCode: string) => {
      const currency = findCurrencyByCode(currencyCode)
      return currency?.symbol || currencyCode
    },
    [findCurrencyByCode]
  )

  /**
   * 获取货币小数位数（基于货币代码，向后兼容）
   * @param currencyCode 货币代码
   * @returns 小数位数
   * @deprecated 建议使用 getCurrencyDecimalPlacesById 以避免重复货币代码问题
   */
  const getCurrencyDecimalPlaces = useCallback(
    (currencyCode: string) => {
      const currency = findCurrencyByCode(currencyCode)
      return currency?.decimalPlaces ?? 2
    },
    [findCurrencyByCode]
  )

  /**
   * 获取货币信息（基于货币代码，向后兼容）
   * @param currencyCode 货币代码
   * @returns 货币信息对象
   * @deprecated 建议使用 getCurrencyInfoById 以避免重复货币代码问题
   */
  const getCurrencyInfo = useCallback(
    (currencyCode: string) => {
      return (
        findCurrencyByCode(currencyCode) || {
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
    [findCurrencyByCode]
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
   * 智能格式化货币金额（基于货币ID，推荐使用）
   * @param amount 金额
   * @param currencyId 货币ID
   * @param showSymbol 是否显示货币符号，默认true
   * @returns 格式化后的货币字符串
   */
  const formatCurrencyAutoById = useCallback(
    (amount: number, currencyId: string, showSymbol: boolean = true) => {
      return formatCurrencyById(amount, currencyId, { showSymbol })
    },
    [formatCurrencyById]
  )

  /**
   * 智能格式化货币金额（基于货币代码，向后兼容）
   * @param amount 金额
   * @param currencyCode 货币代码
   * @param showSymbol 是否显示货币符号，默认true
   * @returns 格式化后的货币字符串
   * @deprecated 建议使用 formatCurrencyAutoById 以避免重复货币代码问题
   */
  const formatCurrencyAuto = useCallback(
    (amount: number, currencyCode: string, showSymbol: boolean = true) => {
      return formatCurrency(amount, currencyCode, { showSymbol })
    },
    [formatCurrency]
  )

  return {
    // 推荐使用的基于ID的函数
    formatCurrencyById,
    formatCurrencyAutoById,
    getCurrencySymbolById,
    getCurrencyDecimalPlacesById,
    getCurrencyInfoById,
    findCurrencyById,

    // 向后兼容的基于代码的函数（已标记为deprecated）
    formatCurrency,
    formatCurrencyAuto,
    getCurrencySymbol,
    getCurrencyDecimalPlaces,
    getCurrencyInfo,
    findCurrencyByCode,

    // 通用函数
    getUserLocale,
    formatNumber,
  }
}

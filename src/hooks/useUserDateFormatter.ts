import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useCallback, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'

interface DateFormatOptions {
  includeTime?: boolean
  relative?: boolean // 是否使用相对时间（今天/昨天）
  chartFormat?: 'month' | 'day' | 'year'
}

/**
 * 基于用户设置的日期格式化Hook
 * 让用户在设置中选择的日期格式在整个应用中生效
 */
export function useUserDateFormatter() {
  const { userSettings } = useUserData()
  const { language, t } = useLanguage()
  
  // 获取 date-fns locale
  const dateLocale = useMemo(() => {
    return language === 'zh' ? zhCN : enUS
  }, [language])
  
  // 用户日期格式映射到 date-fns 格式
  const formatMapping = useMemo(() => {
    const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'
    
    const mappings = {
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD/MM/YYYY': 'dd/MM/yyyy', 
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy'
    }
    
    return mappings[userFormat as keyof typeof mappings] || 'yyyy-MM-dd'
  }, [userSettings?.dateFormat])
  
  // 获取用户日期格式的分隔符
  const getDateSeparator = useMemo(() => {
    const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'
    return userFormat.includes('/') ? '/' : '-'
  }, [userSettings?.dateFormat])
  
  /**
   * 图表专用格式化
   * @param date 要格式化的日期
   * @param chartType 图表类型
   * @returns 适合图表显示的日期字符串
   */
  const formatChartDate = useCallback((
    date: Date,
    chartType: 'month' | 'day' | 'year'
  ): string => {
    try {
      const separator = getDateSeparator

      switch (chartType) {
        case 'month':
          return format(date, `yyyy${separator}MM`)
        case 'day':
          // 根据用户格式调整日期显示
          const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'
          if (userFormat.startsWith('DD')) {
            return format(date, `dd${separator}MM`)
          } else if (userFormat.startsWith('MM')) {
            return format(date, `MM${separator}dd`)
          } else {
            return format(date, `MM${separator}dd`)
          }
        case 'year':
          return format(date, 'yyyy')
        default:
          return format(date, formatMapping)
      }
    } catch (error) {
      console.error('Chart date formatting error:', error)
      return format(date, 'yyyy-MM-dd')
    }
  }, [userSettings?.dateFormat, formatMapping, getDateSeparator])
  
  /**
   * 智能日期显示（保持现有的相对时间逻辑）
   * @param date 要格式化的日期
   * @returns 智能格式化的日期字符串
   */
  const formatSmartDate = useCallback((date: Date): string => {
    try {
      const now = new Date()
      // 设置时间为当天的开始，避免时间部分的影响
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const normalizedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )

      const diffTime = normalizedDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // 使用国际化文本
      if (diffDays === 0) {
        return t('common.date.today')
      } else if (diffDays === -1) {
        return t('common.date.yesterday')
      } else if (diffDays === 1) {
        return t('common.date.tomorrow')
      } else if (diffDays > 1 && diffDays <= 7) {
        return t('common.date.days.later', { days: diffDays })
      } else if (diffDays < -1 && diffDays >= -7) {
        return t('common.date.days.ago', { days: Math.abs(diffDays) })
      } else {
        // 超出范围使用用户设置的格式
        return format(date, formatMapping, { locale: dateLocale })
      }
    } catch (error) {
      console.error('Smart date formatting error:', error)
      return format(date, formatMapping, { locale: dateLocale })
    }
  }, [formatMapping, dateLocale, t])

  /**
   * 基础日期格式化
   * @param date 要格式化的日期
   * @param options 格式化选项
   * @returns 格式化后的日期字符串
   */
  const formatDate = useCallback((
    date: Date | string,
    options: DateFormatOptions = {}
  ): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date

      if (options.relative) {
        return formatSmartDate(dateObj)
      }

      if (options.chartFormat) {
        return formatChartDate(dateObj, options.chartFormat)
      }

      let formatString = formatMapping
      if (options.includeTime) {
        formatString += ' HH:mm'
      }

      return format(dateObj, formatString, { locale: dateLocale })
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid Date'
    }
  }, [formatMapping, dateLocale, formatSmartDate, formatChartDate])
  

  
  /**
   * 表单输入专用格式化
   * @param date 要格式化的日期
   * @returns HTML date input 需要的 YYYY-MM-DD 格式
   */
  const formatInputDate = useCallback((date: Date): string => {
    try {
      // HTML date input 始终需要 YYYY-MM-DD 格式
      return format(date, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Input date formatting error:', error)
      return ''
    }
  }, [])
  
  /**
   * 解析用户输入的日期字符串
   * @param dateString 日期字符串
   * @returns 解析后的 Date 对象或 null
   */
  const parseUserDate = useCallback((dateString: string): Date | null => {
    try {
      // 首先尝试标准 ISO 格式
      if (dateString.includes('T') || dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parseISO(dateString)
      }
      
      // 尝试解析为 Date 对象
      const parsed = new Date(dateString)
      return isNaN(parsed.getTime()) ? null : parsed
    } catch {
      return null
    }
  }, [])
  
  return {
    formatDate,
    formatSmartDate,
    formatChartDate,
    formatInputDate,
    parseUserDate,
    userDateFormat: userSettings?.dateFormat || 'YYYY-MM-DD',
    dateLocale,
    getDateSeparator
  }
}

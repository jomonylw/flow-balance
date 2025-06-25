'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
  parse,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
  getYear,
  getMonth,
} from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  value?: string
  onChange: (value: string) => void
  className?: string
  minDate?: Date
  maxDate?: Date
  showYearMonthSelector?: boolean
}

export default function Calendar({
  value,
  onChange,
  className = '',
  minDate,
  maxDate,
  showYearMonthSelector = true,
}: CalendarProps) {
  const { t, language } = useLanguage()

  // 初始化currentMonth，如果有value则使用value的月份，否则使用当前月份
  const getInitialMonth = () => {
    if (value) {
      try {
        const parsedDate = parse(value, 'yyyy-MM-dd', new Date())
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate
        }
      } catch {
        // 忽略解析错误
      }
    }
    return new Date()
  }

  const [currentMonth, setCurrentMonth] = useState(getInitialMonth)
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days')

  // 获取 date-fns locale
  const dateLocale = language === 'zh' ? zhCN : enUS

  // 解析当前值
  let selectedDate: Date | null = null
  try {
    if (value) {
      selectedDate = parse(value, 'yyyy-MM-dd', new Date())
      if (isNaN(selectedDate.getTime())) {
        selectedDate = null
      }
    }
  } catch {
    selectedDate = null
  }

  // 当value变化时，同步currentMonth（但避免无限循环）
  useEffect(() => {
    if (value) {
      try {
        const parsedDate = parse(value, 'yyyy-MM-dd', new Date())
        if (!isNaN(parsedDate.getTime())) {
          const needsUpdate =
            currentMonth.getMonth() !== parsedDate.getMonth() ||
            currentMonth.getFullYear() !== parsedDate.getFullYear()
          if (needsUpdate) {
            setCurrentMonth(parsedDate)
          }
        }
      } catch {
        // 忽略解析错误
      }
    }
  }, [value]) // 只依赖value，避免currentMonth导致的循环

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 获取月份第一天是星期几，调整为周一开始
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7
  const emptyDays = Array(firstDayOfWeek).fill(null)

  // 获取星期标题
  const getWeekDays = () => {
    const weekdayKeys = [
      'form.date.calendar.weekdays.mon',
      'form.date.calendar.weekdays.tue',
      'form.date.calendar.weekdays.wed',
      'form.date.calendar.weekdays.thu',
      'form.date.calendar.weekdays.fri',
      'form.date.calendar.weekdays.sat',
      'form.date.calendar.weekdays.sun',
    ]
    return weekdayKeys.map(key => t(key))
  }

  const weekDays = getWeekDays()

  // 格式化月份年份显示
  const formatMonthYear = (date: Date) => {
    if (language === 'zh') {
      const yearSuffix = t('form.date.calendar.year') || '年'
      const monthSuffix = t('form.date.calendar.month') || '月'
      return `${date.getFullYear()}${yearSuffix}${date.getMonth() + 1}${monthSuffix}`
    } else {
      return format(date, 'MMMM yyyy', { locale: dateLocale })
    }
  }

  const handleDateSelect = (day: Date) => {
    // 检查日期限制
    if (minDate && day < minDate) return
    if (maxDate && day > maxDate) return

    const formattedDate = format(day, 'yyyy-MM-dd')
    onChange(formattedDate)
  }

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    if (minDate && newMonth < startOfMonth(minDate)) return
    setCurrentMonth(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    if (maxDate && newMonth > endOfMonth(maxDate)) return
    setCurrentMonth(newMonth)
  }

  const handlePrevYear = () => {
    const newMonth = subYears(currentMonth, 1)
    if (minDate && newMonth < startOfYear(minDate)) return
    setCurrentMonth(newMonth)
  }

  const handleNextYear = () => {
    const newMonth = addYears(currentMonth, 1)
    if (maxDate && newMonth > endOfYear(maxDate)) return
    setCurrentMonth(newMonth)
  }

  const handlePrevDecade = () => {
    const currentYear = getYear(currentMonth)
    const newYear = Math.floor(currentYear / 10) * 10 - 10
    setCurrentMonth(new Date(newYear, getMonth(currentMonth), 1))
  }

  const handleNextDecade = () => {
    const currentYear = getYear(currentMonth)
    const newYear = Math.floor(currentYear / 10) * 10 + 10
    setCurrentMonth(new Date(newYear, getMonth(currentMonth), 1))
  }

  const handlePrevClick = () => {
    if (viewMode === 'days') {
      handlePrevMonth()
    } else if (viewMode === 'months') {
      handlePrevYear()
    } else {
      handlePrevDecade()
    }
  }

  const handleNextClick = () => {
    if (viewMode === 'days') {
      handleNextMonth()
    } else if (viewMode === 'months') {
      handleNextYear()
    } else {
      handleNextDecade()
    }
  }

  // 渲染日期视图
  const renderDaysView = () => (
    <>
      {/* 星期标题 */}
      <div className='grid grid-cols-7 gap-1 mb-2'>
        {weekDays.map(day => (
          <div
            key={day}
            className='text-xs text-center text-gray-500 dark:text-gray-400 py-1'
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className='grid grid-cols-7 gap-1'>
        {/* 空白天数 */}
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className='h-7' />
        ))}

        {/* 日期按钮 */}
        {calendarDays.map(day => {
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isDisabled =
            (minDate && day < minDate) || (maxDate && day > maxDate)

          return (
            <button
              key={day.toISOString()}
              type='button'
              onClick={() => handleDateSelect(day)}
              disabled={!isCurrentMonth || isDisabled}
              className={`
                h-7 text-xs rounded transition-colors flex items-center justify-center
                ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : isToday
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : isCurrentMonth && !isDisabled
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* 快捷操作按钮 */}
      <div className='mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between'>
        <button
          type='button'
          onClick={() => {
            const today = format(new Date(), 'yyyy-MM-dd')
            onChange(today)
          }}
          className='text-xs text-blue-500 dark:text-blue-400 hover:underline px-1 py-1'
        >
          {t('common.date.today')}
        </button>
        <button
          type='button'
          onClick={() => onChange('')}
          className='text-xs text-gray-500 dark:text-gray-400 hover:underline px-1 py-1'
        >
          {t('common.clear')}
        </button>
      </div>
    </>
  )

  // 获取月份名称
  const getMonthNames = () => {
    const monthKeys = [
      'form.date.calendar.months.jan',
      'form.date.calendar.months.feb',
      'form.date.calendar.months.mar',
      'form.date.calendar.months.apr',
      'form.date.calendar.months.may',
      'form.date.calendar.months.jun',
      'form.date.calendar.months.jul',
      'form.date.calendar.months.aug',
      'form.date.calendar.months.sep',
      'form.date.calendar.months.oct',
      'form.date.calendar.months.nov',
      'form.date.calendar.months.dec',
    ]
    return monthKeys.map(key => t(key))
  }

  // 渲染月份选择视图
  const renderMonthsView = () => {
    const monthNames = getMonthNames()
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentMonth.getFullYear(), i, 1)
      return {
        index: i,
        name: monthNames[i],
        date: monthDate,
      }
    })

    return (
      <div className='grid grid-cols-3 gap-2'>
        {months.map(month => {
          const isSelected = getMonth(currentMonth) === month.index
          const isDisabled =
            (minDate && month.date < startOfMonth(minDate)) ||
            (maxDate && month.date > endOfMonth(maxDate))

          return (
            <button
              key={month.index}
              type='button'
              onClick={() => {
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), month.index, 1)
                )
                setViewMode('days')
              }}
              disabled={isDisabled}
              className={`
                py-2 px-3 text-sm rounded transition-colors
                ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : !isDisabled
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {month.name}
            </button>
          )
        })}
      </div>
    )
  }

  // 渲染年份选择视图
  const renderYearsView = () => {
    const currentYear = getYear(currentMonth)
    const startYear = Math.floor(currentYear / 10) * 10
    const years = Array.from({ length: 12 }, (_, i) => startYear + i - 1)

    return (
      <div className='grid grid-cols-3 gap-2'>
        {years.map(year => {
          const isSelected = getYear(currentMonth) === year
          // const yearDate = new Date(year, 0, 1)
          const isDisabled =
            (minDate && year < getYear(minDate)) ||
            (maxDate && year > getYear(maxDate))

          return (
            <button
              key={year}
              type='button'
              onClick={() => {
                setCurrentMonth(new Date(year, getMonth(currentMonth), 1))
                setViewMode('months')
              }}
              disabled={isDisabled}
              className={`
                py-2 px-3 text-sm rounded transition-colors
                ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : !isDisabled
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {year}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`p-3 ${className}`}>
      {/* 导航栏 */}
      <div className='flex items-center justify-between mb-3'>
        <button
          type='button'
          onClick={handlePrevClick}
          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
        >
          <ChevronLeft className='w-3.5 h-3.5 text-gray-600 dark:text-gray-400' />
        </button>

        <div className='flex items-center space-x-1'>
          {showYearMonthSelector ? (
            <>
              <button
                type='button'
                onClick={() => {
                  if (viewMode === 'days') {
                    setViewMode('months')
                  } else if (viewMode === 'months') {
                    setViewMode('years')
                  } else {
                    setViewMode('months')
                  }
                }}
                className='text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors'
              >
                {viewMode === 'days'
                  ? formatMonthYear(currentMonth)
                  : viewMode === 'months'
                    ? getYear(currentMonth)
                    : `${Math.floor(getYear(currentMonth) / 10) * 10}-${Math.floor(getYear(currentMonth) / 10) * 10 + 9}`}
              </button>
            </>
          ) : (
            <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {formatMonthYear(currentMonth)}
            </div>
          )}
        </div>

        <button
          type='button'
          onClick={handleNextClick}
          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
        >
          <ChevronRight className='w-3.5 h-3.5 text-gray-600 dark:text-gray-400' />
        </button>
      </div>

      {/* 内容区域 */}
      {viewMode === 'days' && renderDaysView()}
      {viewMode === 'months' && renderMonthsView()}
      {viewMode === 'years' && renderYearsView()}
    </div>
  )
}

'use client'

import { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { SPACING, COMPONENT_SIZE, BORDER_RADIUS } from '@/lib/constants/dimensions'

interface DateInputProps {
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  help?: string
  autoFocus?: boolean
  showFormatHint?: boolean
  placeholder?: string
  showCalendar?: boolean // 是否显示日历选择器
  showTime?: boolean // 是否支持时间选择
  minDate?: string // 最小日期
  maxDate?: string // 最大日期
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      name,
      label,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      className = '',
      help,
      autoFocus = false,
      showFormatHint = true,
      placeholder,
      showCalendar = true,
      showTime = false,
      minDate: _minDate,
      maxDate: _maxDate,
    },
    _ref
  ) => {
    const { userDateFormat, formatInputDate } = useUserDateFormatter()
    const { t, language } = useLanguage()
    const { resolvedTheme: _resolvedTheme } = useTheme()

    // 状态管理
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [displayValue, setDisplayValue] = useState(value)
    const [selectedDate, setSelectedDate] = useState<Date | null>(
      value ? new Date(value) : null
    )
    const [currentMonth, setCurrentMonth] = useState(
      selectedDate || new Date()
    )
    const [timeValue, setTimeValue] = useState('12:00')
    const [calendarPosition, setCalendarPosition] = useState<{
      top?: number
      bottom?: number
      left?: number
      right?: number
    }>({})

    // 日历视图状态：'date' | 'month' | 'year'
    const [calendarView, setCalendarView] = useState<'date' | 'month' | 'year'>('date')
    const [currentYear, setCurrentYear] = useState(
      (selectedDate || new Date()).getFullYear()
    )

    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const inputContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // 获取 date-fns locale
    const dateLocale = language === 'zh' ? zhCN : enUS

    // 格式化用户日期显示
    const formatUserDate = useCallback((date: Date): string => {
      const formatMapping = {
        'YYYY-MM-DD': 'yyyy-MM-dd',
        'DD/MM/YYYY': 'dd/MM/yyyy',
        'MM/DD/YYYY': 'MM/dd/yyyy',
        'DD-MM-YYYY': 'dd-MM-yyyy'
      }
      const formatString = formatMapping[userDateFormat as keyof typeof formatMapping] || 'yyyy-MM-dd'
      return format(date, formatString, { locale: dateLocale })
    }, [userDateFormat, dateLocale])

    // 当外部value变化时，更新内部状态
    useEffect(() => {
      if (value) {
        const date = new Date(value)
        if (isValid(date)) {
          setSelectedDate(date)
          setDisplayValue(formatUserDate(date))
          setCurrentMonth(date)
          if (showTime) {
            setTimeValue(format(date, 'HH:mm'))
          }
        }
      } else {
        setSelectedDate(null)
        setDisplayValue('')
      }
    }, [value, showTime, formatUserDate])

    // 解析用户输入的日期
    const parseUserDate = useCallback((dateString: string): Date | null => {
      try {
        // 尝试解析 ISO 格式
        let date = parseISO(dateString)
        if (isValid(date)) return date

        // 尝试解析用户格式
        const cleanString = dateString.replace(/[^\d]/g, '')
        if (cleanString.length === 8) {
          const year = parseInt(cleanString.substring(0, 4))
          const month = parseInt(cleanString.substring(4, 6)) - 1
          const day = parseInt(cleanString.substring(6, 8))
          date = new Date(year, month, day)
          if (isValid(date)) return date
        }

        return null
      } catch {
        return null
      }
    }, [])

    // 生成日期格式提示
    const getDateFormatHint = () => {
      if (!showFormatHint) return null

      const formatExamples = {
        'YYYY-MM-DD': '2024-01-15',
        'DD/MM/YYYY': '15/01/2024',
        'MM/DD/YYYY': '01/15/2024',
        'DD-MM-YYYY': '15-01-2024'
      }

      const example = formatExamples[userDateFormat as keyof typeof formatExamples] || '2024-01-15'
      return t('form.date.format.hint', { format: userDateFormat, example })
    }

    // 生成占位符文本
    const getPlaceholder = () => {
      if (placeholder) return placeholder

      const formatExamples = {
        'YYYY-MM-DD': '2024-01-15',
        'DD/MM/YYYY': '15/01/2024',
        'MM/DD/YYYY': '01/15/2024',
        'DD-MM-YYYY': '15-01-2024'
      }

      return formatExamples[userDateFormat as keyof typeof formatExamples] || '2024-01-15'
    }

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
        'form.date.calendar.months.dec'
      ]
      return monthKeys.map(key => t(key))
    }

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

    // 计算日历最佳位置
    const calculateCalendarPosition = useCallback(() => {
      if (!inputContainerRef.current) return {}

      const inputRect = inputContainerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // 日历尺寸（紧凑版）
      const calendarWidth = 280
      const calendarHeight = 320

      // 计算水平位置
      let left: number | undefined = 0
      let right: number | undefined

      // 优先左对齐，如果超出右边缘则右对齐
      if (inputRect.left + calendarWidth <= viewportWidth - 16) {
        left = 0 // 相对于输入框左对齐
      } else {
        right = 0 // 相对于输入框右对齐
        left = undefined
      }

      // 计算垂直位置
      let top: number | undefined
      let bottom: number | undefined

      const spaceBelow = viewportHeight - inputRect.bottom
      const spaceAbove = inputRect.top

      // 优先向下弹出，空间不足时向上弹出
      if (spaceBelow >= calendarHeight + 8) {
        top = inputRect.height + 4 // 相对于输入框底部
      } else if (spaceAbove >= calendarHeight + 8) {
        bottom = inputRect.height + 4 // 相对于输入框顶部
      } else {
        // 空间都不足时，选择空间较大的一侧，并调整高度
        if (spaceBelow > spaceAbove) {
          top = inputRect.height + 4
        } else {
          bottom = inputRect.height + 4
        }
      }

      return { top, bottom, left, right }
    }, [])

    // 点击外部关闭日历和窗口大小变化时重新计算位置
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsCalendarOpen(false)
        }
      }

      const handleResize = () => {
        if (isCalendarOpen) {
          const position = calculateCalendarPosition()
          setCalendarPosition(position)
        }
      }

      if (isCalendarOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('resize', handleResize)
        window.addEventListener('scroll', handleResize)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
          window.removeEventListener('resize', handleResize)
          window.removeEventListener('scroll', handleResize)
        }
      }

      return undefined
    }, [isCalendarOpen, calculateCalendarPosition])

    // 输入框事件处理
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setDisplayValue(newValue)

      // 尝试解析日期
      const parsedDate = parseUserDate(newValue)
      if (parsedDate && isValid(parsedDate)) {
        setSelectedDate(parsedDate)
        setCurrentMonth(parsedDate)

        // 触发onChange事件
        const formattedValue = formatInputDate(parsedDate)
        const syntheticEvent = {
          target: { name, value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    // 日历日期选择
    const handleDateSelect = (date: Date) => {
      let finalDate = date

      // 如果支持时间，合并时间
      if (showTime && timeValue) {
        const [hours, minutes] = timeValue.split(':').map(Number)
        finalDate = new Date(date)
        finalDate.setHours(hours, minutes, 0, 0)
      }

      setSelectedDate(finalDate)
      setDisplayValue(formatUserDate(finalDate))
      setIsCalendarOpen(false)

      // 触发onChange事件
      const formattedValue = formatInputDate(finalDate)
      const syntheticEvent = {
        target: { name, value: formattedValue }
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }

    // 时间变化处理
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value
      setTimeValue(newTime)

      if (selectedDate) {
        const [hours, minutes] = newTime.split(':').map(Number)
        const newDate = new Date(selectedDate)
        newDate.setHours(hours, minutes, 0, 0)

        setSelectedDate(newDate)
        setDisplayValue(formatUserDate(newDate))

        // 触发onChange事件
        const formattedValue = formatInputDate(newDate)
        const syntheticEvent = {
          target: { name, value: formattedValue }
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    // 年份选择处理
    const handleYearSelect = (year: number) => {
      setCurrentYear(year)
      const newDate = new Date(currentMonth)
      newDate.setFullYear(year)
      setCurrentMonth(newDate)
      setCalendarView('month')
    }

    // 月份选择处理
    const handleMonthSelect = (monthIndex: number) => {
      const newDate = new Date(currentYear, monthIndex, 1)
      setCurrentMonth(newDate)
      setCalendarView('date')
    }

    // 切换到年份选择
    const switchToYearView = () => {
      setCurrentYear(currentMonth.getFullYear())
      setCalendarView('year')
    }

    // 切换到月份选择
    const switchToMonthView = () => {
      setCalendarView('month')
    }

    // 渲染年份选择器
    const renderYearSelector = () => {
      const currentYearValue = currentYear
      const startYear = Math.floor(currentYearValue / 10) * 10
      const years = Array.from({ length: 12 }, (_, i) => startYear + i - 1)

      return (
        <div className="p-2">
          {/* 年份导航 */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentYear(currentYear - 10)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('form.date.calendar.select.year')}
            </h3>

            <button
              type="button"
              onClick={() => setCurrentYear(currentYear + 10)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* 年份网格 */}
          <div className="grid grid-cols-3 gap-2">
            {years.map(year => (
              <button
                key={year}
                type="button"
                onClick={() => handleYearSelect(year)}
                className={`
                  py-2 px-3 text-sm rounded transition-colors
                  ${year === currentYearValue
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }
                `}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // 渲染月份选择器
    const renderMonthSelector = () => {
      const monthNames = getMonthNames()
      const currentMonthIndex = currentMonth.getMonth()

      return (
        <div className="p-3">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={switchToYearView}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>

            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {language === 'zh'
                ? `${currentYear}${t('form.date.calendar.year') || '年'} ${t('form.date.calendar.select.month')}`
                : `${currentYear} ${t('form.date.calendar.select.month')}`
              }
            </h3>

            <div className="w-6 h-6" /> {/* 占位符保持对称 */}
          </div>

          {/* 月份网格 */}
          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((monthName, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleMonthSelect(index)}
                className={`
                  py-1.5 px-2 text-xs rounded transition-colors
                  ${index === currentMonthIndex
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }
                `}
              >
                {monthName}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // 渲染日期选择器
    const renderDateSelector = () => {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

      // 获取月份第一天是星期几，调整为周一开始
      const firstDayOfWeek = (monthStart.getDay() + 6) % 7
      const emptyDays = Array(firstDayOfWeek).fill(null)

      const weekDays = language === 'zh'
        ? ['一', '二', '三', '四', '五', '六', '日']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

      return (
        <div className="p-3">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              type="button"
              onClick={switchToMonthView}
              className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
            >
              {formatMonthYear(currentMonth)}
            </button>

            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs text-center text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {/* 空白天数 */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="h-7" />
            ))}

            {/* 日期按钮 */}
            {calendarDays.map(day => {
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    h-7 text-xs rounded transition-colors flex items-center justify-center
                    ${isSelected
                      ? 'bg-blue-500 text-white'
                      : isToday
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : isCurrentMonth
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

          {/* 时间选择器 */}
          {showTime && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* 快捷操作 */}
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between">
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              className="text-xs text-blue-500 dark:text-blue-400 hover:underline px-1 py-1"
            >
              {t('common.date.today')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null)
                setDisplayValue('')
                setIsCalendarOpen(false)
                const syntheticEvent = {
                  target: { name, value: '' }
                } as React.ChangeEvent<HTMLInputElement>
                onChange(syntheticEvent)
              }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline px-1 py-1"
            >
              {t('common.clear')}
            </button>
          </div>
        </div>
      )
    }

    // 主日历渲染函数
    const renderCalendar = () => {
      if (!isCalendarOpen) return null

      // 构建位置样式
      const positionStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 50,
        ...calendarPosition
      }

      return (
        <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg w-[280px] max-h-[320px] overflow-hidden"
          style={positionStyle}
        >
          {calendarView === 'year' && renderYearSelector()}
          {calendarView === 'month' && renderMonthSelector()}
          {calendarView === 'date' && renderDateSelector()}
        </div>
      )
    }
    return (
      <div ref={containerRef} className={`relative space-y-2 ${className}`}>
        {/* 标签 */}
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>

        {/* 输入框容器 */}
        <div ref={inputContainerRef} className="relative">
          <input
            ref={inputRef}
            type="text"
            id={name}
            name={name}
            value={displayValue}
            onChange={handleInputChange}
            placeholder={getPlaceholder()}
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`
              w-full border border-gray-300 dark:border-gray-600 shadow-sm
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10
              disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400
              text-base sm:text-sm transition-all duration-200
              hover:border-gray-400 dark:hover:border-gray-500
              ${error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 focus:shadow-rose-500/10' : ''}
            `}
            style={{
              padding: `${SPACING.LG}px ${showCalendar ? '40px' : SPACING.XL + 'px'} ${SPACING.LG}px ${SPACING.XL}px`,
              minHeight: `${COMPONENT_SIZE.INPUT.LG}px`,
              borderRadius: `${BORDER_RADIUS.XL}px`,
              colorScheme: 'light dark',
            }}
          />

          {/* 日历图标按钮 */}
          {showCalendar && (
            <button
              type="button"
              onClick={() => {
                if (!isCalendarOpen) {
                  // 打开日历时计算位置
                  const position = calculateCalendarPosition()
                  setCalendarPosition(position)
                }
                setIsCalendarOpen(!isCalendarOpen)
              }}
              disabled={disabled}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}

          {/* 日历弹出层 */}
          {renderCalendar()}
        </div>

        {/* 显示帮助文本或日期格式提示 */}
        {!error && (
          <>
            {help && (
              <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
            )}
            {getDateFormatHint() && (
              <p className='text-xs text-gray-400 dark:text-gray-500 italic'>
                {getDateFormatHint()}
              </p>
            )}
          </>
        )}

        {error && (
          <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'

export default DateInput

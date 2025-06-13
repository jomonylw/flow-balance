'use client'

import React, { useState } from 'react'

interface CalendarProps {
  mode?: 'single' | 'multiple'
  selected?: Date | Date[]
  onSelect?: (date: Date | Date[] | undefined) => void
  locale?: any
  className?: string
}

export function Calendar({ 
  mode = 'single', 
  selected, 
  onSelect, 
  locale, 
  className = '' 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // 获取当月第一天是星期几
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // 获取上月天数
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const handleDateClick = (day: number, isCurrentMonth: boolean = true) => {
    if (!isCurrentMonth) return
    
    const clickedDate = new Date(year, month, day)
    if (onSelect) {
      onSelect(clickedDate)
    }
  }
  
  const isSelected = (day: number) => {
    if (!selected) return false
    if (mode === 'single' && selected instanceof Date) {
      return selected.getDate() === day && 
             selected.getMonth() === month && 
             selected.getFullYear() === year
    }
    return false
  }
  
  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year
  }
  
  // 生成日历网格
  const calendarDays = []
  
  // 上月的日期
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    calendarDays.push(
      <button
        key={`prev-${day}`}
        className="h-8 w-8 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        onClick={() => handleDateClick(day, false)}
      >
        {day}
      </button>
    )
  }
  
  // 当月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(
      <button
        key={day}
        className={`h-8 w-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isSelected(day)
            ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            : isToday(day)
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'text-gray-900 dark:text-gray-100'
        }`}
        onClick={() => handleDateClick(day)}
      >
        {day}
      </button>
    )
  }
  
  // 下月的日期（填满6行）
  const totalCells = 42 // 6行 × 7列
  const remainingCells = totalCells - calendarDays.length
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push(
      <button
        key={`next-${day}`}
        className="h-8 w-8 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        onClick={() => handleDateClick(day, false)}
      >
        {day}
      </button>
    )
  }
  
  return (
    <div className={`p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
        >
          ←
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {year}年{monthNames[month]}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
        >
          →
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
      
      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays}
      </div>
    </div>
  )
}

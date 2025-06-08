'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SidebarSearchBoxProps {
  value: string
  onChange: (value: string) => void
}

export default function SidebarSearchBox({ value, onChange }: SidebarSearchBoxProps) {
  const { t, isLoading } = useLanguage()
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ESC键清空搜索（保留基本功能）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocused) {
        onChange('')
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, onChange])

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative group">
      {/* 搜索图标 */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className={`h-4 w-4 transition-colors duration-200 ${
            isFocused ? 'text-blue-500' : 'text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        placeholder={isLoading ? '搜索...' : t('sidebar.search.placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          block w-full pl-10 pr-10 py-2.5 text-sm
          border rounded-xl leading-5 bg-white placeholder-gray-500
          transition-all duration-200 ease-in-out
          ${isFocused
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-md placeholder-gray-400'
            : 'border-gray-300 hover:border-gray-400 shadow-sm'
          }
          focus:outline-none
        `}
      />

      {/* 清空按钮 */}
      {value && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200 p-1 rounded-md hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}


    </div>
  )
}

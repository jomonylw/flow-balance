'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import type { SimpleTransactionTemplate } from '@/types/core'

interface TemplateSelectorProps {
  value: string
  templateName: string
  onChange: (templateId: string, template?: SimpleTransactionTemplate) => void
  onTemplateNameChange: (name: string) => void
  onDelete?: (templateId: string) => void
  templates: SimpleTransactionTemplate[]
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export default function TemplateSelector({
  value,
  templateName,
  onChange,
  onTemplateNameChange,
  onDelete,
  templates,
  placeholder,
  disabled = false,
  error,
  label,
  required = false,
}: TemplateSelectorProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedTemplate = templates.find(t => t.id === value)

  // 同步输入值
  useEffect(() => {
    if (selectedTemplate) {
      setInputValue(selectedTemplate.name)
    } else {
      setInputValue(templateName)
    }
  }, [selectedTemplate, templateName])

  const filteredTemplates = templates.filter(
    template =>
      template.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      template.description.toLowerCase().includes(inputValue.toLowerCase())
  )

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (template: SimpleTransactionTemplate) => {
    onChange(template.id, template)
    setInputValue(template.name)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('', undefined)
    setInputValue('')
    onTemplateNameChange('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // 如果当前选中了模板但输入值改变了，清空模板选择
    if (selectedTemplate && newValue !== selectedTemplate.name) {
      onChange('', undefined)
    }

    // 更新模板名称
    onTemplateNameChange(newValue)

    // 显示下拉列表
    if (newValue && !isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleDelete = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(templateId)
    }
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        inputRef.current?.focus()
      }
    }
  }

  return (
    <div className='space-y-2'>
      {label && (
        <label
          className={`block text-sm font-medium ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
        >
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      <div className='relative' ref={dropdownRef}>
        {/* 输入框 */}
        <div className='relative'>
          <input
            ref={inputRef}
            type='text'
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder || t('template.select.placeholder')}
            disabled={disabled}
            className={`
              w-full px-4 py-3 sm:py-2.5 pr-12 border rounded-lg transition-all duration-200
              ${disabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}
              ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500'}
              ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}
              focus:outline-none focus:ring-2 min-h-[44px] sm:min-h-[auto]
            `}
          />

          {/* 右侧按钮组 */}
          <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1'>
            {inputValue && (
              <button
                onClick={handleClear}
                className='p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                title={t('common.clear')}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            )}
            {selectedTemplate && onDelete && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleDelete(e, selectedTemplate.id)
                }}
                className='p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                title={t('common.delete')}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
              </button>
            )}
            <button
              onClick={handleToggle}
              className='p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            >
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 下拉选项 */}
        {isOpen && (
          <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden'>
            {/* 选项列表 */}
            <div className='max-h-80 overflow-y-auto'>
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className='px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0'
                  >
                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                      {template.name}
                    </div>
                    <div className='text-sm text-gray-500 dark:text-gray-400 truncate mt-1'>
                      {template.description}
                    </div>
                    {template.account && (
                      <div className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                        {template.account.name} • {template.currency?.symbol}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className='px-4 py-6 text-gray-500 dark:text-gray-400 text-center'>
                  {inputValue
                    ? t('template.no.results')
                    : t('template.no.templates')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
      )}
    </div>
  )
}

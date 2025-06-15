import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ColorOption {
  value: string
  label: string
  category: string
}

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
  className?: string
}

// 扩展的颜色选项，按色系分组
const COLOR_OPTIONS: ColorOption[] = [
  // 蓝色系
  { value: '#1e40af', label: '深蓝', category: 'blue' },
  { value: '#3b82f6', label: '蓝色', category: 'blue' },
  { value: '#60a5fa', label: '浅蓝', category: 'blue' },
  { value: '#06b6d4', label: '青色', category: 'blue' },
  
  // 绿色系
  { value: '#059669', label: '深绿', category: 'green' },
  { value: '#10b981', label: '绿色', category: 'green' },
  { value: '#34d399', label: '浅绿', category: 'green' },
  { value: '#84cc16', label: '柠檬绿', category: 'green' },
  { value: '#14b8a6', label: '青绿色', category: 'green' },
  
  // 红色系
  { value: '#dc2626', label: '深红', category: 'red' },
  { value: '#ef4444', label: '红色', category: 'red' },
  { value: '#f87171', label: '浅红', category: 'red' },
  { value: '#f43f5e', label: '玫瑰红', category: 'red' },
  
  // 橙色系
  { value: '#ea580c', label: '深橙', category: 'orange' },
  { value: '#f97316', label: '橘色', category: 'orange' },
  { value: '#fb923c', label: '浅橙', category: 'orange' },
  { value: '#f59e0b', label: '琥珀色', category: 'orange' },
  
  // 紫色系
  { value: '#7c3aed', label: '深紫', category: 'purple' },
  { value: '#8b5cf6', label: '紫色', category: 'purple' },
  { value: '#a78bfa', label: '浅紫', category: 'purple' },
  { value: '#a855f7', label: '深紫色', category: 'purple' },
  
  // 粉色系
  { value: '#be185d', label: '深粉', category: 'pink' },
  { value: '#ec4899', label: '粉色', category: 'pink' },
  { value: '#f472b6', label: '浅粉', category: 'pink' },
  
  // 中性色系
  { value: '#374151', label: '深灰', category: 'neutral' },
  { value: '#6b7280', label: '灰色', category: 'neutral' },
  { value: '#9ca3af', label: '浅灰', category: 'neutral' },
  { value: '#78716c', label: '石色', category: 'neutral' },
  
  // 特殊色系
  { value: '#0891b2', label: '天蓝', category: 'special' },
  { value: '#0d9488', label: '蓝绿', category: 'special' },
  { value: '#7c2d12', label: '棕色', category: 'special' },
  { value: '#92400e', label: '琥珀棕', category: 'special' }
]

export default function ColorPicker({ selectedColor, onColorChange, className = '' }: ColorPickerProps) {
  const { t } = useLanguage()

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('account.settings.account.color')}
      </label>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('account.settings.color.help')}
      </p>
      
      {/* 颜色网格 */}
      <div className="grid grid-cols-16 gap-1.5 mb-4">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onColorChange(color.value)}
            className={`
              relative w-8 h-8 rounded-lg border-2 transition-all hover:scale-105
              ${selectedColor === color.value
                ? 'border-gray-900 dark:border-gray-100 ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-2 dark:ring-offset-gray-800'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
            style={{ backgroundColor: color.value }}
            title={color.label}
          >
            {selectedColor === color.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* 颜色预览 */}
      {/* <div className="flex items-center space-x-2">
        <div
          className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('account.color.preview', { 
            color: COLOR_OPTIONS.find(c => c.value === selectedColor)?.label || selectedColor 
          })}
        </span>
      </div> */}
    </div>
  )
}

// 导出颜色选项供其他组件使用
export { COLOR_OPTIONS }
export type { ColorOption }

'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { SPACING } from '@/lib/constants/dimensions'
import type { SimpleTag } from '@/types/core'
import { DEFAULT_COLOR } from '@/types/core/constants'

interface TagSelectorProps {
  tags: SimpleTag[]
  selectedTagIds: string[]
  onTagToggle: (tagId: string) => void
  label?: string
  showLabel?: boolean
  showEmptyMessage?: boolean
  showCreateButton?: boolean
  onCreateClick?: () => void
  createButtonText?: string
  className?: string
}

export default function TagSelector({
  tags,
  selectedTagIds,
  onTagToggle,
  label,
  showLabel = true,
  showEmptyMessage = true,
  showCreateButton = false,
  onCreateClick,
  createButtonText,
  className = '',
}: TagSelectorProps) {
  const { t } = useLanguage()

  return (
    <div className={className}>
      {showLabel && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          {label || t('transaction.tags')}
        </label>
      )}

      <div className='flex flex-wrap' style={{ gap: `${SPACING.MD}px` }}>
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id)
          const tagColor = tag.color || DEFAULT_COLOR // 默认灰色

          return (
            <button
              key={tag.id}
              type='button'
              onClick={() => onTagToggle(tag.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 border-2 ${
                isSelected
                  ? 'text-white border-opacity-100'
                  : 'text-gray-700 dark:text-gray-300 border-transparent hover:border-opacity-50'
              }`}
              style={{
                backgroundColor: isSelected ? tagColor : 'transparent',
                borderColor: isSelected ? tagColor : tagColor + '40', // 40 = 25% opacity
                color: isSelected ? 'white' : undefined,
              }}
            >
              {tag.name}
            </button>
          )
        })}
      </div>

      {showEmptyMessage && tags.length === 0 && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          {t('transaction.tags.empty')}
        </p>
      )}

      {/* 创建新标签按钮 */}
      {showCreateButton && onCreateClick && (
        <div className='pt-3'>
          <button
            type='button'
            onClick={onCreateClick}
            className='inline-flex items-center text-sm text-blue-600 hover:text-blue-500'
          >
            <svg
              className='mr-1 h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 6v6m0 0v6m0-6h6m-6 0H6'
              />
            </svg>
            {createButtonText || t('tag.create.new')}
          </button>
        </div>
      )}
    </div>
  )
}

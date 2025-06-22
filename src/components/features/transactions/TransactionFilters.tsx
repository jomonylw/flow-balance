'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import type { TransactionFilters } from '@/types/components'

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFilterChange: (filters: Partial<TransactionFilters>) => void
}

export default function TransactionFilters({
  filters,
  onFilterChange,
}: TransactionFiltersProps) {
  const { t } = useLanguage()
  const { accounts, categories, tags } = useUserData()

  // 搜索输入的本地状态，用于防抖
  const [searchInput, setSearchInput] = useState(filters.search)
  const [isSearchPending, setIsSearchPending] = useState(false)

  // 防抖效果：当搜索输入变化时，延迟500ms后更新过滤器
  useEffect(() => {
    // 如果搜索输入与当前过滤器不同，设置为待处理状态
    if (searchInput !== filters.search) {
      setIsSearchPending(true)
    }

    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput })
      }
      setIsSearchPending(false)
    }, 500) // 500ms 防抖延迟

    return () => {
      clearTimeout(timeoutId)
      setIsSearchPending(false)
    }
  }, [searchInput, onFilterChange, filters.search])

  // 当外部过滤器的搜索值变化时，同步到本地状态
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  // 筛选出收入类和支出类账户
  const flowAccounts = accounts.filter(
    account =>
      account.category.type === 'INCOME' || account.category.type === 'EXPENSE'
  )

  // 筛选出收入类和支出类分类
  const flowCategories = categories.filter(
    category => category.type === 'INCOME' || category.type === 'EXPENSE'
  )

  // 日期格式化函数，避免时区问题
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    onFilterChange({ [name]: value })
  }

  // 搜索输入的处理函数
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  const handleTagToggle = (tagId: string) => {
    const currentTagIds = filters.tagIds || []
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId]

    onFilterChange({ tagIds: newTagIds })
  }

  const handleClearFilters = () => {
    setSearchInput('') // 清除本地搜索状态
    onFilterChange({
      accountId: '',
      categoryId: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      tagIds: [],
    })
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'tagIds') return Array.isArray(value) && value.length > 0
    return value !== ''
  })

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('transaction.filter')}
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className='text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'
          >
            {t('common.clear.all')}
          </button>
        )}
      </div>

      {/* 基础筛选 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2'>
          {t('transaction.filter.basic')}
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {/* 交易类型 */}
          <div>
            <label
              htmlFor='type'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('transaction.type')}
            </label>
            <select
              id='type'
              name='type'
              value={filters.type}
              onChange={handleInputChange}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            >
              <option value=''>{t('type.all')}</option>
              <option value='INCOME'>{t('type.income')}</option>
              <option value='EXPENSE'>{t('type.expense')}</option>
            </select>
          </div>

          {/* 分类 - 仅显示收入类和支出类分类 */}
          <div>
            <label
              htmlFor='categoryId'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('transaction.category')}
            </label>
            <select
              id='categoryId'
              name='categoryId'
              value={filters.categoryId}
              onChange={handleInputChange}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            >
              <option value=''>{t('category.all')}</option>
              {flowCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* 账户 - 仅显示收入类和支出类账户 */}
          <div>
            <label
              htmlFor='accountId'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('transaction.account')}
            </label>
            <select
              id='accountId'
              name='accountId'
              value={filters.accountId}
              onChange={handleInputChange}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            >
              <option value=''>{t('account.all')}</option>
              {flowAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.category.name})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className='pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {/* 搜索 */}
          <div>
            <label
              htmlFor='search'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('transaction.search')}
              {isSearchPending && (
                <span className='ml-2 text-xs text-blue-600 dark:text-blue-400'>
                  {t('transaction.search.searching')}
                </span>
              )}
            </label>
            <div className='relative'>
              <input
                type='text'
                id='search'
                name='search'
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={t('transaction.search.placeholder')}
                className='w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              />
              {isSearchPending && (
                <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
                  <LoadingSpinner size='sm' color='primary' />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 日期范围筛选 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2'>
          {t('transaction.filter.date.range')}
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* 开始日期 */}
          <div>
            <label
              htmlFor='dateFrom'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('time.date.from')}
            </label>
            <input
              type='date'
              id='dateFrom'
              name='dateFrom'
              value={filters.dateFrom}
              onChange={handleInputChange}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label
              htmlFor='dateTo'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              {t('time.date.to')}
            </label>
            <input
              type='date'
              id='dateTo'
              name='dateTo'
              value={filters.dateTo}
              onChange={handleInputChange}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            />
          </div>
        </div>
      </div>

      {/* 快速日期选择 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2'>
          {t('transaction.filter.quick.date')}
        </h4>
        <div className='flex flex-wrap gap-2'>
          <button
            onClick={() => {
              const today = new Date()
              const todayStr = formatDate(today)
              onFilterChange({ dateFrom: todayStr, dateTo: todayStr })
            }}
            className='px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors'
          >
            {t('time.today')}
          </button>
          <button
            onClick={() => {
              const today = new Date()
              // 本周第一天（周日）
              const thisWeekStart = new Date(today)
              thisWeekStart.setDate(today.getDate() - today.getDay())
              // 本周最后一天（周六）
              const thisWeekEnd = new Date(today)
              thisWeekEnd.setDate(today.getDate() - today.getDay() + 6)

              onFilterChange({
                dateFrom: formatDate(thisWeekStart),
                dateTo: formatDate(thisWeekEnd),
              })
            }}
            className='px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors'
          >
            {t('time.this.week')}
          </button>
          <button
            onClick={() => {
              const today = new Date()
              // 当月第一天
              const thisMonthStart = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
              )
              // 当月最后一天
              const thisMonthEnd = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0
              )

              onFilterChange({
                dateFrom: formatDate(thisMonthStart),
                dateTo: formatDate(thisMonthEnd),
              })
            }}
            className='px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors'
          >
            {t('time.this.month')}
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const thisYearStart = new Date(today.getFullYear(), 0, 1)
              const thisYearEnd = new Date(today.getFullYear(), 11, 31)

              onFilterChange({
                dateFrom: formatDate(thisYearStart),
                dateTo: formatDate(thisYearEnd),
              })
            }}
            className='px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors'
          >
            {t('time.this.year')}
          </button>
          {/* 清除日期筛选按钮 */}
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => onFilterChange({ dateFrom: '', dateTo: '' })}
              className='px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors'
            >
              {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      {/* 标签筛选 */}
      {tags.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex-1'>
              {t('transaction.filter.tags')}
            </h4>
            {filters.tagIds && filters.tagIds.length > 0 && (
              <button
                onClick={() => onFilterChange({ tagIds: [] })}
                className='ml-4 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300'
              >
                {t('transaction.filter.tags.clear')}
              </button>
            )}
          </div>
          <div className='flex flex-wrap gap-2'>
            {tags.map(tag => {
              const isSelected = filters.tagIds?.includes(tag.id) || false
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
                    ${
                      isSelected
                        ? 'border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                  style={
                    isSelected && tag.color
                      ? {
                          backgroundColor: tag.color + '15',
                          borderColor: tag.color,
                          color: tag.color,
                        }
                      : {}
                  }
                >
                  {tag.color && (
                    <div
                      className='w-2 h-2 rounded-full mr-2 border border-gray-300'
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

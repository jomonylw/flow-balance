'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Account {
  id: string
  name: string
  category: {
    name: string
  }
}

interface Category {
  id: string
  name: string
}

interface Filters {
  accountId: string
  categoryId: string
  type: string
  dateFrom: string
  dateTo: string
  search: string
}

interface TransactionFiltersProps {
  filters: Filters
  onFilterChange: (filters: Partial<Filters>) => void
  accounts: Account[]
  categories: Category[]
}

export default function TransactionFilters({
  filters,
  onFilterChange,
  accounts,
  categories
}: TransactionFiltersProps) {
  const { t } = useLanguage()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    onFilterChange({ [name]: value })
  }

  const handleClearFilters = () => {
    onFilterChange({
      accountId: '',
      categoryId: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('transaction.filter')}</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('common.clear.all')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 搜索 */}
        <div className="xl:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('transaction.search')}
          </label>
          <input
            type="text"
            id="search"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
            placeholder={t('transaction.search.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* 交易类型 */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('transaction.type')}
          </label>
          <select
            id="type"
            name="type"
            value={filters.type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('type.all')}</option>
            <option value="INCOME">{t('type.income')}</option>
            <option value="EXPENSE">{t('type.expense')}</option>
          </select>
        </div>

        {/* 账户 */}
        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('transaction.account')}
          </label>
          <select
            id="accountId"
            name="accountId"
            value={filters.accountId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('account.all')}</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.category.name})
              </option>
            ))}
          </select>
        </div>

        {/* 分类 */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('transaction.category')}
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={filters.categoryId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('category.all')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('time.date.from')}
          </label>
          <input
            type="date"
            id="dateFrom"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* 结束日期 */}
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('time.date.to')}
          </label>
          <input
            type="date"
            id="dateTo"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* 快速日期筛选 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">快速筛选：</span>
          <button
            onClick={() => {
              const today = new Date()
              const todayStr = today.toISOString().split('T')[0]
              onFilterChange({ dateFrom: todayStr, dateTo: todayStr })
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            今天
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()))
              const thisWeekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6))
              onFilterChange({
                dateFrom: thisWeekStart.toISOString().split('T')[0],
                dateTo: thisWeekEnd.toISOString().split('T')[0]
              })
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            本周
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
              const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
              onFilterChange({
                dateFrom: thisMonthStart.toISOString().split('T')[0],
                dateTo: thisMonthEnd.toISOString().split('T')[0]
              })
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            本月
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const thisYearStart = new Date(today.getFullYear(), 0, 1)
              const thisYearEnd = new Date(today.getFullYear(), 11, 31)
              onFilterChange({
                dateFrom: thisYearStart.toISOString().split('T')[0],
                dateTo: thisYearEnd.toISOString().split('T')[0]
              })
            }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            今年
          </button>
        </div>
      </div>
    </div>
  )
}

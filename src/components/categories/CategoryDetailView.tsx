'use client'

import StockCategoryDetailView from './StockCategoryDetailView'
import FlowCategoryDetailView from './FlowCategoryDetailView'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CategoryDetailViewProps } from './types'

export default function CategoryDetailView({
  category,
  accounts,
  categories,
  currencies,
  tags,
  user
}: CategoryDetailViewProps) {
  const { t } = useLanguage()

  // 判断分类类型
  const categoryType = category.type
  const isStockCategory = categoryType === 'ASSET' || categoryType === 'LIABILITY'
  const isFlowCategory = categoryType === 'INCOME' || categoryType === 'EXPENSE'

  // 根据分类类型渲染不同的组件
  if (isStockCategory && (categoryType === 'ASSET' || categoryType === 'LIABILITY')) {
    return (
      <StockCategoryDetailView
        category={category as any}
        accounts={accounts as any}
        categories={categories as any}
        currencies={currencies}
        tags={tags}
        user={user}
      />
    )
  }

  if (isFlowCategory && (categoryType === 'INCOME' || categoryType === 'EXPENSE')) {
    return (
      <FlowCategoryDetailView
        category={category as any}
        accounts={accounts}
        categories={categories}
        currencies={currencies}
        tags={tags}
        user={user}
      />
    )
  }

  // 未设置类型的分类显示提示信息
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('category.type.not.set')}
        </h3>
        <p className="text-gray-500 mb-4">
          {t('category.type.not.set.description')}
        </p>
        <div className="text-sm text-gray-400">
          {t('category.name')}: {category.name}
        </div>
      </div>
    </div>
  )
}
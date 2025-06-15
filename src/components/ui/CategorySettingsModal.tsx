'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useUserData } from '@/contexts/UserDataContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface Category {
  id: string
  name: string
  parentId: string | null
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  order: number
}

interface CategorySettingsModalProps {
  isOpen: boolean
  category: Category
  onClose: () => void
  onSave: (updatedCategory: Partial<Category>) => void
}

export default function CategorySettingsModal({
  isOpen,
  category,
  onClose,
  onSave
}: CategorySettingsModalProps) {
  const { t } = useLanguage()
  const [selectedType, setSelectedType] = useState<string>(category.type || '')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(category.order || 0)
  const [isLoading, setIsLoading] = useState(false)

  // 使用UserDataContext获取分类数据，避免API调用
  const { categories } = useUserData()

  const ACCOUNT_TYPES = [
    { value: 'ASSET', label: t('category.type.asset'), description: t('category.settings.asset.description'), color: 'text-blue-600 dark:text-blue-400' },
    { value: 'LIABILITY', label: t('category.type.liability'), description: t('category.settings.liability.description'), color: 'text-red-600 dark:text-red-400' },
    { value: 'INCOME', label: t('category.type.income'), description: t('category.settings.income.description'), color: 'text-green-600 dark:text-green-400' },
    { value: 'EXPENSE', label: t('category.type.expense'), description: t('category.settings.expense.description'), color: 'text-orange-600 dark:text-orange-400' }
  ] as const

  // 是否为顶级分类
  const isTopLevel = !category.parentId

  // 从Context中获取父分类信息
  const parentCategory = category.parentId
    ? categories.find(cat => cat.id === category.parentId) || null
    : null

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const updates: Partial<Category> = {
        order
      }

      // 只有顶级分类可以设置账户类型
      if (isTopLevel && selectedType) {
        updates.type = selectedType as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      }

      await onSave(updates)
      onClose()
    } catch (error) {
      console.error('Error saving category settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getInheritedType = () => {
    if (isTopLevel) return null
    return parentCategory?.type || null
  }

  const getTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type)
  }

  const inheritedType = getInheritedType()
  const inheritedTypeInfo = inheritedType ? getTypeInfo(inheritedType) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('category.settings')}>
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('category.settings.basic.info')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('category.name')}
              </label>
              <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
                {category.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('category.settings.level')}
              </label>
              <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md">
                {isTopLevel ? t('category.settings.top.level') : t('category.subcategory')}
              </div>
            </div>

            <div>
              <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('category.settings.sort.order')}
              </label>
              <input
                type="number"
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t('category.settings.sort.placeholder')}
              />
            </div>
          </div>
        </div>

        {/* 账户类型设置 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('category.type')}</h3>

          {isTopLevel ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('category.settings.top.level.description')}
              </p>

              <div className="space-y-3">
                {ACCOUNT_TYPES.map((type) => (
                  <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="accountType"
                      value={type.value}
                      checked={selectedType === type.value}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${type.color}`}>
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedType && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">{t('category.settings.statistics.method')}</h4>
                  <div className="text-sm text-blue-800 dark:text-blue-400">
                    {selectedType === 'ASSET' || selectedType === 'LIABILITY' ? (
                      <div>
                        <p><strong>{t('category.settings.stock.statistics')}：</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>{t('category.settings.stock.balance.point')}</li>
                          <li>{t('category.settings.stock.net.worth')}</li>
                          <li>{t('category.settings.stock.balance.sheet')}</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p><strong>{t('category.settings.flow.statistics')}：</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>{t('category.settings.flow.period.amount')}</li>
                          <li>{t('category.settings.flow.trend.analysis')}</li>
                          <li>{t('category.settings.flow.cash.flow.statement')}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('category.settings.subcategory.description')}
              </p>

              {inheritedTypeInfo ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('category.settings.inherited.type')}：</span>
                    <span className={`font-medium ${inheritedTypeInfo.color}`}>
                      {inheritedTypeInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {inheritedTypeInfo.description}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-sm text-yellow-800 dark:text-yellow-400">
                    ⚠️ {t('category.settings.parent.type.warning')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('category.settings.saving') : t('category.settings.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

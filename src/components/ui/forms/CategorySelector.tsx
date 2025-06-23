'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { AccountType } from '@/types/core/constants'

// 本地Category接口，用于组件内部
interface LocalCategory {
  id: string
  name: string
  parentId: string | null
  type?: AccountType
  children?: LocalCategory[]
}

interface CategorySelectorProps {
  isOpen: boolean
  title: string
  currentCategoryId?: string
  excludeCategoryId?: string // 排除的分类ID（用于移动时排除自己和子分类）
  filterByAccountType?: AccountType // 按账户类型过滤
  onSelect: (categoryId: string) => void
  onCancel: () => void
}

export default function CategorySelector({
  isOpen,
  title,
  currentCategoryId,
  excludeCategoryId,
  filterByAccountType,
  onSelect,
  onCancel,
}: CategorySelectorProps) {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<LocalCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // 使用UserDataContext获取分类数据，避免重复API调用
  const { categories: allCategories, isLoading } = useUserData()

  // 工具函数定义
  const isDescendantOf = (
    category: LocalCategory,
    ancestorId: string,
    allCategories: LocalCategory[]
  ): boolean => {
    if (!category.parentId) return false
    if (category.parentId === ancestorId) return true

    const parent = allCategories.find(c => c.id === category.parentId)
    if (!parent) return false

    return isDescendantOf(parent, ancestorId, allCategories)
  }

  const findRootCategory = (
    category: LocalCategory,
    allCategories: LocalCategory[]
  ): LocalCategory | null => {
    if (!category.parentId) {
      return category
    }

    const parent = allCategories.find(c => c.id === category.parentId)
    if (!parent) {
      return category
    }

    return findRootCategory(parent, allCategories)
  }

  const filterExcludedCategories = (
    categories: LocalCategory[],
    excludeId: string
  ): LocalCategory[] => {
    return categories.filter(category => {
      if (category.id === excludeId) {
        return false
      }
      // 检查是否是被排除分类的子分类
      return !isDescendantOf(category, excludeId, categories)
    })
  }

  const filterByAccountTypeFunc = (
    categories: LocalCategory[],
    accountType: string
  ): LocalCategory[] => {
    return categories.filter(category => {
      // 如果分类有明确的类型，检查是否匹配
      if (category.type) {
        return category.type === accountType
      }

      // 如果分类没有类型，检查其父分类的类型
      const rootCategory = findRootCategory(category, categories)
      return rootCategory?.type === accountType
    })
  }

  const buildCategoryTree = (categories: LocalCategory[]): LocalCategory[] => {
    const categoryMap = new Map<string, LocalCategory>()
    const rootCategories: LocalCategory[] = []

    // 创建分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // 构建树结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)
      if (!categoryNode) return

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent && parent.children) {
          parent.children.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    return rootCategories
  }

  const processCategories = useCallback(() => {
    // 转换Context中的Category类型到本地Category类型
    let categoriesData: LocalCategory[] = allCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId || null,
      type: cat.type,
      children: [],
    }))

    // 如果有排除的分类，过滤掉它和它的所有子分类
    if (excludeCategoryId) {
      categoriesData = filterExcludedCategories(
        categoriesData,
        excludeCategoryId
      )

      // 对于分类移动，需要确保只显示同类型的分类
      // 获取被排除分类的根分类类型
      const excludedCategory = allCategories.find(
        cat => cat.id === excludeCategoryId
      )
      if (excludedCategory) {
        // 转换为LocalCategory类型
        const excludedLocalCategory: LocalCategory = {
          id: excludedCategory.id,
          name: excludedCategory.name,
          parentId: excludedCategory.parentId || null,
          type: excludedCategory.type,
        }
        const excludedRootCategory = findRootCategory(
          excludedLocalCategory,
          categoriesData
        )
        if (excludedRootCategory?.type) {
          categoriesData = filterByAccountTypeFunc(
            categoriesData,
            excludedRootCategory.type
          )
        }
      }
    }

    // 如果指定了账户类型过滤，只显示同类型的分类
    if (filterByAccountType) {
      categoriesData = filterByAccountTypeFunc(
        categoriesData,
        filterByAccountType
      )
    }

    setCategories(buildCategoryTree(categoriesData))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategories, excludeCategoryId, filterByAccountType])

  useEffect(() => {
    if (isOpen) {
      processCategories()
      setSelectedCategoryId(currentCategoryId || '')
    }
  }, [isOpen, currentCategoryId, processCategories])

  const renderCategoryTree = (
    categories: LocalCategory[],
    level = 0
  ): React.ReactNode => {
    return categories.map(category => (
      <div key={category.id}>
        <label
          className={`
            flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700
            ${selectedCategoryId === category.id ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <input
            type='radio'
            name='category'
            value={category.id}
            checked={selectedCategoryId === category.id}
            onChange={() => setSelectedCategoryId(category.id)}
            className='mr-3 text-blue-600 dark:text-blue-400'
          />
          <span className='text-sm text-gray-900 dark:text-gray-100'>
            {category.name}
          </span>
        </label>
        {category.children && category.children.length > 0 && (
          <div>{renderCategoryTree(category.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  const handleSubmit = () => {
    if (selectedCategoryId) {
      onSelect(selectedCategoryId)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className='space-y-4'>
        <div className='max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800'>
          {isLoading ? (
            <div className='text-center py-4 text-gray-500 dark:text-gray-400'>
              {t('common.loading')}
            </div>
          ) : categories.length > 0 ? (
            renderCategoryTree(categories)
          ) : (
            <div className='text-center py-4 text-gray-500 dark:text-gray-400'>
              {t('category.selector.no.categories')}
            </div>
          )}
        </div>

        <div className='flex justify-end space-x-3'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400'
          >
            {t('common.cancel')}
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={!selectedCategoryId}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

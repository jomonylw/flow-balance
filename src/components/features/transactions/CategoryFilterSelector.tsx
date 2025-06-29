import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import type { Category } from '@/types/core'
import { AccountType } from '@/types/core/constants'

interface CategoryFilterSelectorProps {
  value: string
  onChange: (categoryId: string) => void
  className?: string
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
  level: number
  createdAt: Date
  updatedAt: Date
}

export default function CategoryFilterSelector({
  value,
  onChange,
  className = '',
}: CategoryFilterSelectorProps) {
  const { t } = useLanguage()
  const { categories } = useUserData()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 构建分类树
  const buildCategoryTree = (): CategoryTreeNode[] => {
    // 筛选出收入类和支出类分类
    const flowCategories = categories.filter(
      category => category.type === 'INCOME' || category.type === 'EXPENSE'
    )

    // 创建分类映射
    const categoryMap = new Map<string, CategoryTreeNode>()
    const rootCategories: CategoryTreeNode[] = []

    flowCategories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        type: category.type || AccountType.EXPENSE, // Provide default type
        children: [],
        level: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    // 构建树状结构并计算层级
    const calculateLevel = (
      categoryId: string,
      visited = new Set<string>()
    ): number => {
      if (visited.has(categoryId)) return 0 // 防止循环引用
      visited.add(categoryId)

      const category = categoryMap.get(categoryId)
      if (!category || !category.parentId) return 0

      return calculateLevel(category.parentId, visited) + 1
    }

    flowCategories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)
      if (!categoryNode) return

      categoryNode.level = calculateLevel(category.id)

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    // 递归排序
    const sortTree = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortTree(node.children)
        }
      })
    }

    sortTree(rootCategories)
    return rootCategories
  }

  // 扁平化分类树用于搜索和显示
  const flattenTree = (tree: CategoryTreeNode[]): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = []

    const traverse = (nodes: CategoryTreeNode[]) => {
      nodes.forEach(node => {
        result.push(node)
        if (node.children.length > 0) {
          traverse(node.children)
        }
      })
    }

    traverse(tree)
    return result
  }

  const categoryTree = buildCategoryTree()
  const flatCategories = flattenTree(categoryTree)

  // 搜索过滤
  const filteredCategories = flatCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 获取选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!value) return t('category.all')
    const category = flatCategories.find(c => c.id === value)
    return category ? category.name : t('category.all')
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-between'
      >
        <span className='truncate'>{getSelectedCategoryName()}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

      {/* 下拉选项 */}
      {isOpen && (
        <div className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-hidden'>
          {/* 搜索框 */}
          <div className='p-2 border-b border-gray-200 dark:border-gray-600'>
            <input
              type='text'
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            />
          </div>

          {/* 选项列表 */}
          <div className='max-h-60 overflow-y-auto'>
            {/* 全部选项 */}
            <button
              type='button'
              onClick={() => handleCategorySelect('')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                !value
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {t('category.all')}
            </button>

            {/* 分类选项 */}
            {filteredCategories.map(category => {
              const isSelected = category.id === value
              const prefix =
                '　'.repeat(category.level) + (category.level > 0 ? '└ ' : '')

              return (
                <button
                  key={category.id}
                  type='button'
                  onClick={() => handleCategorySelect(category.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span className='font-mono text-xs text-gray-400 mr-1'>
                    {prefix}
                  </span>
                  {category.name}
                  <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>
                    (
                    {category.type === 'INCOME'
                      ? t('account.type.income')
                      : t('account.type.expense')}
                    )
                  </span>
                </button>
              )
            })}

            {filteredCategories.length === 0 && searchQuery && (
              <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center'>
                {t('common.no.results')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

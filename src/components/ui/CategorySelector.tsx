'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'

interface Category {
  id: string
  name: string
  parentId: string | null
  children?: Category[]
}

interface CategorySelectorProps {
  isOpen: boolean
  title: string
  currentCategoryId?: string
  excludeCategoryId?: string // 排除的分类ID（用于移动时排除自己和子分类）
  onSelect: (categoryId: string) => void
  onCancel: () => void
}

export default function CategorySelector({
  isOpen,
  title,
  currentCategoryId,
  excludeCategoryId,
  onSelect,
  onCancel
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      setSelectedCategoryId(currentCategoryId || '')
    }
  }, [isOpen, currentCategoryId])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const result = await response.json()
        let categoriesData = result.data || []
        
        // 如果有排除的分类，过滤掉它和它的所有子分类
        if (excludeCategoryId) {
          categoriesData = filterExcludedCategories(categoriesData, excludeCategoryId)
        }
        
        setCategories(buildCategoryTree(categoriesData))
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterExcludedCategories = (categories: Category[], excludeId: string): Category[] => {
    return categories.filter(category => {
      if (category.id === excludeId) {
        return false
      }
      // 检查是否是被排除分类的子分类
      return !isDescendantOf(category, excludeId, categories)
    })
  }

  const isDescendantOf = (category: Category, ancestorId: string, allCategories: Category[]): boolean => {
    if (!category.parentId) return false
    if (category.parentId === ancestorId) return true
    
    const parent = allCategories.find(c => c.id === category.parentId)
    if (!parent) return false
    
    return isDescendantOf(parent, ancestorId, allCategories)
  }

  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // 创建分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // 构建树结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    return rootCategories
  }

  const renderCategoryTree = (categories: Category[], level = 0): React.ReactNode => {
    return categories.map(category => (
      <div key={category.id}>
        <label
          className={`
            flex items-center p-2 rounded cursor-pointer hover:bg-gray-50
            ${selectedCategoryId === category.id ? 'bg-blue-50 border border-blue-200' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <input
            type="radio"
            name="category"
            value={category.id}
            checked={selectedCategoryId === category.id}
            onChange={() => setSelectedCategoryId(category.id)}
            className="mr-3"
          />
          <span className="text-sm">{category.name}</span>
        </label>
        {category.children && category.children.length > 0 && (
          <div>
            {renderCategoryTree(category.children, level + 1)}
          </div>
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
      <div className="space-y-4">
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : categories.length > 0 ? (
            renderCategoryTree(categories)
          ) : (
            <div className="text-center py-4 text-gray-500">暂无分类</div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedCategoryId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </button>
        </div>
      </div>
    </Modal>
  )
}

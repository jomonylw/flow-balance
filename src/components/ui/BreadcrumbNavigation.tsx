'use client'

import Link from 'next/link'
import { useUserData } from '@/contexts/UserDataContext'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbNavigationProps {
  // 分类ID（用于分类详情页面）
  categoryId?: string
  // 账户ID（用于账户详情页面）
  accountId?: string
  // 自定义面包屑项目（如果不使用自动构建）
  customItems?: BreadcrumbItem[]
  className?: string
}

export default function BreadcrumbNavigation({
  categoryId,
  accountId,
  customItems,
  className = ''
}: BreadcrumbNavigationProps) {
  const { categories, accounts } = useUserData()

  // 构建面包屑路径
  const buildBreadcrumbItems = (): BreadcrumbItem[] => {
    // 如果提供了自定义项目，直接使用
    if (customItems) {
      return customItems
    }

    const items: BreadcrumbItem[] = []

    // 如果是账户详情页面
    if (accountId) {
      const account = accounts.find(acc => acc.id === accountId)
      if (account) {
        // 构建分类路径
        const categoryPath = buildCategoryPath(account.categoryId)
        items.push(...categoryPath)

        // 添加账户本身
        items.push({
          label: account.name,
          href: `/accounts/${account.id}`
        })
      }
      return items
    }

    // 如果是分类详情页面
    if (categoryId) {
      const categoryPath = buildCategoryPath(categoryId)
      items.push(...categoryPath)
      return items
    }

    return items
  }

  // 构建分类路径（递归构建父级路径）
  const buildCategoryPath = (catId: string): BreadcrumbItem[] => {
    const category = categories.find(cat => cat.id === catId)
    if (!category) return []

    const path: BreadcrumbItem[] = []

    // 如果有父分类，递归构建父级路径
    if (category.parentId) {
      const parentPath = buildCategoryPath(category.parentId)
      path.push(...parentPath)
    }

    // 添加当前分类
    path.push({
      label: category.name,
      href: `/categories/${category.id}`
    })

    return path
  }

  const breadcrumbItems = buildBreadcrumbItems()

  return (
    <nav className={`flex items-center mb-4 sm:mb-6 overflow-x-auto scrollbar-hide ${className}`} aria-label="Breadcrumb">
      <div className="inline-flex items-center space-x-0.5 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg p-1 sm:p-1.5 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm min-w-0">
        {/* 导航图标 */}
        <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mr-1 flex-shrink-0">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>

        <ol className="inline-flex items-center space-x-0.5 whitespace-nowrap min-w-0">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="inline-flex items-center min-w-0">
              {index > 0 && (
                <div className="flex items-center mx-0.5 sm:mx-1 flex-shrink-0">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="group inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] truncate max-w-[100px] sm:max-w-[120px] md:max-w-none min-h-[32px] sm:min-h-[36px]"
                >
                  {item.icon && <span className="mr-1 transition-transform duration-200 group-hover:scale-110 flex-shrink-0">{item.icon}</span>}
                  <span className="tracking-wide truncate">{item.label}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-md shadow-blue-500/25 truncate max-w-[100px] sm:max-w-[120px] md:max-w-none min-h-[32px] sm:min-h-[36px]">
                  {item.icon && <span className="mr-1 flex-shrink-0">{item.icon}</span>}
                  <span className="tracking-wide truncate">{item.label}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}

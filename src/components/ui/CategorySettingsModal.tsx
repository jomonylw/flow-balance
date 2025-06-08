'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useUserData } from '@/contexts/UserDataContext'

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

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: '资产类', description: '现金、银行存款、投资、房产等（存量数据）', color: 'text-blue-600' },
  { value: 'LIABILITY', label: '负债类', description: '信用卡、贷款、应付款等（存量数据）', color: 'text-red-600' },
  { value: 'INCOME', label: '收入类', description: '工资、投资收益、其他收入等（流量数据）', color: 'text-green-600' },
  { value: 'EXPENSE', label: '支出类', description: '生活费、娱乐、交通等（流量数据）', color: 'text-orange-600' }
] as const

export default function CategorySettingsModal({
  isOpen,
  category,
  onClose,
  onSave
}: CategorySettingsModalProps) {
  const [selectedType, setSelectedType] = useState<string>(category.type || '')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(category.order || 0)
  const [isLoading, setIsLoading] = useState(false)

  // 使用UserDataContext获取分类数据，避免API调用
  const { categories } = useUserData()

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
    <Modal isOpen={isOpen} onClose={onClose} title="分类设置">
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类名称
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                {category.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类层级
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                {isTopLevel ? '顶级分类' : '子分类'}
              </div>
            </div>

            <div>
              <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
                排序顺序
              </label>
              <input
                type="number"
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="数字越小排序越靠前"
              />
            </div>
          </div>
        </div>

        {/* 账户类型设置 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">账户类型</h3>
          
          {isTopLevel ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                作为顶级分类，您可以设置此分类的账户类型。所有子分类将自动继承此类型。
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
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${type.color}`}>
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedType && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">统计方法说明</h4>
                  <div className="text-sm text-blue-800">
                    {selectedType === 'ASSET' || selectedType === 'LIABILITY' ? (
                      <div>
                        <p><strong>存量数据统计：</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>显示截止到特定时间点的余额</li>
                          <li>计算净资产（资产-负债）</li>
                          <li>适用于资产负债表分析</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p><strong>流量数据统计：</strong></p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>显示特定时间段内的累计金额</li>
                          <li>分析收支趋势和现金流</li>
                          <li>适用于现金流量表分析</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                作为子分类，此分类的账户类型由父分类决定，无法单独设置。
              </p>
              
              {inheritedTypeInfo ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">继承的账户类型：</span>
                    <span className={`font-medium ${inheritedTypeInfo.color}`}>
                      {inheritedTypeInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {inheritedTypeInfo.description}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    ⚠️ 父分类尚未设置账户类型，建议先设置父分类的账户类型。
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

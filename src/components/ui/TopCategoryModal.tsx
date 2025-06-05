'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import InputField from './InputField'
import SelectField from './SelectField'
import AuthButton from './AuthButton'

interface TopCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; type: string }) => Promise<void>
}

// 账户类型选项
const ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: '请选择账户类型' },
  { value: 'ASSET', label: '资产类 - 存量概念（如：现金、银行存款、投资等）' },
  { value: 'LIABILITY', label: '负债类 - 存量概念（如：信用卡、贷款、应付款等）' },
  { value: 'INCOME', label: '收入类 - 流量概念（如：工资、奖金、投资收益等）' },
  { value: 'EXPENSE', label: '支出类 - 流量概念（如：餐饮、交通、购物等）' }
]

export default function TopCategoryModal({
  isOpen,
  onClose,
  onSave
}: TopCategoryModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({})

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType('')
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: { name?: string; type?: string } = {}

    if (!name.trim()) {
      newErrors.name = '分类名称不能为空'
    } else if (name.length > 50) {
      newErrors.name = '分类名称不能超过50个字符'
    }

    if (!type) {
      newErrors.type = '请选择账户类型'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await onSave({
        name: name.trim(),
        type
      })
      onClose()
    } catch (error) {
      console.error('Error saving top category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeDescription = (selectedType: string) => {
    switch (selectedType) {
      case 'ASSET':
        return {
          title: '资产类分类',
          description: '存量概念 - 记录您拥有的资产的当前价值',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          features: ['余额管理', '资产统计', '净资产计算', '价值变动追踪']
        }
      case 'LIABILITY':
        return {
          title: '负债类分类',
          description: '存量概念 - 记录您需要偿还的债务的当前余额',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          features: ['债务管理', '负债统计', '净资产计算', '还款计划追踪']
        }
      case 'INCOME':
        return {
          title: '收入类分类',
          description: '流量概念 - 记录您的各种收入来源和金额',
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          features: ['收入记录', '现金流统计', '收入趋势分析', '预算对比']
        }
      case 'EXPENSE':
        return {
          title: '支出类分类',
          description: '流量概念 - 记录您的各种支出和消费',
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          features: ['支出记录', '现金流统计', '支出趋势分析', '预算控制']
        }
      default:
        return null
    }
  }

  const typeInfo = getTypeDescription(type)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="添加顶级分类" size="lg">
      <div className="space-y-6">
        {/* 说明文字 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            💡 什么是顶级分类？
          </h3>
          <p className="text-sm text-blue-700">
            顶级分类是财务管理的基础框架，用于区分不同性质的财务数据。每个顶级分类都有特定的账户类型，
            决定了其下属账户的功能和统计方式。
          </p>
        </div>

        {/* 基本信息 */}
        <div className="space-y-4">
          <InputField
            name="name"
            label="分类名称"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: undefined }))
              }
            }}
            error={errors.name}
            placeholder="请输入分类名称，如：现金资产、固定支出等"
            required
          />

          <SelectField
            name="type"
            label="账户类型"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              if (errors.type) {
                setErrors(prev => ({ ...prev, type: undefined }))
              }
            }}
            options={ACCOUNT_TYPE_OPTIONS}
            error={errors.type}
            required
          />
        </div>

        {/* 类型说明 */}
        {typeInfo && (
          <div className={`${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-4`}>
            <h3 className={`font-medium ${typeInfo.color} mb-2`}>
              {typeInfo.title}
            </h3>
            <p className={`text-sm ${typeInfo.color} mb-3`}>
              {typeInfo.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {typeInfo.features.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 示例 */}
        {type && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              📝 常见示例
            </h4>
            <div className="text-sm text-gray-600">
              {type === 'ASSET' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>现金资产：现金、银行存款、支付宝、微信钱包</li>
                  <li>投资资产：股票、基金、债券、理财产品</li>
                  <li>固定资产：房产、车辆、设备、家具</li>
                </ul>
              )}
              {type === 'LIABILITY' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>信用负债：信用卡、花呗、白条</li>
                  <li>贷款负债：房贷、车贷、消费贷</li>
                  <li>其他负债：应付款、借款</li>
                </ul>
              )}
              {type === 'INCOME' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>工作收入：工资、奖金、提成、津贴</li>
                  <li>投资收入：股息、利息、租金收入</li>
                  <li>其他收入：兼职、副业、礼金</li>
                </ul>
              )}
              {type === 'EXPENSE' && (
                <ul className="list-disc list-inside space-y-1">
                  <li>生活支出：餐饮、交通、购物、娱乐</li>
                  <li>固定支出：房租、水电、保险、通讯</li>
                  <li>其他支出：医疗、教育、旅行、礼品</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            取消
          </button>
          <AuthButton
            label={isLoading ? '创建中...' : '创建分类'}
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!name.trim() || !type}
            variant="primary"
          />
        </div>
      </div>
    </Modal>
  )
}

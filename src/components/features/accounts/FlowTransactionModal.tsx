'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import AuthButton from '@/components/ui/forms/AuthButton'
import TagFormModal from '@/components/ui/feedback/TagFormModal'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import TemplateSelector from '@/components/ui/forms/TemplateSelector'
import TemplateUpdateConfirm from '@/components/ui/forms/TemplateUpdateConfirm'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import {
  publishTransactionCreate,
  publishTransactionUpdate,
} from '@/lib/services/data-update.service'
import type {
  SimpleCurrency,
  SimpleTag,
  CategoryType,
  SimpleTransactionTemplate,
} from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface SimpleFlowAccount {
  id: string
  name: string
  currencyCode?: string
  currency?: SimpleCurrency
  category: {
    id: string
    name: string
    type?: CategoryType
  }
}

interface SimpleFlowTransaction {
  id: string
  accountId: string
  amount: number
  description: string
  notes?: string
  date: string
  tagIds?: string[]
}

interface FlowTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transaction?: SimpleFlowTransaction
  account: SimpleFlowAccount // 预选的账户
  currencies: SimpleCurrency[]
  tags: SimpleTag[]
}

export default function FlowTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  account,
  currencies,
  tags,
}: FlowTransactionModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const {
    tags: userTags,
    getTemplates,
    addTemplate,
    updateTemplate: updateTemplateInContext,
    removeTemplate,
    isLoadingTemplates,
  } = useUserData()
  const { resolvedTheme } = useTheme()

  // 简化的表单数据 - 保留必要字段包括标签
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tagIds: [] as string[],
  })

  // 模板相关状态
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplate, setSelectedTemplate] =
    useState<SimpleTransactionTemplate | null>(null)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [shouldUpdateTemplate, setShouldUpdateTemplate] = useState(false)
  const [hasTemplateDataChanged, setHasTemplateDataChanged] = useState(false)
  const [templateJustSelected, setTemplateJustSelected] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(
    null
  )

  // 获取最新的标签颜色信息
  const getUpdatedTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<SimpleTag[]>(tags)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 获取账户的货币信息
  const accountCurrency = account.currencyCode || currencies[0]?.code || 'USD'
  const currencyInfo =
    currencies.find(c => c.code === accountCurrency) || currencies[0]

  // 获取交易类型
  const transactionType =
    account.category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE'

  // 获取当前过滤的模板列表
  const templates = getTemplates({
    type: transactionType,
    accountId: account.id,
  })

  // 检测模板数据是否发生变化
  const checkTemplateDataChanged = useCallback(() => {
    if (!selectedTemplate) return false

    return (
      formData.description !== selectedTemplate.description ||
      formData.notes !== (selectedTemplate.notes || '') ||
      JSON.stringify(formData.tagIds.sort()) !==
        JSON.stringify((selectedTemplate.tagIds || []).sort())
    )
  }, [formData, selectedTemplate])

  // 处理模板选择
  const handleTemplateSelect = useCallback(
    (templateId: string, template?: SimpleTransactionTemplate) => {
      if (template) {
        setSelectedTemplate(template)
        setTemplateName(template.name)
        setTemplateJustSelected(true) // 标记模板刚刚被选择

        // 填充表单数据（除金额外）
        setFormData(prev => ({
          ...prev,
          description: template.description,
          notes: template.notes || '',
          tagIds: template.tagIds || [],
        }))

        // 重置状态
        setHasTemplateDataChanged(false)
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)

        // 延迟重置标记，让数据填充完成
        setTimeout(() => {
          setTemplateJustSelected(false)
        }, 100)
      } else {
        // 清空选择
        setSelectedTemplate(null)
        setTemplateName('')
        setTemplateJustSelected(false)
        setHasTemplateDataChanged(false)
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)
      }
    },
    []
  )

  // 处理模板删除
  const handleTemplateDelete = useCallback(
    (templateId: string) => {
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      setDeletingTemplateId(templateId)
      setShowDeleteConfirm(true)
    },
    [templates]
  )

  // 确认删除模板
  const handleConfirmDeleteTemplate = useCallback(async () => {
    if (!deletingTemplateId) return

    try {
      const response = await fetch(
        `/api/transaction-templates/${deletingTemplateId}`,
        {
          method: 'DELETE',
        }
      )
      const result = await response.json()

      if (result.success) {
        showSuccess(t('template.delete.success'))
        // 从 UserDataContext 中移除模板
        removeTemplate(deletingTemplateId)

        // 如果删除的是当前选中的模板，清空表单
        if (selectedTemplate?.id === deletingTemplateId) {
          handleTemplateSelect('') // 清空选择
          // 重置表单到初始状态（保持编辑模式的数据）
          if (!transaction) {
            setFormData({
              amount: '',
              description: '',
              notes: '',
              date: new Date().toISOString().split('T')[0],
              tagIds: [],
            })
          }
        }
      } else {
        showError(t('template.delete.failed'), result.error)
      }
    } catch (error) {
      console.error('Delete template error:', error)
      showError(t('template.delete.failed'), t('error.network'))
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTemplateId(null)
    }
  }, [
    deletingTemplateId,
    selectedTemplate,
    transaction,
    t,
    showSuccess,
    showError,
    removeTemplate,
    handleTemplateSelect,
  ])

  // 保存新模板
  const saveTemplate = useCallback(async () => {
    if (!templateName.trim()) return false

    try {
      const templateData = {
        name: templateName.trim(),
        accountId: account.id,
        categoryId: account.category.id,
        currencyCode: accountCurrency,
        type: transactionType,
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        tagIds: formData.tagIds,
      }

      const response = await fetch('/api/transaction-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('template.create.success'))
        // 添加到 UserDataContext
        addTemplate({
          ...result.template,
          userId: result.template.userId,
          createdAt: new Date(result.template.createdAt),
          updatedAt: new Date(result.template.updatedAt),
        })
        return true
      } else {
        showError(t('template.create.failed'), result.error)
        return false
      }
    } catch (error) {
      console.error('Save template error:', error)
      showError(t('template.create.failed'), t('error.network'))
      return false
    }
  }, [
    templateName,
    account,
    accountCurrency,
    transactionType,
    formData,
    t,
    showSuccess,
    showError,
    addTemplate,
  ])

  // 更新现有模板
  const updateTemplateData = useCallback(async () => {
    if (!selectedTemplate) return false

    try {
      const templateData = {
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        tagIds: formData.tagIds,
      }

      const response = await fetch(
        `/api/transaction-templates/${selectedTemplate.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        }
      )

      const result = await response.json()

      if (result.success) {
        showSuccess(t('template.update.success'))
        // 更新 UserDataContext 中的模板
        updateTemplateInContext({
          ...result.template,
          userId: result.template.userId,
          createdAt: new Date(result.template.createdAt),
          updatedAt: new Date(result.template.updatedAt),
        })
        return true
      } else {
        showError(t('template.update.failed'), result.error)
        return false
      }
    } catch (error) {
      console.error('Update template error:', error)
      showError(t('template.update.failed'), t('error.network'))
      return false
    }
  }, [
    selectedTemplate,
    formData,
    t,
    showSuccess,
    showError,
    updateTemplateInContext,
  ])

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        // 编辑模式
        setFormData({
          amount: transaction.amount.toString(),
          description: transaction.description,
          notes: transaction.notes || '',
          date: new Date(transaction.date).toISOString().split('T')[0],
          tagIds: transaction.tagIds || [],
        })
      } else {
        // 新增模式
        setFormData({
          amount: '',
          description: '',
          notes: '',
          date: new Date().toISOString().split('T')[0],
          tagIds: [],
        })
      }
      setErrors({})

      // 重置模板相关状态（仅在新增模式下）
      if (!transaction) {
        setTemplateName('')
        setSelectedTemplate(null)
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)
        setHasTemplateDataChanged(false)
        setTemplateJustSelected(false)
        setShowDeleteConfirm(false)
        setDeletingTemplateId(null)

        // 不需要每次打开都刷新模板数据，使用 UserDataContext 中的缓存数据即可
      }
    }
  }, [isOpen, transaction, isLoadingTemplates])

  // 更新可用标签列表
  useEffect(() => {
    setAvailableTags(tags)
  }, [tags])

  // 检测模板数据变化（仅在新增模式下）
  useEffect(() => {
    if (!transaction) {
      // 如果模板刚刚被选择，不检查变化
      if (templateJustSelected) {
        return
      }

      const hasChanged = checkTemplateDataChanged()
      setHasTemplateDataChanged(hasChanged)

      // 只有在用户修改数据且选中了模板时，才显示更新确认
      if (hasChanged && selectedTemplate && !templateJustSelected) {
        setShowUpdateConfirm(true)
      } else {
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)
      }
    }
  }, [
    formData,
    selectedTemplate,
    transaction,
    checkTemplateDataChanged,
    templateJustSelected,
  ])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  const handleTagFormSuccess = (newTag: any) => {
    // 更新本地状态
    setAvailableTags(prev => [...prev, newTag])
    setFormData(prev => ({
      ...prev,
      tagIds: [...prev.tagIds, newTag.id],
    }))

    // 更新 UserDataContext 中的全局标签数据
    // 确保传递的数据符合 UserDataTag 类型
    const userDataTag = {
      ...newTag,
      userId: newTag.userId, // API 返回的数据应该包含 userId
      _count: { transactions: 0 }, // 新标签的交易数量为 0
    }
    addTag(userDataTag)

    setShowTagFormModal(false)
    showSuccess(t('success.created'), t('tag.created.and.added'))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount) {
      newErrors.amount = t('transaction.modal.enter.amount')
    } else if (
      isNaN(parseFloat(formData.amount)) ||
      parseFloat(formData.amount) <= 0
    ) {
      newErrors.amount = t('transaction.modal.amount.positive')
    }

    if (!formData.description.trim()) {
      newErrors.description = t('transaction.modal.enter.description')
    }

    if (!formData.date) {
      newErrors.date = t('transaction.modal.select.date')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // 构建提交数据 - 自动填充简化的字段
      const submitData = {
        accountId: account.id,
        categoryId: account.category.id, // 自动使用账户的分类
        currencyCode: accountCurrency, // 自动使用账户的货币
        type: account.category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE', // 根据账户类型自动确定
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        date: formData.date,
        tagIds: formData.tagIds, // 保留标签选择
      }

      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : '/api/transactions'
      const method = transaction ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (result.success) {
        // 处理模板相关逻辑（仅在新增模式下）
        if (!transaction) {
          // 如果输入了新模板名称且不是选中的模板，保存新模板
          if (
            templateName.trim() &&
            (!selectedTemplate || templateName.trim() !== selectedTemplate.name)
          ) {
            await saveTemplate()
          }
          // 如果选中了模板且数据有变化且用户选择更新，更新模板
          else if (
            selectedTemplate &&
            hasTemplateDataChanged &&
            shouldUpdateTemplate
          ) {
            await updateTemplateData()
          }
        }

        const successMessage = transaction
          ? t('transaction.modal.update.success')
          : t('transaction.modal.create.success')
        showSuccess(
          successMessage,
          `${formData.amount} ${currencyInfo?.symbol || accountCurrency}`
        )

        // 发布交易更新事件
        if (transaction) {
          await publishTransactionUpdate(account.id, account.category.id, {
            transaction: result.transaction,
            amount: parseFloat(formData.amount),
            currencyCode: accountCurrency,
          })
        } else {
          await publishTransactionCreate(account.id, account.category.id, {
            transaction: result.transaction,
            amount: parseFloat(formData.amount),
            currencyCode: accountCurrency,
          })
        }

        onSuccess()
        onClose()
      } else {
        const errorMessage =
          result.error ||
          (transaction
            ? t('transaction.update.failed')
            : t('transaction.create.failed'))
        setErrors({ general: errorMessage })
        showError(
          transaction
            ? t('transaction.update.failed')
            : t('transaction.create.failed'),
          errorMessage
        )
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('error.network')
      setErrors({ general: errorMessage })
      showError(
        transaction
          ? t('transaction.update.failed')
          : t('transaction.create.failed'),
        errorMessage
      )
    } finally {
      setIsLoading(false)
    }
  }

  // 获取账户类型的显示信息
  const getAccountTypeInfo = () => {
    const accountType = account.category?.type
    const isIncome = accountType === 'INCOME'
    return {
      icon: isIncome ? '💰' : '💸',
      label: isIncome ? t('common.income') : t('common.expense'),
      color: isIncome ? 'text-green-600' : 'text-red-600',
    }
  }

  const accountTypeInfo = getAccountTypeInfo()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${transaction ? t('common.edit') : t('common.add')}${accountTypeInfo.label}${t('transaction.title')} - ${account.name}`}
      size='lg'
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        {errors.general && (
          <div
            className={`border border-red-200 text-red-700 px-4 py-3 rounded ${
              resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
            }`}
          >
            {errors.general}
          </div>
        )}

        {/* 账户信息显示 */}
        <div
          className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
        >
          <div className='flex items-center justify-between'>
            <div>
              <div className='flex items-center space-x-2'>
                <span className='text-lg'>{accountTypeInfo.icon}</span>
                <span className={`font-medium ${accountTypeInfo.color}`}>
                  {accountTypeInfo.label}
                  {t('account.title')}
                </span>
              </div>
              <p
                className={`text-sm mt-1 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {account.name} ({account.category.name})
              </p>
            </div>
            <div className='text-right'>
              <div
                className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                {t('common.currency')}
              </div>
              <div
                className={`font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
              >
                {currencyInfo?.symbol} {currencyInfo?.name}
              </div>
            </div>
          </div>
        </div>

        {/* 模板选择器 - 仅在新增模式下显示 */}
        {!transaction && (
          <>
            <TemplateSelector
              value={selectedTemplate?.id || ''}
              templateName={templateName}
              onChange={handleTemplateSelect}
              onTemplateNameChange={setTemplateName}
              onDelete={handleTemplateDelete}
              templates={templates}
              label={t('template.select.label')}
              placeholder={t('template.select.placeholder')}
            />

            {/* 模板更新确认 */}
            <TemplateUpdateConfirm
              isVisible={showUpdateConfirm}
              checked={shouldUpdateTemplate}
              onChange={setShouldUpdateTemplate}
              templateName={selectedTemplate?.name || ''}
            />
          </>
        )}

        {/* 金额和日期 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <InputField
            type='number'
            name='amount'
            label={`${accountTypeInfo.label}${t('transaction.amount')}`}
            value={formData.amount}
            onChange={handleChange}
            placeholder='0.00'
            error={errors.amount}
            step='0.01'
            required
          />

          <InputField
            type='date'
            name='date'
            label={t('transaction.date')}
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />
        </div>

        {/* 描述 */}
        <InputField
          name='description'
          label={t('transaction.description')}
          value={formData.description}
          onChange={handleChange}
          placeholder={t('transaction.description.placeholder', {
            type: accountTypeInfo.label,
          })}
          error={errors.description}
          required
        />

        {/* 标签选择 */}
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            {t('tag.label.optional')}
          </label>
          <div className='space-y-3'>
            {/* 已选标签显示 */}
            {formData.tagIds.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {formData.tagIds.map(tagId => {
                  const tag = availableTags.find(t => t.id === tagId)
                  if (!tag) return null

                  // 从 UserDataContext 获取标签颜色信息
                  const currentColor = getUpdatedTagColor(tag.id)

                  return (
                    <span
                      key={tagId}
                      className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
                      style={
                        currentColor
                          ? {
                              backgroundColor: currentColor + '20',
                              color: currentColor,
                              border: `1px solid ${currentColor}40`,
                            }
                          : {
                              backgroundColor: '#E5E7EB',
                              color: '#374151',
                              border: '1px solid #D1D5DB',
                            }
                      }
                    >
                      {tag.name}
                      <button
                        type='button'
                        onClick={() => handleTagToggle(tagId)}
                        className='ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none'
                      >
                        <svg
                          className='w-2 h-2'
                          stroke='currentColor'
                          fill='none'
                          viewBox='0 0 8 8'
                        >
                          <path
                            strokeLinecap='round'
                            strokeWidth='1.5'
                            d='m1 1 6 6m0-6L1 7'
                          />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* 可选标签列表 */}
            {availableTags.length > 0 && (
              <div
                className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
                  resolvedTheme === 'dark'
                    ? 'border-gray-600'
                    : 'border-gray-200'
                }`}
              >
                <div className='flex flex-wrap gap-2'>
                  {availableTags.map(tag => {
                    // 从 UserDataContext 获取标签颜色信息
                    const currentColor = getUpdatedTagColor(tag.id)

                    return (
                      <button
                        key={tag.id}
                        type='button'
                        onClick={() => handleTagToggle(tag.id)}
                        className={`
                          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                          ${formData.tagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                        `}
                        style={
                          formData.tagIds.includes(tag.id) && currentColor
                            ? {
                                backgroundColor: currentColor + '20',
                                color: currentColor,
                                borderColor: currentColor + '40',
                              }
                            : formData.tagIds.includes(tag.id)
                              ? {
                                  backgroundColor: '#DBEAFE',
                                  color: '#1E40AF',
                                  borderColor: '#93C5FD',
                                }
                              : {
                                  backgroundColor: '#F9FAFB',
                                  color: '#374151',
                                  borderColor: '#E5E7EB',
                                }
                        }
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 创建新标签 */}
            <div
              className={`border-t pt-3 ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
            >
              <button
                type='button'
                onClick={() => setShowTagFormModal(true)}
                className='inline-flex items-center text-sm text-blue-600 hover:text-blue-500'
              >
                <svg
                  className='mr-1 h-4 w-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                  />
                </svg>
                {t('tag.create.new')}
              </button>
            </div>
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label
            htmlFor='notes'
            className={`block text-sm font-medium mb-1 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
          >
            {t('transaction.notes.optional')}
          </label>
          <textarea
            id='notes'
            name='notes'
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              resolvedTheme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder={t('transaction.notes.placeholder')}
          />
        </div>

        {/* 操作按钮 */}
        <div
          className={`flex justify-end space-x-3 pt-4 border-t ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
        >
          <button
            type='button'
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              resolvedTheme === 'dark'
                ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {t('common.cancel')}
          </button>
          <AuthButton
            type='submit'
            label={
              transaction
                ? t('common.save.changes')
                : `${t('common.add')}${accountTypeInfo.label}`
            }
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>

      {/* 标签表单模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
      />

      {/* 删除模板确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('template.delete.title')}
        message={t('template.delete.confirm.message', {
          name: templates.find(t => t.id === deletingTemplateId)?.name || '',
        })}
        confirmLabel={t('template.delete.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDeleteTemplate}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeletingTemplateId(null)
        }}
        variant='danger'
      />
    </Modal>
  )
}

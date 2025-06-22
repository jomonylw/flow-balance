'use client'

import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import AuthButton from '@/components/ui/forms/AuthButton'
import TagSelector from '@/components/ui/forms/TagSelector'
import TagFormModal from '@/components/ui/feedback/TagFormModal'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import TemplateSelector from '@/components/ui/forms/TemplateSelector'
import TemplateUpdateConfirm from '@/components/ui/forms/TemplateUpdateConfirm'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import { publishTransactionCreate } from '@/lib/services/data-update.service'
import type { SimpleTransactionTemplate } from '@/types/core'

interface QuickFlowTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultType?: 'INCOME' | 'EXPENSE' // 可选的默认交易类型
  defaultCategoryId?: string // 可选的预设分类ID
}

export default function QuickFlowTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType,
  defaultCategoryId,
}: QuickFlowTransactionModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()
  const {
    accounts,
    currencies,
    tags: userTags,
    getBaseCurrency,
    getTemplates,
    addTemplate,
    updateTemplate: updateTemplateInContext,
    removeTemplate,
    addTag,
    isLoadingTemplates,
  } = useUserData()
  const { resolvedTheme } = useTheme()

  // 表单数据
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tagIds: [] as string[],
  })

  // 交易类型状态
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>(
    defaultType || 'EXPENSE'
  )

  // 判断是否显示交易类型切换按钮（当defaultType明确传入时隐藏）
  const showTypeToggle = defaultType === undefined

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

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 根据交易类型和可选的分类ID过滤账户
  const filteredAccounts = accounts.filter(account => {
    // 首先按交易类型过滤
    if (account.category?.type !== transactionType) {
      return false
    }

    // 如果指定了分类ID，则只显示该分类下的账户
    if (defaultCategoryId && account.category.id !== defaultCategoryId) {
      return false
    }

    return true
  })

  // 获取选中账户的信息
  const selectedAccount = accounts.find(acc => acc.id === formData.accountId)
  const accountCurrency =
    selectedAccount?.currencyCode || getBaseCurrency()?.code || 'USD'
  const currencyInfo =
    currencies.find(c => c.code === accountCurrency) || getBaseCurrency()

  // 获取最新的标签颜色信息
  const _getUpdatedTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  // 获取当前过滤的模板列表
  const templates = getTemplates({ type: transactionType })

  // 处理模板选择
  const handleTemplateSelect = useCallback(
    (templateId: string, template?: SimpleTransactionTemplate) => {
      if (template) {
        setSelectedTemplate(template)
        setTemplateName(template.name)
        setTemplateJustSelected(true) // 标记模板刚刚被选择

        // 设置交易类型（先设置类型，这样账户过滤会更新）
        // 只支持 INCOME 和 EXPENSE 类型
        if (template.type === 'INCOME' || template.type === 'EXPENSE') {
          setTransactionType(template.type)
        }

        // 使用 setTimeout 确保交易类型更新后再设置账户ID
        // 这样 filteredAccounts 会先更新，然后账户选择器才会收到新的 accountId
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            accountId: template.accountId,
            description: template.description,
            notes: template.notes || '',
            tagIds: template.tagIds || [],
          }))
        }, 0)

        // 重置状态
        setHasTemplateDataChanged(false)
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)

        // 延迟重置标记，让数据填充完成
        setTimeout(() => {
          setTemplateJustSelected(false)
        }, 100)
      } else {
        // 清空选择，重置表单到初始状态
        setSelectedTemplate(null)
        setTemplateName('')
        setTemplateJustSelected(false)
        setHasTemplateDataChanged(false)
        setShowUpdateConfirm(false)
        setShouldUpdateTemplate(false)

        // 重置表单数据到初始状态（保留交易类型和日期）
        setFormData({
          accountId: '',
          amount: '',
          description: '',
          notes: '',
          date: new Date().toISOString().split('T')[0],
          tagIds: [],
        })

        // 清除所有错误
        setErrors({})
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

        // 如果删除的是当前选中的模板，清空选择（会自动重置表单）
        if (selectedTemplate?.id === deletingTemplateId) {
          handleTemplateSelect('') // 清空选择，会自动重置表单到初始状态
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
    t,
    showSuccess,
    showError,
    removeTemplate,
    handleTemplateSelect,
  ])

  // 保存新模板
  const saveTemplate = useCallback(async () => {
    if (!templateName.trim() || !selectedAccount) return false

    try {
      const templateData = {
        name: templateName.trim(),
        accountId: selectedAccount.id,
        categoryId: selectedAccount.category.id,
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
    selectedAccount,
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
    if (!selectedTemplate || !selectedAccount) return false

    try {
      const templateData = {
        accountId: selectedAccount.id,
        categoryId: selectedAccount.category.id,
        currencyCode: accountCurrency,
        type: transactionType,
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
    selectedAccount,
    accountCurrency,
    transactionType,
    formData,
    t,
    showSuccess,
    showError,
    updateTemplateInContext,
  ])

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      setFormData({
        accountId: '',
        amount: '',
        description: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        tagIds: [],
      })
      setErrors({})

      // 只在有明确的 defaultType 时才重置交易类型，否则保持用户当前选择
      if (defaultType !== undefined) {
        setTransactionType(defaultType)
      }

      // 重置模板相关状态
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
  }, [isOpen, defaultType, isLoadingTemplates])

  // 当交易类型改变时，重置账户选择
  useEffect(() => {
    setFormData(prev => ({ ...prev, accountId: '' }))
    setErrors(prev => ({ ...prev, accountId: '' }))

    // 如果当前选中的模板类型不匹配，清空选择
    if (selectedTemplate && selectedTemplate.type !== transactionType) {
      setSelectedTemplate(null)
      setTemplateName('')
      setHasTemplateDataChanged(false)
      setShowUpdateConfirm(false)
      setShouldUpdateTemplate(false)
    }
  }, [transactionType, selectedTemplate])

  // 检测模板数据变化
  useEffect(() => {
    // 如果模板刚刚被选择，不检查变化
    if (templateJustSelected) {
      return
    }

    if (!selectedTemplate) {
      setHasTemplateDataChanged(false)
      setShowUpdateConfirm(false)
      setShouldUpdateTemplate(false)
      return
    }

    // 直接在这里检查变化，避免依赖函数
    const accountChanged = formData.accountId !== selectedTemplate.accountId
    const descriptionChanged =
      formData.description.trim() !== selectedTemplate.description.trim()
    const notesChanged =
      formData.notes.trim() !== (selectedTemplate.notes || '').trim()
    const tagsChanged =
      JSON.stringify(formData.tagIds.sort()) !==
      JSON.stringify((selectedTemplate.tagIds || []).sort())
    const typeChanged = transactionType !== selectedTemplate.type

    const hasChanged =
      accountChanged ||
      descriptionChanged ||
      notesChanged ||
      tagsChanged ||
      typeChanged
    setHasTemplateDataChanged(hasChanged)

    // 只有在用户修改数据且选中了模板时，才显示更新确认
    if (hasChanged && selectedTemplate && !templateJustSelected) {
      setShowUpdateConfirm(true)
    } else {
      setShowUpdateConfirm(false)
      setShouldUpdateTemplate(false)
    }
  }, [
    formData.accountId,
    formData.description,
    formData.notes,
    formData.tagIds,
    selectedTemplate,
    transactionType,
    templateJustSelected,
  ])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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

  const handleTagFormSuccess = (newTag: {
    id: string
    name: string
    color?: string
  }) => {
    // 更新表单数据，添加新标签到选中列表
    setFormData(prev => ({
      ...prev,
      tagIds: [...prev.tagIds, newTag.id],
    }))

    // 更新 UserDataContext 中的全局标签数据
    // 确保传递的数据符合 UserDataTag 类型
    const userDataTag = {
      ...newTag,
      userId: user?.id || '', // 从当前用户获取 userId
      _count: { transactions: 0 }, // 新标签的交易数量为 0
    }
    addTag(userDataTag)

    setShowTagFormModal(false)
    showSuccess(
      t('transaction.quick.tag.create.success'),
      t('transaction.quick.tag.added.success')
    )
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.accountId) {
      newErrors.accountId = t('transaction.quick.select.account.error')
    }

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

    if (!selectedAccount) {
      setErrors({ general: t('transaction.quick.select.valid.account.error') })
      return
    }

    setIsLoading(true)

    try {
      // 构建提交数据 - 自动填充简化的字段
      const submitData = {
        accountId: selectedAccount.id,
        categoryId: selectedAccount.category.id, // 自动使用账户的分类
        currencyCode: accountCurrency, // 自动使用账户的货币
        type: transactionType, // 使用当前选择的交易类型
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        date: formData.date,
        tagIds: formData.tagIds, // 保留标签选择
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (result.success) {
        // 处理模板相关逻辑
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

        const successMessage = t('transaction.modal.create.success')
        showSuccess(
          successMessage,
          `${formData.amount} ${currencyInfo?.symbol || accountCurrency}`
        )

        // 发布交易创建事件
        await publishTransactionCreate(
          selectedAccount.id,
          selectedAccount.category.id,
          {
            transaction: result.transaction,
            amount: parseFloat(formData.amount),
            currencyCode: accountCurrency,
          }
        )

        onSuccess()
        onClose()
      } else {
        const errorMessage =
          result.error || t('transaction.quick.create.failed')
        setErrors({ general: errorMessage })
        showError(t('transaction.quick.create.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Transaction form error:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('error.network')
      setErrors({ general: errorMessage })
      showError(t('transaction.quick.create.failed'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取账户类型的显示信息
  const getAccountTypeInfo = () => {
    const isIncome = transactionType === 'INCOME'
    return {
      icon: isIncome ? '💰' : '💸',
      label: isIncome
        ? t('transaction.quick.income')
        : t('transaction.quick.expense'),
      color: isIncome ? 'text-green-600' : 'text-red-600',
    }
  }

  const accountTypeInfo = getAccountTypeInfo()

  // 账户选项
  const accountOptions = filteredAccounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.category.name})`,
  }))

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('transaction.quick.record.title', {
          type: accountTypeInfo.label,
        })}
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

          {/* 交易类型选择 */}
          <div
            className={`p-4 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <div
              className={`flex items-center ${showTypeToggle ? 'justify-between' : 'justify-start'} mb-3`}
            >
              <div className='flex items-center space-x-2'>
                <span className='text-lg'>{accountTypeInfo.icon}</span>
                <span className={`font-medium ${accountTypeInfo.color}`}>
                  {t('transaction.quick.transaction', {
                    type: accountTypeInfo.label,
                  })}
                </span>
              </div>

              {/* 交易类型切换按钮 - 仅在defaultType未明确指定时显示 */}
              {showTypeToggle && (
                <div className='flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600'>
                  <button
                    type='button'
                    onClick={() => setTransactionType('EXPENSE')}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      transactionType === 'EXPENSE'
                        ? 'bg-red-600 text-white'
                        : resolvedTheme === 'dark'
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💸 {t('transaction.quick.expense')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setTransactionType('INCOME')}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      transactionType === 'INCOME'
                        ? 'bg-green-600 text-white'
                        : resolvedTheme === 'dark'
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💰 {t('transaction.quick.income')}
                  </button>
                </div>
              )}
            </div>
            <p
              className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {t('transaction.quick.select.account.help', {
                type: accountTypeInfo.label,
              })}
            </p>
          </div>

          {/* 模板选择器 */}
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

          {/* 账户选择 */}
          <SelectField
            name='accountId'
            label={t('transaction.quick.account.label', {
              type: accountTypeInfo.label,
            })}
            value={formData.accountId}
            onChange={handleChange}
            options={accountOptions}
            error={errors.accountId}
            required
            help={t('transaction.quick.account.help', {
              type: accountTypeInfo.label,
            })}
          />

          {/* 显示选中账户的货币信息 */}
          {selectedAccount && (
            <div
              className={`border border-blue-200 rounded-md p-3 ${
                resolvedTheme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <div
                    className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}
                  >
                    {t('transaction.quick.selected.account')}
                    <span className='font-medium'>{selectedAccount.name}</span>
                  </div>
                  <div
                    className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {t('transaction.quick.category')}
                    {selectedAccount.category.name}
                  </div>
                </div>
                <div className='text-right'>
                  <div
                    className={`text-sm ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}
                  >
                    {t('transaction.quick.currency')}
                  </div>
                  <div
                    className={`font-medium ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}
                  >
                    {currencyInfo?.symbol} {currencyInfo?.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 金额和日期 */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <InputField
              type='number'
              name='amount'
              label={t('transaction.quick.amount.label', {
                type: accountTypeInfo.label,
              })}
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
              label={t('transaction.quick.date.label')}
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              required
            />
          </div>

          {/* 描述 */}
          <InputField
            name='description'
            label={t('transaction.quick.description.label')}
            value={formData.description}
            onChange={handleChange}
            placeholder={t('transaction.quick.description.placeholder', {
              type: accountTypeInfo.label,
            })}
            error={errors.description}
            required
          />

          {/* 标签选择 */}
          <TagSelector
            tags={userTags}
            selectedTagIds={formData.tagIds}
            onTagToggle={handleTagToggle}
            label={t('transaction.tags')}
            showCreateButton={true}
            onCreateClick={() => setShowTagFormModal(true)}
            createButtonText={t('transaction.quick.tags.create')}
          />

          {/* 备注 */}
          <div>
            <label
              htmlFor='notes'
              className={`block text-sm font-medium mb-1 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            >
              {t('transaction.quick.notes.label')}
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
              placeholder={t('transaction.quick.notes.placeholder')}
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
              {t('transaction.quick.cancel')}
            </button>
            <AuthButton
              type='submit'
              label={t('transaction.quick.add', {
                type: accountTypeInfo.label,
              })}
              isLoading={isLoading}
              disabled={isLoading}
            />
          </div>
        </form>
      </Modal>

      {/* 标签表单模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
        zIndex='z-[60]'
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
    </>
  )
}

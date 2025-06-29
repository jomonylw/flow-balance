'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import TagSelector from '@/components/ui/forms/TagSelector'
import TagFormModal from '@/components/ui/feedback/TagFormModal'
import DateInput from '@/components/ui/forms/DateInput'
import { Z_INDEX } from '@/lib/constants/dimensions'
import {
  RecurrenceFrequency,
  type RecurringTransaction,
  // type SimpleTag, // 未使用，已注释
} from '@/types/core'
import { TransactionType } from '@/types/core/constants'

interface RecurringTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: Partial<RecurringTransaction>) => void
  accountId: string
  accountCurrency: string
  accountType: 'INCOME' | 'EXPENSE' // 添加账户类型
  editingTransaction?: RecurringTransaction | null
}

export default function RecurringTransactionModal({
  isOpen,
  onClose,
  onSave,
  accountId,
  accountCurrency,
  accountType,
  editingTransaction,
}: RecurringTransactionModalProps) {
  const { t } = useLanguage()
  const { theme: _theme } = useTheme()
  const { showSuccess } = useToast()
  const { tags, addTag } = useUserData()
  const { formatInputDate } = useUserDateFormatter()

  // 获取当前日期的字符串格式 (YYYY-MM-DD)
  const getCurrentDate = () => {
    const today = new Date()
    return formatInputDate(today)
  }

  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    amount: '',
    frequency: RecurrenceFrequency.MONTHLY,
    startDate: getCurrentDate(),
    endDate: '',
    status: 'ACTIVE',
    tagIds: [] as string[],
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 重置表单
  const resetForm = () => {
    if (editingTransaction) {
      setFormData({
        name: editingTransaction.description,
        notes: editingTransaction.notes || '',
        amount: editingTransaction.amount.toString(),
        frequency: editingTransaction.frequency as RecurrenceFrequency,
        startDate: formatInputDate(new Date(editingTransaction.startDate)),
        endDate: editingTransaction.endDate
          ? formatInputDate(new Date(editingTransaction.endDate))
          : '',
        status: editingTransaction.isActive ? 'ACTIVE' : 'PAUSED',
        tagIds: editingTransaction.tagIds || [],
      })
    } else {
      setFormData({
        name: '',
        notes: '',
        amount: '',
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: getCurrentDate(),
        endDate: '',
        status: 'ACTIVE',
        tagIds: [],
      })
    }
    setError(null)
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, editingTransaction])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 验证必填字段
      if (!formData.name.trim()) {
        throw new Error('请输入交易名称')
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('请输入有效的金额')
      }
      if (!formData.startDate) {
        throw new Error('请选择开始日期')
      }
      if (
        formData.endDate &&
        new Date(formData.startDate) >= new Date(formData.endDate)
      ) {
        throw new Error('结束日期必须晚于开始日期')
      }

      const transactionData = {
        accountId,
        currencyCode: accountCurrency,
        type: (accountType === 'INCOME'
          ? TransactionType.INCOME
          : TransactionType.EXPENSE) as
          | TransactionType.INCOME
          | TransactionType.EXPENSE, // 转换为 TransactionType 枚举并断言类型
        amount: parseFloat(formData.amount),
        description: formData.name.trim(), // 使用name作为description
        notes: formData.notes.trim() || undefined,
        frequency: formData.frequency,
        interval: 1, // 默认间隔为1
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        isActive: formData.status === 'ACTIVE',
        tagIds: formData.tagIds,
      }

      await onSave(transactionData)
      onClose()
    } catch (error) {
      console.error('Failed to save recurring transaction:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  // 处理新标签创建成功
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
    const userDataTag = {
      ...newTag,
      userId: '', // 暂时使用空字符串，实际应该从当前用户获取
      _count: { transactions: 0 }, // 新标签的交易数量为 0
    }
    addTag(userDataTag)

    setShowTagFormModal(false)
    showSuccess(
      t('transaction.quick.tag.create.success'),
      t('transaction.quick.tag.added.success')
    )
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className='fixed inset-0 flex items-center justify-center p-4'
      style={{
        zIndex: Z_INDEX.MAX,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative'>
        <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              {editingTransaction
                ? t('recurring.transaction.edit')
                : t('recurring.transaction.create')}
            </h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl'
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-6'>
          {error && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
              <div className='flex items-center'>
                <span className='text-red-600 dark:text-red-400 mr-2'>❌</span>
                <p className='text-red-600 dark:text-red-400 text-sm'>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* 基本信息 */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t('recurring.transaction.name')} *
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='请输入交易名称'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t('recurring.amount')} ({accountCurrency}) *
              </label>
              <input
                type='number'
                step='0.01'
                min='0'
                value={formData.amount}
                onChange={e => handleInputChange('amount', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='0.00'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t('recurring.frequency')} *
              </label>
              <select
                value={formData.frequency}
                onChange={e => handleInputChange('frequency', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                required
              >
                <option value='WEEKLY'>{t('frequency.weekly')}</option>
                <option value='BI_WEEKLY'>{t('frequency.bi_weekly')}</option>
                <option value='MONTHLY'>{t('frequency.monthly')}</option>
                <option value='QUARTERLY'>{t('frequency.quarterly')}</option>
                <option value='SEMI_ANNUALLY'>
                  {t('frequency.semi_annually')}
                </option>
                <option value='ANNUALLY'>{t('frequency.annually')}</option>
              </select>
            </div>

            <DateInput
              name='startDate'
              label={`${t('recurring.start.date')} *`}
              value={formData.startDate}
              onChange={e => handleInputChange('startDate', e.target.value)}
              required
              showCalendar={true}
              showFormatHint={false}
            />

            <DateInput
              name='endDate'
              label={t('recurring.end.date')}
              value={formData.endDate}
              onChange={e => handleInputChange('endDate', e.target.value)}
              showCalendar={true}
              showFormatHint={false}
            />

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t('recurring.status')}
              </label>
              <select
                value={formData.status}
                onChange={e => handleInputChange('status', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='ACTIVE'>{t('recurring.status.active')}</option>
                <option value='PAUSED'>{t('recurring.status.paused')}</option>
                <option value='COMPLETED'>
                  {t('recurring.status.completed')}
                </option>
                <option value='CANCELLED'>
                  {t('recurring.status.cancelled')}
                </option>
              </select>
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t('transaction.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={e => handleInputChange('notes', e.target.value)}
                rows={2}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='请输入备注（可选）'
              />
            </div>

            <TagSelector
              tags={tags}
              selectedTagIds={formData.tagIds}
              onTagToggle={handleTagToggle}
              className='md:col-span-2'
              showCreateButton={true}
              onCreateClick={() => setShowTagFormModal(true)}
              createButtonText={t('tag.create.new')}
            />
          </div>

          {/* 操作按钮 */}
          <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       border border-gray-300 dark:border-gray-600 rounded-md
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors duration-200'
            >
              {t('recurring.transaction.cancel')}
            </button>
            <button
              type='submit'
              disabled={isLoading}
              className='px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       rounded-md transition-colors duration-200
                       disabled:cursor-not-allowed'
            >
              {isLoading
                ? t('common.processing')
                : t('recurring.transaction.save')}
            </button>
          </div>
        </form>
      </div>

      {/* 新增标签模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
        zIndex={Z_INDEX.MAX}
      />
    </div>
  )

  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null
}

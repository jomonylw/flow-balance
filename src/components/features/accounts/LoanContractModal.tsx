'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useToast } from '@/contexts/providers/ToastContext'
import TagSelector from '@/components/ui/forms/TagSelector'
import TagFormModal from '@/components/ui/feedback/TagFormModal'
import type {
  LoanContract,
  LoanContractFormData,
  RepaymentType,
  SimpleTag,
} from '@/types/core'

interface LoanContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contract: LoanContractFormData) => void
  accountId: string
  accountCurrency: string
  editingContract?: LoanContract | null
}

export default function LoanContractModal({
  isOpen,
  onClose,
  onSave,
  accountId,
  accountCurrency,
  editingContract,
}: LoanContractModalProps) {
  const { t } = useLanguage()
  const { theme: _theme } = useTheme()
  const { accounts, tags, addTag } = useUserData()
  const { showSuccess } = useToast()

  const [formData, setFormData] = useState<LoanContractFormData>(() => {
    const today = new Date()
    return {
      accountId,
      currencyCode: accountCurrency,
      contractName: '',
      loanAmount: 0,
      interestRate: 0,
      totalPeriods: 12,
      repaymentType: 'EQUAL_PAYMENT' as RepaymentType,
      startDate: today.toISOString().split('T')[0],
      paymentDay: today.getDate(), // 使用当前日期的"日"部分作为默认值
      paymentAccountId: '',
      transactionDescription: '',
      transactionNotes: '',
      transactionTagIds: [],
      isActive: true,
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTagFormModal, setShowTagFormModal] = useState(false)

  // 从UserDataContext获取支出账户（货币一致）
  const expenseAccounts = accounts.filter(
    account =>
      account.category.type === 'EXPENSE' &&
      account.currency?.code === accountCurrency
  )

  // 转换标签格式为TagSelector需要的格式
  const availableTags: SimpleTag[] = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
  }))

  // 重置表单
  const resetForm = () => {
    if (editingContract) {
      setFormData({
        id: editingContract.id,
        accountId: editingContract.accountId,
        currencyCode: editingContract.currencyCode,
        contractName: editingContract.contractName,
        loanAmount: editingContract.loanAmount,
        interestRate: editingContract.interestRate * 100, // 转换为百分比显示
        totalPeriods: editingContract.totalPeriods,
        repaymentType: editingContract.repaymentType,
        startDate: (() => {
          const date = editingContract.startDate as Date | string
          if (date instanceof Date) {
            return date.toISOString().split('T')[0]
          }
          if (typeof date === 'string') {
            return date.split('T')[0]
          }
          return new Date().toISOString().split('T')[0]
        })(),
        paymentDay: editingContract.paymentDay,
        paymentAccountId: editingContract.paymentAccountId || '',
        transactionDescription: editingContract.transactionDescription || '',
        transactionNotes: editingContract.transactionNotes || '',
        transactionTagIds: Array.isArray(editingContract.transactionTagIds)
          ? editingContract.transactionTagIds
          : [],
        isActive: editingContract.isActive,
      })
    } else {
      const today = new Date()
      setFormData({
        accountId,
        currencyCode: accountCurrency,
        contractName: '',
        loanAmount: 0,
        interestRate: 0,
        totalPeriods: 12,
        repaymentType: 'EQUAL_PAYMENT' as RepaymentType,
        startDate: today.toISOString().split('T')[0],
        paymentDay: today.getDate(), // 使用当前日期的"日"部分作为默认值
        paymentAccountId: '',
        transactionDescription: '',
        transactionNotes: '',
        transactionTagIds: [],
        isActive: true,
      })
    }
    setError(null)
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, editingContract])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 验证必填字段
      if (!formData.contractName.trim()) {
        throw new Error(t('loan.contract.name.required'))
      }
      if (!formData.loanAmount || formData.loanAmount <= 0) {
        throw new Error(t('loan.amount.required'))
      }
      if (formData.interestRate < 0) {
        throw new Error(t('loan.interest.rate.required'))
      }
      if (!formData.startDate) {
        throw new Error(t('loan.start.date.required'))
      }
      if (!formData.totalPeriods || formData.totalPeriods <= 0) {
        throw new Error(t('loan.total.periods.required'))
      }

      // 如果是编辑模式，验证新期数必须大于已完成的期数
      if (editingContract) {
        const completedPayments = editingContract.payments || []
        const maxCompletedPeriod =
          completedPayments.length > 0
            ? Math.max(
                ...completedPayments
                  .filter((p: { status: string }) => p.status === 'COMPLETED')
                  .map((p: { period: number }) => p.period)
              )
            : 0

        if (formData.totalPeriods <= maxCompletedPeriod) {
          throw new Error(
            t('loan.total.periods.edit.validation', {
              completedPeriods: maxCompletedPeriod,
            })
          )
        }
      }
      if (formData.paymentDay < 1 || formData.paymentDay > 31) {
        throw new Error(t('loan.payment.day.range'))
      }

      const contractData: LoanContractFormData = {
        ...formData,
        contractName: formData.contractName.trim(),
        interestRate: formData.interestRate / 100, // 转换为小数形式
        transactionDescription:
          formData.transactionDescription?.trim() || undefined,
        transactionNotes: formData.transactionNotes?.trim() || undefined,
        paymentAccountId: formData.paymentAccountId || undefined,
      }

      await onSave(contractData)
      onClose()
    } catch (error) {
      console.error('Failed to save loan contract:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (
    field: keyof LoanContractFormData,
    value: unknown
  ) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      }

      // 当开始日期改变时，自动设置每月还款日
      if (field === 'startDate' && value && typeof value === 'string') {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            const dayOfMonth = date.getDate()
            // 确保日期在1-31范围内
            if (dayOfMonth >= 1 && dayOfMonth <= 31) {
              newData.paymentDay = dayOfMonth
            }
          }
        } catch (error) {
          // 如果日期解析失败，不更新paymentDay
          console.warn('Failed to parse start date:', error)
        }
      }

      return newData
    })
  }

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      transactionTagIds: prev.transactionTagIds?.includes(tagId)
        ? prev.transactionTagIds.filter(id => id !== tagId)
        : [...(prev.transactionTagIds || []), tagId],
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
      transactionTagIds: [...(prev.transactionTagIds || []), newTag.id],
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
      className='fixed inset-0 flex items-center justify-center z-[9999] p-4'
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={e => {
        // 点击遮罩层关闭模态框
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative'>
        <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              {editingContract
                ? t('loan.contract.edit')
                : t('loan.contract.create')}
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
          <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.contract.name')} *
                </label>
                <input
                  type='text'
                  value={formData.contractName}
                  onChange={e =>
                    handleInputChange('contractName', e.target.value)
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder={t('loan.contract.name.placeholder')}
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.amount')} ({accountCurrency}) *
                </label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.loanAmount || ''}
                  onChange={e =>
                    handleInputChange(
                      'loanAmount',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className={`w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100 ${
                    editingContract
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 cursor-not-allowed'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder='0.00'
                  required
                  readOnly={!!editingContract}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.interest.rate')} (%) *
                </label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.interestRate || ''}
                  onChange={e =>
                    handleInputChange(
                      'interestRate',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='0.00'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.total.periods')} *
                  {editingContract && (
                    <span className='text-xs text-amber-600 dark:text-amber-400 ml-2'>
                      ({t('loan.total.periods.edit.hint')})
                    </span>
                  )}
                </label>
                <input
                  type='number'
                  min={
                    editingContract
                      ? (() => {
                          const completedPayments =
                            editingContract.payments || []
                          const maxCompletedPeriod =
                            completedPayments.length > 0
                              ? Math.max(
                                  ...completedPayments
                                    .filter(
                                      (p: { status: string }) =>
                                        p.status === 'COMPLETED'
                                    )
                                    .map((p: { period: number }) => p.period)
                                )
                              : 0
                          return maxCompletedPeriod + 1
                        })()
                      : 1
                  }
                  value={formData.totalPeriods || ''}
                  onChange={e =>
                    handleInputChange(
                      'totalPeriods',
                      parseInt(e.target.value) || 1
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='12'
                  required
                />
                {editingContract &&
                  (() => {
                    const completedPayments = editingContract.payments || []
                    const maxCompletedPeriod =
                      completedPayments.length > 0
                        ? Math.max(
                            ...completedPayments
                              .filter(
                                (p: { status: string }) =>
                                  p.status === 'COMPLETED'
                              )
                              .map((p: { period: number }) => p.period)
                          )
                        : 0
                    return (
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        {t('loan.total.periods.edit.description', {
                          completedPeriods: maxCompletedPeriod,
                          originalPeriods: editingContract.totalPeriods,
                        })}
                      </p>
                    )
                  })()}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.repayment.type')} *
                </label>
                <select
                  value={formData.repaymentType}
                  onChange={e =>
                    handleInputChange(
                      'repaymentType',
                      e.target.value as RepaymentType
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                >
                  <option value='EQUAL_PAYMENT'>
                    {t('loan.repayment.equal.payment')}
                  </option>
                  <option value='EQUAL_PRINCIPAL'>
                    {t('loan.repayment.equal.principal')}
                  </option>
                  <option value='INTEREST_ONLY'>
                    {t('loan.repayment.interest.only')}
                  </option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {t('loan.contract.status')} *
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={e =>
                    handleInputChange('isActive', e.target.value === 'active')
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                >
                  <option value='active'>
                    {t('loan.contract.status.active')}
                  </option>
                  <option value='inactive'>
                    {t('loan.contract.status.inactive')}
                  </option>
                </select>
              </div>
            </div>

            {/* 还款设置 */}
            <div className='border-t border-gray-200 dark:border-gray-700 pt-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
                {t('loan.payment.settings')}
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('loan.start.date')} *
                  </label>
                  <input
                    type='date'
                    value={formData.startDate}
                    onChange={e =>
                      handleInputChange('startDate', e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100 ${
                      editingContract
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    required
                    readOnly={!!editingContract}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('loan.payment.day')} *
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='31'
                    value={formData.paymentDay || ''}
                    onChange={e =>
                      handleInputChange(
                        'paymentDay',
                        parseInt(e.target.value) || 1
                      )
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='1'
                    required
                  />
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {t('loan.payment.day.description')}
                  </p>
                </div>

                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('loan.payment.account')}
                  </label>
                  <select
                    value={formData.paymentAccountId || ''}
                    onChange={e =>
                      handleInputChange('paymentAccountId', e.target.value)
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value=''>{t('loan.payment.account.select')}</option>
                    {expenseAccounts.length > 0 ? (
                      expenseAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currencyCode})
                        </option>
                      ))
                    ) : (
                      <option disabled>
                        {t('loan.payment.account.no.available')}
                      </option>
                    )}
                  </select>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {t('loan.payment.account.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* 交易模板信息 */}
            <div className='border-t border-gray-200 dark:border-gray-700 pt-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
                {t('loan.transaction.template')}
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('transaction.description')}
                  </label>
                  <input
                    type='text'
                    value={formData.transactionDescription || ''}
                    onChange={e =>
                      handleInputChange(
                        'transactionDescription',
                        e.target.value
                      )
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder={t('loan.transaction.description.placeholder')}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('transaction.notes')}
                  </label>
                  <textarea
                    value={formData.transactionNotes || ''}
                    onChange={e =>
                      handleInputChange('transactionNotes', e.target.value)
                    }
                    rows={2}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder={t('loan.transaction.notes.placeholder')}
                  />
                </div>

                <TagSelector
                  tags={availableTags}
                  selectedTagIds={formData.transactionTagIds || []}
                  onTagToggle={handleTagToggle}
                  label={t('transaction.tags')}
                  showEmptyMessage={true}
                  showCreateButton={true}
                  onCreateClick={() => setShowTagFormModal(true)}
                  createButtonText={t('tag.create.new')}
                />
              </div>
            </div>
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
              {t('loan.contract.cancel')}
            </button>
            <button
              type='submit'
              disabled={isLoading}
              className='px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       rounded-md transition-colors duration-200
                       disabled:cursor-not-allowed'
            >
              {isLoading ? t('common.processing') : t('loan.contract.save')}
            </button>
          </div>
        </form>
      </div>

      {/* 新增标签模态框 */}
      <TagFormModal
        isOpen={showTagFormModal}
        onClose={() => setShowTagFormModal(false)}
        onSuccess={handleTagFormSuccess}
        zIndex='z-[10000]'
      />
    </div>
  )

  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null
}

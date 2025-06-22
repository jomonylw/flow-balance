'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useToast } from '@/contexts/providers/ToastContext'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import Modal from '@/components/ui/feedback/Modal'
import CircularCheckbox from '@/components/ui/forms/CircularCheckbox'
import type { LoanPayment } from '@/types/core'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface LoanPaymentHistoryProps {
  loanContractId: string
  currencyCode: string
  isOpen: boolean
  onClose: () => void
}

export default function LoanPaymentHistory({
  loanContractId,
  currencyCode,
  isOpen,
  onClose,
}: LoanPaymentHistoryProps) {
  const { t, language } = useLanguage()
  const { currencies: _currencies } = useUserData()
  const { formatCurrency, getCurrencySymbol: _getCurrencySymbol } =
    useUserCurrencyFormatter()
  const { showSuccess, showError } = useToast()
  const [payments, setPayments] = useState<LoanPayment[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重置功能相关状态
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const locale = language === 'zh' ? zhCN : enUS

  // 获取还款记录
  const fetchPayments = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/loan-contracts/${loanContractId}/payments?page=${page}&limit=${pagination.limit}`
      )
      if (!response.ok) {
        throw new Error('获取还款记录失败')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '获取还款记录失败')
      }

      setPayments(result.data?.payments || [])
      if (result.data?.pagination) {
        setPagination(result.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch loan payments:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && loanContractId) {
      fetchPayments(1)
    }
  }, [isOpen, loanContractId])

  // 处理分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPayments(newPage)
    }
  }

  // 处理勾选框变化
  const handleCheckboxChange = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(prev => [...prev, paymentId])
    } else {
      setSelectedPaymentIds(prev => prev.filter(id => id !== paymentId))
    }
  }

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const completedPaymentIds = payments
        .filter(payment => payment.status === 'COMPLETED')
        .map(payment => payment.id)
      setSelectedPaymentIds(completedPaymentIds)
    } else {
      setSelectedPaymentIds([])
    }
  }

  // 重置选中的还款记录
  const handleReset = async () => {
    try {
      setIsResetting(true)

      const response = await fetch(
        `/api/loan-contracts/${loanContractId}/payments/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIds: selectedPaymentIds,
            resetAll: false,
          }),
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '重置失败')
      }

      showSuccess(t('loan.payment.reset.success'), result.data.message)

      // 重新获取数据
      await fetchPayments(pagination.page)
      setSelectedPaymentIds([])
      setShowResetConfirm(false)
    } catch (error) {
      console.error('重置还款记录失败:', error)
      showError(
        t('loan.payment.reset.error'),
        error instanceof Error ? error.message : '重置失败'
      )
    } finally {
      setIsResetting(false)
    }
  }

  // 重置所有已完成的还款记录
  const handleResetAll = async () => {
    try {
      setIsResetting(true)

      const response = await fetch(
        `/api/loan-contracts/${loanContractId}/payments/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resetAll: true,
          }),
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '重置失败')
      }

      showSuccess(t('loan.payment.reset.all.success'), result.data.message)

      // 重新获取数据
      await fetchPayments(pagination.page)
      setSelectedPaymentIds([])
      setShowResetAllConfirm(false)
    } catch (error) {
      console.error('重置所有还款记录失败:', error)
      showError(
        t('loan.payment.reset.all.error'),
        error instanceof Error ? error.message : '重置失败'
      )
    } finally {
      setIsResetting(false)
    }
  }

  // 格式化金额 - 使用统一的货币格式化
  const formatAmount = (amount: number) => {
    return formatCurrency(amount, currencyCode)
  }

  // 格式化日期
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'yyyy-MM-dd', { locale })
  }

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('loan.payment.history')}
        size='xl'
      >
        <div className='space-y-4'>
          {/* 美化的操作栏 */}
          {selectedPaymentIds.length > 0 && (
            <div
              className='p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20
                          border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm'
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
                  <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                    {t('loan.payment.selected.count', {
                      count: selectedPaymentIds.length,
                    })}
                  </span>
                </div>
                <div className='flex space-x-3'>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isResetting}
                    className='px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600
                             hover:from-orange-600 hover:to-orange-700 disabled:from-orange-300 disabled:to-orange-400
                             text-white rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105
                             disabled:transform-none disabled:cursor-not-allowed'
                  >
                    {isResetting
                      ? t('common.processing')
                      : t('loan.payment.reset')}
                  </button>
                  <button
                    onClick={() => setShowResetAllConfirm(true)}
                    disabled={isResetting}
                    className='px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600
                             hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400
                             text-white rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105
                             disabled:transform-none disabled:cursor-not-allowed'
                  >
                    {isResetting
                      ? t('common.processing')
                      : t('loan.payment.reset.all')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-16 space-y-4'>
              <LoadingSpinner
                size='lg'
                inline
                showText
                text={t('common.loading')}
              />
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {t('loan.payment.loading.description')}
              </p>
            </div>
          ) : error ? (
            <div
              className='bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20
                          border border-red-200 dark:border-red-800 rounded-xl p-6 shadow-sm'
            >
              <div className='flex items-start space-x-3'>
                <div className='flex-shrink-0'>
                  <svg
                    className='w-5 h-5 text-red-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-400 mb-1'>
                    {t('common.error.title')}
                  </h3>
                  <p className='text-sm text-red-700 dark:text-red-300'>
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className='text-center py-16'>
              <div className='mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-6'>
                <svg
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  className='w-full h-full'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                {t('loan.payment.history.empty.title')}
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto'>
                {t('loan.payment.history.empty.description')}
              </p>
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
              {/* 美化的表头 */}
              <div
                className='grid grid-cols-6 gap-4 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800
                            text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider
                            border-b border-gray-200 dark:border-gray-600'
              >
                <div className='text-left flex items-center space-x-2'>
                  <CircularCheckbox
                    checked={
                      selectedPaymentIds.length > 0 &&
                      selectedPaymentIds.length ===
                        payments.filter(p => p.status === 'COMPLETED').length
                    }
                    onChange={() =>
                      handleSelectAll(
                        selectedPaymentIds.length > 0 &&
                          selectedPaymentIds.length ===
                            payments.filter(p => p.status === 'COMPLETED')
                              .length
                          ? false
                          : true
                      )
                    }
                    size='sm'
                    variant='enhanced'
                  />
                  <span>{t('loan.payment.period')}</span>
                </div>
                <div className='text-left'>{t('loan.payment.date')}</div>
                <div className='text-right'>{t('loan.payment.principal')}</div>
                <div className='text-right'>{t('loan.payment.interest')}</div>
                <div className='text-right'>{t('loan.payment.total')}</div>
                <div className='text-right'>
                  {t('loan.payment.remaining.balance')}
                </div>
              </div>

              {/* 美化的数据行 */}
              <div className='divide-y divide-gray-100 dark:divide-gray-700'>
                {payments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className={`grid grid-cols-6 gap-4 px-4 py-3 transition-all duration-200
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10
                    ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/30'}`}
                  >
                    {/* 期数和勾选框 */}
                    <div className='flex items-center space-x-3'>
                      {/* 勾选框 - 只有已完成的记录才显示 */}
                      {payment.status === 'COMPLETED' ? (
                        <CircularCheckbox
                          checked={selectedPaymentIds.includes(payment.id)}
                          onChange={() =>
                            handleCheckboxChange(
                              payment.id,
                              !selectedPaymentIds.includes(payment.id)
                            )
                          }
                          size='sm'
                          variant='enhanced'
                        />
                      ) : (
                        <div className='w-4 h-4'></div>
                      )}

                      <div className='flex items-center space-x-2'>
                        <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {payment.period}
                        </span>

                        {/* 美化的状态图标 */}
                        {payment.status === 'COMPLETED' ? (
                          <div className='flex items-center justify-center w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full'>
                            <svg
                              className='w-3 h-3 text-green-600 dark:text-green-400'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                        ) : payment.status === 'PENDING' ? (
                          <div className='flex items-center justify-center w-5 h-5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full'>
                            <svg
                              className='w-3 h-3 text-yellow-600 dark:text-yellow-400'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className='flex items-center justify-center w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-full'>
                            <svg
                              className='w-3 h-3 text-red-600 dark:text-red-400'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 还款日期 */}
                    <div className='flex items-center'>
                      <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        {formatDate(payment.paymentDate)}
                      </div>
                    </div>

                    {/* 本金 */}
                    <div className='text-right flex items-center justify-end'>
                      <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        {formatAmount(payment.principalAmount)}
                      </span>
                    </div>

                    {/* 利息 */}
                    <div className='text-right flex items-center justify-end'>
                      <span className='text-sm font-semibold text-orange-600 dark:text-orange-400'>
                        {formatAmount(payment.interestAmount)}
                      </span>
                    </div>

                    {/* 总金额 */}
                    <div className='text-right flex items-center justify-end'>
                      <span className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                        {formatAmount(payment.totalAmount)}
                      </span>
                    </div>

                    {/* 剩余余额 */}
                    <div className='text-right flex items-center justify-end'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        {formatAmount(payment.remainingBalance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 美化的分页控件 */}
          {pagination.totalPages > 1 && (
            <div
              className='mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800
                          rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm'
            >
              <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                  显示第{' '}
                  <span className='text-blue-600 dark:text-blue-400 font-semibold'>
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  -{' '}
                  <span className='text-blue-600 dark:text-blue-400 font-semibold'>
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{' '}
                  条，共{' '}
                  <span className='text-blue-600 dark:text-blue-400 font-semibold'>
                    {pagination.total}
                  </span>{' '}
                  条记录
                </div>
                <div className='flex items-center space-x-3'>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className='px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                             bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
                             text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700
                             hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400
                             transition-all duration-200 transform hover:scale-105 disabled:transform-none
                             shadow-sm'
                  >
                    上一页
                  </button>
                  <div className='flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      第
                    </span>
                    <span className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                      {pagination.page}
                    </span>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      /
                    </span>
                    <span className='text-sm font-bold text-gray-700 dark:text-gray-300'>
                      {pagination.totalPages}
                    </span>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      页
                    </span>
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className='px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                             bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
                             text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700
                             hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400
                             transition-all duration-200 transform hover:scale-105 disabled:transform-none
                             shadow-sm'
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 确认模态框 */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title={t('loan.payment.reset.confirm.title')}
        message={t('loan.payment.reset.confirm.message', {
          count: selectedPaymentIds.length,
        })}
        confirmLabel={t('loan.payment.reset')}
        cancelLabel={t('common.cancel')}
        variant='warning'
      />

      {/* 重置所有确认模态框 */}
      <ConfirmationModal
        isOpen={showResetAllConfirm}
        onCancel={() => setShowResetAllConfirm(false)}
        onConfirm={handleResetAll}
        title={t('loan.payment.reset.all.confirm.title')}
        message={t('loan.payment.reset.all.confirm.message')}
        confirmLabel={t('loan.payment.reset.all')}
        cancelLabel={t('common.cancel')}
        variant='danger'
      />
    </>
  )
}

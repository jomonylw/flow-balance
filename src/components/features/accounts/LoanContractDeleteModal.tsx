'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { LoanContract } from '@/types/core'

interface LoanContractDeleteModalProps {
  isOpen: boolean
  loanContract: LoanContract | null
  onConfirm: (options: {
    preserveBalanceTransactions: boolean
    preservePaymentTransactions: boolean
  }) => void
  onCancel: () => void
}

interface DeletionStats {
  balanceTransactionCount: number
  paymentTransactionCount: number
  loanPaymentCount: number
}

export default function LoanContractDeleteModal({
  isOpen,
  loanContract,
  onConfirm,
  onCancel,
}: LoanContractDeleteModalProps) {
  const { t } = useLanguage()
  const [preserveBalanceTransactions, setPreserveBalanceTransactions] =
    useState(false)
  const [preservePaymentTransactions, setPreservePaymentTransactions] =
    useState(false)
  const [deletionStats, setDeletionStats] = useState<DeletionStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // 获取删除统计信息
  useEffect(() => {
    if (isOpen && loanContract) {
      setIsLoadingStats(true)
      fetch(`/api/loan-contracts/${loanContract.id}/deletion-stats`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setDeletionStats(data.stats)
          }
        })
        .catch(error => {
          console.error('Failed to fetch deletion stats:', error)
        })
        .finally(() => {
          setIsLoadingStats(false)
        })
    }
  }, [isOpen, loanContract])

  const handleConfirm = () => {
    onConfirm({
      preserveBalanceTransactions,
      preservePaymentTransactions,
    })
  }

  const handleClose = () => {
    setPreserveBalanceTransactions(false)
    setPreservePaymentTransactions(false)
    setDeletionStats(null)
    onCancel()
  }

  if (!loanContract) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='' maskClosable={false}>
      <div className='text-center'>
        {/* 危险图标 */}
        <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4'>
          <svg
            className='h-6 w-6 text-red-600 dark:text-red-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>

        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
          {t('loan.contract.delete.title')}
        </h3>

        <div className='text-left space-y-4 mb-6'>
          <p className='text-gray-700 dark:text-gray-300 text-sm text-center'>
            {t('loan.contract.delete.message', {
              name: loanContract.contractName,
            })}
          </p>

          {/* 统计信息 */}
          {isLoadingStats ? (
            <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4'>
              <div className='animate-pulse'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2'></div>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2'></div>
              </div>
            </div>
          ) : (
            deletionStats && (
              <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4'>
                <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-3'>
                  {t('loan.contract.delete.related.data')}
                </h4>
                <div className='space-y-2 text-sm text-gray-600 dark:text-gray-400'>
                  <div className='flex justify-between'>
                    <span>
                      {t('loan.contract.delete.balance.transactions')}:
                    </span>
                    <span className='font-medium'>
                      {deletionStats.balanceTransactionCount}{' '}
                      {t('common.items')}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>
                      {t('loan.contract.delete.payment.transactions')}:
                    </span>
                    <span className='font-medium'>
                      {deletionStats.paymentTransactionCount}{' '}
                      {t('common.items')}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span>{t('loan.contract.delete.payment.records')}:</span>
                    <span className='font-medium'>
                      {deletionStats.loanPaymentCount} {t('common.items')}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 保留选项 */}
          {deletionStats &&
            (deletionStats.balanceTransactionCount > 0 ||
              deletionStats.paymentTransactionCount > 0) && (
              <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4'>
                <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-3'>
                  {t('loan.contract.delete.preserve.options')}
                </h4>
                <div className='space-y-3'>
                  {deletionStats.balanceTransactionCount > 0 && (
                    <label className='flex items-start space-x-3 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={preserveBalanceTransactions}
                        onChange={e =>
                          setPreserveBalanceTransactions(e.target.checked)
                        }
                        className='mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded'
                      />
                      <div className='text-sm'>
                        <div className='text-yellow-800 dark:text-yellow-400 font-medium'>
                          {t(
                            'loan.contract.delete.preserve.balance.transactions'
                          )}
                        </div>
                        <div className='text-yellow-700 dark:text-yellow-500 text-xs'>
                          {t(
                            'loan.contract.delete.preserve.balance.description',
                            { count: deletionStats.balanceTransactionCount }
                          )}
                        </div>
                      </div>
                    </label>
                  )}

                  {deletionStats.paymentTransactionCount > 0 && (
                    <label className='flex items-start space-x-3 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={preservePaymentTransactions}
                        onChange={e =>
                          setPreservePaymentTransactions(e.target.checked)
                        }
                        className='mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded'
                      />
                      <div className='text-sm'>
                        <div className='text-yellow-800 dark:text-yellow-400 font-medium'>
                          {t(
                            'loan.contract.delete.preserve.payment.transactions'
                          )}
                        </div>
                        <div className='text-yellow-700 dark:text-yellow-500 text-xs'>
                          {t(
                            'loan.contract.delete.preserve.payment.description',
                            { count: deletionStats.paymentTransactionCount }
                          )}
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

          {/* 警告信息 */}
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3'>
            <p className='text-red-800 dark:text-red-400 text-sm'>
              {t('loan.contract.delete.warning')}
            </p>
          </div>
        </div>

        <div className='flex justify-center space-x-3'>
          <button
            type='button'
            onClick={handleClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400'
          >
            {t('common.cancel')}
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            disabled={isLoadingStats}
            className='px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {t('loan.contract.delete.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

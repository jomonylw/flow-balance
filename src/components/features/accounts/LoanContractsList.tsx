'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useRouter } from 'next/navigation'
import LoanPaymentHistory from './LoanPaymentHistory'
import LoanContractDeleteModal from './LoanContractDeleteModal'
import type { LoanContract } from '@/types/core'
import { format } from 'date-fns'

interface LoanContractsListProps {
  accountId: string
  onEdit?: (contract: LoanContract) => void
  onDelete?: (contractId: string) => void
  onCreateNew?: () => void
  currencyCode?: string
}

export default function LoanContractsList({
  accountId,
  onEdit,
  onDelete,
  onCreateNew,
  currencyCode = 'CNY',
}: LoanContractsListProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingContract, setDeletingContract] = useState<LoanContract | null>(
    null
  )

  // 获取贷款合约列表
  const fetchContracts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/accounts/${accountId}/loan-contracts`)
      if (!response.ok) {
        throw new Error('获取贷款合约失败')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '获取贷款合约失败')
      }

      // API返回的数据结构是 { success: true, data: { loanContracts: [...] } }
      setContracts(result.data?.loanContracts || [])
    } catch (error) {
      console.error('Failed to fetch loan contracts:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  // 显示删除确认模态框
  const handleDeleteClick = (contract: LoanContract) => {
    setDeletingContract(contract)
    setShowDeleteModal(true)
  }

  // 确认删除贷款合约
  const handleDeleteConfirm = async (options: {
    preserveBalanceTransactions: boolean
    preservePaymentTransactions: boolean
  }) => {
    if (!deletingContract) return

    try {
      const response = await fetch(
        `/api/loan-contracts/${deletingContract.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }
      )

      if (!response.ok) {
        throw new Error('删除贷款合约失败')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '删除贷款合约失败')
      }

      // 关闭模态框
      setShowDeleteModal(false)
      setDeletingContract(null)

      // 刷新列表
      await fetchContracts()

      // 调用父组件回调
      onDelete?.(deletingContract.id)
    } catch (error) {
      console.error('Failed to delete loan contract:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    }
  }

  // 取消删除
  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeletingContract(null)
  }

  // 处理还款账户点击跳转
  const handlePaymentAccountClick = (paymentAccountId: string) => {
    router.push(`/accounts/${paymentAccountId}`)
  }

  // 获取状态颜色
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'text-green-600 dark:text-green-400'
      : 'text-orange-600 dark:text-orange-400'
  }

  // 获取状态背景色
  const getStatusBgColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-50 dark:bg-green-900/20'
      : 'bg-orange-50 dark:bg-orange-900/20'
  }

  // 获取状态文本
  const getStatusText = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive'
  }

  // 获取还款类型显示文本
  const getRepaymentTypeText = (repaymentType: string) => {
    switch (repaymentType) {
      case 'EQUAL_PAYMENT':
        return t('loan.repayment.equal.payment')
      case 'EQUAL_PRINCIPAL':
        return t('loan.repayment.equal.principal')
      case 'INTEREST_ONLY':
        return t('loan.repayment.interest.only')
      default:
        return repaymentType
    }
  }

  if (isLoading) {
    return (
      <div className='mb-8'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('loan.contracts')}
          </h3>
          <div className='h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className='bg-gray-200 dark:bg-gray-700 rounded-lg h-40 animate-pulse'
            ></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
        <div className='flex items-center'>
          <span className='text-red-600 dark:text-red-400 mr-2'>❌</span>
          <p className='text-red-600 dark:text-red-400 text-sm'>{error}</p>
        </div>
        <button
          onClick={fetchContracts}
          className='mt-2 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400
                   border border-red-300 dark:border-red-600 rounded-md
                   hover:bg-red-50 dark:hover:bg-red-900/20
                   transition-colors duration-200'
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className='mb-8'>
      <div className='mb-4'>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('loan.contracts')}
        </h3>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {contracts.length === 0 ? (
          // 空状态 - 显示创建选项卡片
          onCreateNew ? (
            <div
              onClick={onCreateNew}
              className='bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
            >
              <div className='flex flex-col items-center justify-center h-full min-h-[120px]'>
                <svg
                  className='h-8 w-8 text-blue-500 dark:text-blue-400 mb-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                <h4 className='text-sm font-medium text-blue-600 dark:text-blue-400 text-center'>
                  {t('loan.contract.create')}
                </h4>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 text-center'>
                  {t('loan.contract.create.description')}
                </p>
              </div>
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4'>
              <div className='flex flex-col items-center justify-center h-full min-h-[120px]'>
                <svg
                  className='h-8 w-8 text-gray-400 dark:text-gray-500 mb-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 text-center'>
                  {t('loan.contracts.empty.title')}
                </h4>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 text-center'>
                  {t('loan.contracts.empty.description')}
                </p>
              </div>
            </div>
          )
        ) : (
          <>
            {contracts.map(contract => (
              <div
                key={contract.id}
                className='bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 hover:shadow-md'
              >
                <div className='flex items-start justify-between mb-3'>
                  <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1'>
                    {contract.contractName}
                  </h4>
                  <div className='flex items-center space-x-2 ml-2'>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedContractId(contract.id)
                        setShowPaymentHistory(true)
                      }}
                      className='text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                      title={t('loan.payment.history.view')}
                    >
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                        />
                      </svg>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onEdit?.(contract)
                      }}
                      className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      title={t('loan.contract.edit')}
                    >
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                        />
                      </svg>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteClick(contract)
                      }}
                      className='text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                      title={t('loan.contract.delete')}
                    >
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-lg font-semibold text-blue-600 dark:text-blue-400'>
                    {Number(contract.loanAmount).toLocaleString()}{' '}
                    {contract.currencyCode}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(contract.isActive)} ${getStatusColor(contract.isActive)}`}
                  >
                    {t(`loan.status.${getStatusText(contract.isActive)}`)}
                  </span>
                </div>

                <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span>{t('loan.interest.rate')}:</span>
                    <span className='font-medium'>
                      {(Number(contract.interestRate) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>{t('loan.repayment.type')}:</span>
                    <span className='font-medium'>
                      {getRepaymentTypeText(contract.repaymentType)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>{t('loan.payment.day')}:</span>
                    <span className='font-medium text-orange-600 dark:text-orange-400'>
                      每月{contract.paymentDay}号
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>{t('loan.start.date')}:</span>
                    <span className='font-medium'>
                      {format(new Date(contract.startDate), 'yyyy-MM-dd')}
                    </span>
                  </div>
                  {contract.paymentAccount && (
                    <div className='flex items-center justify-between'>
                      <span>{t('loan.payment.account')}:</span>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (contract.paymentAccount) {
                            handlePaymentAccountClick(
                              contract.paymentAccount.id
                            )
                          }
                        }}
                        className='font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors'
                        title={t('loan.payment.account.click.to.view')}
                      >
                        {contract.paymentAccount.name}
                      </button>
                    </div>
                  )}
                </div>

                <div className='mt-2 text-xs text-gray-600 dark:text-gray-300'>
                  <div className='flex items-center justify-between'>
                    <span>{t('loan.progress')}:</span>
                    <span className='font-medium'>
                      {contract.currentPeriod}/{contract.totalPeriods}{' '}
                      {t('loan.periods')}
                    </span>
                  </div>
                  <div className='mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
                    <div
                      className='bg-blue-600 h-1.5 rounded-full transition-all duration-300'
                      style={{
                        width: `${(contract.currentPeriod / contract.totalPeriods) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 还款记录模态框 */}
      {selectedContractId && (
        <LoanPaymentHistory
          loanContractId={selectedContractId}
          accountId={accountId}
          currencyCode={currencyCode}
          isOpen={showPaymentHistory}
          onClose={() => {
            setShowPaymentHistory(false)
            setSelectedContractId(null)
          }}
        />
      )}

      {/* 删除确认模态框 */}
      <LoanContractDeleteModal
        isOpen={showDeleteModal}
        loanContract={deletingContract}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}

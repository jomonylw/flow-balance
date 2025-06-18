'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import type { ExchangeRateData } from '@/types/core'

interface ExchangeRateListProps {
  exchangeRates: ExchangeRateData[]
  onEdit: (rate: ExchangeRateData) => void
  onDelete: (rateId: string) => void
  onRefresh: () => void
}

export default function ExchangeRateList({
  exchangeRates,
  onEdit,
  onDelete,
  onRefresh,
}: ExchangeRateListProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  )

  const handleDelete = async (rateId: string) => {
    setDeletingId(rateId)

    try {
      const response = await fetch(`/api/exchange-rates/${rateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showSuccess(t('success.deleted'), t('exchange.rate.deleted'))
        onDelete(rateId)
        setShowDeleteConfirm(null)
      } else {
        const data = await response.json()
        showError(t('error.delete.failed'), data.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Failed to delete exchange rate:', error)
      showError(t('error.delete.failed'), t('error.network'))
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const formatRate = (rate: number) => {
    return rate.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
  }

  if (exchangeRates.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
        <div className='text-4xl mb-4'>💱</div>
        <p className='text-lg font-medium mb-2'>
          {t('exchange.rate.empty.title')}
        </p>
        <p className='text-sm'>{t('exchange.rate.empty.description')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700'>
        <div className='px-4 py-5 sm:p-6'>
          <div className='flex justify-between items-center mb-4'>
            <h4 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
              {t('exchange.rate.list')}
            </h4>
            <button
              onClick={onRefresh}
              className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
            >
              {t('common.refresh')}
            </button>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
              <thead className='bg-gray-50 dark:bg-gray-700'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                    {t('exchange.rate.currency.pair')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                    {t('exchange.rate.rate')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                    {t('exchange.rate.effective.date')}
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                    {t('exchange.rate.notes')}
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                {exchangeRates.map(rate => (
                  <tr
                    key={rate.id}
                    className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {rate.fromCurrencyRef.symbol}{' '}
                            {rate.fromCurrencyRef.name}
                          </div>
                          <div className='text-sm text-gray-500 dark:text-gray-400'>
                            → {rate.toCurrencyRef.symbol}{' '}
                            {rate.toCurrencyRef.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900 dark:text-gray-100 font-mono'>
                        1 {rate.fromCurrency} = {formatRate(rate.rate)}{' '}
                        {rate.toCurrency}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                      {formatDate(rate.effectiveDate)}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-500 dark:text-gray-400'>
                      <div
                        className='max-w-xs truncate'
                        title={rate.notes || undefined}
                      >
                        {rate.notes || '-'}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end space-x-2'>
                        <button
                          onClick={() => onEdit(rate)}
                          className='text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300'
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(rate.id)}
                          className='text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50'
                          disabled={deletingId === rate.id}
                        >
                          {deletingId === rate.id
                            ? t('common.deleting')
                            : t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-600 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800'>
            <div className='mt-3 text-center'>
              <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900'>
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
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mt-4'>
                {t('exchange.rate.delete.confirm.title')}
              </h3>
              <div className='mt-2 px-7 py-3'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {t('exchange.rate.delete.confirm.message')}
                </p>
              </div>
              <div className='flex justify-center space-x-4 mt-4'>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className='px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 transition-colors'
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deletingId === showDeleteConfirm}
                  className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {deletingId === showDeleteConfirm
                    ? t('common.deleting')
                    : t('exchange.rate.delete.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

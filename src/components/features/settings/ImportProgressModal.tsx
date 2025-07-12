'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/feedback/Modal'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import ProgressBar from '@/components/ui/feedback/ProgressBar'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { Z_INDEX } from '@/lib/constants/dimensions'
import type { ImportProgress } from '@/types/data-import'

interface ImportProgressModalProps {
  isOpen: boolean
  progress: ImportProgress | null
  sessionId: string | null
  onCancel: () => void
  onComplete: () => void
}

// 数据类型标签映射
const getDataTypeLabel = (dataType: string): string => {
  const labels: Record<string, string> = {
    transactions: '交易记录',
    recurringTransactions: '定期交易',
    loanContracts: '贷款合约',
    loanPayments: '贷款还款记录',
    categories: '分类',
    tags: '标签',
    accounts: '账户',
    transactionTemplates: '交易模板',
    currencies: '货币',
    exchangeRates: '汇率',
  }
  return labels[dataType] || dataType
}

// 格式化剩余时间
const formatTimeRemaining = (milliseconds: number): string => {
  const seconds = Math.ceil(milliseconds / 1000)

  if (seconds < 60) {
    return `${seconds} 秒`
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} 分钟`
  } else {
    const hours = Math.ceil(seconds / 3600)
    return `${hours} 小时`
  }
}

export default function ImportProgressModal({
  isOpen,
  progress,
  sessionId,
  onCancel,
  onComplete,
}: ImportProgressModalProps) {
  const { t } = useLanguage()
  const [_isAnimating, setIsAnimating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // 进度条动画效果
  useEffect(() => {
    if (progress) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [progress?.percentage, progress])

  // 获取阶段图标
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'validating':
        return (
          <div className='flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
            <svg
              className='w-4 h-4 text-blue-600 dark:text-blue-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
        )
      case 'importing':
        return (
          <div className='flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full'>
            <LoadingSpinner size='sm' color='primary' variant='spin' />
          </div>
        )
      case 'completed':
        return (
          <div className='flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full'>
            <svg
              className='w-4 h-4 text-green-600 dark:text-green-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
        )
      case 'failed':
        return (
          <div className='flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full'>
            <svg
              className='w-4 h-4 text-red-600 dark:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </div>
        )
      default:
        return (
          <div className='flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full'>
            <LoadingSpinner size='sm' variant='pulse' />
          </div>
        )
    }
  }

  // 获取阶段颜色
  const getStageColor = (stage: string): 'blue' | 'green' | 'red' | 'gray' => {
    switch (stage) {
      case 'validating':
        return 'blue'
      case 'importing':
        return 'green'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }

  // 获取阶段标题
  const getStageTitle = (stage: string) => {
    switch (stage) {
      case 'validating':
        return t('data.import.progress.validating')
      case 'importing':
        return t('data.import.progress.importing')
      case 'completed':
        return t('data.import.progress.completed')
      case 'failed':
        return t('data.import.progress.failed')
      default:
        return t('data.import.progress.processing')
    }
  }

  const handleCancel = () => {
    if (progress?.stage === 'completed' || progress?.stage === 'failed') {
      onComplete()
    } else {
      onCancel()
    }
  }

  const isCompleted = progress?.stage === 'completed'
  const isFailed = progress?.stage === 'failed'
  const canCancel =
    progress?.stage !== 'completed' && progress?.stage !== 'failed'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('data.import.progress.title')}
      size='md'
      maskClosable={false}
      zIndex={Z_INDEX.MAX}
    >
      <div className='space-y-6'>
        {/* 主要进度显示 */}
        <div className='text-center'>
          {/* 阶段图标 */}
          <div className='flex justify-center mb-4'>
            {getStageIcon(progress?.stage || 'processing')}
          </div>

          {/* 阶段标题 */}
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
            {getStageTitle(progress?.stage || 'processing')}
          </h3>

          {/* 进度消息 */}
          {progress?.message && (
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {progress.message}
            </p>
          )}

          {/* 主进度条 */}
          <div className='mb-4'>
            <ProgressBar
              percentage={progress?.percentage || 0}
              height='lg'
              color={getStageColor(progress?.stage || 'processing')}
              animated={true}
              striped={progress?.stage === 'importing'}
              label={
                progress?.dataType
                  ? `${getDataTypeLabel(progress.dataType)}`
                  : undefined
              }
            />
          </div>

          {/* 批次进度条 (仅在有批次信息时显示) */}
          {progress?.batchInfo && progress.batchInfo.totalBatches > 1 && (
            <div className='mb-4'>
              <ProgressBar
                percentage={Math.round(
                  (progress.batchInfo.currentBatch /
                    progress.batchInfo.totalBatches) *
                    100
                )}
                height='md'
                color='blue'
                animated={true}
                label={`批次进度 (${progress.batchInfo.currentBatch}/${progress.batchInfo.totalBatches})`}
                showPercentage={true}
              />
            </div>
          )}

          {/* 进度百分比和预估时间 */}
          <div className='flex justify-between items-center text-sm text-gray-600 dark:text-gray-400'>
            <span>
              {progress?.current || 0} / {progress?.total || 0}
            </span>
            <div className='text-right'>
              <div className='font-medium'>
                {Math.round(progress?.percentage || 0)}%
              </div>
              {progress?.estimatedTimeRemaining !== undefined &&
                progress.estimatedTimeRemaining > 0 && (
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    剩余 {formatTimeRemaining(progress.estimatedTimeRemaining)}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* 详细信息切换 */}
        <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className='flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
          >
            <span>{t('data.import.progress.details')}</span>
            <svg
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>

          {/* 详细信息内容 */}
          {showDetails && (
            <div className='mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm'>
              <div className='space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('data.import.progress.session.id')}:
                  </span>
                  <span className='font-mono text-xs text-gray-800 dark:text-gray-200'>
                    {sessionId}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('data.import.progress.stage')}:
                  </span>
                  <span className='text-gray-800 dark:text-gray-200'>
                    {progress?.stage || 'unknown'}
                  </span>
                </div>
                {progress?.dataType && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      数据类型:
                    </span>
                    <span className='text-gray-800 dark:text-gray-200'>
                      {getDataTypeLabel(progress.dataType)}
                    </span>
                  </div>
                )}
                {progress?.current !== undefined &&
                  progress?.total !== undefined && (
                    <div className='flex justify-between'>
                      <span className='text-gray-600 dark:text-gray-400'>
                        {t('data.import.progress.items')}:
                      </span>
                      <span className='text-gray-800 dark:text-gray-200'>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                  )}
                {progress?.batchInfo && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>
                      批次进度:
                    </span>
                    <span className='text-gray-800 dark:text-gray-200'>
                      {progress.batchInfo.currentBatch} /{' '}
                      {progress.batchInfo.totalBatches}
                    </span>
                  </div>
                )}
                {progress?.estimatedTimeRemaining !== undefined &&
                  progress.estimatedTimeRemaining > 0 && (
                    <div className='flex justify-between'>
                      <span className='text-gray-600 dark:text-gray-400'>
                        预估剩余时间:
                      </span>
                      <span className='text-gray-800 dark:text-gray-200'>
                        {formatTimeRemaining(progress.estimatedTimeRemaining)}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700'>
          {canCancel && (
            <button
              onClick={onCancel}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors'
            >
              {t('common.cancel')}
            </button>
          )}

          {(isCompleted || isFailed) && (
            <button
              onClick={onComplete}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 transition-colors ${
                isCompleted
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

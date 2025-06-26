'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import SmartPasteGrid from './SmartPasteGrid'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { Z_INDEX } from '@/lib/constants/dimensions'
import {
  createTransactionColumns,
  createEmptyRows,
} from '@/lib/utils/smart-paste-data'
import type {
  SmartPasteGridConfig,
  SmartPasteRowData,
  TransactionBatchResult,
  SimpleAccount,
} from '@/types/core'
import { AccountType } from '@/types/core/constants'

interface SmartPasteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: TransactionBatchResult) => void
  accountType?: AccountType
  selectedAccount?: SimpleAccount
  title?: string
  className?: string
  editingTransactions?: Array<{
    id: string
    date: string
    amount: number
    description: string
    notes?: string | null
    tags?: Array<{ id: string; name: string }>
    account?: {
      id: string
      name: string
      categoryId: string
      category: {
        type: AccountType
      }
    }
  }> // 用于批量编辑的现有交易记录
  showAccountSelector?: boolean // 是否显示多账户支持
}

export default function SmartPasteModal({
  isOpen,
  onClose,
  onSuccess,
  accountType,
  selectedAccount,
  title,
  className = '',
  editingTransactions,
  showAccountSelector = false,
}: SmartPasteModalProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { accounts, categories, currencies, tags } = useUserData()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gridData, setGridData] = useState<SmartPasteRowData[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [currentAccount, setCurrentAccount] = useState<
    SimpleAccount | undefined
  >(selectedAccount)
  const [selectedAccountFromDropdown, setSelectedAccountFromDropdown] =
    useState<string>('mixed')

  // 判断是否显示账户列：只有在显示账户选择器且选择了混合模式时才显示
  const showAccountColumn =
    showAccountSelector && selectedAccountFromDropdown === 'mixed'

  // 将现有交易转换为表格数据
  const convertTransactionsToGridData = useCallback(
    (transactions: any[]) => {
      const columns = createTransactionColumns(
        accountType || AccountType.INCOME,
        {
          code: currentAccount?.currency?.code || 'CNY',
          symbol: currentAccount?.currency?.symbol || '¥',
          decimalPlaces: currentAccount?.currency?.decimalPlaces || 2,
        },
        {
          includeAccountColumn: showAccountColumn,
          isStockAccount:
            accountType === AccountType.ASSET ||
            accountType === AccountType.LIABILITY,
        },
        t
      )

      return transactions.map((transaction, index) => {
        const rowData: SmartPasteRowData = {
          id: `edit_${transaction.id}_${index}`,
          index,
          isNew: false,
          isModified: false,
          isSelected: false,
          validationStatus: 'valid',
          errors: [],
          cells: {},
          originalData: transaction,
        }

        // 填充单元格数据
        columns.forEach(column => {
          let value: unknown = null

          switch (column.key) {
            case 'date':
              value = transaction.date ? new Date(transaction.date) : null
              break
            case 'amount':
              value = transaction.amount || 0
              break
            case 'description':
              value = transaction.description || ''
              break
            case 'notes':
              value = transaction.notes || ''
              break
            case 'tags':
              value = transaction.tags?.map((tag: any) => tag.id) || []
              break
            case 'account':
              value = transaction.account?.id || null
              break
            default:
              value = column.defaultValue || null
          }

          rowData.cells[column.key] = {
            value,
            displayValue: String(value || ''),
            dataType: column.dataType,
            isRequired: column.isRequired,
            isReadOnly: column.isReadOnly,
            validationStatus: 'valid',
            errors: [],
          }
        })

        return rowData
      })
    },
    [accountType, currentAccount]
  )

  // 当模态框关闭时清空数据
  useEffect(() => {
    if (!isOpen) {
      setGridData([])
    }
  }, [isOpen])

  // 初始化默认数据
  useEffect(() => {
    if (isOpen && gridData.length === 0) {
      const columns = createTransactionColumns(
        accountType || AccountType.INCOME,
        {
          code: currentAccount?.currency?.code || 'CNY',
          symbol: currentAccount?.currency?.symbol || '¥',
          decimalPlaces: currentAccount?.currency?.decimalPlaces || 2,
        },
        {
          includeAccountColumn: showAccountColumn,
          isStockAccount:
            accountType === AccountType.ASSET ||
            accountType === AccountType.LIABILITY,
        },
        t
      )

      if (editingTransactions && editingTransactions.length > 0) {
        // 批量编辑模式：预填充现有交易数据
        const convertedData = convertTransactionsToGridData(editingTransactions)
        setGridData(convertedData)
      } else {
        // 批量录入模式：创建空行
        const initialData = createEmptyRows(columns, 5)
        setGridData(initialData)
      }
    }
  }, [
    isOpen,
    accountType,
    currentAccount,
    gridData.length,
    editingTransactions,
    convertTransactionsToGridData,
  ])

  // 当选择的账户改变时，重置当前账户
  useEffect(() => {
    setCurrentAccount(selectedAccount)
  }, [selectedAccount])

  // 组件挂载状态
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // 过滤可用的账户和分类
  const availableAccounts = accounts.filter(account => {
    if (accountType) {
      // 如果指定了账户类型，只显示该类型的账户
      return account.category.type === accountType
    } else {
      // 如果没有指定账户类型（如全局交易页面），显示所有收入和支出类账户
      return (
        account.category.type === AccountType.INCOME ||
        account.category.type === AccountType.EXPENSE
      )
    }
  })

  const availableCategories = categories.filter(
    category => category.type === accountType
  )

  // 创建表格配置
  const createGridConfig = useCallback((): SmartPasteGridConfig => {
    const columns = createTransactionColumns(
      accountType || AccountType.INCOME,
      {
        code: currentAccount?.currency?.code || 'CNY',
        symbol: currentAccount?.currency?.symbol || '¥',
        decimalPlaces: currentAccount?.currency?.decimalPlaces || 2,
      },
      {
        includeAccountColumn: showAccountColumn,
        isStockAccount:
          accountType === AccountType.ASSET ||
          accountType === AccountType.LIABILITY,
      },
      t
    )

    return {
      columns,
      defaultRowData: {},
      maxRows: 100,
      minRows: 1,
      allowAddRows: true,
      allowDeleteRows: true,
      allowReorderRows: false,
      enableUndo: true,
      enableKeyboardShortcuts: true,
      pasteConfig: {
        delimiter: '\t',
        hasHeader: false,
        skipEmptyRows: true,
        trimWhitespace: true,
        maxRows: 100,
        autoDetectFormat: true,
      },
      keyboardShortcuts: {
        copy: ['Ctrl+C', 'Cmd+C'],
        paste: ['Ctrl+V', 'Cmd+V'],
        undo: ['Ctrl+Z', 'Cmd+Z'],
        redo: ['Ctrl+Y', 'Cmd+Shift+Z'],
        delete: ['Delete', 'Backspace'],
        selectAll: ['Ctrl+A', 'Cmd+A'],
        fillDown: ['Ctrl+D', 'Cmd+D'],
        insertRow: ['Ctrl+Enter', 'Cmd+Enter'],
        deleteRow: ['Ctrl+Delete', 'Cmd+Delete'],
        save: ['Ctrl+S', 'Cmd+S'],
        validate: ['F9'],
      },
      validationMode: 'onChange',
      autoSave: false,
      autoSaveInterval: 30000,
    }
  }, [currentAccount, accountType])

  // 处理数据提交
  const handleSubmit = useCallback(
    async (data: SmartPasteRowData[]) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        // 过滤有效数据：包括完全有效和有警告但无错误的数据
        const validData = data.filter(
          row =>
            row.validationStatus === 'valid' ||
            row.validationStatus === 'partial'
        )

        if (validData.length === 0) {
          showError(
            t('smart.paste.submit.error'),
            t('smart.paste.submit.no.valid.data')
          )
          return
        }

        const isEditMode = editingTransactions && editingTransactions.length > 0
        console.log(
          'SmartPasteModal - isEditMode:',
          isEditMode,
          'validData count:',
          validData.length
        )

        if (isEditMode) {
          // 编辑模式：逐个更新交易
          const filteredData = validData.filter(row => row.originalData?.id)
          console.log(
            'SmartPasteModal - 进入编辑模式，filteredData count:',
            filteredData.length
          )

          const updatePromises = filteredData.map(async row => {
            const originalTransaction = row.originalData

            // 获取账户ID：优先从表格中获取，否则使用原始交易的账户，最后使用当前账户
            const accountId = showAccountColumn
              ? (row.cells.account?.value as string)
              : (originalTransaction as any)?.account?.id || currentAccount?.id

            // 根据账户ID查找对应的账户信息
            const targetAccount =
              showAccountColumn && accountId
                ? accounts.find(acc => acc.id === accountId)
                : (originalTransaction as any)?.account || currentAccount

            if (!targetAccount) {
              throw new Error(
                t('smart.paste.error.account.not.found', { accountId })
              )
            }

            // 确定交易类型：根据账户类型判断
            const accountCategoryType = targetAccount?.category?.type
            let transactionType: string

            if (accountCategoryType === AccountType.INCOME) {
              transactionType = 'INCOME'
            } else if (accountCategoryType === AccountType.EXPENSE) {
              transactionType = 'EXPENSE'
            } else if (
              accountCategoryType === AccountType.ASSET ||
              accountCategoryType === AccountType.LIABILITY
            ) {
              transactionType = 'BALANCE'
            } else {
              // 使用原始交易的类型作为默认值
              transactionType = (originalTransaction as any)?.type || 'EXPENSE'
            }

            // 处理日期值：确保转换为正确的日期格式，避免时区问题
            const dateValue = row.cells.date?.value
            let dateString: string

            // 本地日期格式化函数，避免时区转换
            const formatLocalDate = (date: Date): string => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }

            if (dateValue instanceof Date) {
              dateString = formatLocalDate(dateValue)
            } else if (typeof dateValue === 'string') {
              // 如果是字符串，尝试解析为日期
              const parsedDate = new Date(dateValue)
              if (isNaN(parsedDate.getTime())) {
                // 如果解析失败，使用原始交易的日期或当前日期
                const originalDate = (originalTransaction as any)?.date
                if (originalDate) {
                  dateString = formatLocalDate(new Date(originalDate))
                } else {
                  dateString = formatLocalDate(new Date())
                }
              } else {
                dateString = formatLocalDate(parsedDate)
              }
            } else {
              // 如果是其他类型或为空，使用原始交易的日期或当前日期
              const originalDate = (originalTransaction as any)?.date
              if (originalDate) {
                dateString = formatLocalDate(new Date(originalDate))
              } else {
                dateString = formatLocalDate(new Date())
              }
            }

            // 判断是否为存量账户
            const isStockAccount =
              accountCategoryType === AccountType.ASSET ||
              accountCategoryType === AccountType.LIABILITY

            const updateData = {
              accountId: targetAccount?.id || accountId,
              categoryId:
                targetAccount?.categoryId ||
                (originalTransaction as any)?.categoryId,
              currencyCode:
                targetAccount?.currency?.code ||
                (originalTransaction as any)?.currencyCode ||
                'CNY',
              type: transactionType,
              amount: row.cells.amount?.value as number,
              description: isStockAccount
                ? t('smart.paste.balance.update.description', {
                    accountName:
                      targetAccount?.name ||
                      (originalTransaction as any)?.account?.name,
                  }) // 存量账户使用默认描述
                : (row.cells.description?.value as string),
              notes: (row.cells.notes?.value as string) || null,
              date: dateString,
              tagIds: isStockAccount
                ? [] // 存量账户不使用标签
                : (row.cells.tags?.value as string[]) || [],
            }

            console.log(
              'Updating transaction:',
              originalTransaction?.id,
              'with data:',
              updateData
            )

            const response = await fetch(
              `/api/transactions/${originalTransaction?.id}`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
              }
            )

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              console.error('Failed to update transaction:', {
                id: originalTransaction?.id,
                status: response.status,
                statusText: response.statusText,
                errorData,
                updateData,
              })
              throw new Error(
                `Failed to update transaction ${originalTransaction?.id}: ${JSON.stringify(errorData)}`
              )
            }

            return await response.json()
          })

          const results = await Promise.allSettled(updatePromises)
          const successCount = results.filter(
            r => r.status === 'fulfilled' && r.value
          ).length
          const errorCount = results.filter(r => r.status === 'rejected').length

          const batchResult: TransactionBatchResult = {
            success: errorCount === 0,
            created: successCount,
            updated: 0,
            failed: errorCount,
            errors: [],
          }

          showSuccess(
            t('smart.paste.submit.success.update'),
            t('smart.paste.submit.success.update.detail', {
              count: successCount,
            })
          )

          onSuccess(batchResult)
        } else {
          // 录入模式：批量创建交易
          const transactions = validData.map(row => {
            // 获取账户ID：优先从表格中获取，否则使用当前选择的账户
            const accountId = showAccountColumn
              ? (row.cells.account?.value as string)
              : currentAccount?.id || ''

            // 根据账户ID查找对应的账户信息
            const targetAccount = showAccountColumn
              ? accounts.find(acc => acc.id === accountId)
              : currentAccount

            if (!targetAccount) {
              throw new Error(
                t('smart.paste.error.account.not.found', { accountId })
              )
            }

            // 确定交易类型：根据账户类型判断
            const accountCategoryType =
              accountType || targetAccount.category?.type
            let transactionType: string

            if (accountCategoryType === AccountType.INCOME) {
              transactionType = 'INCOME'
            } else if (accountCategoryType === AccountType.EXPENSE) {
              transactionType = 'EXPENSE'
            } else if (
              accountCategoryType === AccountType.ASSET ||
              accountCategoryType === AccountType.LIABILITY
            ) {
              transactionType = 'BALANCE'
            } else {
              // 默认情况，如果无法确定类型
              transactionType = 'EXPENSE'
            }

            // 处理日期值：确保转换为正确的日期格式，避免时区问题
            const dateValue = row.cells.date?.value
            let dateString: string

            // 本地日期格式化函数，避免时区转换
            const formatLocalDate = (date: Date): string => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }

            if (dateValue instanceof Date) {
              dateString = formatLocalDate(dateValue)
            } else if (typeof dateValue === 'string') {
              // 如果是字符串，尝试解析为日期
              const parsedDate = new Date(dateValue)
              if (isNaN(parsedDate.getTime())) {
                // 如果解析失败，使用当前日期
                dateString = formatLocalDate(new Date())
              } else {
                dateString = formatLocalDate(parsedDate)
              }
            } else {
              // 如果是其他类型或为空，使用当前日期
              dateString = formatLocalDate(new Date())
            }

            // 判断是否为存量账户
            const isStockAccount =
              accountCategoryType === AccountType.ASSET ||
              accountCategoryType === AccountType.LIABILITY

            return {
              accountId,
              categoryId: targetAccount.categoryId,
              currencyCode: targetAccount.currency?.code || 'CNY',
              type: transactionType,
              amount: row.cells.amount?.value as number,
              description: isStockAccount
                ? t('smart.paste.balance.update.description', {
                    accountName: targetAccount.name,
                  }) // 存量账户使用与余额更新API相同的格式
                : (row.cells.description?.value as string),
              notes: (row.cells.notes?.value as string) || null,
              date: dateString,
              tagIds: isStockAccount
                ? [] // 存量账户不使用标签
                : (row.cells.tags?.value as string[]) || [],
            }
          })

          // 批量创建交易
          const response = await fetch('/api/transactions/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transactions }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('API Error:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              requestData: { transactions },
            })
            throw new Error(
              `HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`
            )
          }

          const result = await response.json()

          if (result.success) {
            const batchResult: TransactionBatchResult = {
              success: true,
              created: result.data.created.length,
              updated: 0,
              failed: result.data.errors.length,
              errors: result.data.errors.map(
                (error: any) => error.message || '未知错误'
              ),
            }

            showSuccess(
              t('smart.paste.submit.success.create'),
              t('smart.paste.submit.success.create.detail', {
                count: batchResult.created,
              })
            )

            onSuccess(batchResult)
          } else {
            throw new Error(result.error || t('smart.paste.submit.error'))
          }
        }

        onClose()
      } catch (error) {
        console.error('Batch transaction creation failed:', error)
        showError(
          t('smart.paste.submit.error'),
          error instanceof Error ? error.message : t('error.unknown')
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSubmitting,
      currentAccount,
      accountType,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    ]
  )

  // 处理关闭
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    },
    [isSubmitting, handleClose]
  )

  if (!isMounted || !isOpen) {
    return null
  }

  const modalContent = (
    <div
      className='fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4'
      style={{ zIndex: Z_INDEX.MODAL }}
      onClick={e => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        <div className='flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              {title ||
                (accountType === 'INCOME'
                  ? t('smart.paste.modal.title.income')
                  : t('smart.paste.modal.title.expense'))}
            </h2>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50'
            >
              <svg
                className='w-6 h-6'
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
            </button>
          </div>

          {/* 账户选择器 */}
          <div className='flex items-center space-x-4'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              {showAccountSelector
                ? t('smart.paste.account.selector.default')
                : t('smart.paste.account.selector.target')}
            </label>
            <select
              value={
                showAccountSelector
                  ? selectedAccountFromDropdown || 'mixed'
                  : currentAccount?.id || ''
              }
              onChange={e => {
                const selectedValue = e.target.value
                if (showAccountSelector) {
                  setSelectedAccountFromDropdown(
                    selectedValue === 'mixed' ? 'mixed' : selectedValue
                  )
                  // 如果选择了特定账户，也要更新currentAccount
                  if (selectedValue !== 'mixed') {
                    const newAccount = availableAccounts.find(
                      acc => acc.id === selectedValue
                    )
                    setCurrentAccount(newAccount)
                  } else {
                    setCurrentAccount(undefined)
                  }
                  // 清空现有数据，重新初始化
                  setGridData([])
                } else {
                  const newAccount = availableAccounts.find(
                    acc => acc.id === selectedValue
                  )
                  setCurrentAccount(newAccount)
                  // 清空现有数据，重新初始化
                  setGridData([])
                }
              }}
              disabled={isSubmitting}
              className='flex-1 max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100'
            >
              {showAccountSelector && (
                <option value='mixed'>
                  {t('smart.paste.account.selector.mixed')}
                </option>
              )}
              {availableAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} [{account.currency?.symbol || '¥'}{' '}
                  {account.currency?.code}]
                </option>
              ))}
            </select>
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {showAccountSelector
                ? selectedAccountFromDropdown
                  ? t('smart.paste.account.selector.hint.single')
                  : t('smart.paste.account.selector.hint.mixed')
                : t('smart.paste.account.selector.hint.single')}
            </div>
          </div>
        </div>

        {/* 模态框主体 - 美化背景 */}
        <div className='flex-1 overflow-hidden min-h-0 bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/20'>
          <SmartPasteGrid
            config={createGridConfig()}
            data={gridData}
            selectedAccount={currentAccount}
            availableAccounts={availableAccounts}
            availableCategories={availableCategories}
            availableCurrencies={currencies}
            availableTags={tags}
            onDataChange={setGridData}
            onCellEdit={() => {}}
            onRowOperation={() => {}}
            onPaste={() => {}}
            onValidation={() => {}}
            onSubmit={handleSubmit}
            isLoading={false}
            isReadOnly={isSubmitting}
            showValidationSummary={true}
            height='100%'
          />
        </div>

        {/* 加载遮罩 */}
        {isSubmitting && (
          <div className='absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center'>
            <LoadingSpinner
              size='lg'
              showText
              text={t('smart.paste.submit.processing')}
            />
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import type {
  ImportDataTypeSelection,
  ExportStatistics,
} from '@/types/data-import'

interface DataImportSelectorProps {
  statistics: ExportStatistics
  selection: ImportDataTypeSelection
  onChange: (selection: ImportDataTypeSelection) => void
}

interface DataTypeItem {
  key: keyof ImportDataTypeSelection
  name: string
  count: number
  enabled: boolean
  required?: boolean
  dependsOn?: Array<keyof ImportDataTypeSelection>
  description?: string
}

interface DataSection {
  title?: string
  items: DataTypeItem[]
}

export default function DataImportSelector({
  statistics,
  selection,
  onChange,
}: DataImportSelectorProps) {
  const { t } = useLanguage()
  const [selectAll, setSelectAll] = useState(true)

  // 分离必须导入和可选导入的数据
  const requiredItems: DataTypeItem[] = useMemo(
    () => [
      {
        key: 'categories',
        name: t('data.import.statistics.categories'),
        count: statistics.totalCategories,
        enabled: true,
        required: true,
      },
      {
        key: 'accounts',
        name: t('data.import.statistics.accounts'),
        count: statistics.totalAccounts,
        enabled: true,
        required: true,
      },
      {
        key: 'tags',
        name: t('data.import.statistics.tags'),
        count: statistics.totalTags,
        enabled: true,
        required: true,
      },
      {
        key: 'currencies',
        name: t('data.import.statistics.currencies'),
        count: statistics.totalUserCurrencies,
        enabled: true,
        required: true,
      },
      {
        key: 'exchangeRates',
        name: t('data.import.statistics.rates'),
        count: statistics.totalExchangeRates,
        enabled: true,
        required: true,
      },
    ],
    [t, statistics]
  )

  // 分组的数据类型配置（仅包含可选项）
  const dataSections: DataSection[] = useMemo(
    () => [
      // 基础数据（可选项）
      {
        items: [
          {
            key: 'transactionTemplates',
            name: t('data.import.statistics.templates'),
            count: statistics.totalTransactionTemplates,
            enabled: selection.transactionTemplates ?? true,
            dependsOn: ['accounts', 'tags'],
          },
          {
            key: 'manualTransactions',
            name: t('data.import.statistics.transactions.manual'),
            count:
              statistics.totalManualTransactions ??
              statistics.totalTransactions ??
              0,
            enabled: selection.manualTransactions ?? true,
            dependsOn: ['accounts', 'tags'],
            description: t('data.import.selector.transactions.manual.desc'),
          },
        ],
      },
      // 定期交易
      {
        title: t('data.import.section.recurring'),
        items: [
          {
            key: 'recurringTransactions',
            name: t('data.import.statistics.recurring'),
            count: statistics.totalRecurringTransactions,
            enabled: selection.recurringTransactions ?? true,
            dependsOn: ['accounts', 'tags'],
          },
          {
            key: 'recurringTransactionRecords',
            name: t('data.import.statistics.transactions.recurring'),
            count: statistics.totalRecurringTransactionRecords ?? 0,
            enabled: selection.recurringTransactionRecords ?? true,
            dependsOn: ['recurringTransactions'],
            description: t('data.import.selector.transactions.recurring.desc'),
          },
        ],
      },
      // 贷款合约
      {
        title: t('data.import.section.loans'),
        items: [
          {
            key: 'loanContracts',
            name: t('data.import.statistics.loans'),
            count: statistics.totalLoanContracts,
            enabled: selection.loanContracts ?? true,
            dependsOn: ['accounts'],
          },
          {
            key: 'loanPayments',
            name: t('data.import.statistics.payments'),
            count: statistics.totalLoanPayments,
            enabled: selection.loanPayments ?? true,
            dependsOn: ['loanContracts'],
          },
          {
            key: 'loanTransactionRecords',
            name: t('data.import.statistics.transactions.loan'),
            count: statistics.totalLoanTransactionRecords ?? 0,
            enabled: selection.loanTransactionRecords ?? true,
            dependsOn: ['loanContracts'],
            description: t('data.import.selector.transactions.loan.desc'),
          },
        ],
      },
    ],
    [t, statistics, selection]
  )

  // 扁平化所有数据项用于统计和处理
  const dataTypes: DataTypeItem[] = useMemo(
    () => [...requiredItems, ...dataSections.flatMap(section => section.items)],
    [requiredItems, dataSections]
  )

  // 获取必须导入的项目键名
  const requiredKeys = useMemo(
    () =>
      new Set(dataTypes.filter(item => item.required).map(item => item.key)),
    [dataTypes]
  )

  // 过滤依赖关系，移除已经是必须导入的项目
  const getFilteredDependencies = (
    dependsOn?: Array<keyof ImportDataTypeSelection>
  ) => {
    if (!dependsOn) return undefined
    const filtered = dependsOn.filter(dep => !requiredKeys.has(dep))
    return filtered.length > 0 ? filtered : undefined
  }

  // 计算可选项
  const optionalItems = useMemo(
    () => dataSections.flatMap(section => section.items),
    [dataSections]
  )

  // 检查是否全选（仅针对可选项）
  useEffect(() => {
    const enabledCount = optionalItems.filter(dt => dt.enabled).length
    const totalCount = optionalItems.length
    setSelectAll(enabledCount === totalCount)
  }, [selection, optionalItems])

  // 处理单项选择
  const handleItemToggle = (key: keyof ImportDataTypeSelection) => {
    const newSelection = { ...selection }
    const newValue = !newSelection[key]
    newSelection[key] = newValue

    // 处理依赖关系
    if (!newValue) {
      // 取消选择时，同时取消依赖此项的其他项
      dataTypes.forEach(dt => {
        if (dt.dependsOn?.includes(key)) {
          newSelection[dt.key] = false
        }
      })
    } else {
      // 选择时，自动选择依赖项
      const item = dataTypes.find(dt => dt.key === key)
      if (item?.dependsOn) {
        item.dependsOn.forEach(dep => {
          newSelection[dep] = true
        })
      }
    }

    onChange(newSelection)
  }

  // 处理全选/取消全选（仅影响可选项）
  const handleSelectAll = () => {
    const newSelection: ImportDataTypeSelection = {}
    const newValue = !selectAll

    // 必须项始终为true
    requiredItems.forEach(item => {
      newSelection[item.key] = true
    })

    // 可选项根据全选状态设置
    optionalItems.forEach(item => {
      newSelection[item.key] = newValue
    })

    onChange(newSelection)
  }

  // 处理分组选择
  const handleSectionToggle = (sectionIndex: number) => {
    const section = dataSections[sectionIndex]
    if (!section.title) return // 基础数据区域不允许整体切换

    const newSelection = { ...selection }

    // 检查当前分组是否全部选中
    const allSelected = section.items.every(
      item => item.required || newSelection[item.key] !== false
    )

    // 切换分组状态
    const newValue = !allSelected
    section.items.forEach(item => {
      if (!item.required) {
        newSelection[item.key] = newValue
      }
    })

    onChange(newSelection)
  }

  // 检查分组是否全部选中
  const isSectionSelected = (sectionIndex: number) => {
    const section = dataSections[sectionIndex]
    return section.items.every(
      item => item.required || selection[item.key] !== false
    )
  }

  // 检查分组是否部分选中
  const isSectionIndeterminate = (sectionIndex: number) => {
    const section = dataSections[sectionIndex]
    const selectedCount = section.items.filter(
      item => item.required || selection[item.key] !== false
    ).length
    return selectedCount > 0 && selectedCount < section.items.length
  }

  // 获取选中项统计（包含必须项和可选项）
  const selectedOptionalCount = optionalItems.filter(dt => dt.enabled).length
  const totalOptionalCount = optionalItems.length
  const totalRequiredCount = requiredItems.length
  const selectedCount = totalRequiredCount + selectedOptionalCount
  const totalCount = totalRequiredCount + totalOptionalCount

  const totalRecords = [...requiredItems, ...optionalItems].reduce(
    (sum, dt) => sum + (dt.enabled ? (dt.count ?? 0) : 0),
    0
  )

  return (
    <div className='space-y-6'>
      {/* 紧凑的标题区域 */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/50'>
        <div className='flex items-center justify-between mb-3'>
          <h5 className='text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center'>
            <div className='w-5 h-5 bg-blue-100 dark:bg-blue-800/50 rounded-md flex items-center justify-center mr-2'>
              <svg
                className='w-3 h-3 text-blue-600 dark:text-blue-400'
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
            </div>
            {t('data.import.statistics')}
          </h5>
          <label className='flex items-center cursor-pointer group bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-md px-2 py-1 border border-white/20 dark:border-gray-700/20 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200'>
            <input
              type='checkbox'
              checked={selectAll}
              onChange={handleSelectAll}
              className='mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-colors'
            />
            <span className='text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
              {t('data.import.selector.select.all')}
            </span>
          </label>
        </div>

        {/* 紧凑的统计摘要 */}
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-md p-2 border border-white/30 dark:border-gray-700/30'>
          <div className='flex items-center justify-between text-xs'>
            <div className='flex items-center space-x-2'>
              <div className='w-1.5 h-1.5 bg-blue-500 rounded-full'></div>
              <span className='font-medium text-gray-700 dark:text-gray-300'>
                {t('data.import.selector.selected.summary', {
                  selected: selectedCount,
                  total: totalCount,
                })}
              </span>
            </div>
            <div className='flex items-center space-x-1'>
              <span className='text-gray-500 dark:text-gray-400'>
                {t('data.import.total.records')}
              </span>
              <span className='font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-xs'>
                {totalRecords.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 必须导入的数据项 - 紧凑设计 */}
      <div className='bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800/50'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center'>
            <div className='w-6 h-6 bg-green-100 dark:bg-green-800/50 rounded-md flex items-center justify-center mr-2'>
              <svg
                className='w-3 h-3 text-green-600 dark:text-green-400'
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
            <h6 className='text-sm font-medium text-green-800 dark:text-green-300'>
              {t('data.import.required.title')}
            </h6>
          </div>
          <span className='text-xs text-green-600 dark:text-green-400'>
            {t('data.import.required.auto')}
          </span>
        </div>

        {/* 简洁的列表设计 */}
        <div className='space-y-2'>
          {requiredItems.map((item, index) => (
            <div
              key={item.key}
              className={`flex items-center justify-between py-2 px-3 rounded-md bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 ${
                index < requiredItems.length - 1 ? '' : ''
              }`}
            >
              <div className='flex items-center min-w-0 flex-1'>
                <div className='w-4 h-4 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center mr-2 flex-shrink-0'>
                  <svg
                    className='w-2 h-2 text-green-600 dark:text-green-400'
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
                <span className='text-xs font-medium text-gray-700 dark:text-gray-300 truncate'>
                  {item.name}
                </span>
                <span className='ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0'>
                  {t('data.import.required.label')}
                </span>
              </div>
              <div className='ml-3 text-right flex-shrink-0'>
                <div className='text-xs font-semibold text-gray-900 dark:text-gray-100'>
                  {(item.count ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 可选数据类型列表 */}
      <div className='space-y-6'>
        {dataSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* 紧凑的分组标题 */}
            {section.title && (
              <div className='mb-4'>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-gray-200 dark:border-gray-700'></div>
                  </div>
                  <div className='relative flex justify-center'>
                    <div className='bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600'>
                      <label className='flex items-center cursor-pointer group'>
                        <input
                          type='checkbox'
                          checked={isSectionSelected(sectionIndex)}
                          ref={el => {
                            if (el)
                              el.indeterminate =
                                isSectionIndeterminate(sectionIndex)
                          }}
                          onChange={() => handleSectionToggle(sectionIndex)}
                          className='mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-colors'
                        />
                        <span className='text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center'>
                          <svg
                            className='w-3 h-3 mr-1 text-gray-400 dark:text-gray-500'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            {sectionIndex === 1 ? (
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                              />
                            ) : (
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
                              />
                            )}
                          </svg>
                          {section.title}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 紧凑的分组项目 */}
            <div className='space-y-2'>
              {section.items.map(dataType => {
                const isDisabled = dataType.required && dataType.enabled

                return (
                  <label
                    key={dataType.key}
                    className={`
                      group relative flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${
                        dataType.enabled
                          ? 'border-blue-200 dark:border-blue-700/50 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10'
                          : 'border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${isDisabled ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/50'}
                    `}
                  >
                    <div className='flex items-start flex-1'>
                      {/* 紧凑的复选框 */}
                      <div className='relative mr-3 mt-0.5'>
                        <input
                          type='checkbox'
                          checked={dataType.enabled}
                          onChange={() =>
                            !isDisabled && handleItemToggle(dataType.key)
                          }
                          disabled={isDisabled}
                          className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-all duration-200'
                        />
                        {dataType.required && (
                          <div className='absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full'></div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center'>
                              <h6 className='text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate'>
                                {dataType.name}
                              </h6>
                              {dataType.required && (
                                <span className='ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0'>
                                  {t('data.import.required.label')}
                                </span>
                              )}
                            </div>
                            {dataType.description && (
                              <p className='text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed'>
                                {dataType.description}
                              </p>
                            )}
                            {(() => {
                              const filteredDeps = getFilteredDependencies(
                                dataType.dependsOn
                              )
                              return (
                                filteredDeps &&
                                filteredDeps.length > 0 && (
                                  <div className='flex items-center mt-1'>
                                    <svg
                                      className='w-2.5 h-2.5 text-gray-400 mr-1'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
                                      />
                                    </svg>
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                      {t('data.import.selector.depends.on')}:{' '}
                                      {filteredDeps.join(', ')}
                                    </span>
                                  </div>
                                )
                              )
                            })()}
                          </div>

                          {/* 紧凑的数量显示 */}
                          <div className='ml-3 flex-shrink-0'>
                            <div className='bg-gray-100 dark:bg-gray-700/50 rounded-md px-2 py-1 text-center min-w-[50px]'>
                              <div className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                {(dataType.count ?? 0).toLocaleString()}
                              </div>
                              <div className='text-xs text-gray-500 dark:text-gray-400'>
                                {t('data.import.unit.records')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 紧凑的提示信息 */}
      <div className='bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3'>
        <div className='flex items-start'>
          <div className='w-5 h-5 bg-amber-100 dark:bg-amber-800/50 rounded-md flex items-center justify-center mr-2 flex-shrink-0 mt-0.5'>
            <svg
              className='w-3 h-3 text-amber-600 dark:text-amber-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <div className='flex-1'>
            <h6 className='text-xs font-medium text-amber-800 dark:text-amber-300 mb-1'>
              依赖关系说明
            </h6>
            <p className='text-xs text-amber-700 dark:text-amber-400 leading-relaxed'>
              {t('data.import.selector.dependency.note')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import SmartPasteGrid from './SmartPasteGrid'
import type { SmartPasteGridConfig, SmartPasteRowData } from '@/types/core'

/**
 * 智能表格复制粘贴功能演示组件
 */
export default function SmartPasteDemo() {
  const { t } = useLanguage()

  // 示例配置
  const config: SmartPasteGridConfig = {
    columns: [
      {
        key: 'date',
        title: t('smart.paste.grid.column.date'),
        dataType: 'date',
        width: 120,
        isRequired: true,
        isReadOnly: false,
      },
      {
        key: 'description',
        title: t('smart.paste.grid.column.description'),
        dataType: 'text',
        width: 200,
        isRequired: true,
        isReadOnly: false,
      },
      {
        key: 'amount',
        title: t('smart.paste.grid.column.amount'),
        dataType: 'currency',
        width: 120,
        isRequired: true,
        isReadOnly: false,
      },
      {
        key: 'category',
        title: t('smart.paste.grid.column.category'),
        dataType: 'text',
        width: 120,
        isRequired: false,
        isReadOnly: false,
      },
    ],
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
      skipEmptyRows: true,
      trimWhitespace: true,
      autoDetectFormat: true,
      hasHeader: false,
      maxRows: 1000,
    },
    keyboardShortcuts: {
      copy: ['Ctrl+C', 'Cmd+C'],
      paste: ['Ctrl+V', 'Cmd+V'],
      undo: ['Ctrl+Z', 'Cmd+Z'],
      redo: ['Ctrl+Y', 'Cmd+Y'],
      delete: ['Delete', 'Backspace'],
      selectAll: ['Ctrl+A', 'Cmd+A'],
      fillDown: ['Ctrl+D', 'Cmd+D'],
      insertRow: ['Ctrl+Enter', 'Cmd+Enter'],
      deleteRow: ['Ctrl+Shift+Delete', 'Cmd+Shift+Delete'],
      save: ['Ctrl+S', 'Cmd+S'],
      validate: ['Ctrl+Shift+V', 'Cmd+Shift+V'],
    },
    validationMode: 'onChange',
    autoSave: false,
    autoSaveInterval: 5000,
  }

  // 示例数据
  const [data, setData] = useState<SmartPasteRowData[]>([
    {
      id: '1',
      index: 0,
      isNew: false,
      isModified: false,
      isSelected: false,
      validationStatus: 'valid',
      errors: [],
      cells: {
        date: {
          value: '2024-01-01',
          displayValue: '2024-01-01',
          dataType: 'date',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        description: {
          value: '示例交易1',
          displayValue: '示例交易1',
          dataType: 'text',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        amount: {
          value: 100.5,
          displayValue: '¥100.50',
          dataType: 'currency',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        category: {
          value: '餐饮',
          displayValue: '餐饮',
          dataType: 'text',
          isRequired: false,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
      },
      originalData: {
        date: '2024-01-01',
        description: '示例交易1',
        amount: 100.5,
        category: '餐饮',
      },
    },
    {
      id: '2',
      index: 1,
      isNew: false,
      isModified: false,
      isSelected: false,
      validationStatus: 'valid',
      errors: [],
      cells: {
        date: {
          value: '2024-01-02',
          displayValue: '2024-01-02',
          dataType: 'date',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        description: {
          value: '示例交易2',
          displayValue: '示例交易2',
          dataType: 'text',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        amount: {
          value: 250.0,
          displayValue: '¥250.00',
          dataType: 'currency',
          isRequired: true,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
        category: {
          value: '购物',
          displayValue: '购物',
          dataType: 'text',
          isRequired: false,
          isReadOnly: false,
          validationStatus: 'valid',
          errors: [],
        },
      },
      originalData: {
        date: '2024-01-02',
        description: '示例交易2',
        amount: 250.0,
        category: '购物',
      },
    },
  ])

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
          智能表格复制粘贴功能演示
        </h1>
        <div className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
          <p>• 单击单元格进行选择</p>
          <p>• Ctrl+点击进行多选</p>
          <p>• Shift+点击进行范围选择</p>
          <p>• Ctrl+C 复制选中单元格（会显示蓝色边框动画）</p>
          <p>• Ctrl+V 粘贴到选中位置</p>
          <p>• Ctrl+A 全选所有单元格</p>
          <p>• Escape 取消选择</p>
        </div>
      </div>

      <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        <SmartPasteGrid
          config={config}
          data={data}
          selectedAccount={null}
          availableAccounts={[]}
          availableCategories={[]}
          availableCurrencies={[]}
          availableTags={[]}
          onDataChange={setData}
          onCellEdit={() => {}}
          onRowOperation={() => {}}
          onPaste={() => {}}
          onValidation={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          isReadOnly={false}
          showValidationSummary={true}
          height='400px'
        />
      </div>
    </div>
  )
}
